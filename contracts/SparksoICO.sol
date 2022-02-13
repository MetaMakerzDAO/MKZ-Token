// contracts/SparksoIco.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TokenVesting.sol";

/**
 * @title Sparkso ICO contract
 */
 contract SparksoICO is Ownable, ReentrancyGuard, TokenVesting {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    // Address where funds are collected
    address payable private _wallet;

    // Stages of the ICO
    uint8 public constant STAGES = 4;

    // Manage the current stage of the ICO
    uint8 private _currentStage;

    // Bonus is a percentage of your token purchased in addition to your given tokens.
    // If bonus is 30% you will have : number_tokens + number_tokens * (30 / 100) 
    // Bonus is different for each stages 
    uint8[] private _bonus = [20, 15, 10, 0];

    // Ico total supply
    uint256 public constant ICO_SUPPLY = 160679400;

    // Rate is different for each stages.
    // The rate is the conversion between wei and the smallest and indivisible token unit.
    // If the token has 18 decimals, rate of one will be equivalent to: 1 TOKEN * 10 ^ 18 = 1 ETH * 10 ^ 18 
    uint256[] private _rate = [64866, 43244, 32433, 28829]; 
    
    // Wei goal is different for each stages
    uint256[] private _weiGoals = [217, 813, 1301, 1708];

    // Opening ICO time
    uint256 private _openingTime;
    
    // Closing ICO time
    uint256 private _closingTime;


    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     * @param cliff cliff tokens or not
     * @param vesting vesting tokens or not
     */
    event TokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount, bool cliff, bool vesting);

    constructor (address payable wallet_, address token_) TokenVesting(token_) {
        require(wallet_ != address(0x0), "Sparkso ICO: wallet is the zero address");
        require(token_ != address(0x0), "Sparkso ICO: token contract is the zero address");
        
        _wallet = wallet_; 
    }   

    /**
     * @return the current stage of the ICO.
     */
    function currentStage() 
    external
    view
    returns (uint8) {
        return _currentStage;
    }

    /**
     * @return the number of token units a buyer gets per wei for each stages.
     */
    function rate() 
    external
    view
    returns (uint256[]) {
        return _rate;
    }

    /**
     * @return the number of tokens allocated for each stages 
     */
    function weiGoals() 
    external
    view
    returns (uint256[]) {
        return _weiGoals;
    }

    /**
     * @return the bonus for each stages
     */
    function bonus() 
    external
    view
    returns (uint8[]) {
        return _bonus;
    }

    /**
     * @return the ICO openingTime
     */
    function openingTime()
    external
    view
    returns (uint256) {
        return _openingTime;
    }

    /**
     * @return the ICO closingTime
     */
    function closingTime() 
    external
    view
    returns (uint256) {
        return _closingTime;
    }
    
 }