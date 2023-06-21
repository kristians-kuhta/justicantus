import React from 'react';
import { useOutletContext, useNavigate, useLoaderData } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

export const artistSongsLoader = ({ params }) => {
  // TODO: use The graph protocol and client library to fetch songs for this
  //       artist (for each of the songs, unwrap the JSON object,
  //       but leave the song file as IPFS hash)
  return [];
}

const ArtistSongsList = ({artist, songs}) => {
  return <ul>
    { songs.forEach((song) => <li>song.title</li>) }
  </ul>;
};

const ArtistSongs = () => {
  const songs = useLoaderData();
  const { artist } = useOutletContext();
  const navigate = useNavigate();

  const navigateToNewSong = () => {
    navigate(`/artists/${artist.id.toHexString()}/songs/new`);
  }

  return <>
    { artist && <Button onClick={() => navigateToNewSong(artist)}>Add a song</Button> }
    <ArtistSongsList artist={artist} songs={songs} />
  </>;
};

export default ArtistSongs;

