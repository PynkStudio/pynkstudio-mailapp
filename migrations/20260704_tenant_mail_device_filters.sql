-- Filtri leggeri "per dispositivo" nel modulo mail tenant: senza un vero
-- sistema di account, un dispositivo (identificato da un id generato lato
-- client e persistito in localStorage) puo' "assegnarsi" una o piu' local
-- part (es. "fatturazione", "recruiting") per avere una vista "Mie" e
-- ricevere solo le push di quelle mail. Di default (nessun filtro
-- configurato) il dispositivo riceve la push per ogni mail del tenant.

create table if not exists tenant_mail_device_filters (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id) on delete cascade,
  device_id text not null,
  label text,
  local_parts text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, device_id)
);

create index if not exists tenant_mail_device_filters_tenant_idx
  on tenant_mail_device_filters (tenant_id);

alter table tenant_mail_device_filters enable row level security;

-- device_id: correla la subscription push al filtro sopra.
-- page_url: pagina da cui il dispositivo si e' registrato, usata come
-- fallback per il click-through della notifica quando il payload non
-- specifica un url esplicito (i portali gestione hanno piu' forme di URL
-- pubblico a seconda del dominio del tenant).
alter table push_subscriptions
  add column if not exists device_id text,
  add column if not exists page_url text;

create index if not exists push_subscriptions_tenant_device_idx
  on push_subscriptions (tenant_id, device_id)
  where device_id is not null;
