// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract Reporter is Ownable {
  mapping(address account => bool isReporter) private reporters;

  event ReporterAdded(address indexed account);
  event ReporterRemoved(address indexed account);

  error AccountIsReporter();
  error AccountNotReporter();

  // ++++++++++++ External functions ++++++++++++++++++++++
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
  // ++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // ++++++++++++ Validation functions ++++++++++++++++++++++
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
  // ++++++++++++++++++++++++++++++++++++++++++++++++++++++

}
