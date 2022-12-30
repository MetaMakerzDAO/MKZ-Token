const { ethers, upgrades } = require("hardhat");

const beneficiaries = [
  '0xd074D838b9dCE6233467Ae0c57680248150920E0',
  '0xEb256eA946FA147804E280Ce0d81fe9B3275Ae19',
  '0x9Da3a6A65905B30AfAb40C5BfEA3946c56EbD699',
  '0x1EDd2d030c5B3d6560CB7A6C6b5382E91fBf380B',
  '0x522Fa5024bd27F3D5B19dc5634B1A174F459f513',
  '0x197ed5DCED6693f77159F3541a1c1eaB8BC3Fc60',
  '0x79bc39Ad74C17BD58e4fc7A9475ee79571C3e9f0',
  '0x65186A4A2E24FE0362C0a56D2b18824Ce1A1d9a0',
  '0x961aC59BaC1B2864260Caf3D739fd09A5eC039a8',
  '0x2A4052ffCf084E609253944624cdF05A4220dB26',
  '0x1e89dD1b0191B0605e739eE58b57fBFDBfe247B9',
  '0xca6a5Ea7C9DF9beC984141D3b688c1eb441fd0da',
  '0x8A58a54311e4D68D7a70470b11AE4d9E1A53c1EA',
  '0x5CeA9445F5f49ed82E25FeA47C9F5c79cE7880Ca',
  '0x5aF4953B3dbb2477DaD7231FC46e6A5442299F96',
  '0x1D9d785f33E8137A58C5dd800Eb6DB1d0EC6A8B7',
  '0x947aB686fa12D9b76d58B168bE08468B29a61e8e',
  '0x7d98a975E512DA36703696Abac011853D767A1B4',
  '0x147e604B0b3760Ee443D795EFd5f77Cd14BC0C3a',
  '0x89A01479268309e9998Fe055EC604B137ab382ed',
  '0x178c5e45B9daF96FaE5861467e5050Cf19Ee18d7',
  '0x5ab6ef75B27d2D1322c2D989a7122eA6Ff9753be',
  '0xd257eaDe830d567e369D02B25bE54080966Ac4d9',
  '0x38f014620fb1a491CFdFb998b2105c3a9a93642a',
  '0x3922B5745B6A1D8F0f356aB1F8d6Bf7e10f76634'
];
const amounts = [
  ethers.utils.parseEther('371429.000000000'),
  ethers.utils.parseEther('178571.000000000'),
  ethers.utils.parseEther('1135714.000000000'),
  ethers.utils.parseEther('1785143.000000000'),
  ethers.utils.parseEther('357143.000000000'),
  ethers.utils.parseEther('450000.000000000'),
  ethers.utils.parseEther('71429.000000000'),
  ethers.utils.parseEther('71429.000000000'),
  ethers.utils.parseEther('75000.000000000'),
  ethers.utils.parseEther('250000.000000000'),
  ethers.utils.parseEther('145000.000000000'),
  ethers.utils.parseEther('1071429.000000000'),
  ethers.utils.parseEther('384429.000000000'),
  ethers.utils.parseEther('71429.000000000'),
  ethers.utils.parseEther('142857.000000000'),
  ethers.utils.parseEther('178572.000000000'),
  ethers.utils.parseEther('71429.000000000'),
  ethers.utils.parseEther('71429.000000000'),
  ethers.utils.parseEther('35715.000000000'),
  ethers.utils.parseEther('71429.000000000'),
  ethers.utils.parseEther('35715.000000000'),
  ethers.utils.parseEther('71429.000000000'),
  ethers.utils.parseEther('357142.857142857'),
  ethers.utils.parseEther('357142.857142857'),
  ethers.utils.parseEther('714285.714285714')
];
const slices = [
  3,
  3,
  3,
  3,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const multiSig = "0x29cDA60b0BF9B7f559E44bD24134e0b856979E86";
  const amountsInTokenDrop = 10000000

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("MKZ");
  let token = await upgrades.deployProxy(Token, [deployer.address], { kind: 'uups' });
  await token.deployed();

  console.log("Token address:", token.address);

  TokenDrop = await ethers.getContractFactory("TokenDrop");
  tokenDrop = await TokenDrop.deploy(token.address);
  await tokenDrop.deployed();

  console.log("TokenDrop address:", token.address);

  await token.connect(deployer).transfer(tokenDrop.address, ethers.utils.parseEther(`${amountsInTokenDrop}`));
  await token.connect(deployer).transfer(multiSig, ethers.utils.parseEther(`${240000000 - amountsInTokenDrop}`));
  await tokenDrop.addInvestors(beneficiaries, amounts, slices);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
