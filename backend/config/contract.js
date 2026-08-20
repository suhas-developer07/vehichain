import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:7545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  console.error("CONTRACT_ADDRESS is not set in environment variables");
  process.exit(1);
}

// Load ABI
const abiPath = path.join(__dirname, "abi.json");
const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));

const provider = new ethers.JsonRpcProvider(RPC_URL, parseInt(process.env.CHAIN_ID || "1337"));
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

export { provider, contract, CONTRACT_ADDRESS };
