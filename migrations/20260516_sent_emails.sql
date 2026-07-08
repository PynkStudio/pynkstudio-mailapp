-- ─── Email inviate ────────────────────────────────────────────────────────────
-- Storico delle email mandate dal pannello admin.
-- Popolata da /api/email/send al momento dell'invio.
-- Lo status viene aggiornato dagli eventi di tracking Resend (webhook).

create table if not exists sent_emails (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  resend_message_id text,                        -- ID Resend ("re_...")
  from_address     text        not null,
  from_name        text,
  to_addresses     text[]      not null,
  subject          text        not null default '',
  html_body        text,
  brand            text        not null check (brand in ('menuary', 'bizery')),
  sent_by_user_id  uuid,                         -- auth.uid() del mittente
  sent_by_name     text,
  -- Aggiornato dagli eventi tracking
  status           text        not null default 'sent'
                   check (status in ('sent','delivered','delivery_delayed','bounced','complained'))
);

create index if not exists sent_emails_brand_idx          on sent_emails (brand);
create index if not exists sent_emails_created_at_idx     on sent_emails (created_at desc);
create index if not exists sent_emails_resend_msg_id_idx  on sent_emails (resend_message_id);
create index if not exists sent_emails_sent_by_idx        on sent_emails (sent_by_user_id);

alter table sent_emails enable row level security;
-- Accesso solo via admin/service client (bypassa RLS)
