import { contract } from "../config/contract.js";
import WatchlistEntry from "../models/WatchlistEntry.js";
import { loadVehicleBundle, cacheTrust } from "./vehicleController.js";
import {
  buildDueDiligence,
  compareReports,
  summarizeForComparison,
} from "../services/dueDiligence.js";
import { buildDueDiligencePdf } from "../services/dueDiligenceReport.js";
import { resolveAppUrl } from "../services/passport.js";

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function shareUrlFor(req, vin) {
  return `${resolveAppUrl(req)}/due-diligence/${encodeURIComponent(vin)}`;
}

/**
 * Read the ownership trail straight from chain events. The event carries
 * from/to addresses, which the record history alone cannot reconstruct.
 */
async function loadOwnershipEvents(vin) {
  try {
    const [registrations, transfers] = await Promise.all([
      contract.queryFilter("VehicleRegistered", 0, "latest"),
      contract.queryFilter("OwnershipTransferred", 0, "latest"),
    ]);

    const events = [];
    for (const event of registrations) {
      if (event.args.vin !== vin) continue;
      events.push({
        kind: "REGISTRATION",
        at: new Date(Number(event.args.timestamp) * 1000).toISOString(),
        from: null,
        to: event.args.owner,
        txHash: event.transactionHash,
      });
    }
    for (const event of transfers) {
      if (event.args.vin !== vin) continue;
      events.push({
        kind: "TRANSFER",
        at: new Date(Number(event.args.timestamp) * 1000).toISOString(),
        from: event.args.from,
        to: event.args.to,
        txHash: event.transactionHash,
      });
    }

    return events;
  } catch (err) {
    // Events are an enhancement; the report still works without them.
    console.warn(`Could not load ownership events for ${vin}:`, err.message);
    return [];
  }
}

async function loadWatchlistMatches(vin, owner) {
  const filters = [{ vin: String(vin).toUpperCase() }];
  if (owner) filters.push({ owner: String(owner).toLowerCase() });

  const entries = await WatchlistEntry.find({
    active: true,
    $or: filters,
  })
    .sort({ createdAt: -1 })
    .lean();

  return entries.map((entry) => {
    const vinMatch =
      entry.vin && entry.vin.toUpperCase() === String(vin).toUpperCase();
    const ownerMatch =
      entry.owner &&
      owner &&
      entry.owner.toLowerCase() === String(owner).toLowerCase();

    return {
      id: String(entry._id),
      vin: entry.vin || null,
      owner: entry.owner || null,
      reason: entry.reason,
      severity: entry.severity,
      createdAt: entry.createdAt,
      matchedOn:
        vinMatch && ownerMatch ? "VIN_AND_OWNER" : ownerMatch ? "OWNER" : "VIN",
    };
  });
}

/**
 * Build the full report for one VIN. This is the single source used by the
 * JSON endpoint, the PDF endpoint, and the comparison endpoint.
 */
async function buildReport(vin) {
  const bundle = await loadVehicleBundle(vin);
  await cacheTrust(vin, bundle.trust, bundle.vehicle);

  const [ownershipEvents, watchlistMatches] = await Promise.all([
    loadOwnershipEvents(bundle.vehicle.vin),
    loadWatchlistMatches(bundle.vehicle.vin, bundle.vehicle.currentOwner),
  ]);

  const report = buildDueDiligence({
    ...bundle,
    ownershipEvents,
    watchlist: { matches: watchlistMatches },
  });

  return { report, index: bundle.index };
}

/**
 * GET /api/due-diligence/:vin
 * Shareable buyer due-diligence report with verdict, checklist and timeline.
 */
export async function getDueDiligenceReport(req, res, next) {
  try {
    const { vin } = req.params;
    const { report } = await buildReport(vin);
    const shareUrl = shareUrlFor(req, report.vin);

    res.json({ ...report, shareUrl });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/due-diligence/:vin/report.pdf
 * Printable version of the same due-diligence report.
 */
export async function getDueDiligencePdf(req, res, next) {
  try {
    const { vin } = req.params;
    const { report, index } = await buildReport(vin);
    const shareUrl = shareUrlFor(req, report.vin);
    const pdf = await buildDueDiligencePdf(report, index, shareUrl);
    const safeVin = String(report.vin).replace(/[^A-Za-z0-9_-]/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="due-diligence-${safeVin}.pdf"`
    );
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/due-diligence/compare?vins=VIN1,VIN2
 * Side-by-side trust comparison with a recommended winner.
 */
export async function compareDueDiligence(req, res, next) {
  try {
    const raw = String(req.query.vins || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const vins = [...new Set(raw)];
    if (vins.length !== 2) {
      throw fail(400, "Provide exactly two VINs: ?vins=VIN1,VIN2");
    }

    const [first, second] = await Promise.all(vins.map((vin) => buildReport(vin)));
    const firstSummary = summarizeForComparison(first.report);
    const secondSummary = summarizeForComparison(second.report);

    res.json({
      generatedAt: new Date().toISOString(),
      vehicles: [firstSummary, secondSummary],
      comparison: compareReports(firstSummary, secondSummary),
    });
  } catch (err) {
    next(err);
  }
}
