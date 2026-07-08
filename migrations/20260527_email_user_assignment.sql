-- ─── Assegnazione email utenti siteadmin ─────────────────────────────────────
--
-- Aggiunge:
-- 1. assigned_to_user_id su inbound_emails (auto-assign o manuale)
-- 2. siteadmin_email_aliases per matching automatico su arrivo
-- 3. Trigger: genera alias su INSERT/UPDATE, cancella assign su disabilitazione

-- ─── 1. Colonna assegnazione ──────────────────────────────────────────────────

ALTER TABLE inbound_emails
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid
    REFERENCES siteadmin(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inbound_emails_assigned_to_user_idx
  ON inbound_emails(assigned_to_user_id)
  WHERE assigned_to_user_id IS NOT NULL;

-- ─── 2. Tabella alias ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS siteadmin_email_aliases (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  siteadmin_id  uuid        NOT NULL REFERENCES siteadmin(id) ON DELETE CASCADE,
  alias         text        NOT NULL,
  alias_type    text        NOT NULL
    CHECK (alias_type IN ('email_prefix', 'name_variant', 'legacy_name')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- alias univoco case-insensitive: stessa stringa non può appartenere a due utenti
CREATE UNIQUE INDEX IF NOT EXISTS siteadmin_email_aliases_alias_unique_idx
  ON siteadmin_email_aliases(lower(alias));

CREATE INDEX IF NOT EXISTS siteadmin_email_aliases_siteadmin_idx
  ON siteadmin_email_aliases(siteadmin_id);

-- ─── 3. Funzione generazione alias ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_siteadmin_aliases(p_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_row    record;
  v_prefix text;
  v_first  text;
  v_last   text;
BEGIN
  SELECT email, first_name, last_name INTO v_row FROM siteadmin WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_prefix := lower(split_part(v_row.email, '@', 1));
  v_first  := lower(regexp_replace(coalesce(v_row.first_name, ''), '[^a-zA-Z0-9]', '', 'g'));
  v_last   := lower(regexp_replace(coalesce(v_row.last_name,  ''), '[^a-zA-Z0-9]', '', 'g'));

  -- prefisso email (es. "massimo" da massimo@menuary.it)
  IF v_prefix <> '' THEN
    INSERT INTO siteadmin_email_aliases (siteadmin_id, alias, alias_type)
    VALUES (p_id, v_prefix, 'email_prefix')
    ON CONFLICT (lower(alias)) DO NOTHING;
  END IF;

  -- primo.cognome (es. "massimo.pernozzoli")
  IF v_first <> '' AND v_last <> '' THEN
    INSERT INTO siteadmin_email_aliases (siteadmin_id, alias, alias_type)
    VALUES (p_id, v_first || '.' || v_last, 'name_variant')
    ON CONFLICT (lower(alias)) DO NOTHING;
  END IF;

  -- iniziale+cognome (es. "mpernozzoli")
  IF v_first <> '' AND v_last <> '' THEN
    INSERT INTO siteadmin_email_aliases (siteadmin_id, alias, alias_type)
    VALUES (p_id, left(v_first, 1) || v_last, 'name_variant')
    ON CONFLICT (lower(alias)) DO NOTHING;
  END IF;

  -- solo nome (es. "massimo") — solo se diverso dal prefisso email
  IF v_first <> '' AND v_first <> v_prefix THEN
    INSERT INTO siteadmin_email_aliases (siteadmin_id, alias, alias_type)
    VALUES (p_id, v_first, 'name_variant')
    ON CONFLICT (lower(alias)) DO NOTHING;
  END IF;
END;
$$;

-- ─── 4. Trigger: gestione automatica alias ────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_siteadmin_aliases()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM generate_siteadmin_aliases(NEW.id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Nome cambiato: promuovi vecchi name_variant a legacy_name, aggiungi nuovi
    IF (OLD.first_name IS DISTINCT FROM NEW.first_name)
       OR (OLD.last_name IS DISTINCT FROM NEW.last_name) THEN
      UPDATE siteadmin_email_aliases
        SET alias_type = 'legacy_name'
        WHERE siteadmin_id = NEW.id AND alias_type = 'name_variant';
      PERFORM generate_siteadmin_aliases(NEW.id);
    END IF;

    -- Email cambiata: vecchio prefisso diventa legacy, genera nuovo
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      UPDATE siteadmin_email_aliases
        SET alias_type = 'legacy_name'
        WHERE siteadmin_id = NEW.id AND alias_type = 'email_prefix';
      PERFORM generate_siteadmin_aliases(NEW.id);
    END IF;

    -- Utente disabilitato/bloccato: rimuovi tutte le assegnazioni attive
    IF (OLD.enabled IS DISTINCT FROM NEW.enabled) AND NOT NEW.enabled THEN
      UPDATE inbound_emails
        SET assigned_to_user_id = NULL
        WHERE assigned_to_user_id = NEW.id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS siteadmin_aliases_trigger ON siteadmin;
CREATE TRIGGER siteadmin_aliases_trigger
  AFTER INSERT OR UPDATE ON siteadmin
  FOR EACH ROW EXECUTE FUNCTION trg_siteadmin_aliases();

-- ─── 5. Popola alias per gli utenti già esistenti ─────────────────────────────

DO $$
DECLARE v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM siteadmin LOOP
    PERFORM generate_siteadmin_aliases(v_id);
  END LOOP;
END;
$$;
