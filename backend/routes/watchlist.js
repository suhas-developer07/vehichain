import { Router } from "express";
import {
  addWatchlistEntry,
  listWatchlist,
  resolveWatchlistEntry,
} from "../controllers/watchlistController.js";

const router = Router();

router.get("/", listWatchlist);
router.post("/", addWatchlistEntry);
router.post("/:id/resolve", resolveWatchlistEntry);

export default router;
