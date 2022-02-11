// contracts/SparksoIco.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TokenVesting.sol";

/*
 * @title Sparkso ICO contract
 */
 contract SparksoICO is AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct ICO{
        bool pause; 
        uint8 phase;
        
    }
     // address of the ERC20 token
    IERC20 immutable private _token;
     
 }