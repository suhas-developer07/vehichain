import crypto from "crypto";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { VEHICLE_PHOTOS_DIR } from "../config/paths.js";

const NAVY = "#1a1a2e";
const BLUE = "#007bff";
const GRAY = "#6b7280";
const LIGHT = "#f8fafc";

const SEVERITY_STYLE = {
  critical: { bg: "#fee2e2", color: "#991b1b" },
  high: { bg: "#fee2e2", color: "#b91c1c" },
  medium: { bg: "#fef3c7", color: "#b45309" },
  low: { bg: "#e0f2fe", color: "#0369a1" },
};

/**
 * Where the public passport page lives. In development this is the Vite app;
 * production deployments should set PUBLIC_APP_URL.
 */
export function resolveAppUrl(req) {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const origin = req?.get?.("origin") || req?.get?.("referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // Fall through to the development default.
    }
  }

  return "http://localhost:5173";
}

export function buildPassportUrl(req, vin) {
  return `${resolveAppUrl(req)}/passport/${encodeURIComponent(vin)}`;
}

/**
 * Stable identity for the document. It intentionally excludes generatedAt so
 * the same chain state always produces the same fingerprint.
 */
export function buildPassportDocument({ vehicle, history, index, trust }) {
  const canonical = {
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: Number(vehicle.year),
    currentOwner: vehicle.currentOwner,
    history: history.map((record) => ({
      recordType: record.recordType,
      dataHash: record.dataHash,
      description: record.description,
      recordedBy: record.recordedBy,
      timestamp: record.timestamp,
    })),
    photoHash: index?.photoHash || null,
    trustScore: trust.score,
  };

  const documentHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");

  return {
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: Number(vehicle.year),
    currentOwner: vehicle.currentOwner,
    registeredAt: index?.registeredAt || null,
    photoUrl: index?.photoUrl || null,
    photoHash: index?.photoHash || null,
    recordCount: history.length,
    history,
    trust,
    documentHash,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildPassportJson(req, passport) {
  const passportUrl = buildPassportUrl(req, passport.vin);
  const qrDataUrl = await QRCode.toDataURL(passportUrl, {
    margin: 1,
    width: 480,
    color: { dark: NAVY, light: "#ffffff" },
  });

  return { ...passport, passportUrl, qrDataUrl };
}

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

function drawSectionTitle(doc, title, y) {
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(NAVY)
    .text(title, 50, y);
  return y + 18;
}

function drawTableHeader(doc, y) {
  doc.roundedRect(50, y, 495, 20, 4).fill("#eef2f7");
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(NAVY);
  doc.text("TYPE", 58, y + 6, { lineBreak: false });
  doc.text("DATE", 158, y + 6, { lineBreak: false });
  doc.text("DESCRIPTION", 238, y + 6, { lineBreak: false });
  doc.text("RECORDED BY", 448, y + 6, { lineBreak: false });
  return y + 24;
}

/**
 * Build the PDF entirely in memory so a mid-stream error never produces a
 * corrupt download for the browser.
 */
export async function buildPassportPdf(passport, index) {
  const qrBuffer = await QRCode.toBuffer(passport.passportUrl, {
    margin: 1,
    width: 360,
    color: { dark: NAVY, light: "#ffffff" },
  });

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
    info: {
      Title: `Vehicle Passport - ${passport.vin}`,
      Author: "Blockchain Vehicle Registry",
      Subject: "Blockchain-verified vehicle history passport",
    },
  });

  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Header -----------------------------------------------------------------
  doc.font("Helvetica-Bold").fontSize(22).fillColor(NAVY);
  doc.text("VEHICLE PASSPORT", 50, 46);
  doc.font("Helvetica").fontSize(9).fillColor(GRAY);
  doc.text("Blockchain-verified history summary", 50, 74);

  doc.image(qrBuffer, 455, 42, { width: 88 });
  doc.font("Helvetica").fontSize(7).fillColor(GRAY);
  doc.text("Scan to verify", 455, 134, { width: 88, align: "center" });

  doc.moveTo(50, 150).lineTo(545, 150).lineWidth(1).strokeColor("#e5e7eb").stroke();

  // Identity ---------------------------------------------------------------
  let y = drawSectionTitle(doc, "VEHICLE IDENTITY", 162);

  const photoY = y;
  doc.roundedRect(50, photoY, 170, 128, 8).fillAndStroke(LIGHT, "#e5e7eb");
  const photoPath = resolvePhotoPath(index);
  if (photoPath) {
    try {
      doc.image(photoPath, 54, photoY + 4, {
        fit: [162, 120],
        align: "center",
        valign: "center",
      });
    } catch {
      // Corrupt image: leave the placeholder below.
    }
  } else {
    doc.font("Helvetica").fontSize(9).fillColor("#9ca3af");
    doc.text("NO PHOTO", 50, photoY + 60, { width: 170, align: "center" });
  }

  let detailY = photoY + 2;
  const detail = (label, value) => {
    doc.font("Helvetica").fontSize(7).fillColor(GRAY);
    doc.text(label.toUpperCase(), 236, detailY, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#111827");
    doc.text(pdfText(value), 236, detailY + 10, { width: 309 });
    detailY += 24;
  };

  detail("VIN", passport.vin);
  detail("Make / model", `${passport.make} ${passport.model}`);
  detail("Year", passport.year);
  detail("Current owner", shortAddress(passport.currentOwner));
  detail("Registered", passport.registeredAt ? formatDate(passport.registeredAt) : "Not indexed");

  // Trust ------------------------------------------------------------------
  const trustY = photoY + 148;
  doc.roundedRect(50, trustY, 495, 82, 10).fillAndStroke(LIGHT, "#e5e7eb");
  doc.font("Helvetica-Bold").fontSize(8).fillColor(GRAY);
  doc.text("TRUST SCORE", 66, trustY + 11);
  doc.font("Helvetica-Bold").fontSize(28).fillColor(passport.trust.color);
  doc.text(String(passport.trust.score), 66, trustY + 23, { lineBreak: false });
  doc.font("Helvetica").fontSize(10).fillColor(GRAY);
  doc.text("/ 100", 108, trustY + 38, { lineBreak: false });

  doc.roundedRect(150, trustY + 16, 62, 22, 11).fill(passport.trust.color);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
  doc.text(`GRADE ${passport.trust.grade}`, 150, trustY + 22, {
    width: 62,
    align: "center",
    lineBreak: false,
  });

  doc.font("Helvetica-Bold").fontSize(9).fillColor(passport.trust.riskColor);
  doc.text(passport.trust.riskLabel.toUpperCase(), 224, trustY + 22, { lineBreak: false });
  doc.font("Helvetica").fontSize(8).fillColor("#374151");
  doc.text(pdfText(passport.trust.summary), 150, trustY + 45, { width: 380 });

  doc.roundedRect(66, trustY + 62, 70, 7, 4).fill("#e5e7eb");
  if (passport.trust.score > 0) {
    doc
      .roundedRect(66, trustY + 62, (70 * passport.trust.score) / 100, 7, 4)
      .fill(passport.trust.color);
  }

  // Fraud radar ------------------------------------------------------------
  y = drawSectionTitle(doc, "FRAUD RADAR", trustY + 102);
  const flags = passport.trust.flags || [];
  if (!flags.length) {
    doc.font("Helvetica").fontSize(9).fillColor("#166534");
    doc.text("No fraud indicators detected.", 50, y);
    y += 22;
  } else {
    for (const flag of flags.slice(0, 6)) {
      if (y > 690) {
        doc.addPage();
        y = 60;
      }
      const style = SEVERITY_STYLE[flag.severity] || SEVERITY_STYLE.low;
      doc.roundedRect(50, y, 495, 32, 6).fill(style.bg);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(style.color);
      doc.text(`${flag.severity.toUpperCase()}: ${pdfText(flag.title)}`, 62, y + 7, {
        width: 470,
      });
      doc.font("Helvetica").fontSize(7.5).fillColor("#374151");
      doc.text(pdfText(flag.detail), 62, y + 18, { width: 470 });
      y += 38;
    }
  }

  // History ----------------------------------------------------------------
  if (y > 640) {
    doc.addPage();
    y = 60;
  }
  y = drawSectionTitle(doc, `HISTORY (${passport.history.length})`, y + 4);
  y = drawTableHeader(doc, y);

  if (!passport.history.length) {
    doc.font("Helvetica").fontSize(9).fillColor(GRAY);
    doc.text("No on-chain records for this vehicle.", 58, y + 4);
    y += 22;
  }

  for (const [indexNumber, record] of passport.history.entries()) {
    const description = pdfText(record.description || "(no description)");
    const descriptionHeight = doc
      .font("Helvetica")
      .fontSize(7.5)
      .heightOfString(description, { width: 200 });
    const rowHeight = Math.max(20, descriptionHeight + 10);

    if (y + rowHeight > 750) {
      doc.addPage();
      y = 60;
      y = drawTableHeader(doc, y);
    }

    if (indexNumber % 2 === 0) {
      doc.rect(50, y, 495, rowHeight).fill("#fbfcfd");
    }

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BLUE);
    doc.text(pdfText(record.recordType || "UNKNOWN"), 58, y + 6, {
      width: 92,
      lineBreak: false,
    });

    doc.font("Helvetica").fontSize(7.5).fillColor("#374151");
    doc.text(formatDate(record.timestamp), 158, y + 6, { lineBreak: false });

    doc.fillColor("#111827");
    doc.text(description, 238, y + 6, { width: 200 });

    doc.font("Helvetica").fontSize(7).fillColor(GRAY);
    doc.text(shortAddress(record.recordedBy), 448, y + 6, { width: 90 });

    y += rowHeight;
    doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor("#eef2f7").stroke();
    y += 2;
  }

  // Footer on every page ---------------------------------------------------
  const range = doc.bufferedPageRange();
  for (let page = 0; page < range.count; page += 1) {
    doc.switchToPage(range.start + page);
    const previousBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.font("Helvetica").fontSize(6.5).fillColor(GRAY);
    doc.text(`Document SHA-256: ${passport.documentHash}`, 50, 792, {
      width: 360,
      lineBreak: false,
    });
    doc.text(
      `Generated ${formatDateTime(passport.generatedAt)}  |  ${passport.passportUrl}`,
      50,
      803,
      { width: 360, lineBreak: false }
    );
    doc.text(`Page ${page + 1} of ${range.count}`, 445, 792, {
      width: 100,
      align: "right",
      lineBreak: false,
    });

    doc.page.margins.bottom = previousBottom;
  }

  doc.end();
  return finished;
}
