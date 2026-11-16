import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { VEHICLE_PHOTOS_DIR } from "../config/paths.js";

const NAVY = "#1a1a2e";
const GRAY = "#6b7280";
const LIGHT = "#f8fafc";

const STATUS_STYLE = {
  pass: { bg: "#dcfce7", color: "#15803d", label: "PASS" },
  warn: { bg: "#fef3c7", color: "#b45309", label: "WARN" },
  fail: { bg: "#fee2e2", color: "#b91c1c", label: "FAIL" },
  info: { bg: "#e0f2fe", color: "#0369a1", label: "INFO" },
};

const SEVERITY_STYLE = {
  critical: { bg: "#fee2e2", color: "#991b1b" },
  high: { bg: "#fee2e2", color: "#b91c1c" },
  medium: { bg: "#fef3c7", color: "#b45309" },
  low: { bg: "#e0f2fe", color: "#0369a1" },
};

function pdfText(value) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00b7/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Unknown";
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Unknown";
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 19)} UTC`;
}

function shortAddress(address) {
  if (!address) return "Unknown";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function shortHash(hash) {
  if (!hash) return "-";
  return `${hash.slice(0, 14)}...${hash.slice(-8)}`;
}

function resolvePhotoPath(index) {
  if (!index?.photoPath) return null;
  if (!["image/jpeg", "image/png"].includes(index.photoMimeType)) return null;

  const resolved = path.resolve(index.photoPath);
  if (!resolved.startsWith(VEHICLE_PHOTOS_DIR + path.sep)) return null;

  try {
    if (!fs.statSync(resolved).isFile()) return null;
  } catch {
    return null;
  }
  return resolved;
}

function ensureSpace(doc, y, needed, onNewPage) {
  if (y + needed <= 752) return y;
  doc.addPage();
  return onNewPage ? onNewPage() : 52;
}

function drawSectionTitle(doc, title, y) {
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(NAVY);
  doc.text(title, 45, y);
  doc
    .moveTo(45, y + 15)
    .lineTo(550, y + 15)
    .lineWidth(0.5)
    .strokeColor("#e5e7eb")
    .stroke();
  return y + 23;
}

/**
 * Build the buyer due-diligence PDF entirely in memory.
 *
 * @param {object} report   Output of buildDueDiligence()
 * @param {object|null} index  Mongo vehicle index row (for the photo)
 * @param {string} shareUrl Public due-diligence URL encoded in the QR
 */
export async function buildDueDiligencePdf(report, index, shareUrl) {
  const qrBuffer = await QRCode.toBuffer(shareUrl, {
    margin: 1,
    width: 320,
    color: { dark: NAVY, light: "#ffffff" },
  });

  const doc = new PDFDocument({
    size: "A4",
    margin: 45,
    bufferPages: true,
    info: {
      Title: `Buyer Due Diligence - ${report.vin}`,
      Author: "Blockchain Vehicle Registry",
      Subject: "Blockchain-verified pre-purchase due diligence report",
    },
  });

  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Header ------------------------------------------------------------------
  doc.font("Helvetica-Bold").fontSize(20).fillColor(NAVY);
  doc.text("BUYER DUE DILIGENCE", 45, 40);
  doc.font("Helvetica").fontSize(9).fillColor(GRAY);
  doc.text("Pre-purchase risk report for a blockchain-registered vehicle", 45, 64);

  doc.image(qrBuffer, 474, 36, { width: 76 });
  doc.font("Helvetica").fontSize(6.5).fillColor(GRAY);
  doc.text("Scan to verify", 474, 116, { width: 76, align: "center" });

  doc
    .moveTo(45, 128)
    .lineTo(550, 128)
    .lineWidth(1)
    .strokeColor("#e5e7eb")
    .stroke();

  // Verdict -----------------------------------------------------------------
  const verdict = report.verdict;
  let y = 140;
  doc.roundedRect(45, y, 505, 104, 10).fillAndStroke(verdict.bg, verdict.border);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY);
  doc.text("VERDICT", 61, y + 12);

  doc.font("Helvetica-Bold").fontSize(19).fillColor(verdict.color);
  doc.text(pdfText(verdict.label).toUpperCase(), 61, y + 24, { lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
  doc.text(pdfText(verdict.headline), 61, y + 51, { width: 320 });

  doc.font("Helvetica").fontSize(8.5).fillColor("#374151");
  doc.text(pdfText(verdict.summary), 61, y + 66, { width: 330, height: 34 });

  // Score on the right of the verdict block.
  doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY);
  doc.text("TRUST SCORE", 410, y + 12, { width: 120, align: "right" });
  doc.font("Helvetica-Bold").fontSize(30).fillColor(report.trust.color);
  doc.text(String(report.trust.score), 410, y + 24, {
    width: 120,
    align: "right",
    lineBreak: false,
  });
  doc.font("Helvetica").fontSize(8).fillColor(GRAY);
  doc.text(
    `Grade ${report.trust.grade}  |  ${report.trust.riskLabel}`,
    396,
    y + 60,
    { width: 134, align: "right" }
  );
  doc.font("Helvetica").fontSize(8).fillColor("#374151");
  doc.text(
    `${report.scorecard.passed} pass / ${report.scorecard.warnings} warn / ${report.scorecard.failed} fail`,
    396,
    y + 74,
    { width: 134, align: "right" }
  );

  // Identity ----------------------------------------------------------------
  y += 120;
  y = drawSectionTitle(doc, "VEHICLE IDENTITY", y);

  const photoPath = resolvePhotoPath(index);
  doc.roundedRect(45, y, 138, 102, 7).fillAndStroke(LIGHT, "#e5e7eb");
  if (photoPath) {
    try {
      doc.image(photoPath, 48, y + 3, {
        fit: [132, 96],
        align: "center",
        valign: "center",
      });
    } catch {
      // Corrupt image: fall through to the placeholder.
    }
  } else {
    doc.font("Helvetica").fontSize(8).fillColor("#9ca3af");
    doc.text("NO PHOTO", 45, y + 46, { width: 138, align: "center" });
  }

  let factY = y;
  const fact = (label, value) => {
    doc.font("Helvetica").fontSize(6.5).fillColor(GRAY);
    doc.text(label.toUpperCase(), 198, factY, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827");
    doc.text(pdfText(value), 198, factY + 9, { width: 348 });
    factY += 20;
  };

  fact("VIN", report.vin);
  fact("Make / model", `${report.make} ${report.model}`);
  fact("Year", report.year);
  fact("Current owner", shortAddress(report.currentOwner));
  fact(
    "Registered",
    report.registeredAt ? formatDate(report.registeredAt) : "Not indexed"
  );

  // Alerts ------------------------------------------------------------------
  y += 112;
  if (report.alerts.length) {
    y = ensureSpace(doc, y, 40, () => 52);
    y = drawSectionTitle(doc, "RED FLAGS & WATCHLIST ALERTS", y);
    for (const alert of report.alerts.slice(0, 6)) {
      y = ensureSpace(doc, y, 34, () => 52);
      const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.medium;
      doc.roundedRect(45, y, 505, 30, 5).fill(style.bg);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(style.color);
      doc.text(
        `${alert.severity.toUpperCase()} - ${pdfText(alert.title)}`,
        56,
        y + 6,
        { width: 484 }
      );
      doc.font("Helvetica").fontSize(7).fillColor("#374151");
      doc.text(pdfText(alert.detail), 56, y + 17, { width: 484, height: 10 });
      y += 35;
    }
    y += 4;
  }

  // Checklist ---------------------------------------------------------------
  y = ensureSpace(doc, y, 48, () => 52);
  y = drawSectionTitle(doc, "DUE DILIGENCE CHECKLIST", y);

  for (const entry of report.checks) {
    const detail = pdfText(entry.detail);
    const detailHeight = doc
      .font("Helvetica")
      .fontSize(7.5)
      .heightOfString(detail, { width: 372 });
    const rowHeight = Math.max(26, detailHeight + 16);

    y = ensureSpace(doc, y, rowHeight + 4, () => 52);

    const style = STATUS_STYLE[entry.status] || STATUS_STYLE.info;
    doc.roundedRect(45, y, 505, rowHeight, 5).fill(LIGHT);

    doc.roundedRect(54, y + 7, 34, 14, 7).fill(style.color);
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#ffffff");
    doc.text(style.label, 54, y + 10, {
      width: 34,
      align: "center",
      lineBreak: false,
    });

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827");
    doc.text(pdfText(entry.label), 98, y + 7, { width: 150 });

    doc.font("Helvetica").fontSize(7.5).fillColor("#374151");
    doc.text(detail, 98, y + 18, { width: 440, height: detailHeight });

    y += rowHeight + 4;
  }

  // Ownership timeline ------------------------------------------------------
  y = ensureSpace(doc, y, 60, () => 52);
  y = drawSectionTitle(
    doc,
    `OWNERSHIP TIMELINE (${report.ownership.transferCount} transfer${report.ownership.transferCount === 1 ? "" : "s"})`,
    y
  );

  if (!report.ownership.entries.length) {
    doc.font("Helvetica").fontSize(8).fillColor(GRAY);
    doc.text("No ownership events were indexed for this vehicle.", 45, y);
    y += 20;
  } else {
    for (const entry of report.ownership.entries) {
      y = ensureSpace(doc, y, 34, () => 52);

      doc.circle(52, y + 7, 3.5).fill(entry.kind === "REGISTRATION" ? "#007bff" : "#7c3aed");
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#111827");
      doc.text(pdfText(formatDate(entry.at)), 66, y + 2, {
        width: 56,
        lineBreak: false,
      });

      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(NAVY);
      const label =
        entry.kind === "REGISTRATION"
          ? "Registered"
          : entry.kind === "TRANSFER"
            ? "Ownership transfer"
            : "Transfer record";
      doc.text(label, 128, y + 2, { width: 120, lineBreak: false });

      doc.font("Helvetica").fontSize(7.5).fillColor("#374151");
      const detail =
        entry.kind === "TRANSFER" && entry.from
          ? `${pdfText(shortAddress(entry.from))} -> ${pdfText(shortAddress(entry.to))}`
          : entry.to
            ? `Owner ${pdfText(shortAddress(entry.to))}`
            : pdfText(entry.note);
      doc.text(detail, 252, y + 2, { width: 240 });

      if (entry.txHash) {
        doc.font("Helvetica").fontSize(6.5).fillColor(GRAY);
        doc.text(`tx ${shortHash(entry.txHash)}`, 252, y + 12, {
          width: 240,
          lineBreak: false,
        });
        y += 22;
      } else {
        y += 16;
      }
    }
  }

  // Footer on every page ----------------------------------------------------
  const range = doc.bufferedPageRange();
  for (let page = 0; page < range.count; page += 1) {
    doc.switchToPage(range.start + page);
    const previousBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.font("Helvetica").fontSize(6.3).fillColor(GRAY);
    doc.text(`Report SHA-256: ${report.reportHash}`, 45, 790, {
      width: 360,
      lineBreak: false,
    });
    doc.text(
      `Generated ${formatDateTime(report.generatedAt)}  |  ${shareUrl}`,
      45,
      800,
      { width: 400, lineBreak: false }
    );
    doc.text(`Page ${page + 1} of ${range.count}`, 445, 790, {
      width: 105,
      align: "right",
      lineBreak: false,
    });

    doc.page.margins.bottom = previousBottom;
  }

  doc.end();
  return finished;
}
