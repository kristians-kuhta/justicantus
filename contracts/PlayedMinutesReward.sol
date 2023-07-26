// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract PlayedMinutesReward is Ownable {
  event RewardForPlayedMinutesChanged(uint256 indexed reward);

  uint256 public rewardForPlayedMinute;

  constructor() {
    // Default value: approximately 0.01 eth / 30 days / 24 hours / 60 minutes
    rewardForPlayedMinute = 231481481481;

    emit RewardForPlayedMinutesChanged(rewardForPlayedMinute);
  }

  // +++++++++++++++++++ External functions +++++++++++++++++++
  function setRewardForPlayedMinute(uint256 reward) external onlyOwner {
    require(reward > 0);

    rewardForPlayedMinute = reward;

    emit RewardForPlayedMinutesChanged(rewardForPlayedMinute);
  }
  // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
}
