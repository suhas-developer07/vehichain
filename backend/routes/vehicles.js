import { Router } from "express";
import {
  getVehicleDetail,
  getVehiclePassport,
  getVehiclePassportPdf,
  getVehicleTrust,
  listVehicles,
} from "../controllers/vehicleController.js";
import { getVehicleRecords } from "../controllers/recordController.js";
import { uploadVehiclePhoto } from "../controllers/photoController.js";
import { vehiclePhotoUpload } from "../middleware/upload.js";

const router = Router();

router.get("/", listVehicles);
router.post("/:vin/photo", vehiclePhotoUpload.single("photo"), uploadVehiclePhoto);
router.get("/:vin/trust", getVehicleTrust);
router.get("/:vin/passport", getVehiclePassport);
router.get("/:vin/passport.pdf", getVehiclePassportPdf);
router.get("/:vin", getVehicleDetail);
router.get("/:vin/records", getVehicleRecords);

export default router;
