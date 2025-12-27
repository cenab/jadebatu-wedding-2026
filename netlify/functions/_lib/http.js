import { getEnv } from "./env.js";

function normalizeOrigins(value) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = normalizeOrigins(
  getEnv("CORS_ALLOW_ORIGINS", getEnv("SITE_URL", "*"))
);

export function corsHeaders(requestOrigin) {
  let allowOrigin = "*";

  if (!allowedOrigins.includes("*")) {
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else if (allowedOrigins.length) {
      allowOrigin = allowedOrigins[0];
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Credentials": "true"
  };
}

export function jsonResponse(statusCode, body, requestOrigin) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(requestOrigin)
    },
    body: JSON.stringify(body)
  };
}

export function optionsResponse(requestOrigin) {
  return {
    statusCode: 204,
    headers: corsHeaders(requestOrigin)
  };
}
