import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';

import { useQuery, gql } from '@apollo/client';

const ARTISTS_QUERY = gql`
  query {
    artists {
      account
      title
    }
  }
`;

const Artists = () => {
  const [artistsFound, setArtistsFound] = useState(null);

  // TODO: handle the case when `error` is present here
  const { loading, data } = useQuery(ARTISTS_QUERY);

  const handleSearch = async (evt) => {
    evt.preventDefault();

    const artistName = evt.target.querySelector('#artistName').value;

    const filteredArtists = data.artists.filter((artist) => {
      return artist.title.toLowerCase().includes(artistName.toLowerCase());
    });

    setArtistsFound(filteredArtists);
  };

  if (loading) {
    return <div className='mx-auto mt-3'><p>Loading artists...</p></div>;
  }

  if (!data) {
    return <div className='mx-auto mt-3'><p>No artists yet.</p><p>Stick around!</p></div>;
  }

  // NOTE: if search is performed we display the results, even when nothing is found
  const artists = artistsFound ? artistsFound : data.artists;

  // TODO: extract to separate components
  return <>
    <Form onSubmit={handleSearch}>
      <Form.Group className="mb-3" >
        <Form.Control
          type="text"
          placeholder="Artist name..."
          id="artistName"
        />
      </Form.Group>

      <Button variant="primary" type="submit" >
        Search
      </Button>
    </Form>
    <ListGroup variant='flush'>
      {
        artists.map((artist) => (
          <ListGroup.Item as='li' variant='dark' key={artist.account} className='d-flex align-items-center justify-content-around' >
            <Link to={`/artists/${artist.account}/songs`}>
              { artist.title }
            </Link>
          </ListGroup.Item>)
        )
      }
      { artistsFound && artistsFound.length === 0 && <p>Did not find matching artists! Try a different search phrase!</p> }

    </ListGroup>
  </>;
};

export default Artists;

