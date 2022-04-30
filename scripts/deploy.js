// deploy on local node
//1.npx hardhat node
//2. open new terminal
//3. npx hardhat run --network localhost scripts/deploy.js



const hre = require("hardhat");
const ethers = hre.ethers


async function main() {

  const [signer, admin1, admin2, admin3, user1, user2, user3] = await ethers.getSigners()

  console.log("Deploying contracts with the account:", signer.address);

  const RealEstate = await hre.ethers.getContractFactory("RealEstate");
  const real = await RealEstate.deploy([admin1.address, admin2.address, admin3.address],
     [user1.address, user2.address, user3.address]);

  await real.deployed();

  console.log("RealEstate deployed to:", real.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
