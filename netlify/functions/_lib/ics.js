import { event } from "./event.js";
import { getEnv } from "./env.js";

function formatIcsDate(dateISO, time24) {
  const datePart = dateISO.replace(/-/g, "");
  const timePart = time24.replace(":", "") + "00";
  return `${datePart}T${timePart}`;
}

function formatTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcs() {
  const uidDomain = getEnv("ICS_UID_DOMAIN", "example.com");
  const uid = `${event.dateISO.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 10)}@${uidDomain}`;
  const dtstamp = formatTimestamp(new Date());
  const dtstart = formatIcsDate(event.dateISO, event.startTime24);
  const dtend = formatIcsDate(event.dateISO, event.endTime24);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${event.coupleNames} Wedding//EN`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${event.timezone}:${dtstart}`,
    `DTEND;TZID=${event.timezone}:${dtend}`,
    `SUMMARY:${event.coupleNames} Wedding`,
    `LOCATION:${event.venue.name}, ${event.venue.address}`,
    `DESCRIPTION:Dress code: ${event.dressCode}.`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\n");
}
