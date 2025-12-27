create extension if not exists "pgcrypto";

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  attending boolean not null,
  guest_count integer not null default 1,
  dietary_notes text,
  song_request text,
  message text,
  edit_token text not null unique,
  email_sent_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists rsvps_email_key on rsvps (email);

create table if not exists photo_uploads (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  original_name text,
  mime_type text,
  size_bytes integer,
  uploader_name text,
  uploader_email text,
  created_at timestamptz default now()
);
