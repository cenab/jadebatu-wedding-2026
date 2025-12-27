# Jade + Batu Wedding Site

Static wedding site built with Astro and Netlify Functions. Includes RSVP flow, confirmation email with .ics attachment, self-service RSVP edits, and guest photo uploads to Supabase Storage.

## Customize Event Details
- Update event data: `src/data/event.js`
- Update email copy: `src/data/email.js`
- Update calendar file: `public/wedding.ics` (keep in sync with `src/data/event.js`)

## Supabase Setup
1) Create a Supabase project.
2) Run the schema in `supabase/schema.sql`.
3) Create a private storage bucket (default: `wedding-photos`).
4) Copy the project URL and service role key for environment variables.

## SendGrid Setup
1) Create a SendGrid API key.
2) Verify the sender domain or single sender address.

## Environment Variables
Set these in Netlify (or `.env` for local):

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `SITE_URL` (ex: `https://your-site.netlify.app`)

Optional:
- `SUPABASE_BUCKET` (default: `wedding-photos`)
- `SUPABASE_RSVP_TABLE` (default: `rsvps`)
- `SUPABASE_PHOTO_TABLE` (default: `photo_uploads`)
- `SENDGRID_FROM_NAME` (default: couple name)
- `SENDGRID_REPLY_TO`
- `INVITE_CODE` (if you want to gate RSVP and uploads)
- `UPLOAD_MAX_MB` (default: 20)
- `UPLOAD_MAX_FILES` (default: 10)
- `UPLOAD_ALLOWED_TYPES` (comma-separated list)
- `ICS_UID_DOMAIN` (default: `example.com`)
- `CORS_ALLOW_ORIGINS` (comma-separated list, default: `SITE_URL`)

## Local Development
```bash
npm install
npm run dev
```

To run Netlify Functions locally, install Netlify CLI and run:
```bash
netlify dev
```

## Deploy to Netlify
1) Connect the repo.
2) Build command: `npm run build`
3) Publish directory: `dist`
4) Functions directory: `netlify/functions`

## Scheduled Reminder Email
The reminder function (`netlify/functions/reminder.js`) is scheduled daily and will send emails exactly 3 days before the event date. You can adjust the cron schedule in that file.
