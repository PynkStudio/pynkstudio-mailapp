-- Il modulo Mail è incluso solo nei piani base più alti dei tre verticali:
-- Menuary food, Bizery services (slug condiviso "operativita") e Orpheo creative.

update public.platform_packages
set
  modules = (
    select array_agg(distinct module_key order by module_key)
    from unnest(coalesce(modules, '{}'::text[]) || array['mail']) as module_key
  ),
  marketing_items = case
    when 'Mail interna sul dominio del tenant' = any(coalesce(marketing_items, '{}'::text[]))
      then marketing_items
    else coalesce(marketing_items, '{}'::text[]) || array['Mail interna sul dominio del tenant']
  end,
  updated_at = now()
where slug in ('operativita', 'orpheo-management');

-- Compatibilità con seed storici che rinominavano il vecchio Pro in Autopilota.
update public.platform_packages
set
  modules = (
    select array_agg(distinct module_key order by module_key)
    from unnest(coalesce(modules, '{}'::text[]) || array['mail']) as module_key
  ),
  updated_at = now()
where slug = 'autopilota';
