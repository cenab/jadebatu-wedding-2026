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
    .map((item) => `
      <tr>
        <td style="padding: 8px 16px 8px 0; color: #e95145; font-weight: 600; white-space: nowrap; vertical-align: top;">${item.time}</td>
        <td style="padding: 8px 0; color: #5a4a42;">${item.item}</td>
      </tr>
    `)
    .join("");
}

function emailWrapper(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${event.coupleNames} Wedding</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fbe7e1; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fbe7e1;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #fff9f6; border-radius: 20px; box-shadow: 0 4px 24px rgba(233, 69, 111, 0.1);">
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <!-- Header -->
              <h1 style="margin: 0 0 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: normal; font-style: italic; color: #e95145;">${event.coupleNames}</h1>
              <div style="width: 60px; height: 2px; background-color: #e95145; margin: 0 auto 24px; opacity: 0.5;"></div>

              ${content}

              <!-- Footer -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(233, 69, 111, 0.15);">
                <p style="margin: 0; font-size: 14px; color: #5a4a42; opacity: 0.7;">
                  With love,<br>
                  ${event.coupleNames}
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function buildRsvpEmail({ name, attending, editUrl, siteUrl }) {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const photoUrl = siteUrl ? `${siteUrl}/upload` : "";
  const calendarUrl = siteUrl ? `${siteUrl}/wedding.ics` : "";
  const editLine = editUrl ? `Update your RSVP: ${editUrl}` : "";

  const buttonStyle = `
    display: inline-block;
    padding: 14px 28px;
    background-color: #e95145;
    color: #ffffff;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    margin: 8px 4px;
  `.replace(/\s+/g, ' ').trim();

  const secondaryButtonStyle = `
    display: inline-block;
    padding: 12px 24px;
    background-color: transparent;
    color: #e95145;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    border: 2px solid #e95145;
    margin: 8px 4px;
  `.replace(/\s+/g, ' ').trim();

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

    const content = `
      <p style="margin: 0 0 16px; font-size: 18px; color: #5a4a42;">${greeting}</p>
      <p style="margin: 0 0 24px; font-size: 16px; color: #5a4a42; line-height: 1.6;">
        Thanks for letting us know you cannot make it. We will miss you!
      </p>
      ${editUrl ? `
        <p style="margin: 24px 0 0;">
          <a href="${editUrl}" style="${secondaryButtonStyle}">Update your RSVP</a>
        </p>
      ` : ""}
    `;

    return { text, html: emailWrapper(content) };
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

  const content = `
    <p style="margin: 0 0 16px; font-size: 18px; color: #5a4a42;">${greeting}</p>
    <p style="margin: 0 0 24px; font-size: 16px; color: #5a4a42; line-height: 1.6;">
      ${emailCopy.intro}
    </p>

    <!-- Event Details Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(251, 231, 225, 0.5); border-radius: 16px; margin: 24px 0;">
      <tr>
        <td style="padding: 24px;">
          <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: normal; font-style: italic; color: #e95145;">${event.venue.name}</h2>
          <p style="margin: 0 0 8px; font-size: 14px; color: #5a4a42;">${event.venue.address}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 16px 0;">
            <tr>
              <td style="padding: 4px 16px 4px 0; font-size: 14px; color: rgb(233, 115, 69); font-weight: 600;">Date</td>
              <td style="padding: 4px 0; font-size: 14px; color: #5a4a42;">${event.date}</td>
            </tr>
            <tr>
              <td style="padding: 4px 16px 4px 0; font-size: 14px; color: rgb(233, 115, 69); font-weight: 600;">Time</td>
              <td style="padding: 4px 0; font-size: 14px; color: #5a4a42;">${event.startTime} - ${event.endTime}</td>
            </tr>
            <tr>
              <td style="padding: 4px 16px 4px 0; font-size: 14px; color: rgb(233, 115, 69); font-weight: 600;">Dress code</td>
              <td style="padding: 4px 0; font-size: 14px; color: #5a4a42;">${event.dressCode}</td>
            </tr>
          </table>
          <p style="margin: 16px 0 0;">
            <a href="${event.venue.mapUrl}" style="${buttonStyle}">View Map</a>
          </p>
        </td>
      </tr>
    </table>

    <!-- Schedule -->
    <div style="text-align: left; margin: 32px 0;">
      <h3 style="margin: 0 0 16px; font-size: 20px; font-weight: normal; font-style: italic; color: #e95145;">Schedule</h3>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${buildItineraryHtml()}
      </table>
    </div>

    <!-- Notes -->
    <div style="text-align: left; margin: 24px 0; padding: 16px; background-color: rgba(251, 231, 225, 0.5); border-radius: 12px;">
      <p style="margin: 0; font-size: 14px; color: #5a4a42; line-height: 1.6;">
        ${emailCopy.parking}
      </p>
    </div>

    <!-- Action Buttons -->
    <div style="margin: 32px 0;">
      ${calendarUrl ? `<a href="${calendarUrl}" style="${buttonStyle}">Add to Calendar</a>` : ""}
      ${photoUrl ? `<a href="${photoUrl}" style="${secondaryButtonStyle}">Share Photos</a>` : ""}
    </div>

    ${editUrl ? `
      <p style="margin: 24px 0 0; font-size: 14px; color: #5a4a42;">
        Need to make changes? <a href="${editUrl}" style="color: #e95145; text-decoration: underline;">Update your RSVP</a>
      </p>
    ` : ""}
  `;

  return { text, html: emailWrapper(content) };
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
