const busboy = require('busboy');

const axios = require('axios');

exports.pinFile = async (req, res) => {

  const { INFURA_API_KEY, INFURA_API_SECRET } = process.env;
  let file = null;

  if (
    req.method != 'POST' ||
    !req.headers['content-type'] ||
    !req.headers['content-type'].startsWith('multipart/form-data')
  ) {
    return res.status(400).send('Invalid request');
  }

  const bb = busboy({ headers: req.headers });

  // TODO: consider doing JSON file creation in this GC function
  bb.on('file', (name, file, _info) => {
    console.log('file found');
    // NOTE: only one file is expected
    if (file) return;

    // TODO: limit allowed formats to support only audio ones (?)
    const chunks = [];

    file.on('data', function (data) {
      console.log(`File [${name}] got ${data.length} bytes`);
      chunks.push(data);
    }).on('end', async () => {
      console.log('file ended');
      file = Buffer.concat(chunks);
    });
  });

  bb.on('field', (name, val, info) => {
    console.log(`Field [${name}]: value: %j`, val);
  });

  bb.on('close', async () => {
    console.log('bb closed');
    if (!file) { console.log('file not present'); return; }

    try {
      const options = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        params: {
          pin: 'true'
        },
        auth: {
          username: INFURA_API_KEY,
          password: INFURA_API_SECRET
        }
      };

      console.log({file});

      const response = await axios.post('https://ipfs.infura.io:5001/api/v0/add', file, options);

      // TODO: update this when going live
      res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
      res.set('Access-Control-Allow-Methods', 'POST');

      res.status(response.status).json(response.data);
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while adding and pinning the file.');
    }
  });

  req.pipe(bb);
};

