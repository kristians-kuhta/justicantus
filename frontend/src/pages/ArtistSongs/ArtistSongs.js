import React from 'react';

export const artistSongsLoader = ({ params }) => {
  console.log({paramsId: params.id});
  // TODO: use The graph protocol and client library to fetch songs for this
  //       artist (for each of the songs, unwrap the JSON object,
  //       but leave the song file as IPFS hash)
  return [];
}

const ArtistSongs = () => {
  // if (
  // return
  return <p>Artist songs will go here</p>;
};

export default ArtistSongs;

