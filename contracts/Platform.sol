// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./ResourceRegistration.sol";
import "./Subscription.sol";

contract Platform is Ownable, ReentrancyGuard, ResourceRegistration, Subscription {
  struct ArtistUpdate {
    address artist;
    uint256 playedMinutes;
  }

  event ReporterAdded(address indexed account);
  event ReporterRemoved(address indexed account);

  event PlayedMinutesUpdated();
  event RewardForPlayedMinutesChanged(uint256 indexed reward);
  event RewardsClaimed(address indexed artist, uint256 indexed rewards);

  error AccountIsReporter();
  error AccountNotReporter();
  error NoUpdatesGiven();
  error NoClaimableRewards();
  error UpdateInvalid(address artist, uint256 playedMinutes);

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

  function artistUnclaimedAmount(address artist) external view returns (uint256) {
    return _artistUnclaimedAmount(artistPlayedMinutes[artist], artistClaimedMinutes[artist]);
  }
}
