// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./ResourceRegistration.sol";

contract Platform is Ownable, ReentrancyGuard, ResourceRegistration {
  struct ArtistUpdate {
    address artist;
    uint256 playedMinutes;
  }

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

  error SubscriptionAlreadyCreated();
  error SubscriptionNotCreated();
  error ValueMustMatchOneOfThePlans();
  error AccountIsReporter();
  error AccountNotReporter();
  error NoUpdatesGiven();
  error NoClaimableRewards();
  error UpdateInvalid(address artist, uint256 playedMinutes);

  // TODO: review which ones of these mappings need to be public
  mapping(address account => uint256 expirationTimestamp) public subscriptions;
  mapping(uint256 price => uint256 interval) public subscriptionPlanIntervals;

  mapping(address account => bool isReporter) private reporters;
  mapping(address artist => uint256 playedMinutes) public artistPlayedMinutes;
  mapping(address artist => uint256 claimedMinutes) public artistClaimedMinutes;

  uint256 public rewardForPlayedMinute;

  constructor(
    address _vrfCoordinator,
    uint64 _subscriptionId,
    bytes32 _keyHash
  ) ResourceRegistration(_vrfCoordinator, _subscriptionId, _keyHash) {
    // Default value: 0.1 eth / 30 days / 24 hours / 60 minutes
    rewardForPlayedMinute = 2314814814814;

    emit RewardForPlayedMinutesChanged(rewardForPlayedMinute);
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

  function _requireArtistHasUnclaimedRewards() internal view {
    uint256 playedMinutes = artistPlayedMinutes[msg.sender];
    uint256 claimedMinutes = artistClaimedMinutes[msg.sender];
    uint256 unclaimedMinutes = playedMinutes - claimedMinutes;

    if (unclaimedMinutes == 0) {
      revert NoClaimableRewards();
    }
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
    _requireRegisteredArtist();
    _requireArtistHasUnclaimedRewards();

    uint256 playedMinutes = artistPlayedMinutes[msg.sender];
    uint256 claimedMinutes = artistClaimedMinutes[msg.sender];

    uint256 unclaimedAmount = _artistUnclaimedAmount(playedMinutes, claimedMinutes);

    (bool success,) = payable(msg.sender).call{ value: unclaimedAmount }('');
    require(success);

    artistClaimedMinutes[msg.sender] = playedMinutes + claimedMinutes;

    emit RewardsClaimed(msg.sender, unclaimedAmount);
  }

  function isActiveSubscriber(address account) external view returns (bool) {
    return subscriptions[account] >= block.timestamp;
  }

  function artistUnclaimedAmount(address artist) external view returns (uint256) {
    return _artistUnclaimedAmount(artistPlayedMinutes[artist], artistClaimedMinutes[artist]);
  }
}
