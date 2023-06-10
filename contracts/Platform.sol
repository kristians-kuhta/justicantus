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

  error ArtistNameRequired();

  mapping(address account => Artist data) private artists;

  function _requireArtistName(string calldata name) internal view {
    if (bytes(name).length == 0) {
      revert ArtistNameRequired();
    }
  }

  function registerArtist(string calldata name) external {
    _requireArtistName(name);

    Artist storage artist = artists[msg.sender];
    artist.id = _generateArtistId();
    artist.name = name;

    emit ArtistRegistered(msg.sender, artist.id, name);
  }

  function getArtistId(address account) external view returns (uint256) {
    return artists[account].id;
  }

  function getArtistName(address account) external view returns (string memory) {
    return artists[account].name;
  }

  function _generateArtistId() internal pure returns (uint256) {
    //TODO: use chainlink oracles to get a unique artist ID here
    return 123;
  }
}
