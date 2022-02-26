// contracts/MockSparksoICO.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

import "./SparksoICO.sol";

/**
 * @title MockSparksoICO
 * WARNING: use only for testing and debugging purpose
 */
contract MockSparksoICO is SparksoICO {
    uint256 mockTime = 0;
    uint256 countAdresses = 0;

    constructor(
        address systemAddress_,
        address payable wallet_,
        address token_
    ) SparksoICO(systemAddress_, wallet_, token_) {}

    function setCurrentTime(uint256 _time) external {
        mockTime = _time;
    }

    function setCountAddresses(uint256 _count) external {
        countAdresses = _count;
    }

    function getCurrentTime() internal view virtual override returns (uint256) {
        return mockTime;
    }

    function _getCountAddresses()
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return countAdresses;
    }
}
