import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';

const ArtistSongsList = ({ songs }) => {
  const { REACT_APP_IPFS_API_URL } = process.env;
  const [ songsData, setSongsData ] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await Promise.all(Object.entries(songs).map(async ([songId, songURI]) => {
        return (await axios.get(`${REACT_APP_IPFS_API_URL}${songURI}`)).data;
      }));

      setSongsData(data);
    })();
  },[setSongsData, songs, REACT_APP_IPFS_API_URL]);

  const songListItems = () => {
    return songsData.map((song) => {
      return <ListGroup.Item as='li' variant='dark' key={song.cid} className='d-flex align-items-center justify-content-around' >
        {song.title}
        <audio controls>
          <source src={`${REACT_APP_IPFS_API_URL}${song.cid}`} />
          Your browser does not support the audio tag.
        </audio>
      </ListGroup.Item>;
    });
  };

  return <ListGroup variant='flush'>{songListItems()}</ListGroup>;
};

const ArtistSongs = () => {
  const { platform, account } = useOutletContext();
  const navigate = useNavigate();
  const [songs, setSongs] = useState({});
  const { artistAddress } = useParams();

  useEffect(() => {
    (async () => {
      const songsCount = await platform.getArtistSongsCount(artistAddress);
      let songsObject = {};

      for(let i = 0; i < songsCount; i++) {
        const songID = await platform.getArtistSongId(artistAddress, i);
        const songURI = await platform.getSongUri(songID);
        songsObject[songID] = songURI;
      }

      setSongs(songsObject);
    })();
  }, [platform, setSongs, artistAddress]);

  const navigateToNewSong = () => {
    navigate(`/artists/${artistAddress}/songs/new`);
  }

  return <>
    { account === artistAddress  && <Button onClick={() => navigateToNewSong()}>Add a song</Button> }
    <ArtistSongsList songs={songs} />
  </>;
};

export default ArtistSongs;

