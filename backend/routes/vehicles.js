import { Router } from "express";
import { getVehicleDetail, listVehicles } from "../controllers/vehicleController.js";
import { getVehicleRecords } from "../controllers/recordController.js";

const router = Router();

router.get("/", listVehicles);
router.get("/:vin", getVehicleDetail);
router.get("/:vin/records", getVehicleRecords);

export default router;
