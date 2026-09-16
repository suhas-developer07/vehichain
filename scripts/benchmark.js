/**
 * Performance benchmark for VehicleRegistry
 * Measures: gas per operation, read latency (view calls), write throughput (TPS)
 *
 * Run: npx hardhat run scripts/benchmark.js
 * (uses in-process Hardhat network — no Ganache needed)
 */
const hre = require("hardhat");

const RECORD_TYPES = ["SERVICE", "ACCIDENT", "INSURANCE", "OWNERSHIP_TRANSFER", "INSPECTION"];

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  const { ethers } = hre;
  const signers = await ethers.getSigners();
  const [admin, serviceCenter, insurance, buyer] = signers;

  console.log("=".repeat(64));
  console.log("  VEHICLE REGISTRY — PERFORMANCE BENCHMARK");
  console.log("=".repeat(64));

  // ---- Deploy ----
  let t0 = Date.now();
  const Factory = await ethers.getContractFactory("VehicleRegistry");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();
  const deployMs = Date.now() - t0;
  const deployRcpt = await ethers.provider.getTransactionReceipt(registry.deploymentTransaction().hash);
  console.log(`\n[Deploy]                 gas=${deployRcpt.gasUsed}  wall=${deployMs}ms`);

  // ---- Setup roles ----
  await (await registry.assignRole(serviceCenter.address, 2)).wait();
  await (await registry.assignRole(insurance.address, 3)).wait();

  // ---- Register N vehicles, track gas ----
  const N_VEHICLES = 100;
  const N_RECORDS = 500;
  const N_TRANSFERS = 50;

  const regGas = [];
  t0 = Date.now();
  for (let i = 0; i < N_VEHICLES; i++) {
    const tx = await registry
      .connect(admin)
      .registerVehicle(`BENCH${String(i).padStart(6, "0")}`, "Toyota", "Camry", 2023);
    const rcpt = await tx.wait();
    regGas.push(rcpt.gasUsed);
  }
  const regMs = Date.now() - t0;
  const regAvgGas = regGas.reduce((a, b) => a + b, 0n) / BigInt(regGas.length);
  console.log(
    `[registerVehicle] x${N_VEHICLES}  avgGas=${regAvgGas}  tx/s=${((N_VEHICLES / regMs) * 1000).toFixed(1)}`
  );

  // ---- Add records ----
  const recGas = [];
  const vins = Array.from({ length: N_VEHICLES }, (_, i) => `BENCH${String(i).padStart(6, "0")}`);
  t0 = Date.now();
  for (let i = 0; i < N_RECORDS; i++) {
    const vin = vins[i % N_VEHICLES];
    const type = i % 2 === 0 ? 0 : 2; // SERVICE / INSURANCE
    const sender = i % 2 === 0 ? serviceCenter : insurance;
    const tx = await registry
      .connect(sender)
      .addRecord(vin, type, `QmBenchHash${i}`, `Benchmark record ${i}`);
    const rcpt = await tx.wait();
    recGas.push(rcpt.gasUsed);
  }
  const recMs = Date.now() - t0;
  const recAvgGas = recGas.reduce((a, b) => a + b, 0n) / BigInt(recGas.length);
  console.log(
    `[addRecord]       x${N_RECORDS}  avgGas=${recAvgGas}  tx/s=${((N_RECORDS / recMs) * 1000).toFixed(1)}`
  );

  // ---- Transfers ----
  const xferGas = [];
  t0 = Date.now();
  for (let i = 0; i < N_TRANSFERS; i++) {
    const vin = vins[i];
    const tx = await registry.connect(admin).transferOwnership(vin, buyer.address);
    const rcpt = await tx.wait();
    xferGas.push(rcpt.gasUsed);
  }
  const xferMs = Date.now() - t0;
  const xferAvgGas = xferGas.reduce((a, b) => a + b, 0n) / BigInt(xferGas.length);
  console.log(
    `[transferOwnership] x${N_TRANSFERS}  avgGas=${xferAvgGas}  tx/s=${((N_TRANSFERS / xferMs) * 1000).toFixed(1)}`
  );

  // ---- Read latency ----
  const readVeh = [];
  for (let i = 0; i < 50; i++) {
    t0 = performance.now();
    await registry.getVehicle(vins[i]);
    readVeh.push(performance.now() - t0);
  }
  readVeh.sort((a, b) => a - b);

  // History read scales with record count — measure small vs large history
  const readHistSmall = [];
  for (let i = 0; i < 20; i++) {
    const hist = await registry.getHistory(vins[i]); // warm
    t0 = performance.now();
    await registry.getHistory(vins[i]);
    readHistSmall.push(performance.now() - t0);
  }
  readHistSmall.sort((a, b) => a - b);

  console.log(`\n[Read] getVehicle        p50=${readVeh[Math.floor(readVeh.length / 2)].toFixed(2)}ms  p95=${percentile(readVeh, 95).toFixed(2)}ms`);
  console.log(`[Read] getHistory (~5 rec) p50=${readHistSmall[Math.floor(readHistSmall.length / 2)].toFixed(2)}ms  p95=${percentile(readHistSmall, 95).toFixed(2)}ms`);

  // ---- Count history records for largest vehicle ----
  const bigHist = await registry.getHistory(vins[0]);
  console.log(`[State] records on ${vins[0]}: ${bigHist.length} (array read scales linearly)`);

  console.log("\n" + "=".repeat(64));
  console.log("  BENCHMARK COMPLETE");
  console.log("=".repeat(64));
  console.log("\nCopy these numbers into docs/COMPARISON.md");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
