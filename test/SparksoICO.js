const { expect } = require("chai");

const ICO_SUPPLY = 160679400;
const RATE = [
  64866, 
  43244, 
  32433, 
  28829
]

const BONUS = [
  20,
  15,
  10,
  0
]

describe("TokenVesting", function () {
  let Token;
  let testToken;
  let SparksoICO;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  before(async function () {
    Token = await ethers.getContractFactory("Token");
    SparksoICO = await ethers.getContractFactory("MockSparksoICO");
  });
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    testToken = await Token.deploy(owner);
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
      const sparksoICO = await SparksoICO.deploy(wallet, Token.address);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

      // send tokens ICO allocated
      await expect(testToken.transfer(sparksoICO.address, ICO_SUPPLY))
        .to.emit(testToken, "Transfer")
        .whithArgs(owner.address, sparksoICO.address, ICO_SUPPLY);
      const sparksoICOBalance = await testToken.balanceOf(
        sparksoICO.address
      );
      expect(sparksoICOBalance).to.equal(ICO_SUPPLY);
      expect(await tokenVesting.getWithdrawableAmount()).to.equal(ICO_SUPPLY);

      const openingTime = 1646485200;
      const beneficiary = addr1;
      
      // check that is it not possible to purchase token before opening time
      await expect(
        beneficiary.sendTransaction({to: sparksoICO.address, value: 100})
      ).to.be.revertedWith(
        "Sparkso ICO: ICO didn't start."
      );

      // set current time to the open ICO
      await sparksoICO.setCurrentTime(openingTime);

      // check that benefiaciary cannot purchased less token than the minimum requiered
      await expect(
        beneficiary.sendTransaction({to: sparksoICO.address, value: 0.1})
      ).to.be.revertedWith(
        "Sparkso ICO: Amount need to be superior to the minimum wei defined."
      );

      // purchase tokens
      await expect(
        beneficiary.sendTransaction({to: sparksoICO.address, value: 1})
      ).to.emit(sparksoICO, "TokensPurchase");
      
      // check the balance of the beneficiary
      expect(await testToken.balanceOf(beneficiary.address)).to.equal(
        RATE[0] +     // Tokens
        0.3 * RATE[0] // Bonus (first 500 it is 30% bonus)
      );

      // check wei raised in the contract
      expect(await sparksoICO.weiRaised()).to.equal(1);

      // check the purchase addresses counter
      expect(await sparksoICO.countAdresses()).to.equal(1);

      // check that beneficiary cannot purchase another time
      expect(await 
        beneficiary.sendTransaction({to: sparksoICO.address, value: 1})
      ).to.be.revertedWith(
        "Sparkso ICO: One transaction per wallet for the 500 first."
      );

      // set addresses counter to 501 and switch minimum wei for first stage
      await sparksoICO.setCountAddresses(501);

      const value = 217;
      // purchase tokens
      await expect(
        beneficiary.sendTransaction({to: sparksoICO.address, value: value})
      ).to.emit(sparksoICO, "TokensPurchase");
      
      // check the balance of the beneficiary
      expect(await testToken.balanceOf(beneficiary.address)).to.equal(
        value * RATE[0] +     // Tokens 
        value * BONUS[0] * RATE[0] // Bonus
      );
    });
  });
});
