const path = require('path');
const os = require('os');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const Firestore = require("@google-cloud/firestore");
const ethers = require("ethers");

const functions = require('@google-cloud/functions-framework');

import contractAddresses from "contracts/contract-addresses.json";
import PlatformArtifact from "contracts/Platform.json";

// Node.js doesn't have a built-in multipart/form-data parsing library.
// Instead, we can use the 'busboy' library from NPM to parse these requests.
const Busboy = require('busboy');
const TRACKING_INTERVAL_SECONDS = 10;

// TODO: decide on what kind of additional data needs to be logged, if any
functions.http('pinFile', (req, res) => {
  if (req.method !== 'POST') {
    // Return a "method not allowed" error
    return res.status(405).end();
  }

  // Set CORS headers for preflight requests
  // Allows GETs from any origin with the Content-Type header
  // and caches preflight response for 3600s

  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS);

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
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

  const collectionSnapshot = firestore.collection("songPlayRecords").get();
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

  docs.forEach((doc) => {
    const { songId, artistAddress, secondsPlayed } = doc.data();

    const isArtistSong = await platform.isArtistSong(artistAddress, songId);

    if (!isArtistSong) {
      console.error(`Unable to process played minutes for artist ${artistAddress} and song ${songId}`);
      // NOTE: We skip this doc. If we were to choose to abort the whole update this would lock
      //       any further updates and we might not have a way of enabling them unless we add a DB editing feature.
      return;
    }

    const prevPlayedSeconds = artistPlayedSeconds[artistId] || 0;
    artistPlayedSeconds[artistId] = prevPlayedSeconds + secondsPlayed;
  });

  // TODO: remove this, once testing is done
  console.log({artistPlayedSeconds});

  const artistPlayedMinutes = Object.keys(artistPlayedSeconds).map((artistId) => {
    const playedSeconds = artistPlayedSeconds[artistId];
    const playedMinutes = Math.floor(playedSeconds / 60);
    return { artist: artistId, playedMinutes };
  });

  try {
    await (await platform.updatePlayedMinutes(artistPlayedMinutes)).wait();
  } catch (e) {
    return res.status(422).send('Could not update played minutes');
  }
});

functions.http('trackPlayback', async (req, res) => {
  if (req.method !== 'POST') {
    // Return a "method not allowed" error
    return res.status(405).end();
  }

  // Set CORS headers for preflight requests
  // Allows GETs from any origin with the Content-Type header
  // and caches preflight response for 3600s

  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS);

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  const {
    songId,
    artistAddress,
    account,
    signature,
    duration
  } = req.body;

  if (!songId || !account || !signature || !duration || !artistAddress) {
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
    const platform = new ethers.Contract(contractAddresses.Platform, PlatformArtifact.abi);

    const isActiveSubscriber = await platform.isActiveSubscriber(account);

    if (!isActiveSubscriber) {
      return res.status(403).send("Not allowed to track playback");
    }

    const isArtistSong = await platform.isArtistSong(artistAddress, songId);

    if (!isArtistSong) {
      return res.status(422).send('Malformed request');
    }

    await storeSongPlaybackRecord(res, songId, artistAddress);

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

async function storeSongPlaybackRecord(res, songId, artistAddress) {
  const firestore = new Firestore({
    projectId: process.env.FIRESTORE_PROJECT_ID,
    timestampsInSnapshots: true
  });

  const songDocPath = songId.toString();
  const docRef = firestore.collection("songPlayRecords").doc(songDocPath);

  // Get the existing song played seconds
  const doc = await docRef.get();

  let existingSecondsPlayed = 0;

  if (doc.exists) {
    const { secondsPlayed } = doc.data();
    existingSecondsPlayed = secondsPlayed || 0;
  }

  // Calculate the updated seconds played
  const updatedSecondsPlayed = existingSecondsPlayed + TRACKING_INTERVAL_SECONDS;

  // Store the updated song play record in the database
  await docRef.set({
    songId,
    artistAddress,
    secondsPlayed: updatedSecondsPlayed,
    timestamp: Date.now(),
  });
}

