// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract Platform is Ownable, VRFConsumerBaseV2, ReentrancyGuard {
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

  struct ArtistUpdate {
    address artist;
    uint256 playedMinutes;
  }

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

  event SubscriptionCreated(
    address indexed account,
    uint256 indexed expirationTimestamp,
    uint256 indexed timestampIncrease
  );

  event SubscriptionFunded(
    address indexed account,
    uint256 indexed expirationTimestamp,
    uint256 indexed timestampIncrease
  );

  event SubscriptionPlanAdded(uint256 indexed price, uint256 indexed timestampIncrease);

  event ReporterAdded(address indexed account);
  event ReporterRemoved(address indexed account);

  event PlayedMinutesUpdated();
  event RewardForPlayedMinutesChanged(uint256 indexed reward);
  event RewardsClaimed(address indexed artist, uint256 indexed rewards);

  error ArtistNameRequired();
  error ArtistAlreadyRegistered();
  error SongUriRequired();
  error NotARegisteredArtist();
  error SubscriptionAlreadyCreated();
  error SubscriptionNotCreated();
  error ValueMustMatchOneOfThePlans();
  error AccountIsReporter();
  error AccountNotReporter();
  error NoUpdatesGiven();
  error NoClaimableRewards();
  error UpdateInvalid(address artist, uint256 playedMinutes);

  // TODO: review which ones of these mappings need to be public
  mapping(uint256 id => string name) public artistNames;
  mapping(address account => uint256 id) public artistIds;
  mapping(address account => uint256 expirationTimestamp) public subscriptions;
  mapping(uint256 price => uint256 interval) public subscriptionPlanIntervals;

  mapping(uint256 id => string uri) private songURIs;
  mapping(address account => uint256[] ids) private songIds;
  mapping(address account => uint256 count) private songsCount;

  // Requests are used for generating IDs (both for an artists and a song)
  mapping(uint256 requestId => Registration registration) private registrations;

  mapping(address account => bool isReporter) private reporters;
  mapping(address artist => uint256 playedMinutes) public artistPlayedMinutes;
  mapping(address artist => uint256 claimedMinutes) public artistClaimedMinutes;

  uint256 public rewardForPlayedMinute;

  VRFCoordinatorV2Interface immutable vrfCoordinator;
  uint64 private immutable subscriptionId;
  bytes32 private immutable keyHash;

  // TODO: make sure that this makes sense after finalizing the `fulfillRandomWords()` function
  uint32 private constant CALLBACK_GAS_LIMIT = 200000;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;

  constructor(
    address _vrfCoordinator,
    uint64 _subscriptionId,
    bytes32 _keyHash
  ) VRFConsumerBaseV2(_vrfCoordinator) {
    vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
    subscriptionId = _subscriptionId;
    keyHash = _keyHash;

    // Default value: 0.1 eth / 30 days / 24 hours / 60 minutes
    rewardForPlayedMinute = 2314814814814;

    emit RewardForPlayedMinutesChanged(rewardForPlayedMinute);
  }

  function _requireArtistName(string calldata name) internal pure {
    if (bytes(name).length == 0) {
      revert ArtistNameRequired();
    }
  }

  function _requireNotRegistered() internal view {
    if (artistIds[msg.sender] > 0) {
      revert ArtistAlreadyRegistered();
    }
  }

  function _requireUri(string calldata uri) internal pure {
    if (bytes(uri).length == 0) {
      revert SongUriRequired();
    }
  }

  function _requireRegisteredArtist() internal view {
    if (artistIds[msg.sender] == 0) {
      revert NotARegisteredArtist();
    }
  }

  function _requireSubscriptionNotCreated() internal view {
    if (subscriptions[msg.sender] > 0) {
      revert SubscriptionAlreadyCreated();
    }
  }

  function _requireSubscriptionCreated() internal view {
    if (subscriptions[msg.sender] == 0) {
      revert SubscriptionNotCreated();
    }
  }

  function _requireValueMatchesOneOfThePlans(uint256 subscriptionInterval) internal pure {
    if (subscriptionInterval == 0) {
      revert ValueMustMatchOneOfThePlans();
    }
  }

  function _requireAccountIsReporter(address account) internal view {
    if (!reporters[account]) {
      revert AccountNotReporter();
    }
  }

  function _requireAccountNotReporter(address account) internal view {
    if (reporters[account]) {
      revert AccountIsReporter();
    }
  }

  function _requireValidUpdates(ArtistUpdate[] calldata updates) internal view {
    if (updates.length == 0) {
      revert NoUpdatesGiven();
    }

    for(uint256 i; i < updates.length; i++) {
      ArtistUpdate memory update = updates[i];

      if (artistIds[update.artist] == 0) {
        revert UpdateInvalid(update.artist, update.playedMinutes);
      }

      uint256 previousPlayedMinutes = artistPlayedMinutes[update.artist];

      if (previousPlayedMinutes >= update.playedMinutes) {
        revert UpdateInvalid(update.artist, update.playedMinutes);
      }
    }
  }

  function _requireArtist() internal view {
    if (artistIds[msg.sender] == 0) {
      revert NotARegisteredArtist();
    }
  }

  function _requireArtistHasUnclaimedRewards() internal view {
    uint256 playedMinutes = artistPlayedMinutes[msg.sender];
    uint256 claimedMinutes = artistClaimedMinutes[msg.sender];
    uint256 unclaimedMinutes = playedMinutes - claimedMinutes;

    if (unclaimedMinutes == 0) {
      revert NoClaimableRewards();
    }
  }

  function registerArtist(string calldata name) external {
    _requireArtistName(name);
    _requireNotRegistered();

    _createResourceRegistration(ResourceType.Artist, name);
  }

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

    // TODO: consider what to do if generated IDs clash.
    //       AFAIK the possibility is probably extremely low.
    registration.generatedId = _randomWords[0];

    if (registration.resourceType == ResourceType.Artist) {
      _completeArtistRegistration(registration);
    } else if (registration.resourceType == ResourceType.Song) {
      _completeSongRegistration(registration);
    } else {
      revert('Unsupported registration');
    }
  }

  function _createResourceRegistration(
    ResourceType resourceType,
    string calldata data
  ) internal {
    // Will revert if subscription is not set and funded.
    uint256 requestId = vrfCoordinator.requestRandomWords(
        keyHash,
        subscriptionId,
        REQUEST_CONFIRMATIONS,
        CALLBACK_GAS_LIMIT,
        NUM_WORDS
    );

    emit RegistrationCreated(msg.sender, resourceType, requestId);

    // TODO: Consider checking for existing requestIds.
    //       Failing to do this this could lead to overriding existing registrations.
    //       On the other hand the possibility that this would happen is probably extremely low.
    Registration storage registration = registrations[requestId];

    registration.resourceType = resourceType;
    registration.account = msg.sender;
    registration.data = data;
  }

  function registerSong(string calldata uri) external {
    _requireUri(uri);
    _requireRegisteredArtist();

    _createResourceRegistration(ResourceType.Song, uri);
  }

  function createSubscription() external payable {
    _requireSubscriptionNotCreated();

    uint256 timestampIncrease = subscriptionPlanIntervals[msg.value];
    _requireValueMatchesOneOfThePlans(timestampIncrease);

    uint256 expirationTimestamp = block.timestamp + timestampIncrease;
    subscriptions[msg.sender] = expirationTimestamp;

    emit SubscriptionCreated(msg.sender, expirationTimestamp, timestampIncrease);
  }

  function fundSubscription() external payable {
    _requireSubscriptionCreated();

    uint256 timestampIncrease = subscriptionPlanIntervals[msg.value];
    _requireValueMatchesOneOfThePlans(timestampIncrease);

    uint256 expirationTimestamp;
    uint256 subscriptionTimestamp = subscriptions[msg.sender];

    if (subscriptionTimestamp < block.timestamp) {
      expirationTimestamp = block.timestamp + timestampIncrease;
    } else {
      expirationTimestamp = subscriptionTimestamp + timestampIncrease;
    }

    subscriptions[msg.sender] = expirationTimestamp;

    emit SubscriptionFunded(msg.sender, expirationTimestamp, timestampIncrease);
  }

  function setSubscriptionPlan(uint256 price, uint256 timestampIncrease) external onlyOwner {
    // NOTE: we assume the owner knows what he is doing, hence no error messages are provided
    require(price > 0);
    require(timestampIncrease > 0);

    subscriptionPlanIntervals[price] = timestampIncrease;

    emit SubscriptionPlanAdded(price, timestampIncrease);
  }

  function addReporter(address account) external onlyOwner {
    _requireAccountNotReporter(account);

    reporters[account] = true;

    emit ReporterAdded(account);
  }

  function removeReporter(address account) external onlyOwner {
    _requireAccountIsReporter(account);

    reporters[account] = false;

    emit ReporterRemoved(account);
  }

  function updatePlayedMinutes(ArtistUpdate[] calldata updates) external {
    _requireAccountIsReporter(msg.sender);
    _requireValidUpdates(updates);

    for(uint256 i; i < updates.length; i++) {
      ArtistUpdate memory update = updates[i];
      artistPlayedMinutes[update.artist] = update.playedMinutes;
    }

    emit PlayedMinutesUpdated();
  }

  function setRewardForPlayedMinute(uint256 reward) external onlyOwner {
    require(reward > 0);

    rewardForPlayedMinute = reward;

    emit RewardForPlayedMinutesChanged(rewardForPlayedMinute);
  }

  function _artistUnclaimedAmount(uint256 playedMinutes, uint256 claimedMinutes) internal view returns(uint256) {
    return rewardForPlayedMinute * (playedMinutes - claimedMinutes);
  }

  function claimRewards() external nonReentrant {
    _requireArtist();
    _requireArtistHasUnclaimedRewards();

    uint256 playedMinutes = artistPlayedMinutes[msg.sender];
    uint256 claimedMinutes = artistClaimedMinutes[msg.sender];

    uint256 unclaimedAmount = _artistUnclaimedAmount(playedMinutes, claimedMinutes);

    (bool success,) = payable(msg.sender).call{ value: unclaimedAmount }('');
    require(success);

    artistClaimedMinutes[msg.sender] = playedMinutes + claimedMinutes;

    emit RewardsClaimed(msg.sender, unclaimedAmount);
  }

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

  function isActiveSubscriber(address account) external view returns (bool) {
    return subscriptions[account] >= block.timestamp;
  }

  function artistUnclaimedAmount(address artist) external view returns (uint256) {
    return _artistUnclaimedAmount(artistPlayedMinutes[artist], artistClaimedMinutes[artist]);
  }
}
