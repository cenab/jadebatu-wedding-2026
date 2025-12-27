import sgMail from "@sendgrid/mail";
import { requireEnv } from "./env.js";

sgMail.setApiKey(requireEnv("SENDGRID_API_KEY"));

export { sgMail };
