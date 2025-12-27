import crypto from "crypto";
import { supabase } from "./_lib/supabase.js";
import { jsonResponse, optionsResponse } from "./_lib/http.js";
import { event } from "./_lib/event.js";
import { getEnv } from "./_lib/env.js";

function cleanString(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
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
  const inviteCode = cleanString(payload.inviteCode, 80);

  const requiredInviteCode = getEnv("INVITE_CODE", "");
  if (requiredInviteCode && inviteCode !== requiredInviteCode) {
    return jsonResponse(403, { error: "Invalid invite code." }, origin);
  }

  if (!files.length) {
    return jsonResponse(400, { error: "No files provided." }, origin);
  }

  const maxFiles = Number(getEnv("UPLOAD_MAX_FILES", event.photo.maxFiles));
  if (files.length > maxFiles) {
    return jsonResponse(400, { error: "Too many files." }, origin);
  }

  const maxFileSizeMb = Number(getEnv("UPLOAD_MAX_MB", event.photo.maxFileSizeMb));
  const allowedTypes = getEnv("UPLOAD_ALLOWED_TYPES", event.photo.allowedTypes.join(","))
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean);

  for (const file of files) {
    const sizeMb = Number(file.size || 0) / 1024 / 1024;
    if (sizeMb > maxFileSizeMb) {
      return jsonResponse(400, { error: "File exceeds size limit." }, origin);
    }
    if (allowedTypes.length && !allowedTypes.includes(file.type)) {
      return jsonResponse(400, { error: "File type not allowed." }, origin);
    }
  }

  const bucket = getEnv("SUPABASE_BUCKET", "wedding-photos");
  const prefix = getEnv("SUPABASE_UPLOAD_PREFIX", "uploads");

  try {
    const uploads = [];
    for (const file of files) {
      const safeName = sanitizeFilename(file.name || "photo");
      const unique = crypto.randomBytes(6).toString("hex");
      const path = `${prefix}/${Date.now()}-${unique}-${safeName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path);

      if (error) {
        throw error;
      }

      uploads.push({
        path: data.path,
        signedUrl: data.signedUrl
      });
    }

    return jsonResponse(200, { uploads }, origin);
  } catch (error) {
    return jsonResponse(500, { error: "Unable to generate upload URLs." }, origin);
  }
}
