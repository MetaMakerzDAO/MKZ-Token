// contracts/SparksoToken.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Sparkso ERC20 Token
 */
contract Sparkso is ERC20 {
    //ERC20 symbol
    string public constant SYMBOL = "SPARKSO";
    
    //ERC20 name
    string public constant NAME = "Sparkso ICO token";
    
    //ERC20 decimals
    uint8 public constant DECIMALS = 18;
    
    //Total supply
    uint256 private _totalSupply = 420000000; 

    //Ico total supply
    uint256 public icoSupply = 160679400;

    //Ico mintable supply
    uint256 public mintableIcoSupply = 140700000; 

    //Ico bonus supply
    uint256 public bonusIcoSupply = icoSupply - mintableIcoSupply;

    //Wallet where all tokens are minted
    address public wallet;
    
    constructor(address wallet_) ERC20(NAME, SYMBOL) {
        wallet = wallet_;
        _mint(wallet_, _totalSupply * 10 ^ DECIMALS);
    }
}
