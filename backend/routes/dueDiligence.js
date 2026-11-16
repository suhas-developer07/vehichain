import { Router } from "express";
import {
  compareDueDiligence,
  getDueDiligencePdf,
  getDueDiligenceReport,
} from "../controllers/dueDiligenceController.js";

const router = Router();

// Static routes must be declared before the :vin wildcard.
router.get("/compare", compareDueDiligence);
router.get("/:vin/report.pdf", getDueDiligencePdf);
router.get("/:vin", getDueDiligenceReport);

export default router;
