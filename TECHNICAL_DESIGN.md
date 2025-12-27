# Wedding Site - Technical Design

## Goal
Build a static wedding website with:
- Invitation landing page with a "Next" button.
- RSVP form + short questionnaire.
- Confirmation step that sends the guest an email containing location, itinerary, dress code, etc.
- Photo upload page that collects guest photos in an S3 bucket.

This document outlines a simple, secure, low‑maintenance architecture using static hosting plus serverless APIs.

## Proposed Architecture (Static + Serverless)
**Frontend**
- Static site (HTML/CSS/JS or a static framework like Astro/Next.js static export).
- Hosted on S3 + CloudFront, or Netlify/Vercel/Cloudflare Pages.

**Backend (serverless APIs)**
- RSVP API: store responses and send confirmation email.
- Upload API: generate pre‑signed S3 upload URLs.

**Data + Email**
- Data store: DynamoDB (AWS), Supabase, Airtable, or a private Google Sheet.
- Email: AWS SES, SendGrid, Postmark, or Mailgun.

**Media Storage**
- S3 bucket for photos. Private by default; uploads use pre‑signed URLs.

## Pages and Flows
### 1) Invitation / Landing Page
- Static content: date, names, hero imagery.
- "Next" button routes to RSVP form.

### 2) RSVP + Questionnaire
- Form fields: name, email, attending (yes/no), number of guests, dietary notes, etc.
- On submit:
  1) POST to `/api/rsvp`
  2) Store response
  3) Send confirmation email with itinerary, dress code, venue details
  4) Return success + show "thanks" page with the same details

### 3) Confirmation / Details Page
- Shown after RSVP success.
- Also sent via email for future access.
- Optional: keep details behind an invite code to avoid public scraping.

### 4) Photo Upload Page
- User enters invite code (or uses a shared link).
- Site requests an upload token from `/api/upload-token`.
- Direct upload from browser to S3 using pre‑signed POST or PUT.
- Metadata (name, caption, timestamp) sent to `/api/photo-metadata`.

## Data Flow Diagrams (ASCII)
**RSVP**
```
Browser -> /api/rsvp -> Database
                   -> Email service -> Guest inbox
```

**Photo Upload**
```
Browser -> /api/upload-token -> S3 pre-signed URL
Browser -> S3 (direct upload)
Browser -> /api/photo-metadata -> Database
```

## Recommended AWS Stack (Simple + Scalable)
- Hosting: S3 + CloudFront + Route53
- Serverless API: AWS Lambda + API Gateway
- RSVP storage: DynamoDB
- Email: Amazon SES
- Photos: S3 (private bucket), optional CloudFront for viewing

## Security and Abuse Prevention
- Use a shared invite code to gate RSVP and photo uploads.
- Add basic rate limiting (API Gateway or a lightweight custom check).
- CAPTCHA on RSVP if you expect abuse.
- S3 bucket remains private; only pre‑signed URLs allow uploads.
- Set size/type limits on uploads (e.g., max 20MB, image/* only).

## Email Content Strategy
Two options:
1) **Send full details in email** after RSVP, plus show on the confirmation page.
2) **Send a private link** in the email to a details page gated by a token.

Keep the email template in code so updates are easy (e.g., JSON config or Markdown).

## Minimal Tech Stack Option (Lower Ops)
- Hosting: Netlify or Vercel (static deploys)
- Functions: Netlify Functions / Vercel Serverless Functions
- Data: Supabase or Airtable
- Email: SendGrid / Postmark
- Photos: S3 with pre‑signed URLs

## Implementation Notes
- Use environment variables for API keys (email provider, DB, S3).
- Keep a single configuration file for venue + itinerary so both the page and email pull from one source.
- Consider a simple admin‑only page to export RSVP data (CSV).

## Open Decisions to Resolve
- Hosting choice: AWS vs Netlify/Vercel.
- Data store: DynamoDB vs Supabase/Airtable.
- Email provider: SES vs SendGrid/Postmark.
- Invite gating method: shared code vs unique per guest.
- Should photos be publicly viewable or only accessible to the couple?

## Next Steps
1) Pick hosting + serverless platform.
2) Decide on RSVP data store and email provider.
3) Define RSVP fields and photo upload limits.
4) Build static pages + APIs.
5) Test RSVP flow and upload flow end‑to‑end.
