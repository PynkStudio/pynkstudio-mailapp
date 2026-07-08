-- Scope tenant per il modulo mail condiviso tra admin piattaforma e gestione tenant.

alter table public.inbound_emails
  add column if not exists tenant_id text references public.tenants(id) on delete set null;

alter table public.sent_emails
  add column if not exists tenant_id text references public.tenants(id) on delete set null;

create index if not exists inbound_emails_tenant_created_idx
  on public.inbound_emails (tenant_id, created_at desc)
  where tenant_id is not null;

create index if not exists sent_emails_tenant_created_idx
  on public.sent_emails (tenant_id, created_at desc)
  where tenant_id is not null;

update public.inbound_emails email
set tenant_id = tenant_match.id
from (
  select distinct on (email.id)
    email.id as email_id,
    tenant.id
  from public.inbound_emails email
  join public.tenants tenant
    on tenant.enabled = true
   and exists (
      select 1
      from unnest(tenant.domains) as domain
      where domain not ilike '%localhost%'
        and domain not ilike '%.local'
        and domain <> '127.0.0.1'
        and lower(array_to_string(email.to_addresses, ',')) like ('%@' || lower(domain) || '%')
    )
  where email.tenant_id is null
  order by email.id, tenant.created_at desc
) tenant_match
where email.id = tenant_match.email_id;

update public.sent_emails email
set tenant_id = tenant_match.id
from (
  select distinct on (email.id)
    email.id as email_id,
    tenant.id
  from public.sent_emails email
  join public.tenants tenant
    on tenant.enabled = true
   and exists (
      select 1
      from unnest(tenant.domains) as domain
      where domain not ilike '%localhost%'
        and domain not ilike '%.local'
        and domain <> '127.0.0.1'
        and lower(email.from_address) like ('%@' || lower(domain))
    )
  where email.tenant_id is null
  order by email.id, tenant.created_at desc
) tenant_match
where email.id = tenant_match.email_id;
