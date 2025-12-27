import { supabase } from "./_lib/supabase.js";
import { jsonResponse, optionsResponse } from "./_lib/http.js";
import { getEnv } from "./_lib/env.js";

function cleanString(value, max = 200) {
  return String(value || "").trim().slice(0, max);
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

  const files = Array.isArray(payload.files) ? payload.files : [];
  if (!files.length) {
    return jsonResponse(400, { error: "No files provided." }, origin);
  }

  const uploaderName = cleanString(payload.uploaderName, 120);
  const uploaderEmail = cleanString(payload.uploaderEmail, 120);

  const table = getEnv("SUPABASE_PHOTO_TABLE", "photo_uploads");

  try {
    const rows = files.map((file) => ({
      path: cleanString(file.path, 500),
      original_name: cleanString(file.originalName, 200),
      mime_type: cleanString(file.mimeType, 120),
      size_bytes: Number(file.sizeBytes || 0),
      uploader_name: uploaderName,
      uploader_email: uploaderEmail
    }));

    const { error } = await supabase.from(table).insert(rows);
    if (error) {
      throw error;
    }

    return jsonResponse(200, { success: true }, origin);
  } catch (error) {
    return jsonResponse(500, { error: "Unable to save metadata." }, origin);
  }
}
