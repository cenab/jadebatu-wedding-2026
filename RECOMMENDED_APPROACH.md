# Recommended Approach (Fast + Affordable)

## Summary
Use Astro for a fully static site hosted on Netlify, and add two serverless functions:
1) RSVP handler (store data + send email)
2) Photo upload token generator (Supabase Storage signed upload URL)

This minimizes setup time, keeps costs near zero for small traffic, and avoids server maintenance.

## Why This Is the Most Convenient
- **Fastest to ship**: One repo, static pages + a couple of functions.
- **Low cost**: Free tiers cover small weddings easily.
- **Reliable**: CDN hosting + managed email + Supabase Storage.
- **Flexible**: You can swap providers later without rewriting the frontend.

## Recommended Stack
**Hosting + Functions**
- Netlify + Astro (static hosting + Netlify Functions)

**Database**
- Supabase Postgres (simple setup + free tier)

**Email**
- SendGrid (simple APIs and good deliverability)

**Photo Storage**
- Supabase Storage (built in)

**Supabase S3 Compatibility Notes**
- Not required for this plan; we will use Supabase Storage directly and avoid AWS entirely.

## Minimal Architecture
**Frontend (static)**
- Landing page → RSVP form → Confirmation page
- Photo upload page

**Serverless functions (Netlify)**
1) `/.netlify/functions/rsvp`
   - Validate input
   - Save to Supabase
   - Send email with itinerary + dress code
2) `/.netlify/functions/upload-token`
   - Generate Supabase Storage signed upload URL
   - Return URL + path for each file (multi-upload)
3) `/.netlify/functions/photo-metadata` (optional)
   - Save file metadata to DB (name, timestamp, caption)

## Cost Snapshot (Typical Wedding Scale)
- Static hosting: free
- Serverless calls: free or pennies
- Email: free tier or a few dollars total
- Supabase Storage: cents to a few dollars
- DB: free tier likely enough

## Implementation Plan (Quickest Path)
1) Create an Astro site in a single repo.
2) Add RSVP form + form validation.
3) Add `/.netlify/functions/rsvp` to store data + send email.
4) Add photo upload page + `/.netlify/functions/upload-token`.
5) Test end‑to‑end with one guest email and a sample upload.

## Notes on RSVP Email
- Send a single confirmation email right after form submit.
- Include venue address, itinerary, dress code, and a map link.
- Keep email text in one config file so you can update it easily.

## RSVP Edit Link (Self-Service)
- After RSVP, send a private "Update your RSVP" link in the email.
- Use a tokenized URL like `/rsvp/edit?token=...` to load the guest's record.
- Allow changes to attendance, guest count, and dietary notes.
- This reduces back-and-forth when plans change.

## Calendar Invite (.ics) Attachment
- Attach an `.ics` file to the confirmation email so guests can add the event.
- Include venue address, start time, and a short dress code note in the invite.
- This improves attendance reliability with minimal effort.

## Auto Reminder Email (T-3 days)
- Send one scheduled reminder email 3 days before the event.
- Include time, venue, parking note, dress code, and the photo upload link.
- Run it via Netlify Scheduled Functions or a one-off manual trigger to avoid automation risk.

## Photo Upload Requirements
- Allow multi-upload from the browser (select multiple files at once).
- Request signed upload URLs for all files in one call when possible.
- Enforce size/type limits client-side and server-side.

## Recommended Default Choice
**Netlify + Astro + Supabase (DB + Storage) + SendGrid**  
This is the fastest to build, easiest to maintain, and very low cost.

## No‑AWS Policy
- This plan avoids AWS completely (hosting, storage, DB, and email are all non‑AWS).
