import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';

import { useQuery, gql } from '@apollo/client';

const GET_DATA = gql`
  query {
    artists {
      account
      title
    }
  }
`;

const Artists = () => {
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_DATA);
  const [ artists, setArtists ] = useState([]);

  useEffect(() => {
    if (data) {
      setArtists(data.artists);
    }
  }, [setArtists, data]);

  const navigateToArtistSongs = (artistAddress) => {
    navigate(`/artists/${artistAddress}/songs`);
  }

  if (!data) {
    return <div className='mx-auto mt-3'><p>No artists yet.</p><p>Stick around!</p></div>;
  }

  return <ListGroup variant='flush'>
    {
      artists.map((artist) => (
        <ListGroup.Item as='li' variant='dark' key={777} className='d-flex align-items-center justify-content-around' >
          <Link to={`/artists/${artist.account}/songs`}>
            { artist.title }
          </Link>
        </ListGroup.Item>)
      )
    }
  </ListGroup>;
};

export default Artists;

