// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Platform is Ownable {
  struct Artist {
    uint256 id;
    string name;
  }

  event ArtistRegistered(
    address indexed account,
    uint256 indexed id,
    string indexed name
  );

  event SongRegistered(
    address indexed artist,
    uint256 indexed id,
    string indexed uri
  );

  error ArtistNameRequired();
  error SongUriRequired();
  error NotARegisteredArtist();

  mapping(address account => Artist data) private artists;

  mapping(uint256 id => string uri) private songURIs;
  mapping(address account => uint256[] ids) private songIds;
  mapping(address account => uint256 count) public songsCount;

  function _requireArtistName(string calldata name) internal view {
    if (bytes(name).length == 0) {
      revert ArtistNameRequired();
    }
  }

  function _requireUri(string calldata uri) internal view {
    if (bytes(uri).length == 0) {
      revert SongUriRequired();
    }
  }

  function _requireRegisteredArtist() internal view {
    if (artists[msg.sender].id == 0) {
      revert NotARegisteredArtist();
    }
  }

  function registerArtist(string calldata name) external {
    _requireArtistName(name);

    Artist storage artist = artists[msg.sender];
    artist.id = _generateArtistId();
    artist.name = name;

    emit ArtistRegistered(msg.sender, artist.id, name);
  }

  function registerSong(string calldata uri) external {
    _requireUri(uri);
    _requireRegisteredArtist();

    uint256 songId = _generateSongId();

    // Regenerate the song id if taken
    while (bytes(songURIs[songId]).length > 0) {
      songId = _generateSongId();
    }

    songURIs[songId] = uri;
    songIds[msg.sender].push(songId);
    songsCount[msg.sender]++;

    emit SongRegistered(msg.sender, songId, uri);
  }

  function getArtistId(address account) external view returns (uint256) {
    return artists[account].id;
  }

  function getArtistName(address account) external view returns (string memory) {
    return artists[account].name;
  }

  function getSongUri(uint256 songId) external view returns (string memory) {
    return songURIs[songId];
  }

  function getArtistSongId(address artist, uint256 songIndex) external view returns (uint256) {
    return songIds[artist][songIndex];
  }

  function getArtistSongsCount(address artist) external view returns (uint256) {
    return songsCount[artist];
  }

  function _generateArtistId() internal pure returns (uint256) {
    //TODO: use chainlink oracles to get a random artist ID here
    return 123;
  }

  function _generateSongId() internal pure returns (uint256) {
    //TODO: use chainlink oracles to get a random song ID here
    return 321;
  }
}
