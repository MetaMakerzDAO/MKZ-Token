// contracts/SparksoToken.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

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

    //Wallet where all tokens are minted
    address public wallet;
    
    constructor(address payable wallet_) ERC20(NAME, SYMBOL) {
        require(wallet_ != address(0), "Sparkso token: wallet is the zero address");
        wallet = wallet_;
        _mint(wallet_, _totalSupply * 10 ^ DECIMALS);
    }
}
