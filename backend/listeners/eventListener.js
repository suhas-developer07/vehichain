import { contract } from "../config/contract.js";
import VehicleIndex from "../models/VehicleIndex.js";
import RecordIndex from "../models/RecordIndex.js";

const RECORD_TYPES = ["SERVICE", "ACCIDENT", "INSURANCE", "OWNERSHIP_TRANSFER", "INSPECTION"];

/**
 * Event listener that keeps MongoDB in sync with on-chain events.
 * IMPORTANT: The blockchain is the source of truth. If Mongo and the chain
 * ever disagree, the chain wins. This listener is best-effort cache sync.
 */
export function startEventListener() {
  console.log("Starting event listener...");

  // Listen for VehicleRegistered events
  contract.on("VehicleRegistered", async (vin, owner, timestamp, event) => {
    try {
      console.log(`[Event] VehicleRegistered: ${vin} by ${owner}`);
      await VehicleIndex.findOneAndUpdate(
        { vin },
        {
          vin,
          currentOwner: owner,
          registeredAt: new Date(Number(timestamp) * 1000),
          lastUpdatedAt: new Date(Number(timestamp) * 1000),
          recordCount: 0,
        },
        { upsert: true, new: true }
      );
      console.log(`[DB] Upserted VehicleIndex for ${vin}`);
    } catch (err) {
      console.error(`[Event] Error handling VehicleRegistered:`, err.message);
    }
  });

  // Listen for RecordAdded events
  contract.on("RecordAdded", async (vin, recordType, recordedBy, timestamp, event) => {
    try {
      console.log(`[Event] RecordAdded: ${vin}, type=${RECORD_TYPES[recordType]}`);

      // Get the transaction hash
      const txHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;

      // Fetch the latest record from the contract's history
      const history = await contract.getHistory(vin);
      const latestRecord = history[history.length - 1];

      if (latestRecord) {
        await RecordIndex.create({
          vin,
          recordType: RECORD_TYPES[Number(recordType)],
          dataHash: latestRecord.dataHash,
          description: latestRecord.description,
          recordedBy: latestRecord.recordedBy,
          timestamp: new Date(Number(latestRecord.timestamp) * 1000),
          txHash,
          blockNumber,
        });

        // Increment record count on VehicleIndex
        await VehicleIndex.findOneAndUpdate(
          { vin },
          { $inc: { recordCount: 1 }, lastUpdatedAt: new Date(Number(timestamp) * 1000) }
        );

        console.log(`[DB] Inserted RecordIndex for ${vin}`);
      }
    } catch (err) {
      console.error(`[Event] Error handling RecordAdded:`, err.message);
    }
  });

  // Listen for OwnershipTransferred events
  contract.on("OwnershipTransferred", async (vin, from, to, timestamp, event) => {
    try {
      console.log(`[Event] OwnershipTransferred: ${vin} from ${from} to ${to}`);
      await VehicleIndex.findOneAndUpdate(
        { vin },
        { currentOwner: to, lastUpdatedAt: new Date(Number(timestamp) * 1000) }
      );
      console.log(`[DB] Updated owner for ${vin}`);
    } catch (err) {
      console.error(`[Event] Error handling OwnershipTransferred:`, err.message);
    }
  });

  console.log("Event listener started successfully.");
}
