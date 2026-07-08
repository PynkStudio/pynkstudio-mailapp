-- Collega inbound_emails e sent_emails a un lead CRM
alter table public.inbound_emails
  add column if not exists lead_id uuid references public.platform_leads (id) on delete set null;

alter table public.sent_emails
  add column if not exists lead_id uuid references public.platform_leads (id) on delete set null;

create index if not exists inbound_emails_lead_id_idx on public.inbound_emails (lead_id) where lead_id is not null;
create index if not exists sent_emails_lead_id_idx    on public.sent_emails    (lead_id) where lead_id is not null;
