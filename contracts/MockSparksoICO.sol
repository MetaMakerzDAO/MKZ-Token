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
    bool debug = true;

    constructor(
        address systemAddress_,
        address payable wallet_,
        address token_
    )
        SparksoICO(
            systemAddress_,
            wallet_,
            token_,
            0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada,
            0xAB594600376Ec9fD91F8e885dADF0CE036862dE0
        )
    {}

    function setCurrentTime(uint256 _time) onlyOwner external {
        mockTime = _time;
    }

    function setCountAddresses(uint256 _count) onlyOwner external {
        countAdresses = _count;
    }

    function setDebug(bool _debug) onlyOwner external {
        debug = _debug;
    }

    function changeMATICEUR(uint256 weiAmount)
        public
        virtual
        override
        returns (uint256)
    {
        // Oracles Simulation
        // Data date from the 25th april on Polygon Mainnet
        if (debug) {
            int256 MATICUSD = 135800000; // MATIC/USD chainlink simulation
            int256 EURUSD = 107380000; // EUR/USD chainlink simulation

            uint8 decEURUSD = 8;
            uint8 decMATICUSD = 8;

            // Return EUR with cent precision taking in account decimals variation if there is any
            if (decEURUSD == decMATICUSD)
                return (weiAmount * uint256(MATICUSD) * 100) / (uint256(EURUSD) * 10 ** 18);
            else if (decEURUSD < decMATICUSD)
                return ((weiAmount * uint256(MATICUSD) * 100) /
                    (uint256(EURUSD) * 10**(decMATICUSD - decEURUSD + 18)));
            else
                return ((weiAmount *
                    uint256(MATICUSD) *
                    100 *
                    10**(decEURUSD - decMATICUSD)) / (uint256(EURUSD) * 10 ** 18));
        } 
        else return super.changeMATICEUR(weiAmount);
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
    function _checkMaxEUR(uint256 _eurAmount) internal view virtual override {
        if (debug) {
            // ONLY FOR TEST PURPOSES
            require(
                _eurAmount <= 150000000000000000000000000000000,
                "Sparkso ICO: Amount need to be inferior or equal to 15 000 EUR."
            );
        } else super._checkMaxEUR(_eurAmount);
    }
}
