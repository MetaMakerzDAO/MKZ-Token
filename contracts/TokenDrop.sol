// contracts/TokenDrop.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./TokenVesting.sol";

//import "hardhat/console.sol";

/**
 * @title TokenDrop
 */
contract TokenDrop is TokenVesting, KeeperCompatibleInterface {
    using SafeERC20 for IERC20;

    uint256 public startDate;
    uint256 public DAY_IN_SECONDS = 86400;
    uint256 public cliff = DAY_IN_SECONDS * 30 * 2; // 2 month

    uint256 private _quarter_slice = DAY_IN_SECONDS * 30 * 3; // 3 months
    uint256 private _month_slice = DAY_IN_SECONDS * 30; // 1 month

    uint256 private _counterQuarterVesting = 0;
    uint256 private _counterMonthVesting = 0;

    /**
     * @dev Init the Investors + create vestings schedules
     * @param token_ address of the ERC20
     */
    constructor(address token_) TokenVesting(token_) {
        startDate = _getCurrentTime();
    }

    /** -----------------------------------------
     *  External functions
     *  -----------------------------------------
     */

    /**
     * @dev addInvestors
     * @param  _beneficiaries represent the investors address
     * @param _amounts of each investor vesting schedules 
     * @param _slices if it is 3 month it is quartely distrbute else every month
     */
    function addInvestors(
        address[] memory _beneficiaries,
        uint256[] memory _amounts,
        uint8[] memory _slices
    ) external onlyOwner {
        uint256 tge;
        uint256 amount;
        uint256 duration = DAY_IN_SECONDS * 30 * 18; // 18 months
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            
             // Calculate TGE 10%
            tge = (_amounts[i] * 10) / 100;
            amount = _amounts[i] - tge;
            // Send value to investor
            IERC20(getToken()).safeTransfer(_beneficiaries[i], tge);
            
            // Create vesting schedule with the rest of the tokens
            _createVestingSchedule(
                _beneficiaries[i],
                startDate,
                cliff,
                duration,
                _slices[i] == 3 ? _quarter_slice : _month_slice,
                false,
                amount
            );
        }
    }

    /**
     * @dev performUpKeep, we release automatically the tokens for all investors
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        bytes32 id;
        uint256 amount;
        VestingSchedule memory schedule;
        if (
            _counterQuarterVesting < 6 &&
            _getCurrentTime() >
            _counterQuarterVesting * _quarter_slice + cliff + startDate
        ) {
            
            for (uint256 i = 0; i < getVestingSchedulesCount(); ++i) {
                id = getVestingIdAtIndex(i);
                schedule = getVestingSchedule(id);

                if (schedule.slicePeriodSeconds == _quarter_slice) {
                    amount = computeReleasableAmount(id);
                    _release(id, amount);
                }
            }
            ++_counterQuarterVesting;
        }

        if (
            _counterMonthVesting < 18 &&
            _getCurrentTime() >
            _counterMonthVesting * _month_slice + cliff + startDate
        ) {
            for (uint256 i = 0; i < getVestingSchedulesCount(); ++i) {
                id = getVestingIdAtIndex(i);
                schedule = getVestingSchedule(id);

                if (schedule.slicePeriodSeconds == _month_slice) {
                    amount = computeReleasableAmount(id);
                    _release(id, amount);
                }
            }
            ++_counterMonthVesting;
        }
    }

    /**
     * @dev check if an UpKeep could be performed
     * @return bool determined if the UpKeep has already done the day when we call
     */
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool, bytes memory)
    {
        return (
            (_counterQuarterVesting < 6 &&
                _getCurrentTime() >
                _counterQuarterVesting * _quarter_slice + cliff + startDate) ||
            (_counterMonthVesting < 18 &&
                _getCurrentTime() >
                _counterMonthVesting * _month_slice + cliff + startDate),
            bytes("")
        );
    }
}
