const { expect } = require("chai");

const ICO_SUPPLY = 160679400;

describe("Sparsko ICO", function () {
  let Token;
  let testToken;
  let SparksoICO;
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
    [owner, addr1, addr2, addr3, addr4, addr5, ...addrs] = await ethers.getSigners();
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
      const sparksoICO = await SparksoICO.deploy(testToken.address, wallet);
      await sparksoICO.deployed();
      expect((await sparksoICO.getToken()).toString()).to.equal(
        testToken.address
      );

      // send tokens to the ICO contract
      await expect(testToken.transfer(sparksoICO.address, ICO_SUPPLY))
        .to.emit(testToken, "Transfer")
      const sparksoICOBalance = await testToken.balanceOf(sparksoICO.address);
      expect(sparksoICOBalance).to.equal(ICO_SUPPLY);
      expect(await sparksoICO.getWithdrawableAmount()).to.equal(ICO_SUPPLY);

      const openingTime = 1646485200;
      const closingTime = openingTime + 4 * 30 * 24 * 3600; //By default 4 months
      const beneficiary = addr1;

      // check that is it not possible to purchase token before opening time
      await expect(
        sparksoICO
        .connect(beneficiary)
        .buyTokens(beneficiary.address, {value: ethers.utils.parseEther("100")})
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

      // check wei raised in the contract is equal to 0
      expect(await sparksoICO.getVestingSchedulesTotalAmount()).to.equal(0);

      // purchase tokens
      await expect(
        sparksoICO
        .connect(beneficiary)
        .buyTokens(beneficiary.address, {value: ethers.utils.parseEther("1")})
      ).to.emit(sparksoICO, "TokensPurchase");

      // check wei raised in the contract is equal to 1
      expect(await sparksoICO.weiRaised()).to.equal(ethers.utils.parseEther("1"));

      // check the purchase addresses counter
      expect(await sparksoICO.countAdresses()).to.equal(1);

      // check that beneficiary cannot purchase a second time
      expect(
        sparksoICO
        .connect(beneficiary)
        .buyTokens(beneficiary.address, {value: ethers.utils.parseEther("1")})
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
        .buyTokens(beneficiary2.address, {value: value})
      ).to.emit(sparksoICO, "TokensPurchase");

      const beneficiary3 = addr3;
      value = ethers.utils.parseEther("812")
      // purchase all the second stage tokens
      await expect(
        sparksoICO
        .connect(beneficiary3)
        .buyTokens(beneficiary3.address, {value: value})
      ).to.emit(sparksoICO, "TokensPurchase");


      const beneficiary4 = addr4;
      value = ethers.utils.parseEther("1301")

      // purchase all the third stage tokens
      await expect(
        sparksoICO
        .connect(beneficiary4)
        .buyTokens(beneficiary4.address, {value: value})
      ).to.emit(sparksoICO, "TokensPurchase");
    
      
      const beneficiary5 = addr5;
      value = ethers.utils.parseEther("1708")

      // purchase all the last stage tokens
      await expect(
        sparksoICO
        .connect(beneficiary5)
        .buyTokens(beneficiary5.address, {value: value})
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
      var tokens = 84325;

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
      tokens = 16891106;

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

      const b3_tokens = 40381247
      // beneficiary 3 should not be able to release his token until the cliff + slice period
      await expect(
        sparksoICO.connect(beneficiary3).release(vestingScheduleId, b3_tokens)
      ).to.be.revertedWith(
        "TokenVesting: cannot release tokens, not enough vested tokens"
      );
      
      // change time to first slice third beneficiary should be able to release tokens
      await sparksoICO.setCurrentTime(closingTime + 10 * 24 * 3600)

     
      var releasableTokens = await sparksoICO.computeReleasableAmount(vestingScheduleId)
      expect(releasableTokens).to.equal(Math.round(b3_tokens/9)) 

      const b4_tokens = 46414866;

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



      // change time to first slice third beneficiary should be able to release tokens
      // await sparksoICO.setCurrentTime(closingTime + 10 * 24 * 3600)
      
      
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
       * check that first beneficiary can release all his tokens
       * check the balance of the first beneficiary
       * check that second beneficiary can release all his tokens bought at the first ICO stage
       * check the balance of the second beneficiary
       * beneficiary 3 should not be able to release his token until the cliff + slice period
       * should revert the fourth beneficiary attempt to relase tokens because of the cliff period
       */
    });
  });
});
