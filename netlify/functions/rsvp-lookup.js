import { supabase } from "./_lib/supabase.js";
import { jsonResponse, optionsResponse } from "./_lib/http.js";
import { getEnv } from "./_lib/env.js";

export async function handler(request) {
  const origin = request.headers?.origin;

  if (request.httpMethod === "OPTIONS") {
    return optionsResponse(origin);
  }

  if (request.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" }, origin);
  }

  const token = request.queryStringParameters?.token || "";
  if (!token) {
    return jsonResponse(400, { error: "Missing token." }, origin);
  }

  const table = getEnv("SUPABASE_RSVP_TABLE", "rsvps");

  try {
    const { data, error } = await supabase
      .from(table)
      .select("name, email, attending, dietary_notes, message")
      .eq("edit_token", token)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return jsonResponse(404, { error: "RSVP not found." }, origin);
    }

    return jsonResponse(
      200,
      {
        name: data.name,
        email: data.email,
        attending: data.attending,
        dietaryNotes: data.dietary_notes,
        message: data.message
      },
      origin
    );
  } catch (error) {
    return jsonResponse(500, { error: "Unable to load RSVP." }, origin);
  }
}
