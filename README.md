[![Actions Status](https://github.com/MetaMakerzDAO/MKZ-Token/workflows/main/badge.svg)](https://github.com/MetaMakerzDAO/MKZ-Token/actions)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![license](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# MKZ Token & Vesting contracts

## Overview

Fork [Token vesting contracts](https://github.com/vachmara/sparkso-token/) to build ICO Vesting token distribution for [MetaMakerz](https://metamakerz.io) project.

`TokenVesting` contract can release its token balance gradually like a typical vesting scheme, with a cliff and vesting period.
Optionally revocable by the owner.

`TokenMKZ` contract is a simple ERC20 with fixed supply.

`TokenDrop` contract encapsulate `TokenVesting` contract to build a Vesting Schedule with Chainlink [Automation](https://automation.chain.link/) release for each.

## 🔐💻 Security audits

- [TokenVesting](https://github.com/MetaMakerzDAO/MKZ-Token/blob/main/audits/hacken_audit_report.pdf) security audit from [Hacken](https://hacken.io), 2021.

- [TokenVesting](https://github.com/MetaMakerzDAO/MKZ-Token/blob/main/audits/certik_audit_2022.pdf) security audit from [Certik](https://certik.com) for the second time in 2022

Some of the TokenVesting functions has been removed to optimized the contrat.


### ⛓️ List important addresses

- MKZ deployed on Polygon : [`Not deployed`]()
- MetaMakerzDAO Multisig on Polygon : [`0x29cDA60b0BF9B7f559E44bD24134e0b856979E86`](https://polygonscan.com/address/0x29cDA60b0BF9B7f559E44bD24134e0b856979E86)

### 📦 Installation

```console
$ npm i
```

### ⛏️ Compile

```console
$ npm run compile
```

This task will compile all smart contracts in the `contracts` directory.
ABI files will be automatically exported in `build/abi` directory.

### 📚 Documentation

Documentation is auto-generated after each build in [`docs`](https://MetaMakerzDAO.github.io/MKZ-Token/docs) directory.

The generated output is a static website containing smart contract documentation.

### 🌡️ Testing

```console
$ npm run test
```

### 📊 Code coverage

```console
$ npm run coverage
```

The report will be printed in the console and a static website containing full report will be generated in [`coverage`](https://MetaMakerzDAO.github.io/MKZ-Token/coverage) directory.

### ✨ Code style

```console
$ npm run prettier
```

### 🐱‍💻 Verify & Publish contract source code

```console
$ npx hardhat  verify --network mainnet $CONTRACT_ADDRESS $CONSTRUCTOR_ARGUMENTS
```

## 📄 License

**MKZ token** is released under the [Apache-2.0](LICENSE).
