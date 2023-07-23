// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./ResourceRegistration.sol";
import "./Subscription.sol";
import "./Reporter.sol";
import "./PlayedMinutesReward.sol";

contract Platform is Ownable, ReentrancyGuard, ResourceRegistration, Subscription,
  Reporter, PlayedMinutesReward {
  struct ArtistUpdate {
    address artist;
    uint256 playedMinutes;
  }

  event PlayedMinutesUpdated();
  event RewardsClaimed(address indexed artist, uint256 indexed rewards);

  error NoUpdatesGiven();
  error NoClaimableRewards();
  error UpdateInvalid(address artist, uint256 playedMinutes);

  mapping(address artist => uint256 playedMinutes) public artistPlayedMinutes;
  mapping(address artist => uint256 claimedMinutes) public artistClaimedMinutes;

  constructor(address _vrfCoordinator, uint64 _subscriptionId, bytes32 _keyHash)
    ResourceRegistration(_vrfCoordinator, _subscriptionId, _keyHash)
    PlayedMinutesReward() {}

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

  function updatePlayedMinutes(ArtistUpdate[] calldata updates) external {
    _requireAccountIsReporter(msg.sender);
    _requireValidUpdates(updates);

    for(uint256 i; i < updates.length; i++) {
      ArtistUpdate memory update = updates[i];
      artistPlayedMinutes[update.artist] = update.playedMinutes;
    }

    emit PlayedMinutesUpdated();
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
