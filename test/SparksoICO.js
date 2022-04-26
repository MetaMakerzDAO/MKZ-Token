const { expect } = require("chai");
const { ethers } = require("hardhat");

const ICO_SUPPLY = 160679400; 

const EUR_GOALS = [
  562800, // Stage 1 EUR goal
  2110500, // Stage 2 EUR goal
  3376800, // Stage 3 EUR goal
  4432050 // Stage 4 EUR goal
];
// Unit : euro cent 
const RATE = [4, 6, 8, 9];

const BONUS = [20, 15, 10, 0];

const calcEur = (weiAmount) => {
  let MATICUSD = 135800000; 
  let EURUSD = 107380000;
  return parseInt((weiAmount * MATICUSD) / (EURUSD * 10 ** 18))
}

const calcTokens = (weiAmount, rate, bonus) => {
  let eurAmount = calcEur(weiAmount)
  let tokens = (eurAmount / rate) * 100
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

      const buildSignature = async (beneficiary, timestamp) => {
        let hashBinary = ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
            ["address", "uint"],
            [beneficiary.address, timestamp]
          )
        )
        return await systemAddress.signMessage(hashBinary)
      }


      const wallet = owner.address;

      // deploy ICO contract
      const sparksoICO = await SparksoICO.deploy(systemAddress.address, wallet, testToken.address);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

      // send tokens to the ICO contract
      await expect(testToken.transfer(sparksoICO.address, ethers.utils.parseEther(ICO_SUPPLY.toString()))).to.emit(
        testToken,
        "Transfer"
      );
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ethers.utils.parseEther(ICO_SUPPLY.toString()));
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ethers.utils.parseEther(ICO_SUPPLY.toString()));

      const openingTime = 1646485200; // Use to build signature, only for testing purpose
      const closingTime = openingTime + 4 * 30 * 24 * 3600; //By default 4 months
      const beneficiary = addr1;

      // check that only people with a proper signature can interact with the buyTokens function
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, 0), {
            value: ethers.utils.parseEther("100"),
          })
      ).to.be.revertedWith("Sparkso ICO: Invalid purchase signature.");

      // check that is it not possible to purchase token before opening time
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, openingTime), {
            value: ethers.utils.parseEther("100"),
          })
      ).to.be.revertedWith("Sparkso ICO: ICO didn't start.");

      // set current time to the open ICO
      await sparksoICO.setCurrentTime(openingTime);

      // check that benefiaciary cannot purchased less token than the minimum requiered
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, openingTime), { value: 0 })
      ).to.be.revertedWith(
        "Sparkso ICO: Amount need to be superior to the minimum EUR defined."
      );

      // check wei raised in the contract is equal to 0
      expect(await sparksoICO.getVestingSchedulesTotalAmount()).to.equal(0);

      // purchase tokens
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, openingTime),{
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
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, openingTime), {
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
          .buyTokens(beneficiary2.address, openingTime, buildSignature(beneficiary2, openingTime), { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary3 = addr3;
      value = ethers.utils.parseEther("1668818.1");
      // purchase all the second stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary3)
          .buyTokens(beneficiary3.address, openingTime, buildSignature(beneficiary3, openingTime), { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary4 = addr4;
      value = ethers.utils.parseEther("2670109");

      // purchase all the third stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary4)
          .buyTokens(beneficiary4.address, openingTime, buildSignature(beneficiary4, openingTime), { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary5 = addr5;
      value = ethers.utils.parseEther("3504518");

      // purchase all the last stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary5)
          .buyTokens(beneficiary5.address, openingTime, buildSignature(beneficiary5, openingTime), { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      // set time to closing time to release tokens
      await sparksoICO.setCurrentTime(closingTime + 10);

      // first beneficiary
      // compute vesting schedule id
      var vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary.address,
          0
        );

      // the number of tokens beneficiary should be able to release
      var tokens = calcTokens(ethers.utils.parseEther("1000"), RATE[0], 30)

      // check that vested amount is equal to all the tokens bought at the first ICO stage
      expect(
        await sparksoICO.computeReleasableAmount(vestingScheduleId)
      ).to.be.equal(tokens);

      // check that user can release all his tokens
      await expect(
        sparksoICO.connect(beneficiary).release(vestingScheduleId, tokens)
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
      tokens = calcTokens(ethers.utils.parseEther("444019"), RATE[0], BONUS[0])

      // check that second beneficiary can release all his tokens bought at the first ICO stage
      await expect(
        sparksoICO.connect(beneficiary2).release(vestingScheduleId, tokens)
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
        sparksoICO.connect(beneficiary3).release(vestingScheduleId, b3_tokens)
      ).to.be.revertedWith(
        "TokenVesting: cannot release tokens, not enough vested tokens"
      );

      // change time to first slice of the third beneficiary, he should be able to release tokens
      await sparksoICO.setCurrentTime(closingTime + 10 * 24 * 3600);

      // check beneficiary 3 could release first slice of this vesting 
      var releasableTokens = await sparksoICO.computeReleasableAmount(
        vestingScheduleId
      );
      expect(releasableTokens).to.equal(parseInt(b3_tokens /9));

      const b4_tokens = calcTokens(ethers.utils.parseEther("2670109"), RATE[2], BONUS[2])

      // fourth beneficiary
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary4.address,
          0
        );

      // should revert the fourth beneficiary attempt to relase tokens because of the cliff period
      await expect(
        sparksoICO.connect(beneficiary4).release(vestingScheduleId, b4_tokens)
      ).to.be.revertedWith(
        "TokenVesting: cannot release tokens, not enough vested tokens"
      );

      // change time to the end of the vestsing period
      await sparksoICO.setCurrentTime(closingTime + 121 * 24 * 3600);

      // check that the fourth beneficiary could release all his tokens
      await expect(
        sparksoICO.connect(beneficiary4).release(vestingScheduleId, b4_tokens)
      )
        .to.emit(testToken, "Transfer")
        .withArgs(sparksoICO.address, beneficiary4.address, b4_tokens);

      // third beneficiary
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary3.address,
          0
        );

      // check that the third beneficiary could release the rest of his tokens
      await expect(
        sparksoICO
          .connect(beneficiary3)
          .release(vestingScheduleId, parseInt(8 * b3_tokens /9))
      )
        .to.emit(testToken, "Transfer")
        .withArgs(
          sparksoICO.address,
          beneficiary3.address,
          parseInt(8 * b3_tokens /9)
        );

      // last beneficiary
      const b5_tokens = calcTokens(ethers.utils.parseEther("3504518"), RATE[3], BONUS[3])
      vestingScheduleId =
        await sparksoICO.computeVestingScheduleIdForAddressAndIndex(
          beneficiary5.address,
          0
        );

      // check that the fifth beneficiary could release the rest of his tokens
      await expect(
        sparksoICO.connect(beneficiary5).release(vestingScheduleId, b5_tokens)
      )
        .to.emit(testToken, "Transfer")
        .withArgs(sparksoICO.address, beneficiary5.address, b5_tokens);

      /*
       * TEST SUMMARY
       * deploy ICO contract
       * send tokens to the ICO contract
       * check that only people with a proper signature can interact with the buyTokens function
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
       * check that first beneficiary can release all his tokens
       * check the balance of the first beneficiary
       * check that second beneficiary can release all his tokens bought at the first ICO stage
       * check the balance of the second beneficiary
       * beneficiary 3 should not be able to release his token until the cliff + slice period
       * check beneficiary 3 could release first slice of this vesting 
       * should revert the fourth beneficiary attempt to relase tokens because of the cliff period
       * check that the fourth beneficiary could release all his tokens
       * check that the third beneficiary could release the rest of his tokens
       * check that the fifth beneficiary could release the rest of his tokens
       */
    });
    it("Should check TokenVesting contract functions", async function () {

      const buildSignature = async (beneficiary, timestamp) => {
        let hashBinary = ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
            ["address", "uint"],
            [beneficiary.address, timestamp]
          )
        )
        return await systemAddress.signMessage(hashBinary)
      }


      const wallet = owner.address;
      // deploy ICO contract
      const sparksoICO = await SparksoICO.deploy(systemAddress.address, wallet, testToken.address);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

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

      const openingTime = 1646485200;
      //const closingTime = openingTime + 4 * 30 * 24 * 3600; //By default 4 months
      const beneficiary = addr1;

      // set current time to the open ICO
      await sparksoICO.setCurrentTime(openingTime);

      // purchase tokens and create the equivalent vesting schedule
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, openingTime), {
            value: ethers.utils.parseEther("1000"),
          })
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

      const buildSignature = async (beneficiary, timestamp) => {
        let hashBinary = ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
            ["address", "uint"],
            [beneficiary.address, timestamp]
          )
        )
        return await systemAddress.signMessage(hashBinary)
      }


      const wallet = owner.address;
      // deploy ICO contract
      const sparksoICO = await SparksoICO.deploy(systemAddress.address, wallet, testToken.address);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

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

      const openingTime = 1646485200;
      const closingTime = openingTime + 4 * 30 * 24 * 3600; //By default 4 months
      const beneficiary = addr1;

      // set current time to the open ICO
      await sparksoICO.setCurrentTime(openingTime);

      // purchase tokens
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, openingTime),{
            value: ethers.utils.parseEther("1000"),
          })
      ).to.emit(sparksoICO, "TokensPurchase");

      
      const beneficiary2 = addr2;
      // purchase tokens
      await expect(
        sparksoICO
          .connect(beneficiary2)
          .buyTokens(beneficiary2.address, openingTime, buildSignature(beneficiary2, openingTime),{
            value: ethers.utils.parseEther("444019"),
          })
      ).to.emit(sparksoICO, "TokensPurchase");

      expect(
        await sparksoICO.currentStage()
      ).to.be.equal(1);
      
      expect(await sparksoICO.closingTime()).to.be.equal(closingTime)

      let delay = 1 * 24 * 3600;

      await sparksoICO.connect(owner).delayICO(delay);

      // set time to closing time to release tokens
      await sparksoICO.setCurrentTime(closingTime + 10);

      // the number of tokens beneficiary should be able to release
      b1_tokens = calcTokens(ethers.utils.parseEther("444019"), RATE[0], BONUS[0])

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
        sparksoICO.connect(beneficiary).release(vestingScheduleId, b1_tokens)
      ).to.be.revertedWith(
        "TokenVesting: cannot release tokens, not enough vested tokens"
      );
    });
  });
});
