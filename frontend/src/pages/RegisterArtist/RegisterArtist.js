import React, { useState } from 'react';
import {
  Container,
  Form,
  Button,
  ProgressBar
} from 'react-bootstrap';

import { useForm } from 'react-hook-form';
import { useOutletContext } from 'react-router-dom';


const RegisterArtist = () => {
  const { account, platform } = useOutletContext();
  const [progress, setProgress] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { isDirty, isValid, errors }
  } = useForm({
    mode: "onChange"
  });

  const handleResourceRegisteredEvent = (event) => {
    console.log({event});
    setProgress(100);
  }

  const onSubmit = async data => {
    setProgress(25);
    console.log(await platform.artistIds(account));
    try {
      await platform.registerArtist(data.artistName, { gasLimit: 100000 });
      setProgress(50);
      platform.on('ResourceRegistered', handleResourceRegisteredEvent);
    } catch (e) {
      alert('Could not register artist!');
      setProgress(0);
      console.error(e);
    }
  }
  const onError = error => console.error(error);

  return <>
    <Container className="my-4">
      <h1 className="mb-3">Register as an artist</h1>
      <Form onSubmit={handleSubmit(onSubmit, onError)}>
        <Form.Group className="mb-3">
          <Form.Label>Account address</Form.Label>
          <Form.Control
            type="text"
            disabled={true}
            value={account || ''}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formArtistName">
          <Form.Label>Artist name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Artist name"
            {...register("artistName", { required: "must enter name" })}
          />
          {errors.artistName && (
            <Form.Text className="text-danger">
              {errors.artistName.message}
            </Form.Text>
          )}
        </Form.Group>

        <Button variant="primary" type="submit" disabled={progress > 0 || !isDirty || !isValid} >
          Register
        </Button>
        { progress > 0 && <ProgressBar animated now={progress}  /> }
      </Form>
    </Container>
  </>;
};

export default RegisterArtist;

