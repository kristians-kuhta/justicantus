const path = require('path');
const os = require('os');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const Firestore = require("@google-cloud/firestore");
const ethers = require("ethers");

const functions = require('@google-cloud/functions-framework');

const contractAddresses = require("./contracts/contract-addresses.json");
const PlatformArtifact = require("./contracts/Platform.json");

// Node.js doesn't have a built-in multipart/form-data parsing library.
// Instead, we can use the 'busboy' library from NPM to parse these requests.
const Busboy = require('busboy');
const TRACKING_INTERVAL_SECONDS = 10;

// TODO: decide on what kind of additional data needs to be logged, if any
functions.http('pinFile', (req, res) => {
  // Set CORS headers for preflight requests
  // Allows GETs from any origin with the Content-Type header
  // and caches preflight response for 3600s

  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS);

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  } else if (req.method !== 'POST') {
    // Return a "method not allowed" error
    return res.status(405).end();
  }

  const busboy = Busboy({headers: req.headers});
  const tmpdir = os.tmpdir();
  // The tmp file where the final JSON object will be written
  const finalTmpFilePath = path.join(tmpdir, 'final.json');

  // This object will accumulate all the fields, keyed by their name
  const fields = {};

  // This object will accumulate all the uploaded files, keyed by their name.
  const uploads = {};

  const pinFileToIpfs = async () => {
    const { INFURA_API_KEY, INFURA_API_SECRET } = process.env;

    const formData = new FormData();
    formData.append('file', fs.readFileSync(uploads['file']));

    const options = {
      params: { pin: 'true' },
      auth: { username: INFURA_API_KEY, password: INFURA_API_SECRET },
      headers: {
        'Content-Type': 'multipart/form-data'
      },
    };

    const firstResponse = await axios.post('https://ipfs.infura.io:5001/api/v0/add', formData, options);
    const cid = firstResponse.data.Hash;

    const jsonContent = JSON.stringify({ title: fields['title'], cid });

    // Write final json object to tmp file
    fs.writeFileSync(finalTmpFilePath, jsonContent);

    const secondFormData = new FormData();
    secondFormData.append('file', fs.createReadStream(finalTmpFilePath));

    try {
      const secondResponse = await axios.post('https://ipfs.infura.io:5001/api/v0/add', secondFormData, options);
      const secondResponseJson = secondResponse.data;

      res.status(secondResponse.status).json(secondResponse.data);
    } catch (e) {
      console.error(e);
      res.status(500).send('An error occured while pinning the file');
    }

    // Remove final json object tmp file
    fs.unlinkSync(finalTmpFilePath);
  };

  // This code will process each non-file field in the form.
  busboy.on('field', (fieldname, val) => {
    fields[fieldname] = val;
  });

  const fileWrites = [];

  // This code will process each file uploaded.
  busboy.on('file', (fieldname, file, {filename}) => {
    // Note: os.tmpdir() points to an in-memory file system on GCF
    // Thus, any files in it must fit in the instance's memory.
    const filepath = path.join(tmpdir, filename);
    uploads[fieldname] = filepath;

    const writeStream = fs.createWriteStream(filepath);
    file.pipe(writeStream);

    // File was processed by Busboy; wait for it to be written.
    // Note: GCF may not persist saved files across invocations.
    // Persistent files must be kept in other locations
    // (such as Cloud Storage buckets).
    const promise = new Promise((resolve, reject) => {
      file.on('end', () => {
        writeStream.end();
      });
      writeStream.on('close', resolve);
      writeStream.on('error', reject);
    });
    fileWrites.push(promise);
  });

  // Triggered once all uploaded files are processed by Busboy.
  // We still need to wait for the disk writes (saves) to complete.
  busboy.on('finish', async () => {
    await Promise.all(fileWrites);

    await pinFileToIpfs();
  });

  busboy.end(req.rawBody);
});

functions.http('updatePlayedMinutes', async (req, res) => {
  if (req.method !== 'POST') {
    // Return a "method not allowed" error
    return res.status(405).end();
  }

  const {
    INFURA_URL,
    REPORTER_PRIVATE_KEY,
    FIRESTORE_PROJECT_ID
  } = process.env;

  const firestore = new Firestore({
    projectId: FIRESTORE_PROJECT_ID,
    timestampsInSnapshots: true
  });

  const collectionSnapshot = await firestore.collection("songPlayRecords").get();
  const { docs } = collectionSnapshot;

  if (docs.length === 0) {
    return res.status(200).send('No updates where made');
  }

  let artistPlayedSeconds = {};

  const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);
  const reporterWallet = new ethers.Wallet(REPORTER_PRIVATE_KEY, provider);

  const platform = new ethers.Contract(
    contractAddresses.Platform,
    PlatformArtifact.abi,
    reporterWallet
  );

  await Promise.all(docs.map(async(doc) => {
    const { songId, artistAddress, secondsPlayed } = doc.data();

    const isArtistSong = await platform.isArtistSong(artistAddress, songId);

    if (!isArtistSong) {
      console.error(`Unable to process played minutes for artist ${artistAddress} and song ${songId}`);
      // NOTE: We skip this doc. If we were to choose to abort the whole update this would lock
      //       any further updates and we might not have a way of enabling them unless we add a DB editing feature.
      return;
    }

    const prevPlayedSeconds = artistPlayedSeconds[artistAddress] || 0;
    artistPlayedSeconds[artistAddress] = prevPlayedSeconds + secondsPlayed;
  }));

  const artistPlayedMinutes = Object.keys(artistPlayedSeconds).map((artistAddress) => {
    const playedSeconds = artistPlayedSeconds[artistAddress];
    const playedMinutes = Math.floor(playedSeconds / 60);
    return playedMinutes === 0 ? null : { artist: artistAddress, playedMinutes };
  }).filter(e => e !== null);

  try {
    if (artistPlayedMinutes.length > 0) {
      // TODO: figure out actual amount of gas used here
      await (await platform.updatePlayedMinutes(artistPlayedMinutes, { gasLimit: 3000000 })).wait();
    }
    res.status(200).send('Done');
  } catch (e) {
    console.error(e);
    return res.status(422).send('Could not update played minutes');
  }
});

functions.http('trackPlayback', async (req, res) => {
  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS);

  // Send response to OPTIONS requests
  if (req.method === 'OPTIONS') {
    // Set CORS headers for preflight requests
    // Allows POSTs from any origin with the Content-Type header
    // and caches preflight response for 3600s
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  } else if (req.method !== 'POST') {
    // Return a "method not allowed" error
    return res.status(405).end();
  }

  const {
    songId,
    artistAddress,
    account,
    signature,
    duration
  } = req.body;

  const requiredParams = [songId, account, signature, duration, artistAddress];
  const areRequiredParamsSent = requiredParams.every((item) => item !== undefined && item !== '');

  if (!areRequiredParamsSent) {
    return res.status(400).send('Malformed request');
  }

  try {
    const isValidSignature = await validateSignature(account, signature);

    if (!isValidSignature) {
      res.status(403).send("Invalid signature");
      return;
    }

    const { INFURA_URL } = process.env;

    const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);
    // TODO: figure out how we can get rid of signers here, as only read-only operations will be done (this is 10th account from hardhat, consider it random)
    const wallet = new ethers.Wallet('0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897', provider);
    const platform = new ethers.Contract(contractAddresses.Platform, PlatformArtifact.abi, wallet);

    const isActiveSubscriber = await platform.isActiveSubscriber(account);

    if (!isActiveSubscriber) {
      return res.status(403).send("Not allowed to track playback");
    }

    const isArtistSong = await platform.isArtistSong(artistAddress, songId);

    if (!isArtistSong) {
      return res.status(422).send('Malformed request');
    }

    await storeSongPlaybackRecord(res, account, songId, artistAddress, duration);

    res.status(200).send("Song play record stored successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Oops, an error occured!");
  }
});

async function validateSignature(account, signature) {
  // TODO: consider using view function instead of hard-coding this
  const message = 'I want to subscribe';
  const signer = ethers.utils.verifyMessage(message, signature);

  return signer.toLowerCase() === account.toLowerCase();
}

async function getSubscriberLastTrackedSong(firestore, account, songId) {
  const docRef = firestore.collection("lastTrackedSong").doc(account);
  const snapshot = await docRef.get();

  return snapshot.exists ? snapshot.data() : null;
}

async function storePlayedSeconds(firestore, songId, artistAddress, addedPlayedSeconds) {
  const docRef = firestore.collection("songPlayRecords").doc(songId.toString());
  const snapshot = await docRef.get();

  const existingSecondsPlayed = snapshot.exists ? snapshot.data().secondsPlayed : 0;

  // Calculate the updated seconds played
  const secondsPlayed = existingSecondsPlayed + addedPlayedSeconds;

  const timestamp = Date.now();

  console.log('storing songPlayRecords');
  console.log({songId, artistAddress, secondsPlayed, timestamp});

  // Store the updated song play record in the database
  await docRef.set({ songId, artistAddress, secondsPlayed, timestamp });
}

async function storeSubscriberLastTrackedSong(firestore, account, songId, duration) {
  const docRef = firestore.collection("lastTrackedSong").doc(account);

  console.log('storing lastTrackedSong');
  console.log({account, songId, duration});
  await docRef.set({ account, songId, duration });
}

async function storeSongPlaybackRecord(res, account, songId, artistAddress, duration) {
  const firestore = new Firestore({
    projectId: process.env.FIRESTORE_PROJECT_ID,
    timestampsInSnapshots: true
  });

  const subscriberLastTrackedSong = await getSubscriberLastTrackedSong(firestore, account, songId);
  console.log({subscriberLastTrackedSong});

  await storeSubscriberLastTrackedSong(firestore, account, songId, duration);

  // NOTE: in case that we replay the same song after it has finished, we don't register the first update.
  //       This might also be the case if we allow users to go back to a certain place in song and play from there.
  if (subscriberLastTrackedSong && subscriberLastTrackedSong.duration < duration) {
    const addedPlayedSeconds = parseInt(duration - subscriberLastTrackedSong.duration);

    console.log('lastTrackedSong did exist');
    console.log({duration, prevDuration: subscriberLastTrackedSong.duration});
    await storePlayedSeconds(firestore, songId, artistAddress, addedPlayedSeconds);
  }
}

