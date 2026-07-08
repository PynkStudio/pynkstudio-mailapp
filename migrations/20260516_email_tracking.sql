-- ─── Tracking eventi email ────────────────────────────────────────────────────
-- Ogni evento Resend (delivered, opened, clicked, bounced, complained)
-- genera una riga qui, collegata al resend_message_id dell'email inviata.

create table if not exists email_tracking_events (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  resend_email_id  text        not null,           -- "re_..." da Resend
  event_type       text        not null,           -- email.delivered | email.opened | ...
  from_address     text,
  to_address       text,
  subject          text,
  brand            text        check (brand in ('menuary', 'bizery')),
  -- Dati extra evento: click {link, userAgent, ipAddress}, bounce {type, message}, ecc.
  metadata         jsonb       not null default '{}'
);

create index if not exists email_tracking_events_msg_id_idx   on email_tracking_events (resend_email_id);
create index if not exists email_tracking_events_type_idx     on email_tracking_events (event_type);
create index if not exists email_tracking_events_brand_idx    on email_tracking_events (brand);
create index if not exists email_tracking_events_created_idx  on email_tracking_events (created_at desc);

alter table email_tracking_events enable row level security;
