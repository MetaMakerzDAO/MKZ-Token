const { expect } = require("chai");

const ICO_SUPPLY = 160679400;
const RATE = [64866, 43244, 32433, 28829];

const BONUS = [20, 15, 10, 0];

describe("Sparsko ICO", function () {
  let Token;
  let testToken;
  let SparksoICO;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  before(async function () {
    Token = await ethers.getContractFactory("Sparkso");
    SparksoICO = await ethers.getContractFactory("MockSparksoICO");
  });
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    testToken = await Token.deploy(owner.address);
    await testToken.deployed();
  });

  describe("ICO", function () {
    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await testToken.balanceOf(owner.address);
      expect(await testToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Should purchase token at the first stage of the ICO", async function () {
      const wallet = owner.address;
      // deploy ICO contract
      const sparksoICO = await SparksoICO.deploy(testToken.address, wallet);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

      // send tokens ICO allocated
      await expect(testToken.transfer(sparksoICO.address, ICO_SUPPLY))
        .to.emit(testToken, "Transfer")
        .withArgs(wallet, sparksoICO.address, ICO_SUPPLY);
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ICO_SUPPLY);
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ICO_SUPPLY);

      const openingTime = 1646485200;
      const closingTime = openingTime * 3 * 30 * 24 * 3600; //By default 3 months
      const beneficiary = addr1;

      // check that is it not possible to purchase token before opening time
      await expect(
        sparksoICO
        .connect(beneficiary)
        .buyTokens(beneficiary.address, {value: 100})
      ).to.be.revertedWith("Sparkso ICO: ICO didn't start.");

      // set current time to the open ICO
      await sparksoICO.setCurrentTime(openingTime);

      // check that benefiaciary cannot purchased less token than the minimum requiered
      await expect(
        sparksoICO
        .connect(beneficiary)
        .buyTokens(beneficiary.address, {value: 0})
      ).to.be.revertedWith(
        "Sparkso ICO: Amount need to be superior to the minimum wei defined."
      );
      // Calculate number of tokens bought
      const tokens = (value) =>{
        return value * RATE[0] * ( 1 + BONUS[0] );
      } 

      // purchase tokens
      await expect(
        sparksoICO
        .connect(beneficiary)
        .buyTokens(beneficiary.address, {value: 1})
      ).to.emit(sparksoICO, "TokensPurchase");

      // check wei raised in the contract
      expect(await sparksoICO.weiRaised()).to.equal(1);

      // check the purchase addresses counter
      expect(await sparksoICO.countAdresses()).to.equal(1);

      // check that beneficiary cannot purchase a second time
      expect(
        sparksoICO
        .connect(beneficiary)
        .buyTokens(beneficiary.address, {value: 1})
      ).to.be.revertedWith(
        "Sparkso ICO: One transaction per wallet for the 500 first."
      );

      // set addresses counter to 501 and switch minimum wei for first stage
      await sparksoICO.setCountAddresses(501);

      const value = 217;
      // purchase tokens
      await expect(
        beneficiary.sendTransaction({ to: sparksoICO.address, value: value })
      ).to.emit(sparksoICO, "TokensPurchase");

      // set time to release tokens
      await sparksoICO.setCurrentTime(closingTime + 1);

      // compute vesting schedule id
      const vestingScheduleId =
        await tokenVesting.computeVestingScheduleIdForAddressAndIndex(
          beneficiary.address,
          0
        );

      // check that user can release all his tokens
      await expect(
        tokenVesting.connect(beneficiary).release(vestingScheduleId, tokens)
      )
      .to.emit(testToken, "Transfer")
      .withArgs(sparksoICO.address, beneficiary.address, tokens);

      // check the balance of the beneficiary
      expect(await testToken.balanceOf(beneficiary.address)).to.equal(tokens);
    });
  });
});
