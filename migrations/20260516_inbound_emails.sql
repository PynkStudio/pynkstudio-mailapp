-- ─── Inbound emails ──────────────────────────────────────────────────────────
-- Riceve email in arrivo su @menuary.it e @bizery.it tramite webhook Resend.
-- L'inserimento avviene SOLO tramite service role (route webhook server-side).
-- La lettura è riservata ai siteadmin tramite admin client (bypassa RLS).

create table if not exists inbound_emails (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  message_id     text,
  from_address   text        not null,
  from_name      text,
  to_addresses   text[]      not null,
  subject        text        not null default '',
  text_body      text,
  html_body      text,
  headers        jsonb       not null default '[]',
  attachments    jsonb       not null default '[]',
  -- 'menuary' = email su @menuary.it, 'bizery' = email su @bizery.it
  brand          text        not null check (brand in ('menuary', 'bizery')),
  read           boolean     not null default false,
  starred        boolean     not null default false,
  archived       boolean     not null default false
);

-- Indici per le query più frequenti nella inbox
create index if not exists inbound_emails_brand_idx       on inbound_emails (brand);
create index if not exists inbound_emails_created_at_idx  on inbound_emails (created_at desc);
create index if not exists inbound_emails_read_idx        on inbound_emails (read);
create index if not exists inbound_emails_archived_idx    on inbound_emails (archived);
create index if not exists inbound_emails_starred_idx     on inbound_emails (starred);

-- RLS abilitato: solo il service role può inserire (bypassa RLS).
-- I siteadmin leggono tramite createSupabaseAdminClient() che bypassa RLS.
alter table inbound_emails enable row level security;

-- Nessuna policy pubblica: tutto il traffico passa attraverso il service/admin client.
