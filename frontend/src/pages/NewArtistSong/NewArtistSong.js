import React, { useState, useRef } from 'react';
import {
  Container,
  Form,
  Button,
  ProgressBar
} from 'react-bootstrap';

import { useForm } from 'react-hook-form';
import { useOutletContext, useNavigate } from 'react-router-dom';

import axios from 'axios';

const SONG_RESOURCE_TYPE = 2;

const NewArtistSong = () => {

  const { account, platform, setMessage } = useOutletContext();
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  //TODO: consider if this is needed
  const newForm = useRef();

  const {
    register,
    handleSubmit,
    formState: { isDirty, isValid, errors }
  } = useForm({
    mode: "onChange"
  });

  const handleResourceRegisteredEvent = async (creator, resourceType, assignedId) => {
    const accountLowercase = account.toLowerCase();
    const creatorLowercase = creator.toLowerCase();

    if (creatorLowercase === accountLowercase && resourceType === SONG_RESOURCE_TYPE) {
      setProgress(100);
      setMessage({
        text: 'Song registered!',
        type: 'success'
      });

      const artistId = await platform.artistIds(creator);

      navigate(`/artists/${artistId.toHexString()}/songs`);
    }
  }

  const handleRegistrationCreatedEvent = (creator, resourceType, requestId) => {
    const accountLowercase = account.toLowerCase();
    const creatorLowercase = creator.toLowerCase();

    // NOTE: we choose to ignore the fact that this account could register
    //       multiple songs at once (maybe many tabs?)
    if (creatorLowercase === accountLowercase && resourceType === SONG_RESOURCE_TYPE) {
      // NOTE: In dev. environment you are expected to take this requestId
      // and fulfill VRF request manually via the hardhat task.
      // In mainnet or testnet the requests will be fulfilled by Chainlink.
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SONG] Request ID: ${requestId.toHexString()}`);
      }

      setProgress(75);
    }
  };

  const pinFileToIpfs = async (title, file) => {
    const { REACT_APP_PIN_FUNCTION_URL } = process.env;

    const formData = new FormData();
    formData.set('title', title);
    formData.set('file', file);

    const response = await axios.post(REACT_APP_PIN_FUNCTION_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data.Hash;
  };

  const uploadSongToIpfs = async (title, file) => {
    try {
      const songIpfsHash = await pinFileToIpfs(title, file);
      setProgress(50);
      return songIpfsHash;
    } catch (e) {
      console.error(e);
      setMessage({
        text: 'Song registration failed! Could not upload to IPFS',
        type: 'danger'
      });
    }
  };

  const onSubmit = async (data) => {
    platform.on('RegistrationCreated', handleRegistrationCreatedEvent);
    try {

      platform.on('ResourceRegistered', handleResourceRegisteredEvent);

      const ipfsHash = await uploadSongToIpfs(data.songTitle, data.songFile[0]);

      // TODO: figure out the actual gas needed here
      await platform.registerSong(ipfsHash, { gasLimit: 500000 });
    } catch (e) {
      setMessage({
        text: 'Could not register the song!',
        type: 'danger'
      });

      setProgress(0);
      console.error(e);
    }
  }
  const onError = error => console.error(error);

  return <>
    <Container className="my-4">
      <h1 className="mb-3">Register a song</h1>
      <Form
        onSubmit={handleSubmit(onSubmit, onError)}
        encType="multipart/form-data"
        ref={newForm}
      >
        <Form.Group className="mb-3" controlId="formSongTitle">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            {...register("songTitle", { required: "must enter song title" })}
          />
          {errors.songTitle && (
            <Form.Text className="text-danger">
              {errors.songTitle.message}
            </Form.Text>
          )}
        </Form.Group>

        <Form.Group className="mb-3" controlId="formSongFile">
          <Form.Label>Audio file</Form.Label>
          <Form.Control
            type="file"
            {...register("songFile", { required: "must upload song audio file" })}
          />
          {errors.songFile && (
            <Form.Text className="text-danger">
              {errors.songFile.message}
            </Form.Text>
          )}
        </Form.Group>

        <Button variant="primary" type="submit" disabled={progress > 0 || !isDirty || !isValid} >
          Register
        </Button>
        { progress > 0 && progress < 100 && <ProgressBar className="mt-3" animated now={progress} /> }
      </Form>
    </Container>
  </>;
};

export default NewArtistSong;
