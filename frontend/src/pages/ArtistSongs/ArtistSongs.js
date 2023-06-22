import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

const ArtistSongsList = ({ songs }) => {
  return <ul>
    { Object.keys(songs).map((songID) => <li key={songID}>{songs[songID]}</li>) }
  </ul>;
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

