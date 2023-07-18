import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';

import { PlayFill, PauseFill } from 'react-bootstrap-icons';

const { REACT_APP_IPFS_API_URL } = process.env;
const TRACKING_INTERVAL_MILLISECONDS = 10000; // 10 seconds

const PlayControls = ({songId, playing, subscriber, handleSongPlay}) => {
  if (playing) {
    return <PauseFill onClick={() => handleSongPlay(songId, subscriber)}></PauseFill>;
  }

  return <PlayFill onClick={() => handleSongPlay(songId, subscriber)}></PlayFill>;
};

const Song = ({song, playable, subscriber, handleSongPlay}) => {
  return <ListGroup.Item as='li' variant='dark' key={song.id} className='d-flex align-items-center justify-content-around' >
        {song.title}
        {
          playable &&
            <PlayControls songId={song.id} playing={song.playing} subscriber={subscriber} handleSongPlay={handleSongPlay} />
        }
      </ListGroup.Item>;
};

const ArtistSongsList = ({ songs, accountIsArtist, subscriber, handleSongPlay }) => {
  const songListItems = () => {
    return songs.map((song) => {
      const playable = (subscriber || accountIsArtist());
      return <Song key={song.id} song={song} playable={playable} subscriber={subscriber} handleSongPlay={handleSongPlay} />;
    });
  };

  return <ListGroup variant='flush'>{songListItems()}</ListGroup>;
};

const ArtistSongs = () => {
  const { platform, account, subscriber } = useOutletContext();
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const { artistAddress } = useParams();
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [playbackEndedSongId, setPlaybackEndedSongId] = useState(null);

  const sendTrackingEvent = useCallback((song) => {
    const signature = localStorage.getItem('subscriberSignature');
    const progressSeconds = song.audio.currentTime;

    console.log(`Going to update played minutes`);
    console.log({songId: song.id, artistAddress, progressSeconds, subscriber, signature });
  }, [subscriber]);

  // For both play and pause/stop events
  const handleSongPlay = useCallback((songId, subscriber) => {
    let song = songs.find((sng) => sng.id === songId);

    if (song.playing) {
      song.playing = false;
      song.audio.pause();

      if (subscriber) {
        // Sending the last event before pausing audio
        sendTrackingEvent(song);
        clearInterval(trackingInterval);
      }
    } else {
      if (subscriber) {
        setTrackingInterval(
          setInterval(() => {
            sendTrackingEvent(song);
          }, TRACKING_INTERVAL_MILLISECONDS)
        );
      }

      song.playing = true;
      song.audio.play();
    }

    const otherSongs = songs.filter((sng) => sng.id !== songId);
    const newSongs = [ ...otherSongs, song ].sort((a, b) => a.order - b.order);
    setSongs(newSongs);
  }, [songs, setSongs, setTrackingInterval, trackingInterval, sendTrackingEvent]);

  const handleSongEnded = (songId) => {
    setPlaybackEndedSongId(songId);
  };

  useEffect(() => {
    if (playbackEndedSongId === null) return;

    handleSongPlay(playbackEndedSongId, subscriber);

    setPlaybackEndedSongId(null);
  }, [playbackEndedSongId, handleSongPlay, subscriber, setPlaybackEndedSongId]);

  useEffect(() => {
    (async () => {
      const songsCount = await platform.getArtistSongsCount(artistAddress);
      let songsData = [];

      for(let i = 0; i < songsCount; i++) {
        const id = await platform.getArtistSongId(artistAddress, i);
        const uri = await platform.getSongUri(id);
        const metadata = (await axios.get(`${REACT_APP_IPFS_API_URL}${uri}`)).data || {};
        const audio = new Audio(`${REACT_APP_IPFS_API_URL}${metadata.cid}`);
        audio.addEventListener('ended', () => handleSongEnded(id.toString()));
        songsData.push({ order: i, id: id.toString(), uri, title: metadata.title, audio, playing: false });
      }

      setSongs(songsData);
    })();
  }, [platform, setSongs, artistAddress]);

  const navigateToNewSong = () => {
    navigate(`/artists/${artistAddress}/songs/new`);
  }

  const accountIsArtist = () => {
    return account === artistAddress.toLowerCase();
  };

  return <>
    { accountIsArtist  && <Button onClick={() => navigateToNewSong()}>Add a song</Button> }
    <ArtistSongsList
       songs={songs}
       accountIsArtist={accountIsArtist}
       subscriber={subscriber}
       handleSongPlay={handleSongPlay}
    />
  </>;
};

export default ArtistSongs;

