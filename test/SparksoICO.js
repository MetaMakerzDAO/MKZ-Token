const { expect } = require("chai");
const { ethers } = require("hardhat");

const ICO_SUPPLY = 160679400; 

const TOKENS_ALLOCATED = [
  14070000 * 10**18,
  35175000 * 10**18,
  42210000 * 10**18,
  49245000 * 10**18
];

const WEI_GOALS = [
  217  * 10**18, // Stage 1 wei goal (ETH or chain governance currency)
  813 * 10**18, // Stage 2 wei goal (ETH or chain governance currency)
  1301 * 10**18, // Stage 3 wei goal (ETH or chain governance currency)
  1708 * 10**18 // Stage 4 wei goal (ETH or chain governance currency)
];

const BONUS = [20, 15, 10, 0];

const calcTokens = (tokens_allocated, wei_goal, bonus) => {
  let tokens = parseInt(tokens_allocated/wei_goal);
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
      await expect(testToken.transfer(sparksoICO.address, ICO_SUPPLY)).to.emit(
        testToken,
        "Transfer"
      );
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ICO_SUPPLY);
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ICO_SUPPLY);

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
        "Sparkso ICO: Amount need to be superior to the minimum wei defined."
      );

      // check wei raised in the contract is equal to 0
      expect(await sparksoICO.getVestingSchedulesTotalAmount()).to.equal(0);

      // purchase tokens
      await expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, openingTime),{
            value: ethers.utils.parseEther("1"),
          })
      ).to.emit(sparksoICO, "TokensPurchase");

      // check wei raised in the contract is equal to 1
      expect(await sparksoICO.weiRaised()).to.equal(
        ethers.utils.parseEther("1")
      );

      // check the purchase addresses counter
      expect(await sparksoICO.countAdresses()).to.equal(1);

      // check that beneficiary cannot purchase a second time
      expect(
        sparksoICO
          .connect(beneficiary)
          .buyTokens(beneficiary.address, openingTime, buildSignature(beneficiary, openingTime), {
            value: ethers.utils.parseEther("1"),
          })
      ).to.be.revertedWith(
        "Sparkso ICO: One transaction per wallet for the 500 first."
      );

      // set addresses counter to 501 and switch minimum wei for first stage
      await sparksoICO.setCountAddresses(501);
      const beneficiary2 = addr2;

      var value = ethers.utils.parseEther("217");
      // purchase all the first stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary2)
          .buyTokens(beneficiary2.address, openingTime, buildSignature(beneficiary2, openingTime), { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary3 = addr3;
      value = ethers.utils.parseEther("812");
      // purchase all the second stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary3)
          .buyTokens(beneficiary3.address, openingTime, buildSignature(beneficiary3, openingTime), { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary4 = addr4;
      value = ethers.utils.parseEther("1301");

      // purchase all the third stage tokens
      await expect(
        sparksoICO
          .connect(beneficiary4)
          .buyTokens(beneficiary4.address, openingTime, buildSignature(beneficiary4, openingTime), { value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary5 = addr5;
      value = ethers.utils.parseEther("1708");

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
      var tokens = 1 * calcTokens(TOKENS_ALLOCATED[0], WEI_GOALS[0], 30); // 30% bonus for first beneficiary

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
      tokens = 217 * calcTokens(TOKENS_ALLOCATED[0], WEI_GOALS[0], BONUS[0]);

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

      const b3_tokens = 40400857;//812 * calcTokens(TOKENS_ALLOCATED[1], WEI_GOALS[1], BONUS[1]);
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
      expect(releasableTokens).to.equal(Math.round(b3_tokens /9));

      const b4_tokens = 1301 * calcTokens(TOKENS_ALLOCATED[2], WEI_GOALS[2], BONUS[2]);

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
          .release(vestingScheduleId, b3_tokens - releasableTokens)
      )
        .to.emit(testToken, "Transfer")
        .withArgs(
          sparksoICO.address,
          beneficiary3.address,
          b3_tokens - releasableTokens
        );

      // last beneficiary
      const b5_tokens = 1708 * calcTokens(TOKENS_ALLOCATED[3], WEI_GOALS[3], BONUS[3]);
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
      await expect(testToken.transfer(sparksoICO.address, ICO_SUPPLY)).to.emit(
        testToken,
        "Transfer"
      );
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ICO_SUPPLY);
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ICO_SUPPLY);

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
            value: ethers.utils.parseEther("1"),
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
    it("Should check the updating and delaying functionalities", async function () {

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
      await expect(testToken.transfer(sparksoICO.address, ICO_SUPPLY)).to.emit(
        testToken,
        "Transfer"
      );
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ICO_SUPPLY);
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ICO_SUPPLY);

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
            value: ethers.utils.parseEther("100"),
          })
      ).to.emit(sparksoICO, "TokensPurchase");

      let newWeiGoal = ethers.utils.parseEther("281");
      await sparksoICO.updateICO(newWeiGoal, [ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.10")]);
      
      const beneficiary2 = addr2;
      // purchase tokens
      await expect(
        sparksoICO
          .connect(beneficiary2)
          .buyTokens(beneficiary2.address, openingTime, buildSignature(beneficiary2, openingTime),{
            value: ethers.utils.parseEther("181"),
          })
      ).to.emit(sparksoICO, "TokensPurchase");

      expect(
        await sparksoICO.currentStage()
      ).to.be.equal(1);
      
      const b1_tokens = 8428940;//100 * calcTokens(TOKENS_ALLOCATED[0], WEI_GOALS[0], 30);
      
      const b2_tokens = 7333359;//181 * calcTokens(TOKENS_ALLOCATED[0] - b1_tokens*10**18, newWeiGoal - 100*10**18 , 30);

      expect(await sparksoICO.getVestingSchedulesTotalAmount()).to.be.equal(b1_tokens + b2_tokens);
      
      expect(await sparksoICO.closingTime()).to.be.equal(closingTime)

      let delay = 1 * 24 * 3600;

      await sparksoICO.connect(owner).delayICO(delay);

      // set time to closing time to release tokens
      await sparksoICO.setCurrentTime(closingTime + 10);

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
