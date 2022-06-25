async function main() {
  const [deployer] = await ethers.getSigners();
  const wallet = '0xdec44382eaed2954e170bd2a36381a9b06627332'; // Get all Sparkso tokens

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("Sparkso");
  const token = await Token.deploy(wallet);

  console.log("Token address:", token.address);

  const SparksoICO = await ethers.getContractFactory("SparksoICO");
  const sparksoICO = await SparksoICO.deploy(deployer.address, wallet, token.address, '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0', '0x73366Fe0AA0Ded304479862808e02506FE556a98');
  console.log(
    "SparksoICO address:",
    sparksoICO.address,
    "\nICO wallet:",
    wallet
  );
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
