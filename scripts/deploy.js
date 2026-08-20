const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying VehicleRegistry...");

  const VehicleRegistry = await hre.ethers.getContractFactory("VehicleRegistry");
  const vehicleRegistry = await VehicleRegistry.deploy();
  await vehicleRegistry.waitForDeployment();

  const address = await vehicleRegistry.getAddress();
  console.log(`VehicleRegistry deployed to: ${address}`);

  // --- Update .env with CONTRACT_ADDRESS ---
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  // Replace or append CONTRACT_ADDRESS
  if (envContent.includes("CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/g,
      `CONTRACT_ADDRESS=${address}`
    );
  } else {
    envContent += `\nCONTRACT_ADDRESS=${address}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log("Updated .env with CONTRACT_ADDRESS");

  // --- Copy ABI to frontend and backend ---
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "VehicleRegistry.sol",
    "VehicleRegistry.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiJson = JSON.stringify(artifact.abi, null, 2);

  const frontendAbiPath = path.join(
    __dirname,
    "..",
    "frontend",
    "src",
    "contract",
    "abi.json"
  );
  const backendAbiPath = path.join(
    __dirname,
    "..",
    "backend",
    "config",
    "abi.json"
  );

  fs.writeFileSync(frontendAbiPath, abiJson);
  console.log(`Copied ABI to ${frontendAbiPath}`);

  fs.writeFileSync(backendAbiPath, abiJson);
  console.log(`Copied ABI to ${backendAbiPath}`);

  // --- Update frontend config with contract address ---
  const frontendConfigPath = path.join(
    __dirname,
    "..",
    "frontend",
    "src",
    "contract",
    "config.js"
  );
  let configContent = fs.readFileSync(frontendConfigPath, "utf8");
  configContent = configContent.replace(
    /contractAddress:\s*["']0x[0-9a-fA-F]+["']/,
    `contractAddress: "${address}"`
  );
  fs.writeFileSync(frontendConfigPath, configContent);
  console.log(`Updated frontend config with contract address`);

  console.log("\nDeployment complete!");
  console.log(`Contract address: ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
