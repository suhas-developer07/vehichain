import { Router } from "express";
import {
  getActivityFeed,
  getAnalyticsSummary,
} from "../controllers/analyticsController.js";

const router = Router();

router.get("/summary", getAnalyticsSummary);
router.get("/activity", getActivityFeed);

export default router;
