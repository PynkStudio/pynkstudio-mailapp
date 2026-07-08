-- Gestione spam nella mail app: flag spam su inbound_emails +
-- blocklist mittenti (globale con tenant_id null, o per singolo tenant).

alter table inbound_emails
  add column if not exists spam boolean not null default false;

create index if not exists inbound_emails_spam_idx
  on inbound_emails (spam)
  where spam;

create table if not exists email_spam_senders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  address text not null,
  tenant_id text references tenants(id) on delete cascade,
  -- nulls not distinct: un solo blocco globale (tenant_id null) per indirizzo
  unique nulls not distinct (address, tenant_id)
);

create index if not exists email_spam_senders_address_idx
  on email_spam_senders (address);

alter table email_spam_senders enable row level security;
