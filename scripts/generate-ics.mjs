import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventModule = await import(path.join(__dirname, "..", "src", "data", "event.js"));
const event = eventModule.event ?? eventModule.default ?? eventModule;

const requireField = (value, name) => {
  if (!value) {
    throw new Error(`Missing event.${name} for wedding.ics generation.`);
  }
  return value;
};

const escapeText = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const formatDate = (isoDate) => isoDate.replace(/-/g, "");

const formatTime = (time24) => {
  const [hours = "00", minutes = "00", seconds = "00"] = String(time24).split(":");
  return `${hours.padStart(2, "0")}${minutes.padStart(2, "0")}${seconds.padStart(2, "0")}`;
};

const coupleNames = requireField(event.coupleNames, "coupleNames");
const dateISO = requireField(event.dateISO, "dateISO");
const startTime24 = requireField(event.startTime24, "startTime24");
const endTime24 = requireField(event.endTime24, "endTime24");
const timezone = requireField(event.timezone, "timezone");

const dateCompact = formatDate(dateISO);
const dtStart = `${dateCompact}T${formatTime(startTime24)}`;
const dtEnd = `${dateCompact}T${formatTime(endTime24)}`;
const dtStamp = `${dateCompact}T000000Z`;

const venueName = event.venue?.name;
const venueAddress = event.venue?.address;
const location = [venueName, venueAddress].filter(Boolean).join(", ");

const slug = coupleNames
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");

const uid = `${slug || "wedding"}-${dateCompact}@example.com`;
const summary = `${coupleNames} Wedding`;
const description = event.dressCode ? `Dress code: ${event.dressCode}.` : "";

const lines = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  `PRODID:-//${escapeText(coupleNames)} Wedding//EN`,
  "CALSCALE:GREGORIAN",
  "BEGIN:VEVENT",
  `UID:${escapeText(uid)}`,
  `DTSTAMP:${dtStamp}`,
  `DTSTART;TZID=${escapeText(timezone)}:${dtStart}`,
  `DTEND;TZID=${escapeText(timezone)}:${dtEnd}`,
  `SUMMARY:${escapeText(summary)}`,
  `LOCATION:${escapeText(location)}`,
  `DESCRIPTION:${escapeText(description)}`,
  "END:VEVENT",
  "END:VCALENDAR"
];

const output = `${lines.join("\r\n")}\r\n`;
const outputPath = path.join(__dirname, "..", "public", "wedding.ics");

await writeFile(outputPath, output, "utf8");
console.log(`Updated ${outputPath}`);
