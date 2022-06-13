const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const ICO_SUPPLY = 160679400;
let monthSecond = 30 * 24 * 3600;
const VESTING = [
  4 * monthSecond,
  8 * monthSecond,
  12 * monthSecond,
  12 * monthSecond
]
const CLIFF = [0, 0, 0, monthSecond];
// Unit : euro cent 
const RATE = [4, 6, 8, 9];

const BONUS = [0, 0, 0, 0];

const calcEur = (weiAmount) => {
  let MATICUSD = 135800000;
  let EURUSD = 107380000;
  return parseInt((weiAmount * MATICUSD * 100) / (EURUSD * 10 ** 18))
}

const calcTokens = (weiAmount, rate, bonus) => {
  let eurAmount = calcEur(weiAmount)
  let tokens = eurAmount / rate
  return tokens + parseInt(tokens * 0.01 * bonus);
}

describe("Sparsko ICO", function () {
  let Token;
  let testToken;
  let SparksoICO;
  let systemAddress;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let addr5;
  let addrs;

  before(async function () {
    Token = await ethers.getContractFactory("Sparkso");
    SparksoICO = await ethers.getContractFactory("MockSparksoICO");
  });
  beforeEach(async function () {
    [owner, systemAddress, addr1, addr2, addr3, addr4, addr5, ...addrs] =
      await ethers.getSigners();
    testToken = await Token.deploy(owner.address);
    await testToken.deployed();
  });

  describe("ICO", function () {
    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await testToken.balanceOf(owner.address);
      expect(await testToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Should purchase token at each stage of the ICO", async function () {
      const wallet = owner.address;

      // deploy ICO contract
      const sparksoICO = await SparksoICO.deploy(systemAddress.address, wallet, testToken.address);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

      const network = await ethers.getDefaultProvider().getNetwork();

      const buildSignature = async (_beneficiary, _nonce, _deadline) => {

        const domain = {
          name: "Sparkso",
          version: "1",
          chainId: network.chainId,
          verifyingContract: sparksoICO.address
        }

        const types = {
          PermitRelease: [
            {
              name: "systemAddress",
              type: "address",
            },
            {
              name: "beneficiary",
              type: "address",
            },
            {
              name: "nonce",
              type: "uint256",
            },
            {
              name: "deadline",
              type: "uint256",
            }
          ]
        }

        const value = {
          systemAddress: systemAddress.address,
          beneficiary: _beneficiary,
          nonce: _nonce,
          deadline: _deadline
        }

        return await systemAddress._signTypedData(domain, types, value);
      }

      // send tokens to the ICO contract
      await expect(testToken.transfer(sparksoICO.address, ethers.utils.parseEther(ICO_SUPPLY.toString()))).to.emit(
        testToken,
        "Transfer"
      );
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ethers.utils.parseEther(ICO_SUPPLY.toString()));
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ethers.utils.parseEther(ICO_SUPPLY.toString()));

      const openingTime = 1656612002; // Use to build signature, only for testing purpose
      const closingTime = openingTime + 4 * 30 * 24 * 3600; //By default 4 months
      const deadline = closingTime + 15 * 30 * 24 * 3600; // Irrelevant deadline just for testing
      const beneficiary = addr1;

      // check that is it not possible to purchase token before opening time
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, {
            value: ethers.utils.parseEther("100"),
          })
      ).to.be.revertedWith("Sparkso ICO: ICO didn't start.");

      // set current time to the open ICO
      await sparksoICO.setCurrentTime(openingTime);

      // check that benefiaciary cannot purchased less token than the minimum requiered
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, { value: 0 })
      ).to.be.revertedWith(
        "Sparkso ICO: Amount need to be superior to the minimum EUR defined."
      );

      // check wei raised in the contract is equal to 0
      expect(await sparksoICO.getVestingSchedulesTotalAmount()).to.equal(0);

      // purchase tokens
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, {
            value: ethers.utils.parseEther("1000"),
          })
      ).to.emit(sparksoICO, "TokensPurchase");

      // check wei raised in the contract is equal to 1
      expect(await sparksoICO.eurRaised()).to.equal(
        calcEur(ethers.utils.parseEther("1000"))
      );

      // check the purchase addresses counter
      expect(await sparksoICO.countAdresses()).to.equal(1);

      // check that beneficiary cannot purchase a second time
      expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, {
            value: ethers.utils.parseEther("1000"),
          })
      ).to.be.revertedWith(
        "Sparkso ICO: One transaction per wallet for the 500 first."
      );

      // set addresses counter to 501 and switch minimum wei for first stage
      await sparksoICO.setCountAddresses(501);
      const beneficiary2 = addr2;

      var value = ethers.utils.parseEther("444019");
      // purchase all the first stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary2)
          .buyTokens(beneficiary2.address, { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary3 = addr3;
      value = ethers.utils.parseEther("1668818.1");
      // purchase all the second stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary3)
          .buyTokens(beneficiary3.address, { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary4 = addr4;
      value = ethers.utils.parseEther("2670109");

      // purchase all the third stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary4)
          .buyTokens(beneficiary4.address, { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary5 = addr5;
      value = ethers.utils.parseEther("3504518");

      // purchase all the last stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary5)
          .buyTokens(beneficiary5.address, { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      // set time to closing time to release tokens
      await sparksoICO.setCurrentTime(closingTime + CLIFF[0] + VESTING[0] +10 );

      // first beneficiary
      // compute vesting schedule id
      var vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary.address,
          0
        );

      // the number of tokens beneficiary should be able to release
      var tokens = ethers.utils.parseEther(calcTokens(ethers.utils.parseEther("1000"), RATE[0], 0).toString())

      // check that vested amount is equal to all the tokens bought at the first ICO stage
      expect(
        await sparksoICO.computeReleasableAmount(vestingScheduleId)
      ).to.be.equal(tokens);

      // check that only people with a proper signature deadline can interact with the releaseTokens function
      await expect(
        sparksoICO
          .connect(beneficiary)
          .releaseTokens(vestingScheduleId, tokens, beneficiary.address, openingTime, buildSignature(beneficiary.address, 0, openingTime))
      ).to.be.revertedWith("SparksoICO: expired deadline release permit signature.");


      // check that only people with a proper signature can interact with the releaseTokens function
      await expect(
        sparksoICO
          .connect(beneficiary)
          .releaseTokens(vestingScheduleId, tokens, beneficiary.address, deadline, buildSignature(beneficiary2.address, 1, deadline))
      ).to.be.revertedWith("Sparkso ICO: Invalid release permit signature.");

      // check that user can release all his tokens
      await expect(
        sparksoICO.connect(beneficiary).releaseTokens(vestingScheduleId, tokens, beneficiary.address, deadline, buildSignature(beneficiary.address, 0, deadline))
      )
        .to.emit(testToken, "Transfer")
        .withArgs(sparksoICO.address, beneficiary.address, tokens);

      // check the balance of the first beneficiary
      expect(await testToken.balanceOf(beneficiary.address)).to.equal(tokens);

      // second beneficiary
      // compute vesting schedule id
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(

          beneficiary2.address,
          0
        );

      // the number of tokens beneficiary should be able to release
      tokens = ethers.utils.parseEther(calcTokens(ethers.utils.parseEther("444019"), RATE[0], BONUS[0]).toString())

      // check that second beneficiary can release all his tokens bought at the first ICO stage
      await expect(
        sparksoICO.connect(beneficiary2).releaseTokens(vestingScheduleId, tokens, beneficiary2.address, deadline, buildSignature(beneficiary2.address, 0, deadline))
      )
        .to.emit(testToken, "Transfer")
        .withArgs(sparksoICO.address, beneficiary2.address, tokens);

      // check the balance of the beneficiary 2
      expect(await testToken.balanceOf(beneficiary2.address)).to.equal(tokens);

      // third beneficiary
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary3.address,
          0
        );

      const b3_tokens = calcTokens(ethers.utils.parseEther("1668818.1"), RATE[1], BONUS[1])
      
      // beneficiary 3 should not be able to release his token until the cliff + slice period
      await expect(
        sparksoICO.connect(beneficiary3).releaseTokens(vestingScheduleId, ethers.utils.parseEther(b3_tokens.toString()), beneficiary3.address, deadline, buildSignature(beneficiary3.address, 0, deadline))
      ).to.be.revertedWith(
        "TokenVesting: cannot release tokens, not enough vested tokens"
      );

      // check beneficiary 3 could release first slice of this vesting 
      var releasableTokens = await sparksoICO.computeReleasableAmount(
        vestingScheduleId
      );
      expect(releasableTokens).to.equal("17587500583333333333333333");//ethers.utils.parseEther((b3_tokens / 2).toString()));

      // release the first slice of this vesting schedule
      await expect(
        sparksoICO
          .connect(beneficiary3)
          .releaseTokens(vestingScheduleId,ethers.utils.parseEther((b3_tokens / 2).toString()), beneficiary3.address, deadline, buildSignature(beneficiary3.address, 0, deadline))
      )
        .to.emit(testToken, "Transfer")
        .withArgs(
          sparksoICO.address,
          beneficiary3.address,
          ethers.utils.parseEther((b3_tokens / 2).toString())
        );

      const b4_tokens =  ethers.utils.parseEther(calcTokens(ethers.utils.parseEther("2670109"), RATE[2], BONUS[2]).toString())

      // fourth beneficiary
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary4.address,
          0
        );

      // should revert the fourth beneficiary attempt to relase tokens because of the cliff period
      await expect(
        sparksoICO.connect(beneficiary4).releaseTokens(vestingScheduleId, b4_tokens, beneficiary4.address, deadline, buildSignature(beneficiary4.address, 0, deadline))
      ).to.be.revertedWith(
        "TokenVesting: cannot release tokens, not enough vested tokens"
      );

      // change time to the end of the vestsing period
      await sparksoICO.setCurrentTime(closingTime + CLIFF[3] + VESTING[3]);

      // check that the fourth beneficiary could release all his tokens
      await expect(
        sparksoICO.connect(beneficiary4).releaseTokens(vestingScheduleId, b4_tokens, beneficiary4.address, deadline, buildSignature(beneficiary4.address, 0, deadline))
      )
        .to.emit(testToken, "Transfer")
        .withArgs(sparksoICO.address, beneficiary4.address, b4_tokens);

      // third beneficiary
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary3.address,
          0
        );

      // check nonces is equal to 1 because its the second time signature for this user
      expect(await sparksoICO.nonces(beneficiary3.address)).to.equal(1);

      // check that the third beneficiary could release the rest of his tokens
      await expect(
        sparksoICO
          .connect(beneficiary3)
          .releaseTokens(vestingScheduleId ,ethers.utils.parseEther((b3_tokens / 2).toString()), beneficiary3.address, deadline, buildSignature(beneficiary3.address, 1, deadline))
      )
        .to.emit(testToken, "Transfer")
        .withArgs(
          sparksoICO.address,
          beneficiary3.address,
          ethers.utils.parseEther((b3_tokens / 2).toString())
        );

      // last beneficiary
      const b5_tokens =  ethers.utils.parseEther(calcTokens(ethers.utils.parseEther("3504518"), RATE[3], BONUS[3]).toString())
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary5.address,
          0
        );

      // check that the fifth beneficiary could release the rest of his tokens
      await expect(
        sparksoICO.connect(beneficiary5).releaseTokens(vestingScheduleId, b5_tokens, beneficiary5.address, deadline, buildSignature(beneficiary5.address, 0, deadline))
      )
        .to.emit(testToken, "Transfer")
        .withArgs(sparksoICO.address, beneficiary5.address, b5_tokens);

      /*
       * TEST SUMMARY
       * deploy ICO contract
       * send tokens to the ICO contract
       * check that is it not possible to purchase token before opening time
       * check that benefiaciary cannot purchased less token than the minimum requiered
       * check wei raised in the contract is equal to 0
       * purchase tokens
       * check wei raised in the contract is equal to 1
       * check the purchase addresses counter
       * check that beneficiary cannot purchase a second time
       * set addresses counter to 501 and switch minimum wei for first stage
       * purchase all the first stage tokens
       * purchase all the second stage tokens
       * purchase all the third stage tokens
       * purchase all the last stage tokens
       * check that vested amount is equal to all the tokens bought at the first ICO stage
       * check that only people with a proper signature deadline can interact with the releaseTokens function
       * check that only people with a proper signature can interact with the releaseTokens function
       * check that first beneficiary can release all his tokens
       * check the balance of the first beneficiary
       * check that second beneficiary can release all his tokens bought at the first ICO stage
       * check the balance of the second beneficiary
       * beneficiary 3 should not be able to release his token until the cliff + slice period
       * check beneficiary 3 could release first slice of this vesting 
       * 
       * should revert the fourth beneficiary attempt to relase tokens because of the cliff period
       * check that the fourth beneficiary could release all his tokens
       * check nonces is equal to 1 because its the second time signature for this user
       * check that the third beneficiary could release the rest of his tokens
       * check that the fifth beneficiary could release the rest of his tokens
       */
    });
    it("Should check TokenVesting contract functions", async function () {
      const wallet = owner.address;

      // deploy ICO contract
      const sparksoICO = await SparksoICO.deploy(systemAddress.address, wallet, testToken.address);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

      const network = await ethers.getDefaultProvider().getNetwork();

      const buildSignature = async (_beneficiary, _nonce, _deadline) => {

        const domain = {
          name: "Sparkso",
          version: "1",
          chainId: network.chainId,
          verifyingContract: sparksoICO.address
        }

        const types = {
          Release: [
            {
              name: "systemAddress",
              type: "address",
            },
            {
              name: "beneficiary",
              type: "address",
            },
            {
              name: "nonce",
              type: "uint256",
            },
            {
              name: "deadline",
              type: "uint256",
            }
          ]
        }

        const value = {
          systemAddress: systemAddress.address,
          beneficiary: _beneficiary,
          nonce: _nonce,
          deadline: _deadline
        }

        return await systemAddress._signTypedData(domain, types, value);
      }

      // check that no vesting is scheduled
      expect(await sparksoICO.getVestingSchedulesCount()).to.equal(0);

      // config sparkso ICO to checks others functions
      // send tokens to the ICO contract
      await expect(testToken.transfer(sparksoICO.address, ethers.utils.parseEther(ICO_SUPPLY.toString()))).to.emit(
        testToken,
        "Transfer"
      );
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ethers.utils.parseEther(ICO_SUPPLY.toString()));
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ethers.utils.parseEther(ICO_SUPPLY.toString()));

      const openingTime = 1656612002;
      //const closingTime = openingTime + 4 * 30 * 24 * 3600; //By default 4 months
      const beneficiary = addr1;

      // set current time to the open ICO
      await sparksoICO.setCurrentTime(openingTime);

      // purchase tokens and create the equivalent vesting schedule
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, { value: ethers.utils.parseEther("1000") })
      ).to.emit(sparksoICO, "TokensPurchase");

      // get vesting schedule id
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary.address,
          0
        );

      // get last vesting schedule
      lastVestScheduleId = await sparksoICO.getVestingIdAtIndex(0);

      // check the schedule id are both the same
      expect(vestingScheduleId).to.equal(lastVestScheduleId.toString());

      // check the vesting schedule count of beneficiary
      expect(
        await sparksoICO.getVestingSchedulesCountByBeneficiary(
          beneficiary.address
        )
      ).to.equal(1);

      // get vesting schedule
      vestingSchedule = await sparksoICO.getVestingSchedule(vestingScheduleId);

      // get last vesting schedule
      lastVestSchedule = await sparksoICO.getLastVestingScheduleForHolder(
        beneficiary.address
      );

      expect(vestingSchedule.toString()).to.equal(lastVestSchedule.toString());

      // check that that vesting schedule cannot be revoke
      expect(sparksoICO.revoke(vestingScheduleId)).to.be.revertedWith(
        "TokenVesting: vesting is not revocable"
      );

      const withdrawalAmount = await sparksoICO.getWithdrawableAmount();
      expect(await sparksoICO.withdraw(withdrawalAmount)).to.emit(
        testToken,
        "Transfer"
      );
    });
    it("Should check delay functionality", async function () {

      const wallet = owner.address;

      // deploy ICO contract
      const sparksoICO = await SparksoICO.deploy(systemAddress.address, wallet, testToken.address);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

      const network = await ethers.getDefaultProvider().getNetwork();

      const buildSignature = async (_beneficiary, _nonce, _deadline) => {

        const domain = {
          name: "Sparkso",
          version: "1",
          chainId: network.chainId,
          verifyingContract: sparksoICO.address
        }

        const types = {
          PermitRelease: [
            {
              name: "systemAddress",
              type: "address",
            },
            {
              name: "beneficiary",
              type: "address",
            },
            {
              name: "nonce",
              type: "uint256",
            },
            {
              name: "deadline",
              type: "uint256",
            }
          ]
        }

        const value = {
          systemAddress: systemAddress.address,
          beneficiary: _beneficiary,
          nonce: _nonce,
          deadline: _deadline
        }

        return await systemAddress._signTypedData(domain, types, value);
      }

      // check that no vesting is scheduled
      expect(await sparksoICO.getVestingSchedulesCount()).to.equal(0);

      // config sparkso ICO to checks others functions
      // send tokens to the ICO contract
      await expect(testToken.transfer(sparksoICO.address, ethers.utils.parseEther(ICO_SUPPLY.toString()))).to.emit(
        testToken,
        "Transfer"
      );
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ethers.utils.parseEther(ICO_SUPPLY.toString()));
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ethers.utils.parseEther(ICO_SUPPLY.toString()));

      const openingTime = 1656612002;
      const closingTime = openingTime + 4 * 30 * 24 * 3600; //By default 4 months
      const beneficiary = addr1;
      const deadline = closingTime + 6 * 30 * 24 * 3600; // Irrelevant deadline just for testing

      // set current time to the open ICO
      await sparksoICO.setCurrentTime(openingTime);

      // purchase tokens
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, {
            value: ethers.utils.parseEther("1000"),
          })
      ).to.emit(sparksoICO, "TokensPurchase");


      const beneficiary2 = addr2;
      // purchase tokens
      await expect(
        sparksoICO
          .connect(beneficiary2)
          .buyTokens(beneficiary2.address, {
            value: ethers.utils.parseEther("4000"),
          })
      ).to.emit(sparksoICO, "TokensPurchase");


      expect(await sparksoICO.closingTime()).to.be.equal(closingTime)

      let delay = 1 * 24 * 3600;

      await sparksoICO.connect(owner).delayICO(delay);

      // set time to closing time to release tokens
      await sparksoICO.setCurrentTime(closingTime + 10);

      // the number of tokens beneficiary should be able to release
      b1_tokens =  ethers.utils.parseEther(parseInt(calcTokens(ethers.utils.parseEther("4000"), RATE[0], BONUS[0])).toString())

      // first beneficiary
      // compute vesting schedule id
      var vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary.address,
          0
        );

      expect(
        await sparksoICO.computeReleasableAmount(vestingScheduleId)
      ).to.be.equal(0);

      // should revert because of the delay apply to ICO
      await expect(
        sparksoICO.connect(beneficiary).releaseTokens(vestingScheduleId, b1_tokens, beneficiary.address, deadline, buildSignature(beneficiary.address, 0, deadline))
      ).to.be.revertedWith(
        "TokenVesting: cannot release tokens, not enough vested tokens"
      );
    });
  });
});
