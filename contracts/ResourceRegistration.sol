// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { VRFCoordinatorV2Interface } from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract ResourceRegistration is VRFConsumerBaseV2 {
  enum ResourceType {
    Unknown,
    Artist,
    Song
  }

  struct Registration {
    bool completed;

    // Defaults to unknown,
    // which is also how we can tell if registration has been created
    ResourceType resourceType;

    address account;
    uint256 generatedId;
    // Data is either artist name or song uri
    string data;
  }

  mapping(uint256 id => string name) public artistNames;
  mapping(address account => uint256 id) public artistIds;

  mapping(uint256 id => string uri) private songURIs;
  mapping(address account => uint256[] ids) private songIds;
  mapping(address account => uint256 count) private songsCount;

  // Requests are used for generating IDs (both for an artists and a song)
  mapping(uint256 requestId => Registration registration) private registrations;

  VRFCoordinatorV2Interface private immutable vrfCoordinator;
  uint64 private immutable subscriptionId;
  bytes32 private immutable keyHash;

  // TODO: make sure that this makes sense after finalizing the `fulfillRandomWords()` function
  uint32 private constant CALLBACK_GAS_LIMIT = 200000;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;

  event RegistrationCreated(
    address indexed account,
    ResourceType indexed resourceType,
    uint256 indexed requestId
  );

  // Data is either artist name or song uri
  event ResourceRegistered(
    address indexed account,
    ResourceType indexed resourceType,
    uint256 indexed id,
    string data
  );

  error ArtistNameRequired();
  error ArtistAlreadyRegistered();
  error SongUriRequired();
  error NotARegisteredArtist();

  constructor(
    address _vrfCoordinator,
    uint64 _subscriptionId,
    bytes32 _keyHash
  ) VRFConsumerBaseV2(_vrfCoordinator) {
    vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
    subscriptionId = _subscriptionId;
    keyHash = _keyHash;
  }

  function registerArtist(string calldata name) external {
    _requireArtistName(name);
    _requireNotRegistered();

    _createResourceRegistration(ResourceType.Artist, name);
  }

  function registerSong(string calldata uri) external {
    _requireUri(uri);
    _requireRegisteredArtist();

    _createResourceRegistration(ResourceType.Song, uri);
  }

  // ++++++++++++++++View/Pure functions +++++++++++++++
  function getArtistId(address account) external view returns (uint256) {
    return artistIds[account];
  }

  function getArtistName(address account) external view returns (string memory) {
    return artistNames[artistIds[account]];
  }

  function getSongUri(uint256 songId) external view returns (string memory) {
    return songURIs[songId];
  }

  function getArtistSongId(address artist, uint256 songIndex) external view returns (uint256) {
    return songIds[artist][songIndex];
  }

  function isArtistSong(address artist, uint256 songId) external view returns (bool) {
    uint256 artistSongsCount = songsCount[artist];
    for(uint256 i; i < artistSongsCount; i++) {
      if (songIds[artist][i] == songId) {
        return true;
      }
    }
    return false;
  }

  function getArtistSongsCount(address artist) external view returns (uint256) {
    return songsCount[artist];
  }

 // +++++++++++++++++++++++++++++++++++++++++++++++++

  function _completeArtistRegistration(Registration memory registration) internal {
    artistNames[registration.generatedId] = registration.data;
    artistIds[registration.account] = registration.generatedId;

    emit ResourceRegistered(
      registration.account,
      ResourceType.Artist,
      registration.generatedId,
      registration.data
    );
  }

  function _completeSongRegistration(Registration memory registration) internal {
    songURIs[registration.generatedId] = registration.data;
    songIds[registration.account].push(registration.generatedId);
    songsCount[registration.account]++;

    emit ResourceRegistered(
      registration.account,
      ResourceType.Song,
      registration.generatedId,
      registration.data
    );
  }

  function fulfillRandomWords(
    uint256 _requestId,
    uint256[] memory _randomWords
  ) internal override {
    Registration storage registration = registrations[_requestId];
    require(!registration.completed);

    registration.completed = true;

    registration.generatedId = _randomWords[0];

    if (registration.resourceType == ResourceType.Artist) {
      _completeArtistRegistration(registration);
    } else if (registration.resourceType == ResourceType.Song) {
      _completeSongRegistration(registration);
    } else {
      revert("Unsupported registration");
    }
  }

  function _createResourceRegistration(
    ResourceType resourceType,
    string calldata data
  ) internal {
    // NOTE: This will revert if subscription is not set and funded.
    uint256 requestId = vrfCoordinator.requestRandomWords(
        keyHash,
        subscriptionId,
        REQUEST_CONFIRMATIONS,
        CALLBACK_GAS_LIMIT,
        NUM_WORDS
    );

    emit RegistrationCreated(msg.sender, resourceType, requestId);

    Registration storage registration = registrations[requestId];

    registration.resourceType = resourceType;
    registration.account = msg.sender;
    registration.data = data;
  }


  function _requireNotRegistered() internal view {
    if (artistIds[msg.sender] > 0) {
      revert ArtistAlreadyRegistered();
    }
  }

  function _requireRegisteredArtist() internal view {
    if (artistIds[msg.sender] == 0) {
      revert NotARegisteredArtist();
    }
  }

  function _requireArtistName(string calldata name) internal pure {
    if (bytes(name).length == 0) {
      revert ArtistNameRequired();
    }
  }

  function _requireUri(string calldata uri) internal pure {
    if (bytes(uri).length == 0) {
      revert SongUriRequired();
    }
  }

}
