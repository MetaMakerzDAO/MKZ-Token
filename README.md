[![Actions Status](https://github.com/vachmara/sparkso-token/workflows/main/badge.svg)](https://github.com/vachmara/sparkso-token/actions)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![license](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Sparkso ICO contract

## Overview

Fork [Token vesting contracts](https://github.com/abdelhamidbakhta/token-vesting-contracts/) to build ICO mechanism for [Sparkso]() project.

`TokenVesting` contract can release its token balance gradually like a typical vesting scheme, with a cliff and vesting period.
Optionally revocable by the owner.

`SparksoToken` contract is a simple ERC20 with fixed supply.

`SparksoICO` contract encapsulate `TokenVesting` contract to build a four stages timed crowdsale with different rates and bonuses at each stages.

## 🔐💻 Security audits

- [TokenVesting](https://github.com/abdelhamidbakhta/token-vesting-contracts/blob/main/audits/hacken_audit_report.pdf) security audit from [Hacken](https://hacken.io)

- SparksoICO - ⌛In progress⌛

### 📦 Installation

```console
$ yarn
```

### ⛏️ Compile

```console
$ yarn compile
```

This task will compile all smart contracts in the `contracts` directory.
ABI files will be automatically exported in `build/abi` directory.

### 📚 Documentation

Documentation is auto-generated after each build in [`docs`](https://vachmara.github.io/sparkso-token/docs) directory.

The generated output is a static website containing smart contract documentation.

### 🌡️ Testing

```console
$ yarn test
```

### 📊 Code coverage

```console
$ yarn coverage
```

The report will be printed in the console and a static website containing full report will be generated in [`coverage`](https://vachmara.github.io/sparkso-token/coverage) directory.

### ✨ Code style

```console
$ yarn prettier
```

### 🐱‍💻 Verify & Publish contract source code

```console
$ npx hardhat  verify --network mainnet $CONTRACT_ADDRESS $CONSTRUCTOR_ARGUMENTS
```

## 📄 License

**Sparkso ICO contracts** is released under the [Apache-2.0](LICENSE).
