async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("SparksoToken");
  const token = await Token.deploy(deployer.address);

  console.log("Token address:", token.address);

  const SparksoICO = await ethers.getContractFactory("SparskoICO");
  const sparksoICO = await SparksoICO.deploy(token.address);
  console.log("SparksoICO address:", sparksoICO.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
