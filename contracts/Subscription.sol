// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract Subscription is Ownable {
  mapping(address account => uint256 expirationTimestamp) public subscriptions;
  mapping(uint256 price => uint256 interval) public subscriptionPlanIntervals;

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

  error SubscriptionAlreadyCreated();
  error SubscriptionNotCreated();
  error ValueMustMatchOneOfThePlans();

  // ++++++++++++++++ External functions +++++++++++++++++
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
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // ++++++++++++++++ External View/Pure functions +++++++++++++++++++
  function isActiveSubscriber(address account) external view returns (bool) {
    return subscriptions[account] >= block.timestamp;
  }
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // +++++++++++++++ Validation functions ++++++++++++++++++
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

  // +++++++++++++++++++++++++++++++++++++++++++++++++++++
}
