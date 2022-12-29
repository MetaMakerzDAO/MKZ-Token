// contracts/TokenMKZ.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title MKZ ERC20 Token
 */
contract MKZ is ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    //Total supply
    uint256 private _totalSupply;

    // -----------------------------------------
    // Public interface
    // -----------------------------------------

    /**
     * @dev Initialize proxy contract
     * @param wallet_ address where MKZ will be mint
     */
    function initialize(address payable wallet_) public initializer {
        require(
            wallet_ != address(0),
            "Sparkso token: wallet is the zero address"
        );
        _totalSupply = 240000000;

        __ERC20_init( "MKZ", "MetaMakerz");
        __Ownable_init();
        _mint(wallet_, (_totalSupply * 10**18));
    }

    /**
     * @dev requirement by [OpenZeppelin implementation](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable-_authorizeUpgrade-address-)
     */
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
