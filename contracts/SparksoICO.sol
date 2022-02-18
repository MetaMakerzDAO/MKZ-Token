// contracts/SparksoIco.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./TokenVesting.sol";

/**
 * @title Sparkso ICO contract
 */
contract SparksoICO is TokenVesting {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using SafeERC20 for IERC20;

    // address of the ERC20 token
    IERC20 private immutable _token;

    // Address where funds are collected
    address payable private _wallet;

    // Bonus is a percentage of your token purchased in addition to your given tokens.
    // If bonus is 30% you will have : number_tokens + number_tokens * (30 / 100)
    // Bonus is different for each stages
    uint8[4] private _bonus;

    // Stages of the ICO
    uint8 public constant STAGES = 4;
    
    // Manage the current stage of the ICO
    uint8 private _currentStage = 0;

    // Count first 500 purchases
    uint16 private _countAdresses = 0;

    // Delay the ICO _colsingTime 
    uint256 private _delay = 0;

    // Total amount wei raised
    uint256 private _weiRaised = 0;

    // Ico total supply
    uint256 public constant ICO_SUPPLY = 160679400;

    // Rate is different for each stages.
    // The rate is the conversion between wei and the smallest and indivisible token unit.
    // If the token has 18 decimals, rate of one will be equivalent to: 1 TOKEN * 10 ^ 18 = 1 ETH * 10 ^ 18
    uint256[4] private _rate;

    // Wei goal is different for each stages
    uint256[4] private _weiGoals;

    // Wei goal base on _weiGoals
    uint256 private _weiGoal;

    // Wei mini to invest (used only for the first stage)
    uint256[2] private _minWei;

    // Cliff values for each stages
    uint256[4] private _cliffValues;

    // Vesting value for stage 2,3 and 4 (cf. Whitepaper)
    uint256 private _vestingValue;

    // Vesting slice period
    uint256 private _slicePeriod;

    // Opening ICO time
    uint256 private _openingTime;

    // Closing ICO time
    uint256 private _closingTime;

    // First 500 addresses purchasing tokens
    mapping(address => bool) private _firstAddresses;

    // Purchased cliff or not
    bool private _cliff;

    // Purchased vest or not
    bool private _vest;

    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     * @param cliff cliff tokens or not
     * @param vesting vesting tokens or not
     */
    event TokensPurchase(
        address indexed purchaser,
        address indexed beneficiary,
        uint256 value,
        uint256 amount,
        bool cliff,
        bool vesting
    );

    constructor(address payable wallet_, address token_) TokenVesting(token_) {
        require(
            wallet_ != address(0x0),
            "Sparkso ICO: wallet is the zero address"
        );
        require(
            token_ != address(0x0),
            "Sparkso ICO: token contract is the zero address"
        );

        _wallet = wallet_;
        _token = IERC20(token_);

        // Input values Rate and Bonus
        _bonus = [20, 15, 10, 0];
        _rate = [64866, 43244, 32433, 28829];

        // Input values in ether multiply by 10^18 to convert into wei
        _weiGoals = [
            217 * 10**18, // Stage 1 wei goal (ETH)
            813 * 10**18, // Stage 2 wei goal (ETH)
            1301 * 10**18, // Stage 3 wei goal (ETH)
            1708 * 10**18
        ]; // Stage 4 wei goal (ETH)
        _minWei = [
            0.19 * 10**18, // Stage 1 first 500 people
            0.08 * 10**18
        ];
        
        // Calculate _weiGoal
        for (uint8 i = 0; i < STAGES; i++) _weiGoal += _weiGoals[i];

        // 30 days into seconds
        uint256 monthSecond = 30 * 24 * 3600;

        // Input values in seconds corresponding to cliff for each stages
        _cliffValues = [0, 0, 1 * monthSecond, 2 * monthSecond];
        // Input value in seconds corresponding to vesting for each stages
        _vestingValue = 3 * monthSecond;
        // Input value in second corresponding to token time release slices
        _slicePeriod = 10 * 24 * 3600;

        // Input value timestamp in second of the opening ICO time
        _openingTime = 1646485200; // The 5th march 2022 
        _closingTime = _openingTime.add(monthSecond.mul(3));

        // Cliff is applied only for stage 3 and 4 (cf. Whitepaper)
        _cliff = false;
        // Vesting is applied only for stage 2, 3 and 4 (cf. Whitepaper)
        _vest = false;
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     */
    fallback() 
        external 
        payable 
        virtual
        override 
    {
        buyTokens(msg.sender);
    }

    // -----------------------------------------
    // External interface
    // -----------------------------------------

    /**
     * @return the count of addresses
     */
    function countAdresses() 
        external 
        view
        returns (uint16)
    {
        return _countAdresses;
    }

    /**
     * @return the total amount wei raised.
     */
    function weiRaised() 
        external 
        view 
        returns (uint256) 
    {
        return _weiRaised;
    }

    /**
     * @return the current stage of the ICO.
     */
    function currentStage() 
        external 
        view 
        returns (uint8) 
    {
        return _currentStage;
    }

    /**
     * @return the number of token units a buyer gets per wei for each stages.
     */
    function rate() 
        external 
        view 
        returns (uint256[4] memory) 
    {
        return _rate;
    }

    /**
     * @return the number of tokens allocated for each stages
     */
    function weiGoals() 
        external 
        view 
        returns (uint256[4] memory) 
    {
        return _weiGoals;
    }

    /**
     * @return the bonus for each stages
     */
    function bonus() 
        external 
        view 
        returns (uint8[4] memory) 
    {
        return _bonus;
    }

    /**
     * @return the ICO openingTime
     */
    function openingTime() 
        external 
        view 
        returns (uint256) 
    {
        return _openingTime;
    }

    /**
     * @return the ICO closingTime
     */
    function closingTime() 
        external 
        view 
        returns (uint256) 
    {
        return _closingTime.add(_delay);
    }

    /**
     * @dev low level token purchase
     * @param _beneficiary Address performing the token purchase
     */
    function buyTokens(address _beneficiary) 
        public 
        payable 
    {
        uint256 weiAmount = msg.value;
        _preValidatePurchase(_beneficiary, weiAmount);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(weiAmount);

        // update state
        _weiRaised = _weiRaised.add(weiAmount);

        _processPurchase(_beneficiary, tokens);
        emit TokensPurchase(
            msg.sender,
            _beneficiary,
            weiAmount,
            tokens,
            _cliff,
            _vest
        );

        _updatePurchasingState();

        _forwardFunds();
        _postValidatePurchase(_beneficiary);
    }

    /**
     * @dev Delay the ICO _closingTime
     * @param _timeToDelay Add a time delay in seconds
     */
    function delayICO(uint256 _timeToDelay) 
        public 
        nonReentrant
        onlyOwner 
    {
        require(
            _timeToDelay > 0,
            "Sparkso ICO: the delay need to be superior to 0."
        );
        // Convert the delay time into seconds and add to the current delay
        _delay = _delay.add(_timeToDelay.mul(1000));
    }

    // -----------------------------------------
    // Internal interface
    // -----------------------------------------

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() 
        internal 
    {
        _wallet.transfer(msg.value);
    }

    /**
     * @dev Validation of an executed purchase.
     * @param _beneficiary Address performing the token purchase
     */
    function _postValidatePurchase(address _beneficiary)
        internal
    {
        // Add address if in the 500 first buyers
        if (_getCountAddresses() < 500) {
            _firstAddresses[_beneficiary] = true;
            _countAdresses++;
        }
    }

    /**
     * @dev Source of tokens.
     * @param _beneficiary Address performing the token purchase
     * @param _tokenAmount Number of tokens to be emitted
     */
    function _deliverTokens(address _beneficiary, uint256 _tokenAmount)
        internal
    {
        uint256 vestingValue = _currentStage == 0 ? 1 : _vestingValue;
        uint256 slicePeriod = _currentStage == 0 ? 1 : _slicePeriod;

        createVestingSchedule(
            _beneficiary,
            _closingTime,
            _cliffValues[_currentStage],
            vestingValue,
            slicePeriod,
            false,
            _tokenAmount
        );
    }

    /**
     * @dev Executed when a purchase has been validated and is ready to be executed. Not necessarily emits/sends tokens.
     * @param _beneficiary Address receiving the tokens
     * @param _tokenAmount Number of tokens to be purchased
     */
    function _processPurchase(address _beneficiary, uint256 _tokenAmount)
        internal
    {
        _deliverTokens(_beneficiary, _tokenAmount);
    }

    /**
     * @dev Update current stage of the ICO
     */
    function _updatePurchasingState()
        internal
    {
        uint256 weiGoal = 0;
        for (uint8 i = 0; i < _currentStage; i++) weiGoal += _weiGoals[i];

        if (_weiRaised >= weiGoal && _currentStage < STAGES) {
            _currentStage++;
            // Cliff is applied only for stage 3 and 4 (cf. Whitepaper)
            _cliff = _currentStage >= 2 ? true : false;
            // Vesting is applied only for stage 2, 3 and 4 (cf. Whitepaper)
            _vest = _currentStage != 0 ? true : false;
        }
    }

    /**
     * @dev Calculate the number of tokens depending on current ICO stage with corresponding rate and bonus
     * @param _weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 _weiAmount)
        internal
        view
        returns (uint256)
    {
        uint256 rate_ = _rate[_currentStage];
        uint256 tokens = _weiAmount.mul(rate_);
        uint256 bonus_ = _getCountAddresses() > 500 ? tokens.mul(_bonus[_currentStage]) : tokens.mul(30);
        return tokens.add(bonus_.div(100));
    }

    /**
     * @return the number of people (within the 500 ones) who purchased tokens 
     */
    function _getCountAddresses()
        internal
        virtual
        view
        returns(uint256){
            return _countAdresses;
        }

    function getCurrentTime()
        internal
        override
        virtual
        view
        returns(uint256){
        return block.timestamp.sub(_delay);
    }

     /**
     * @dev Validation of an incoming purchase.
     * @param _beneficiary Address performing the token purchase
     * @param _weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount)
        internal
        view
    {
        require(
            _beneficiary != address(0),
            "Sparkso ICO: beneficiary address should be defined."
        );
        require(
            getCurrentTime() >= _openingTime,
            "Sparkso ICO: ICO didn't start."
        );
        require(
            getCurrentTime() <= _closingTime,
            "Sparkso ICO: ICO is now closed, times up."
        );
        require(
            _weiRaised < _weiGoal,
            "Sparkso ICO: ICO is now closed, all funds are raised."  
        );

        if (_currentStage > 0)
            require(
                _weiAmount >= 0,
                "Sparkso ICO: Amount need to be superior to 0."
            );
        else {
            // One transaction authorized for the 500 first per wallet
            require(
                (_getCountAddresses() < 500 && !_firstAddresses[_beneficiary]) || (_getCountAddresses() >= 500),
                "Sparkso ICO: One transaction per wallet for the 500 first."
            );
            // Minimum wei for the first 500 people else the second minimum wei
            uint256 minWei = _getCountAddresses() < 500 ? _minWei[0] : _minWei[1];
            require(
                _weiAmount >= minWei,
                "Sparkso ICO: Amount need to be superior to the minimum wei defined."
            );
        }
    }    
}