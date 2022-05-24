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
    uint256 delay = 0;
    uint256 countAdresses = 0;

    constructor(
        address systemAddress_,
        address payable wallet_,
        address token_
    )
        SparksoICO(
            systemAddress_,
            wallet_,
            token_,
            0xAB594600376Ec9fD91F8e885dADF0CE036862dE0,
            0xAB594600376Ec9fD91F8e885dADF0CE036862dE0
        )
    {}

    function setCurrentTime(uint256 _time) external {
        mockTime = _time;
    }

    function setCountAddresses(uint256 _count) external {
        countAdresses = _count;
    }

    function changeMATICEUR(uint256 weiAmount)
        public
        virtual
        override
        returns (uint256)
    {
        // Oracles Simulation
        // Data date from the 25th april on Polygon Mainnet
        int256 MATICUSD = 135800000; // MATIC/USD chainlink simulation
        int256 EURUSD = 107380000; // EUR/USD chainlink simulation

        return (weiAmount * uint256(MATICUSD)) / (uint256(EURUSD) * 10**18);
    }

    function _delayICO(uint256 _time) internal virtual override {
        delay = delay + _time;
    }

    function _getCurrentTime()
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return mockTime - delay;
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

    /**
     * @dev Check if the transaction EUR is lower or equal to the maximum defined.
     * @param _eurAmount Value in EUR involved in the purchase
     */
    function _checkMaxEUR(uint256 _eurAmount) 
        internal 
        override
        pure 
        virtual
    {
        // ONLY FOR TEST PURPOSES
        require(
            _eurAmount <= 150000000000,
            "Sparkso ICO: Amount need to be inferior or equal to 15 000 EUR."
        );
    }
}
