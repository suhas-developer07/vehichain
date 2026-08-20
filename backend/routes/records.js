import { Router } from "express";
import { getVehicleRecords, getRecentRecords } from "../controllers/recordController.js";

const router = Router();

router.get("/recent", getRecentRecords);
router.get("/:vin", getVehicleRecords);

export default router;
