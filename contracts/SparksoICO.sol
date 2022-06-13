// contracts/SparksoIco.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./TokenVesting.sol";

/**
 * @title Sparkso ICO contract
 */
contract SparksoICO is TokenVesting, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using Counters for Counters.Counter;

    using Strings for address;

    // Price feed to convert MATIC to EUR
    AggregatorV3Interface internal _MATICUSD;
    AggregatorV3Interface internal _EURUSD;

    // address of the ERC20 token
    IERC20 private immutable _token;

    // Address where funds are collected
    address payable private _wallet;

    // Backend address use to sign and authentificate beneficiary release tokens
    address private _systemAddress;

    // EIP712 constant
    bytes32 private immutable _PERMIT_TYPEHASH =
        keccak256(
            "PermitRelease(address systemAddress,address beneficiary,uint256 nonce,uint256 deadline)"
        );

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

    // Total amount EUR raised
    // Unit : cent euros
    uint256 private _eurRaised = 0;

    // Rate is different for each stage.
    // The rate is the conversion between EUR and the smallest and indivisible token unit.
    // Unit : cent euros
    uint8[4] private _rate;

    // EUR goal is different for each stage
    // Unit : cent euros
    uint256[4] private _eurGoals;

    // EUR goal base on _weiGoals
    // Unit : cent euros
    uint256 private _totalEurGoal;

    // EUR mini to invest (used only for the first stage)
    // Unit : cent euros
    uint256[2] private _minEur;

    // Cliff values for each stage
    uint256[4] private _cliffValues;

    // Vesting value for each stage (cf. Whitepaper)
    uint256[4] private _vestingValue;

    // Vesting slice period
    uint256 private _slicePeriod;

    // Opening ICO time
    uint256 private _openingTime;

    // Closing ICO time
    uint256 private _closingTime;

    // First 500 addresses purchasing tokens
    mapping(address => uint8) private _firstAddresses;

    // Nonces use for signature
    mapping(address => Counters.Counter) private _nonces;

    // Purchased cliff or not
    bool private _cliff;

    // Purchased vest or not
    // bool private _vest;

    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param EURvalue converted EUR from wei value
     * @param amount amount of tokens purchased
     * @param cliff cliff tokens or not
     * @param vesting vesting tokens or not
     */
    event TokensPurchase(
        address indexed purchaser,
        address indexed beneficiary,
        uint256 value,
        uint256 EURvalue,
        uint256 amount,
        bool cliff,
        bool vesting
    );

    /**
     * @dev Reverts if the beneficiary has already purchase whithin the first 500.
     */
    modifier onlyOnePurchase(address _beneficiary) {
        require(
            _firstAddresses[_beneficiary] == 0,
            "Sparkso ICO: One transaction per wallet for the 500 first."
        );
        _;
    }

    /**
     * @dev Reverts if the purchase is not sign by the backend system wallet address
     */
    modifier onlyValidSignature(
        address beneficiary,
        uint256 deadline,
        bytes memory signature
    ) {
        // Must be inferior or equal to the deadline
        require(
            _getCurrentTime() <= deadline,
            "SparksoICO: expired deadline release permit signature."
        );

        bytes32 structHash = keccak256(
            abi.encode(
                _PERMIT_TYPEHASH,
                _systemAddress,
                beneficiary,
                _useNonce(beneficiary),
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);

        require(
            ECDSA.recover(hash, signature) == _systemAddress,
            "Sparkso ICO: Invalid release permit signature."
        );
        _;
    }

    constructor(
        address systemAddress_,
        address payable wallet_,
        address token_,
        address MATICUSD_,
        address EURUSD_
    ) TokenVesting(token_) EIP712("Sparkso", "1") {
        require(
            systemAddress_ != address(0x0),
            "Sparkso ICO: system address is the zero address"
        );
        require(
            wallet_ != address(0x0),
            "Sparkso ICO: wallet is the zero address"
        );
        require(
            token_ != address(0x0),
            "Sparkso ICO: token contract is the zero address"
        );
        require(
            MATICUSD_ != address(0x0),
            "Sparkso ICO: Aggregator MATIC/USD cannot be the zero address"
        );
        require(
            EURUSD_ != address(0x0),
            "Sparkso ICO: Aggregator EUR/USD cannot be the zero address"
        );

        _systemAddress = systemAddress_;
        _wallet = wallet_;
        _token = IERC20(token_);
        _MATICUSD = AggregatorV3Interface(MATICUSD_);
        _EURUSD = AggregatorV3Interface(EURUSD_);

        // Input values Rate and Bonus
        _bonus = [0, 0, 0, 0];

        // Input values EUR goals
        // Unit : cent euros
        _eurGoals = [
            56280000, // Stage 1 EUR goal
            211050000, // Stage 2 EUR goal
            337680000, // Stage 3 EUR goal
            443205000 // Stage 4 EUR goal
        ];

        // Input rates
        // Unit : cent euros
        _rate = [4, 6, 8, 9];

        // Minimum eur to invest in first stage
        // Unit : cent euros
        _minEur = [
            20000, // Stage 1 first 500 people
            50000
        ];

        // Calculate _totalEurGoal
        // Unit : cent euros
        for (uint8 i = 0; i < STAGES; i++) _totalEurGoal += _eurGoals[i];

        // 30 days into seconds
        uint256 monthSecond = 30 * 24 * 3600;

        // Input values in seconds corresponding to cliff for each stages
        // Add listing date when we have it.
        _cliffValues = [0, 0, 0, monthSecond];
        // Input value in seconds corresponding to vesting for each stages
        _vestingValue = [
            4 * monthSecond,
            8 * monthSecond,
            12 * monthSecond,
            12 * monthSecond
        ];
        // Input value in second corresponding to token time release slices
        _slicePeriod = monthSecond;

        // Input value timestamp in second of the opening ICO time
        _openingTime = 1656612002; // The 30th of June 20:00 UTC+2
        _closingTime = _openingTime + (monthSecond * 4);

        // Cliff is applied only for stage 3 and 4 (cf. Whitepaper)
        _cliff = false;
        // Vesting is applied only for stage 2, 3 and 4 (cf. Whitepaper)
        //_vest = false;
    }

    // -----------------------------------------
    // External interface
    // -----------------------------------------

    /**
     * @return _countAddresses
     */
    function countAdresses() external view returns (uint16) {
        return _countAdresses;
    }

    /**
     * @return _eurRaised total amount EUR raised. Unit : cent euros
     */
    function eurRaised() external view returns (uint256) {
        return _eurRaised;
    }

    /**
     * @return _currentStage of the ICO.
     */
    function currentStage() external view returns (uint8) {
        return _currentStage;
    }

    /**
     * @return _rate number of token units a buyer gets per wei for each stages.
     */
    function rate() external view returns (uint8[4] memory) {
        return _rate;
    }

    /**
     * @return _eurGoals number of EUR allocated for each stages
     */
    function eurGoals() external view returns (uint256[4] memory) {
        return _eurGoals;
    }

    /**
     * @return _bonus for each stages
     */
    function bonus() external view returns (uint8[4] memory) {
        return _bonus;
    }

    /**
     * @return _openingTime of the ICO
     */
    function openingTime() external view returns (uint256) {
        return _openingTime;
    }

    /**
     * @return _closingTime of the ICO
     */
    function closingTime() external view returns (uint256) {
        return _closingTime + _delay;
    }

    /**
     * @dev Returns the domain separator used in the encoding of the signature for {permit-release},
     * as defined by {EIP712}.
     */
    function DomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // -----------------------------------------
    // Public interface
    // -----------------------------------------

    /**
     * @dev Release token block into the vesting smart contract
     * @param _vestingScheduleId ID corresponding to the vesting schedule of the buyer
     * @param _amount Token amount _beneficiary want to release
     * @param _beneficiary Address of the release token beneficiary
     * @param _deadline Signature deadline
     * @param _signature System wallet signature only if beneficiary has register a KYC
     */
    function releaseTokens(
        bytes32 _vestingScheduleId,
        uint256 _amount,
        address _beneficiary,
        uint256 _deadline,
        bytes memory _signature
    ) public onlyValidSignature(_beneficiary, _deadline, _signature) {
        _release(_vestingScheduleId, _amount);
    }

    /**
     * @dev Convert weiAmount MATIC into EUR thanks to chainlink oracles
     * @param _weiAmount Matic weiAmount to change into EUR
     */
    function changeMATICEUR(uint256 _weiAmount)
        public
        virtual
        returns (uint256)
    {
        (, int256 MATICUSD, , , ) = _MATICUSD.latestRoundData();
        (, int256 EURUSD, , , ) = _EURUSD.latestRoundData();
        uint8 decEURUSD = _EURUSD.decimals();
        uint8 decMATICUSD = _MATICUSD.decimals();

        // Return EUR with cent precision taking in account decimals variation if there is any
        if (decEURUSD == decMATICUSD)
            return
                (_weiAmount * uint256(MATICUSD) * 100) /
                (uint256(EURUSD) * 10**18);
        else if (decEURUSD < decMATICUSD)
            return ((_weiAmount * uint256(MATICUSD) * 100) /
                (uint256(EURUSD) * 10**(decMATICUSD - decEURUSD + 18)));
        else
            return ((_weiAmount *
                uint256(MATICUSD) *
                100 *
                10**(decEURUSD - decMATICUSD)) / (uint256(EURUSD) * 10**18));
    }

    /**
     * @dev low level token purchase
     * @param _beneficiary Address performing the token purchase
     */
    function buyTokens(address _beneficiary) public payable {
        uint256 weiAmount = msg.value;
        uint256 eurAmount = changeMATICEUR(msg.value);

        _preValidatePurchase(_beneficiary, eurAmount);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(eurAmount);

        // update state
        _eurRaised += eurAmount;

        _processPurchase(_beneficiary, tokens);
        emit TokensPurchase(
            msg.sender,
            _beneficiary,
            weiAmount,
            eurAmount,
            tokens,
            _cliff,
            true //_vest
        );

        _updatePurchasingState();

        _forwardFunds();
        _postValidatePurchase(_beneficiary);
    }

    /**
     * @dev Delay the ICO _closingTime
     * @param _timeToDelay Add a time delay in seconds
     */
    function delayICO(uint256 _timeToDelay) public nonReentrant onlyOwner {
        require(
            _timeToDelay > 0,
            "Sparkso ICO: the delay need to be superior to 0."
        );
        _delayICO(_timeToDelay);
    }

    /**
     * @dev Returns the current nonce for `beneficiary`. This value must be
     * included whenever a signature is generated for {permit-release}.
     *
     * Every successful call to {permit-release} increases ``beneficiary``'s nonce by one. This
     * prevents a signature from being used multiple times.
     * @param _beneficiary beneficiary address used to purchase ICO tokens
     */
    function nonces(address _beneficiary) public view returns (uint256) {
        return _nonces[_beneficiary].current();
    }

    // -----------------------------------------
    // Internal interface
    // -----------------------------------------

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        Address.sendValue(_wallet, msg.value);
    }

    /**
     * @dev Delay the ICO
     */
    function _delayICO(uint256 _time) internal virtual {
        // Convert the delay time into seconds and add to the current delay
        _delay += _time;
    }

    /**
     * @dev Update ICO stage and add addresses if it is 500 first purchase
     * @param _beneficiary Address performing the token purchase
     */
    function _postValidatePurchase(address _beneficiary) internal {
        // Add address if in the 500 first buyers
        if (_getCountAddresses() < 500) {
            _firstAddresses[_beneficiary] = 1;
            _countAdresses++;
        }

        uint256 eurGoal = 0;
        for (uint8 i = 0; i <= _currentStage; i++) eurGoal += _eurGoals[i];

        if (_eurRaised >= eurGoal && _currentStage < STAGES) {
            _currentStage++;

            // Cliff is applied only for stage 3 and 4 (cf. Whitepaper)
            _cliff = _currentStage >= 3 ? true : false;
            // Vesting is applied only for stage 2, 3 and 4 (cf. Whitepaper)
            // _vest = _currentStage != 0 ? true : false;
        }
    }

    /**
     * @dev Create a vesting schedule starting at the closing time of the ICO
     * @param _beneficiary Address performing the token purchase
     * @param _tokenAmount Number of tokens to be emitted
     */
    function _deliverTokens(address _beneficiary, uint256 _tokenAmount)
        internal
    {
        _createVestingSchedule(
            _beneficiary,
            _closingTime,
            _cliffValues[_currentStage],
            _vestingValue[_currentStage],
            _slicePeriod,
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
     * @dev "Consume a nonce": return the current value and increment.
     *
     * @param _beneficiary buyer address used to purchase ICO tokens
     */
    function _useNonce(address _beneficiary)
        internal
        returns (uint256 current)
    {
        Counters.Counter storage nonce = _nonces[_beneficiary];
        current = nonce.current();
        nonce.increment();

        return current;
    }

    /**
     * @dev Calculate the number of tokens depending on current ICO stage with corresponding rate and bonus
     * @param _eurAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokenAmount(uint256 _eurAmount)
        internal
        view
        returns (uint256)
    {
        uint256 rate_ = _rate[_currentStage];
        uint256 tokens = (_eurAmount / rate_) * 10 ** 18; // Unit : cent euros
        /*uint256 bonus_ = _getCountAddresses() > 500
            ? tokens * _bonus[_currentStage]
            : tokens * 30; // 500 first bonus equal to 30% */
        return tokens + (_bonus[_currentStage] / 100);
    }

    /**
     * @return the number of people (within the 500 ones) who purchased tokens
     */
    function _getCountAddresses() internal view virtual returns (uint256) {
        return _countAdresses;
    }

    /**
     * @return current time minus the actual delay to control the closing times
     */
    function _getCurrentTime()
        internal
        view
        virtual
        override
        returns (uint256)
    {
        return block.timestamp - _delay;
    }

    /**
     * @dev Validation of an incoming purchase.
     * @param _beneficiary Address performing the token purchase
     * @param _eurAmount Value in EUR involved in the purchase
     */
    function _preValidatePurchase(address _beneficiary, uint256 _eurAmount)
        internal
        view
        onlyOnePurchase(_beneficiary)
    {
        require(
            _beneficiary != address(0x0),
            "Sparkso ICO: beneficiary address should be defined."
        );
        require(
            _getCurrentTime() >= _openingTime,
            "Sparkso ICO: ICO didn't start."
        );
        require(
            _getCurrentTime() <= _closingTime,
            "Sparkso ICO: ICO is now closed, times up."
        );
        require(
            _eurRaised < _totalEurGoal,
            "Sparkso ICO: ICO is now closed, all funds are raised."
        );

        if (_currentStage > 0) {
            require(
                _eurAmount > 0,
                "Sparkso ICO: Amount need to be superior to 0."
            );
            require(
                _eurAmount >= _minEur[0],
                "Sparkso ICO: Amount need to be superior to the minimum EUR defined."
            );
        } else {
            // Minimum wei for the first 500 people else the second minimum wei
            uint256 minEur = _getCountAddresses() < 500
                ? _minEur[0]
                : _minEur[1];
            require(
                _eurAmount >= minEur,
                "Sparkso ICO: Amount need to be superior to the minimum EUR defined."
            );
        }

        _checkMaxEUR(_eurAmount);
    }

    /**
     * @dev Check if the transaction EUR is lower or equal to the maximum defined.
     * @param _eurAmount Value in EUR involved in the purchase
     */
    function _checkMaxEUR(uint256 _eurAmount) internal view virtual {
        // Unit : cent euros
        require(
            _eurAmount <= 1500000,
            "Sparkso ICO: Amount need to be inferior or equal to 15 000 EUR."
        );
    }

    /**
     * @dev Update purchasing state.
     */
    function _updatePurchasingState() internal pure {}
}
