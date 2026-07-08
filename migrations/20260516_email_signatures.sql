-- ─── Firme email personalizzate ──────────────────────────────────────────────
-- Una firma per brand per utente. Un solo record per (user_id, brand).

create table if not exists email_signatures (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  user_id     uuid        not null,   -- auth.uid()
  brand       text        not null check (brand in ('menuary', 'bizery')),
  name        text        not null default '',     -- nome visualizzato nel from
  title       text        not null default '',     -- es. "Responsabile commerciale"
  phone       text        not null default '',
  email       text        not null default '',
  website     text        not null default '',
  html        text        not null default '',     -- HTML firma generato
  unique (user_id, brand)
);

create index if not exists email_signatures_user_idx  on email_signatures (user_id);
create index if not exists email_signatures_brand_idx on email_signatures (brand);

alter table email_signatures enable row level security;
