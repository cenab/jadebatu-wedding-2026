import { supabase } from "./_lib/supabase.js";
import { jsonResponse, optionsResponse } from "./_lib/http.js";
import { getEnv } from "./_lib/env.js";

function cleanString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function validateEmail(email) {
  return /.+@.+\..+/.test(email);
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

  const token = cleanString(payload.token, 120);
  const name = cleanString(payload.name, 120);
  const email = cleanString(payload.email, 120).toLowerCase();
  const attending = Boolean(payload.attending);
  const guestCount = attending ? 1 : 0;
  const dietaryNotes = cleanString(payload.dietaryNotes, 500);
  const message = cleanString(payload.message, 800);

  if (!token) {
    return jsonResponse(400, { error: "Missing RSVP token." }, origin);
  }

  if (!name || !email || !validateEmail(email)) {
    return jsonResponse(400, { error: "Name and a valid email are required." }, origin);
  }

  const table = getEnv("SUPABASE_RSVP_TABLE", "rsvps");

  try {
    const { data, error } = await supabase
      .from(table)
      .update({
        name,
        email,
        attending,
        guest_count: guestCount,
        dietary_notes: dietaryNotes,
        message,
        updated_at: new Date().toISOString()
      })
      .eq("edit_token", token)
      .select("id");

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return jsonResponse(404, { error: "RSVP not found." }, origin);
    }

    return jsonResponse(200, { success: true }, origin);
  } catch (error) {
    return jsonResponse(500, { error: "Unable to update RSVP." }, origin);
  }
}
