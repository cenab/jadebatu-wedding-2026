import crypto from "crypto";
import { supabase } from "./_lib/supabase.js";
import { jsonResponse, optionsResponse } from "./_lib/http.js";
import { event, emailCopy } from "./_lib/event.js";
import { sgMail } from "./_lib/sendgrid.js";
import { buildIcs } from "./_lib/ics.js";
import { getEnv, requireEnv } from "./_lib/env.js";

function cleanString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function validateEmail(email) {
  return /.+@.+\..+/.test(email);
}

function buildItineraryText() {
  return event.itinerary
    .map((item) => `${item.time} - ${item.item}`)
    .join("\n");
}

function buildItineraryHtml() {
  return event.itinerary
    .map((item) => `<li><strong>${item.time}</strong> - ${item.item}</li>`)
    .join("");
}

function buildRsvpEmail({ name, attending, editUrl, siteUrl }) {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const photoUrl = siteUrl ? `${siteUrl}/upload` : "";
  const calendarUrl = siteUrl ? `${siteUrl}/wedding.ics` : "";
  const editLine = editUrl ? `Update your RSVP: ${editUrl}` : "";

  if (!attending) {
    const text = [
      greeting,
      "",
      "Thanks for letting us know you cannot make it. We will miss you.",
      "",
      editLine,
      "",
      emailCopy.closing
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <p>${greeting}</p>
      <p>Thanks for letting us know you cannot make it. We will miss you.</p>
      ${editUrl ? `<p><a href="${editUrl}">Update your RSVP</a></p>` : ""}
      <p>${emailCopy.closing}</p>
    `;

    return { text, html };
  }

  const detailsText = [
    `${event.venue.name}`,
    `${event.venue.address}`,
    `Date: ${event.date}`,
    `Time: ${event.startTime} to ${event.endTime} (${event.timezone})`,
    `Dress code: ${event.dressCode}`
  ].join("\n");

  const text = [
    greeting,
    "",
    emailCopy.intro,
    "",
    detailsText,
    "",
    "Schedule:",
    buildItineraryText(),
    "",
    `Map: ${event.venue.mapUrl}`,
    emailCopy.parking,
    calendarUrl ? `Calendar: ${calendarUrl}` : "",
    photoUrl ? `Photo upload: ${photoUrl}` : "",
    editLine,
    "",
    emailCopy.closing
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>${greeting}</p>
    <p>${emailCopy.intro}</p>
    <p>
      <strong>${event.venue.name}</strong><br />
      ${event.venue.address}<br />
      Date: ${event.date}<br />
      Time: ${event.startTime} to ${event.endTime} (${event.timezone})<br />
      Dress code: ${event.dressCode}
    </p>
    <p>Schedule:</p>
    <ul>
      ${buildItineraryHtml()}
    </ul>
    <p>
      <a href="${event.venue.mapUrl}">Map link</a><br />
      ${emailCopy.parking}
    </p>
    ${calendarUrl ? `<p><a href="${calendarUrl}">Add to calendar</a></p>` : ""}
    ${photoUrl ? `<p><a href="${photoUrl}">Share photos</a></p>` : ""}
    ${editUrl ? `<p><a href="${editUrl}">Update your RSVP</a></p>` : ""}
    <p>${emailCopy.closing}</p>
  `;

  return { text, html };
}

export async function handler(request) {
  const origin = request.headers?.origin;

  if (request.httpMethod === "OPTIONS") {
    return optionsResponse(origin);
  }

  if (request.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, origin);
  }

  let payload;
  try {
    payload = JSON.parse(request.body || "{}");
  } catch (error) {
    return jsonResponse(400, { error: "Invalid JSON" }, origin);
  }

  const name = cleanString(payload.name, 120);
  const email = cleanString(payload.email, 120).toLowerCase();
  const attending = Boolean(payload.attending);
  const guestCount = attending ? 1 : 0;
  const dietaryNotes = cleanString(payload.dietaryNotes, 500);
  const message = cleanString(payload.message, 800);

  if (!name || !email || !validateEmail(email)) {
    return jsonResponse(400, { error: "Name and a valid email are required." }, origin);
  }

  const table = getEnv("SUPABASE_RSVP_TABLE", "rsvps");
  let editToken = "";
  let rowId = "";

  try {
    const { data: existing, error: lookupError } = await supabase
      .from(table)
      .select("id, edit_token")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existing) {
      editToken = existing.edit_token;
      rowId = existing.id;

      const { error: updateError } = await supabase
        .from(table)
        .update({
          name,
          attending,
          guest_count: guestCount,
          dietary_notes: dietaryNotes,
          message,
          updated_at: new Date().toISOString()
        })
        .eq("id", rowId);

      if (updateError) {
        throw updateError;
      }
    } else {
      editToken = crypto.randomBytes(16).toString("hex");
      const { data: inserted, error: insertError } = await supabase
        .from(table)
        .insert({
          name,
          email,
          attending,
          guest_count: guestCount,
          dietary_notes: dietaryNotes,
          message,
          edit_token: editToken
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      rowId = inserted?.id || "";
    }
  } catch (error) {
    return jsonResponse(500, { error: "Unable to save RSVP." }, origin);
  }

  const siteUrl = getEnv("SITE_URL", "").replace(/\/$/, "");
  const editUrl = siteUrl
    ? `${siteUrl}/rsvp/edit?token=${editToken}`
    : `/rsvp/edit?token=${editToken}`;
  const emailEditUrl = siteUrl ? editUrl : "";
  const { text, html } = buildRsvpEmail({ name, attending, editUrl: emailEditUrl, siteUrl });
  const icsContent = buildIcs();

  try {
    const messageData = {
      to: email,
      from: {
        email: requireEnv("SENDGRID_FROM_EMAIL"),
        name: getEnv("SENDGRID_FROM_NAME", event.coupleNames)
      },
      subject: emailCopy.subject,
      text,
      html,
      attachments: [
        {
          content: Buffer.from(icsContent).toString("base64"),
          filename: "wedding.ics",
          type: "text/calendar",
          disposition: "attachment"
        }
      ]
    };

    const replyTo = getEnv("SENDGRID_REPLY_TO", "");
    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    await sgMail.send(messageData);

    if (rowId) {
      await supabase
        .from(table)
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", rowId);
    }
  } catch (error) {
    return jsonResponse(500, { error: "RSVP saved but email failed." }, origin);
  }

  return jsonResponse(
    200,
    {
      success: true,
      editUrl
    },
    origin
  );
}
