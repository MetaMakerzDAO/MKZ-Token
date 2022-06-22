async function main() {
  const [deployer] = await ethers.getSigners();
  const wallet = deployer.address; // Get all Sparkso tokens

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("Sparkso");
  const token = await Token.deploy(wallet);

  console.log("Token address:", token.address);

  const SparksoICO = await ethers.getContractFactory("SparksoICO");
  const sparksoICO = await SparksoICO.deploy(token.address, wallet);
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
