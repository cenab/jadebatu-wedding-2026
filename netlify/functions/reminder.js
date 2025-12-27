import { supabase } from "./_lib/supabase.js";
import { jsonResponse } from "./_lib/http.js";
import { event, emailCopy } from "./_lib/event.js";
import { sgMail } from "./_lib/sendgrid.js";
import { getEnv, requireEnv } from "./_lib/env.js";

export const config = {
  schedule: "0 15 * * *"
};

function daysUntilEvent() {
  const today = new Date();
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const [year, month, day] = event.dateISO.split("-").map((part) => Number(part));
  const eventUtc = Date.UTC(year, month - 1, day);
  const diffMs = eventUtc - utcToday;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function buildReminderEmail({ name, siteUrl }) {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const photoUrl = siteUrl ? `${siteUrl}/upload` : "";
  const calendarUrl = siteUrl ? `${siteUrl}/wedding.ics` : "";

  const text = [
    greeting,
    "",
    emailCopy.reminderIntro,
    "",
    `Date: ${event.date}`,
    `Time: ${event.startTime} to ${event.endTime} (${event.timezone})`,
    `Venue: ${event.venue.name}, ${event.venue.address}`,
    `Dress code: ${event.dressCode}`,
    "",
    `Map: ${event.venue.mapUrl}`,
    emailCopy.parking,
    calendarUrl ? `Calendar: ${calendarUrl}` : "",
    photoUrl ? `Photo upload: ${photoUrl}` : "",
    "",
    emailCopy.reminderClosing
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>${greeting}</p>
    <p>${emailCopy.reminderIntro}</p>
    <p>
      Date: ${event.date}<br />
      Time: ${event.startTime} to ${event.endTime} (${event.timezone})<br />
      Venue: ${event.venue.name}, ${event.venue.address}<br />
      Dress code: ${event.dressCode}
    </p>
    <p>
      <a href="${event.venue.mapUrl}">Map link</a><br />
      ${emailCopy.parking}
    </p>
    ${calendarUrl ? `<p><a href="${calendarUrl}">Add to calendar</a></p>` : ""}
    ${photoUrl ? `<p><a href="${photoUrl}">Photo upload link</a></p>` : ""}
    <p>${emailCopy.reminderClosing}</p>
  `;

  return { text, html };
}

export async function handler(request) {
  const daysUntil = daysUntilEvent();
  if (daysUntil !== 3) {
    return jsonResponse(200, { skipped: true, daysUntil }, request.headers?.origin);
  }

  const table = getEnv("SUPABASE_RSVP_TABLE", "rsvps");
  const siteUrl = getEnv("SITE_URL", "").replace(/\/$/, "");

  try {
    const { data, error } = await supabase
      .from(table)
      .select("id, name, email")
      .eq("attending", true)
      .is("reminder_sent_at", null);

    if (error) {
      throw error;
    }

    if (!data || !data.length) {
      return jsonResponse(200, { sent: 0 }, request.headers?.origin);
    }

    const fromEmail = requireEnv("SENDGRID_FROM_EMAIL");
    const fromName = getEnv("SENDGRID_FROM_NAME", event.coupleNames);

    for (const guest of data) {
      const { text, html } = buildReminderEmail({ name: guest.name, siteUrl });
      await sgMail.send({
        to: guest.email,
        from: { email: fromEmail, name: fromName },
        subject: emailCopy.reminderSubject,
        text,
        html
      });
    }

    const ids = data.map((guest) => guest.id);
    await supabase
      .from(table)
      .update({ reminder_sent_at: new Date().toISOString() })
      .in("id", ids);

    return jsonResponse(200, { sent: data.length }, request.headers?.origin);
  } catch (error) {
    return jsonResponse(500, { error: "Unable to send reminders." }, request.headers?.origin);
  }
}
