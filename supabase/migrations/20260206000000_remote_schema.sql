--
-- PostgreSQL database dump
--

\restrict jwa3VovqNNgmstL4wehhL2ViYtfTe35jIriW483wtPzV2BKCm0W74suAT2j84rw

-- Dumped from database version 17.4
-- Dumped by pg_dump version 18.1 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: _snapshot_product_fields(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._snapshot_product_fields(p_product_id uuid) RETURNS TABLE(item_name text, item_sku text, item_image text)
    LANGUAGE sql
    AS $$
  select name, sku, featured_image from products where id = p_product_id
$$;


--
-- Name: calculate_service_fee_amount(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_service_fee_amount(estimate_id_param uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    subtotal numeric := 0;
    setting_enabled boolean := false;
    setting_type text := 'percentage';
    setting_rate numeric := 0.035;
    fee_amount numeric := 0;
    enabled_setting text;
    type_setting text;
    rate_setting text;
BEGIN
    -- Get subtotal of non-service-fee items
    SELECT COALESCE(SUM(qty * unit_price), 0)
    INTO subtotal
    FROM estimate_items
    WHERE estimate_id = estimate_id_param
    AND (is_service_fee = false OR is_service_fee IS NULL);

    -- Get service fee settings using simple JSON casting
    SELECT value::text INTO enabled_setting FROM settings WHERE key = 'credit_card_fee_enabled';
    SELECT value::text INTO type_setting FROM settings WHERE key = 'credit_card_fee_type';
    SELECT value::text INTO rate_setting FROM settings WHERE key = 'credit_card_fee_rate';

    -- Parse settings with defaults
    setting_enabled := COALESCE(enabled_setting::boolean, false);
    setting_type := COALESCE(TRIM(BOTH '"' FROM type_setting), 'percentage');
    setting_rate := COALESCE(rate_setting::numeric, 0.035);

    -- Calculate fee amount if enabled
    IF setting_enabled THEN
        IF setting_type = 'percentage' THEN
            fee_amount := subtotal * setting_rate;
        ELSE
            fee_amount := setting_rate; -- Fixed amount
        END IF;
    END IF;

    RETURN ROUND(fee_amount, 2);
END;
$$;


--
-- Name: calculate_service_fee_amount(text, character varying, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_service_fee_amount(estimate_id_param text, fee_type_param character varying, fee_rate_param numeric) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  base_amount DECIMAL(10,2);
  fee_amount DECIMAL(10,2);
BEGIN
  -- Calculate base amount (sum of all non-service-fee items)
  SELECT COALESCE(SUM(qty * COALESCE(unit_price, 0)), 0)
  INTO base_amount
  FROM public.estimate_items
  WHERE estimate_id = estimate_id_param
    AND is_service_fee = false;

  -- Calculate fee amount based on type
  IF fee_type_param = 'percentage' THEN
    fee_amount := base_amount * fee_rate_param;
  ELSIF fee_type_param = 'fixed' THEN
    fee_amount := fee_rate_param;
  ELSE
    fee_amount := 0;
  END IF;

  RETURN ROUND(fee_amount, 2);
END;
$$;


--
-- Name: generate_alphanumeric_string(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_alphanumeric_string(length integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;


--
-- Name: generate_estimate_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_estimate_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_number text;
    exists_count integer;
BEGIN
    LOOP
        new_number := 'E' || generate_numeric_string(5);
        SELECT COUNT(*) INTO exists_count FROM estimates WHERE estimate_number = new_number;
        IF exists_count = 0 THEN
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$;


--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_number text;
    exists_count integer;
BEGIN
    LOOP
        new_number := 'I' || generate_numeric_string(5);
        SELECT COUNT(*) INTO exists_count FROM invoices WHERE invoice_number = new_number;
        IF exists_count = 0 THEN
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$;


--
-- Name: generate_numeric_string(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_numeric_string(length integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    chars text := '0123456789';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;


--
-- Name: get_entity_activity_logs(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_entity_activity_logs(p_entity_type text, p_entity_id uuid) RETURNS TABLE(id uuid, user_first_name text, user_last_name text, action_name text, event_date timestamp with time zone, metadata jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.user_first_name,
        al.user_last_name,
        al.action_name,
        al.event_date,
        al.metadata,
        al.created_at
    FROM activity_logs al
    WHERE al.entity_type = p_entity_type 
      AND al.entity_id = p_entity_id
      AND al.user_id = auth.uid()  -- Only show logs for the current user
    ORDER BY al.created_at DESC;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
  RETURN NEW;
END;
$$;


--
-- Name: log_estimate_action(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_estimate_action(p_estimate_id uuid, p_action_name text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_organization_id UUID;
    v_contact_id UUID;
    v_log_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to log actions';
    END IF;
    
    -- Get estimate details
    SELECT organization_id, contact_id
    INTO v_organization_id, v_contact_id
    FROM estimates
    WHERE id = p_estimate_id;
    
    -- Insert the log entry
    INSERT INTO activity_logs (
        user_id,
        action_name,
        entity_type,
        entity_id,
        organization_id,
        contact_id,
        metadata
    ) VALUES (
        v_user_id,
        p_action_name,
        'estimate',
        p_estimate_id,
        v_organization_id,
        v_contact_id,
        p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;


--
-- Name: log_estimate_to_invoice_conversion(uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_estimate_to_invoice_conversion(p_estimate_id uuid, p_invoice_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_organization_id UUID;
    v_contact_id UUID;
    v_estimate_number TEXT;
    v_invoice_number TEXT;
    v_action_name TEXT;
    v_log_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to log actions';
    END IF;
    
    -- Get estimate and invoice details
    SELECT e.organization_id, e.contact_id, e.estimate_number
    INTO v_organization_id, v_contact_id, v_estimate_number
    FROM estimates e
    WHERE e.id = p_estimate_id;
    
    SELECT invoice_number
    INTO v_invoice_number
    FROM invoices
    WHERE id = p_invoice_id;
    
    -- Create action name
    v_action_name := format('Estimate #%s Converted to Invoice #%s', 
                           COALESCE(v_estimate_number, p_estimate_id::TEXT),
                           COALESCE(v_invoice_number, p_invoice_id::TEXT));
    
    -- Insert the log entry
    INSERT INTO activity_logs (
        user_id,
        action_name,
        entity_type,
        entity_id,
        organization_id,
        contact_id,
        metadata
    ) VALUES (
        v_user_id,
        v_action_name,
        'estimate',
        p_estimate_id,
        v_organization_id,
        v_contact_id,
        jsonb_build_object(
            'converted_to_invoice_id', p_invoice_id,
            'converted_to_invoice_number', v_invoice_number
        ) || p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;


--
-- Name: log_invoice_action(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_invoice_action(p_invoice_id uuid, p_action_name text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_organization_id UUID;
    v_contact_id UUID;
    v_log_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to log actions';
    END IF;
    
    -- Get invoice details (assuming similar structure to estimates)
    SELECT organization_id, contact_id
    INTO v_organization_id, v_contact_id
    FROM invoices
    WHERE id = p_invoice_id;
    
    -- Insert the log entry
    INSERT INTO activity_logs (
        user_id,
        action_name,
        entity_type,
        entity_id,
        organization_id,
        contact_id,
        metadata
    ) VALUES (
        v_user_id,
        p_action_name,
        'invoice',
        p_invoice_id,
        v_organization_id,
        v_contact_id,
        p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;


--
-- Name: populate_user_profile_info(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_user_profile_info() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Get user profile information from profiles table
    SELECT first_name, last_name
    INTO NEW.user_first_name, NEW.user_last_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$;


--
-- Name: set_estimate_default_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_estimate_default_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Set default status to 'draft' if not specified
    IF NEW.status IS NULL THEN
        NEW.status = 'draft';
    END IF;

    -- Set timestamps
    NEW.created_at = COALESCE(NEW.created_at, NOW());
    NEW.updated_at = NOW();

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION set_estimate_default_status(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_estimate_default_status() IS 'Sets default status to draft for new estimates and manages timestamps';


--
-- Name: sync_estimate_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_estimate_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    latest_approval_status TEXT;
    approval_contact_id UUID;
BEGIN
    -- Get the latest approval status for this estimate
    SELECT status, contact_id INTO latest_approval_status, approval_contact_id
    FROM estimate_approvals
    WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Update the estimate based on the latest approval status
    IF latest_approval_status = 'sent' THEN
        -- Estimate was sent for approval
        UPDATE estimates
        SET
            status = 'sent for approval',
            updated_at = NOW()
        WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);

    ELSIF latest_approval_status = 'approved' THEN
        -- Estimate was approved
        UPDATE estimates
        SET
            status = 'approved',
            approved_by = approval_contact_id,
            rejected_by = NULL,  -- Clear any previous rejection
            updated_at = NOW()
        WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);

    ELSIF latest_approval_status = 'rejected' THEN
        -- Estimate was rejected
        UPDATE estimates
        SET
            status = 'rejected',
            rejected_by = approval_contact_id,
            approved_by = NULL,  -- Clear any previous approval
            updated_at = NOW()
        WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: FUNCTION sync_estimate_status(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_estimate_status() IS 'Automatically syncs estimate status and approval fields based on the latest estimate_approvals record';


--
-- Name: sync_invoice_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_invoice_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    latest_approval_status TEXT;
    approval_contact_id UUID;
BEGIN
    -- Get the latest approval status for this invoice
    SELECT status, contact_id INTO latest_approval_status, approval_contact_id
    FROM invoice_approvals
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ORDER BY created_at DESC
    LIMIT 1;

    -- Update the invoice based on the latest approval status
    IF latest_approval_status = 'sent' THEN
        -- Invoice was sent for approval
        UPDATE invoices
        SET
            status = 'sent for approval',
            updated_at = NOW()
        WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    ELSIF latest_approval_status = 'approved' THEN
        -- Invoice was approved
        UPDATE invoices
        SET
            status = 'approved',
            approved_by = approval_contact_id,
            rejected_by = NULL,  -- Clear any previous rejection
            updated_at = NOW()
        WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    ELSIF latest_approval_status = 'rejected' THEN
        -- Invoice was rejected
        UPDATE invoices
        SET
            status = 'rejected',
            rejected_by = approval_contact_id,
            approved_by = NULL,  -- Clear any previous approval
            updated_at = NOW()
        WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: trg_estimate_items_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_estimate_items_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare s record;
begin
  if NEW.is_custom = false and NEW.product_id is not null then
    select * into s from _snapshot_product_fields(NEW.product_id);
    NEW.item_name  := coalesce(NEW.item_name,  s.item_name);
    NEW.item_sku   := coalesce(NEW.item_sku,   s.item_sku);
    NEW.item_image := coalesce(NEW.item_image, s.item_image);
  end if;
  return NEW;
end$$;


--
-- Name: trg_generate_estimate_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_generate_estimate_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estimate_number IS NULL THEN
        NEW.estimate_number := generate_estimate_number();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trg_generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_generate_invoice_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: trg_invoice_items_lock_after_paid(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_invoice_items_lock_after_paid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_status TEXT;  -- Changed from invoice_status to TEXT
BEGIN
  SELECT status INTO v_status FROM invoices WHERE id = NEW.invoice_id;
  IF v_status = 'paid' THEN
    RAISE EXCEPTION 'Cannot modify items of a paid invoice';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: trg_invoice_items_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_invoice_items_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  declare s record;
  begin
    if NEW.is_custom = false and NEW.product_id is not null then
      select * into s from _snapshot_product_fields(NEW.product_id);
      NEW.item_name := coalesce(NEW.item_name, s.item_name);
      NEW.item_sku := coalesce(NEW.item_sku, s.item_sku);
      NEW.item_featured_image := coalesce(NEW.item_featured_image, s.item_image);
    end if;
    if NEW.unit_price is null then
      raise exception 'Invoice line items require unit_price';
    end if;
    return NEW;
  end
  $$;


--
-- Name: trg_touch_timestamps(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_touch_timestamps() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if TG_OP = 'INSERT' then
    if NEW.created_at is null then NEW.created_at := now(); end if;
    NEW.updated_at := now();
  elsif TG_OP = 'UPDATE' then
    NEW.updated_at := now();
  end if;
  return NEW;
end$$;


--
-- Name: trigger_update_service_fee(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_service_fee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only update service fees for non-service-fee items
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND (NEW.is_service_fee = false OR NEW.is_service_fee IS NULL) THEN
        PERFORM update_service_fee_for_estimate(NEW.estimate_id);
    ELSIF TG_OP = 'DELETE' AND (OLD.is_service_fee = false OR OLD.is_service_fee IS NULL) THEN
        PERFORM update_service_fee_for_estimate(OLD.estimate_id);
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


--
-- Name: update_estimate_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_estimate_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_estimate_timestamp(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_estimate_timestamp() IS 'Updates the updated_at timestamp when an estimate is modified';


--
-- Name: update_estimate_total_cost(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_estimate_total_cost() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update the estimate's total_cost
    UPDATE public.estimates 
    SET total_cost = COALESCE((
        SELECT SUM(qty * COALESCE(unit_price, 0))
        FROM public.estimate_items 
        WHERE estimate_id = COALESCE(NEW.estimate_id, OLD.estimate_id)
    ), 0)
    WHERE id = COALESCE(NEW.estimate_id, OLD.estimate_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_invoice_payment_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_invoice_payment_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update invoice payment_status when payment is completed
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE invoices 
        SET payment_status = 'paid', updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_invoice_total_cost(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_invoice_total_cost() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE invoices
  SET total_cost = (
    SELECT COALESCE(SUM(qty * COALESCE(unit_price, 0)), 0)
    FROM invoice_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
  )
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_service_fee_for_estimate(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_service_fee_for_estimate(estimate_id_param text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  fee_enabled BOOLEAN;
  fee_type VARCHAR(20);
  fee_rate DECIMAL(10,4);
  fee_name TEXT;
  fee_amount DECIMAL(10,2);
  max_sort_order INTEGER;
  service_fee_item_id TEXT;
BEGIN
  -- Get service fee settings
  SELECT
    (SELECT value::boolean FROM public.settings WHERE key = 'credit_card_fee_enabled'),
    (SELECT value FROM public.settings WHERE key = 'credit_card_fee_type'),
    (SELECT value::decimal FROM public.settings WHERE key = 'credit_card_fee_rate'),
    (SELECT value FROM public.settings WHERE key = 'credit_card_fee_name')
  INTO fee_enabled, fee_type, fee_rate, fee_name;

  -- If service fee is disabled, remove any existing service fee items
  IF NOT fee_enabled THEN
    DELETE FROM public.estimate_items
    WHERE estimate_id = estimate_id_param AND is_service_fee = true;
    RETURN;
  END IF;

  -- Calculate fee amount
  fee_amount := calculate_service_fee_amount(estimate_id_param, fee_type, fee_rate);

  -- Skip if fee amount is 0 or negative
  IF fee_amount <= 0 THEN
    DELETE FROM public.estimate_items
    WHERE estimate_id = estimate_id_param AND is_service_fee = true;
    RETURN;
  END IF;

  -- Get maximum sort order for this estimate
  SELECT COALESCE(MAX(sort_order), 0) + 1000
  INTO max_sort_order
  FROM public.estimate_items
  WHERE estimate_id = estimate_id_param AND is_service_fee = false;

  -- Check if service fee item already exists
  SELECT id INTO service_fee_item_id
  FROM public.estimate_items
  WHERE estimate_id = estimate_id_param AND is_service_fee = true
  LIMIT 1;

  IF service_fee_item_id IS NOT NULL THEN
    -- Update existing service fee item
    UPDATE public.estimate_items SET
      item_name = fee_name,
      qty = 1,
      unit_price = fee_amount,
      fee_type = fee_type,
      fee_rate = fee_rate,
      sort_order = max_sort_order,
      updated_at = NOW()
    WHERE id = service_fee_item_id;
  ELSE
    -- Create new service fee item
    INSERT INTO public.estimate_items (
      estimate_id,
      product_id,
      qty,
      unit_price,
      item_name,
      item_description,
      item_sku,
      item_featured_image,
      is_custom,
      is_service_fee,
      fee_type,
      fee_rate,
      sort_order,
      created_at,
      updated_at
    ) VALUES (
      estimate_id_param,
      NULL,
      1,
      fee_amount,
      fee_name,
      CASE
        WHEN fee_type = 'percentage' THEN
          'Applied to subtotal (' || (fee_rate * 100)::text || '%)'
        ELSE
          'Fixed service fee'
      END,
      NULL,
      NULL,
      true,
      true,
      fee_type,
      fee_rate,
      max_sort_order,
      NOW(),
      NOW()
    );
  END IF;
END;
$$;


--
-- Name: update_service_fee_for_estimate(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_service_fee_for_estimate(estimate_id_param uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    fee_amount numeric;
    setting_enabled boolean := false;
    setting_type text := 'percentage';
    setting_rate numeric := 0.035;
    setting_name text := 'Credit Card Service Fee';
    existing_service_fee_id uuid;
    enabled_setting text;
    type_setting text;
    rate_setting text;
    name_setting text;
BEGIN
    -- Get service fee settings using simple JSON casting
    SELECT value::text INTO enabled_setting FROM settings WHERE key = 'credit_card_fee_enabled';
    SELECT value::text INTO type_setting FROM settings WHERE key = 'credit_card_fee_type';
    SELECT value::text INTO rate_setting FROM settings WHERE key = 'credit_card_fee_rate';
    SELECT value::text INTO name_setting FROM settings WHERE key = 'credit_card_fee_name';

    -- Parse settings with defaults
    setting_enabled := COALESCE(enabled_setting::boolean, false);
    setting_type := COALESCE(TRIM(BOTH '"' FROM type_setting), 'percentage');
    setting_rate := COALESCE(rate_setting::numeric, 0.035);
    setting_name := COALESCE(TRIM(BOTH '"' FROM name_setting), 'Credit Card Service Fee');

    -- Check if service fee item already exists
    SELECT id INTO existing_service_fee_id
    FROM estimate_items
    WHERE estimate_id = estimate_id_param
    AND is_service_fee = true
    LIMIT 1;

    IF setting_enabled THEN
        -- Calculate fee amount
        fee_amount := calculate_service_fee_amount(estimate_id_param);

        -- Only proceed if fee amount > 0
        IF fee_amount > 0 THEN
            IF existing_service_fee_id IS NOT NULL THEN
                -- Update existing service fee
                UPDATE estimate_items
                SET
                    item_name = setting_name,
                    unit_price = fee_amount,
                    qty = 1,
                    service_fee_type = setting_type,
                    service_fee_rate = setting_rate,
                    updated_at = now()
                WHERE id = existing_service_fee_id;
            ELSE
                -- Insert new service fee item
                INSERT INTO estimate_items (
                    estimate_id,
                    item_name,
                    item_description,
                    qty,
                    unit_price,
                    is_service_fee,
                    service_fee_type,
                    service_fee_rate,
                    is_custom,
                    created_at,
                    updated_at
                ) VALUES (
                    estimate_id_param,
                    setting_name,
                    CASE
                        WHEN setting_type = 'percentage' THEN
                            'Service fee (' || (setting_rate * 100)::text || '%)'
                        ELSE
                            'Fixed service fee'
                    END,
                    1,
                    fee_amount,
                    true,
                    setting_type,
                    setting_rate,
                    true,
                    now(),
                    now()
                );
            END IF;
        ELSE
            -- Remove service fee if amount is 0
            DELETE FROM estimate_items
            WHERE estimate_id = estimate_id_param AND is_service_fee = true;
        END IF;
    ELSE
        -- Remove service fee if disabled
        DELETE FROM estimate_items
        WHERE estimate_id = estimate_id_param AND is_service_fee = true;
    END IF;
END;
$$;


--
-- Name: update_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_first_name text,
    user_last_name text,
    action_name text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    organization_id uuid,
    contact_id uuid,
    event_date timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT activity_logs_entity_type_check CHECK ((entity_type = ANY (ARRAY['estimate'::text, 'invoice'::text])))
);


--
-- Name: TABLE activity_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.activity_logs IS 'Logs all user actions on estimates and invoices for audit trail';


--
-- Name: COLUMN activity_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.user_id IS 'ID of the user who performed the action';


--
-- Name: COLUMN activity_logs.user_first_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.user_first_name IS 'First name of the user (auto-populated from profiles)';


--
-- Name: COLUMN activity_logs.user_last_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.user_last_name IS 'Last name of the user (auto-populated from profiles)';


--
-- Name: COLUMN activity_logs.action_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.action_name IS 'Description of the action performed (e.g., "Created", "Deleted", "Estimate #123 Converted to Invoice #456")';


--
-- Name: COLUMN activity_logs.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.entity_type IS 'Type of entity (estimate or invoice)';


--
-- Name: COLUMN activity_logs.entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.entity_id IS 'ID of the estimate or invoice';


--
-- Name: COLUMN activity_logs.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.organization_id IS 'ID of the related organization (if any)';


--
-- Name: COLUMN activity_logs.contact_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.contact_id IS 'ID of the related contact (if any)';


--
-- Name: COLUMN activity_logs.event_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.event_date IS 'Date when the action occurred (defaults to NOW)';


--
-- Name: COLUMN activity_logs.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.activity_logs.metadata IS 'Additional data about the action in JSON format';


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    first_name text,
    last_name text,
    email text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    address_full text,
    address_street text,
    address_city text,
    address_state text,
    address_postal_code text,
    address_country text
);


--
-- Name: estimates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    contact_id uuid NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    estimate_number text NOT NULL,
    organization text DEFAULT 'no'::text,
    guests integer DEFAULT 1,
    event_type text,
    event_address_street text,
    event_address_unit text,
    event_city text,
    event_state text DEFAULT 'California'::text,
    event_zipcode text,
    event_county text,
    event_date date,
    event_start_time time without time zone,
    event_end_time time without time zone,
    comment text,
    referred_by text,
    total_cost numeric(12,2) DEFAULT 0,
    approved_by uuid,
    rejected_by uuid
);


--
-- Name: COLUMN estimates.organization; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.organization IS 'Organization type (default: no)';


--
-- Name: COLUMN estimates.guests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.guests IS 'Number of guests (default: 1)';


--
-- Name: COLUMN estimates.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_type IS 'Type of event';


--
-- Name: COLUMN estimates.event_address_street; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_address_street IS 'Event address street';


--
-- Name: COLUMN estimates.event_address_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_address_unit IS 'Event address unit/apartment';


--
-- Name: COLUMN estimates.event_city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_city IS 'Event city';


--
-- Name: COLUMN estimates.event_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_state IS 'Event state (default: California)';


--
-- Name: COLUMN estimates.event_zipcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_zipcode IS 'Event zipcode';


--
-- Name: COLUMN estimates.event_county; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_county IS 'Event county';


--
-- Name: COLUMN estimates.event_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_date IS 'Event date';


--
-- Name: COLUMN estimates.event_start_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_start_time IS 'Event start time';


--
-- Name: COLUMN estimates.event_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.event_end_time IS 'Event end time';


--
-- Name: COLUMN estimates.comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.comment IS 'Additional comments for the estimate';


--
-- Name: COLUMN estimates.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimates.referred_by IS 'How the client was referred';


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    contact_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    invoice_number text NOT NULL,
    contact_email text,
    organization text DEFAULT 'no'::text,
    guests integer DEFAULT 1,
    event_type text,
    event_address_street text,
    event_address_unit text,
    event_city text,
    event_state text DEFAULT 'California'::text,
    event_zipcode text,
    event_county text,
    event_date date,
    event_start_time time without time zone,
    event_end_time time without time zone,
    comment text,
    referred_by text,
    estimate_id uuid,
    approved_by uuid,
    rejected_by uuid,
    total_cost numeric(12,2) DEFAULT 0,
    status text DEFAULT 'draft'::text NOT NULL,
    payment_status text,
    CONSTRAINT invoices_payment_status_check CHECK ((payment_status = ANY (ARRAY[('paid'::character varying)::text, ('unpaid'::character varying)::text]))),
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'sent for approval'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'paid'::text, 'canceled'::text])))
);


--
-- Name: COLUMN invoices.contact_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.contact_email IS 'Contact email address for the invoice';


--
-- Name: COLUMN invoices.organization; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.organization IS 'Organization type (default: no)';


--
-- Name: COLUMN invoices.guests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.guests IS 'Number of guests (default: 1)';


--
-- Name: COLUMN invoices.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_type IS 'Type of event';


--
-- Name: COLUMN invoices.event_address_street; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_address_street IS 'Event address street';


--
-- Name: COLUMN invoices.event_address_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_address_unit IS 'Event address unit/apartment';


--
-- Name: COLUMN invoices.event_city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_city IS 'Event city';


--
-- Name: COLUMN invoices.event_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_state IS 'Event state (default: California)';


--
-- Name: COLUMN invoices.event_zipcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_zipcode IS 'Event zipcode';


--
-- Name: COLUMN invoices.event_county; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_county IS 'Event county';


--
-- Name: COLUMN invoices.event_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_date IS 'Event date';


--
-- Name: COLUMN invoices.event_start_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_start_time IS 'Event start time';


--
-- Name: COLUMN invoices.event_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.event_end_time IS 'Event end time';


--
-- Name: COLUMN invoices.comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.comment IS 'Additional comments for the invoice';


--
-- Name: COLUMN invoices.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.referred_by IS 'How the client was referred';


--
-- Name: COLUMN invoices.estimate_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.estimate_id IS 'Reference to the estimate this invoice was created from';


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    address_full text,
    address_street text,
    address_city text,
    address_state text,
    address_postal_code text,
    address_country text,
    phone text,
    website text
);


--
-- Name: activity_logs_with_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.activity_logs_with_details AS
 SELECT al.id,
    al.user_id,
    al.user_first_name,
    al.user_last_name,
    al.action_name,
    al.entity_type,
    al.entity_id,
    al.organization_id,
    al.contact_id,
    al.event_date,
    al.metadata,
    al.created_at,
    al.updated_at,
    o.name AS organization_name,
    c.first_name AS contact_first_name,
    c.last_name AS contact_last_name,
    c.email AS contact_email,
        CASE
            WHEN (al.entity_type = 'estimate'::text) THEN e.estimate_number
            WHEN (al.entity_type = 'invoice'::text) THEN i.invoice_number
            ELSE NULL::text
        END AS entity_number
   FROM ((((public.activity_logs al
     LEFT JOIN public.organizations o ON ((al.organization_id = o.id)))
     LEFT JOIN public.contacts c ON ((al.contact_id = c.id)))
     LEFT JOIN public.estimates e ON (((al.entity_type = 'estimate'::text) AND (al.entity_id = e.id))))
     LEFT JOIN public.invoices i ON (((al.entity_type = 'invoice'::text) AND (al.entity_id = i.id))));


--
-- Name: disclosures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disclosures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by_email character varying(255),
    updated_by_email character varying(255)
);


--
-- Name: estimate_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimate_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estimate_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    approval_hash text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    contact_response text,
    sent_at timestamp with time zone DEFAULT now(),
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    custom_message text,
    signature jsonb,
    due_date timestamp with time zone,
    CONSTRAINT estimate_approvals_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: TABLE estimate_approvals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.estimate_approvals IS 'Tracks estimate approval workflow including sent invitations and customer responses';


--
-- Name: COLUMN estimate_approvals.approval_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimate_approvals.approval_hash IS 'Unique hash used for public approval page URL';


--
-- Name: COLUMN estimate_approvals.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimate_approvals.status IS 'Workflow status: sent, approved, or rejected';


--
-- Name: COLUMN estimate_approvals.contact_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimate_approvals.contact_response IS 'Customer provided reason for rejection (optional)';


--
-- Name: estimate_disclosures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimate_disclosures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estimate_id uuid,
    disclosure_id uuid,
    contact_id uuid,
    disclosure_title character varying(255) NOT NULL,
    disclosure_content text NOT NULL,
    is_approved boolean DEFAULT false,
    approved_at timestamp with time zone,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: estimate_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimate_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    estimate_id uuid NOT NULL,
    product_id uuid,
    qty numeric(12,3) NOT NULL,
    unit_price numeric(12,2),
    item_name text,
    item_description text,
    item_sku text,
    item_featured_image text,
    is_custom boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_service_fee boolean DEFAULT false,
    fee_type character varying(20),
    fee_rate numeric(10,4),
    service_fee_base_amount numeric(10,2),
    service_fee_type text,
    service_fee_rate numeric(10,4),
    CONSTRAINT estimate_items_product_or_custom CHECK ((((product_id IS NOT NULL) AND (is_custom = false)) OR ((product_id IS NULL) AND (is_custom = true) AND (COALESCE(TRIM(BOTH FROM item_name), ''::text) <> ''::text)))),
    CONSTRAINT estimate_items_qty_check CHECK ((qty > (0)::numeric)),
    CONSTRAINT estimate_items_service_fee_type_check CHECK (((service_fee_type = ANY (ARRAY['percentage'::text, 'fixed'::text])) OR (service_fee_type IS NULL)))
);


--
-- Name: COLUMN estimate_items.sort_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.estimate_items.sort_order IS 'Order of items within an estimate (0-based index)';


--
-- Name: invoice_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    approval_hash text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    contact_response text,
    sent_at timestamp with time zone DEFAULT now(),
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    custom_message text,
    signature jsonb,
    due_date timestamp with time zone,
    CONSTRAINT invoice_approvals_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'sent for approval'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: invoice_disclosures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_disclosures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    disclosure_id uuid,
    contact_id uuid,
    disclosure_title character varying(255) NOT NULL,
    disclosure_content text NOT NULL,
    is_approved boolean DEFAULT false,
    approved_at timestamp with time zone,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    product_id uuid,
    qty numeric(12,3) NOT NULL,
    unit_price numeric(12,2),
    item_name text,
    item_description text,
    item_sku text,
    item_featured_image text,
    is_custom boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    due_date timestamp with time zone,
    is_service_fee boolean DEFAULT false,
    fee_type character varying(20),
    fee_rate numeric(10,4),
    service_fee_base_amount numeric(10,2),
    service_fee_type text,
    service_fee_rate numeric(10,4),
    CONSTRAINT invoice_items_product_or_custom CHECK ((((product_id IS NOT NULL) AND (is_custom = false)) OR ((product_id IS NULL) AND (is_custom = true) AND (COALESCE(TRIM(BOTH FROM item_name), ''::text) <> ''::text)))),
    CONSTRAINT invoice_items_qty_check CHECK ((qty > (0)::numeric)),
    CONSTRAINT invoice_items_service_fee_type_check CHECK (((service_fee_type = ANY (ARRAY['percentage'::text, 'fixed'::text])) OR (service_fee_type IS NULL)))
);


--
-- Name: COLUMN invoice_items.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoice_items.due_date IS 'estimate due date';


--
-- Name: invoice_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid,
    payment_hash text NOT NULL,
    stripe_payment_intent_id text,
    amount numeric(10,2) NOT NULL,
    currency text,
    status text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT invoice_payments_status_check CHECK ((status = ANY (ARRAY[('pending'::character varying)::text, ('paid'::character varying)::text, ('failed'::character varying)::text])))
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sku text,
    active boolean DEFAULT true NOT NULL,
    unit_price numeric(12,2),
    featured_image text,
    product_gallery jsonb DEFAULT '[]'::jsonb NOT NULL,
    description text,
    rules text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_internal boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN products.is_internal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.is_internal IS 'Internal products are not visible to end users but can be added to estimates by staff';


--
-- Name: COLUMN products.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.is_default IS 'Default products are automatically included in new estimates';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    product_id uuid NOT NULL,
    qty numeric(12,3) DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    unit_price numeric DEFAULT 0.00,
    CONSTRAINT request_items_qty_check CHECK ((qty > (0)::numeric))
);


--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text,
    last_name text,
    phone text,
    organization_name text,
    event_date date,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    accepted_estimate_id uuid,
    contact_email text,
    organization text DEFAULT 'no'::text,
    guests integer DEFAULT 1,
    event_type text,
    event_address_street text,
    event_address_unit text,
    event_city text,
    event_state text DEFAULT 'California'::text,
    event_zipcode text,
    event_county text,
    event_start_time time without time zone,
    event_end_time time without time zone,
    referred_by text,
    status text DEFAULT 'pending'::text
);


--
-- Name: COLUMN requests.contact_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.contact_email IS 'Contact email address for the request';


--
-- Name: COLUMN requests.organization; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.organization IS 'Organization type (default: no)';


--
-- Name: COLUMN requests.guests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.guests IS 'Number of guests (default: 1)';


--
-- Name: COLUMN requests.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_type IS 'Type of event';


--
-- Name: COLUMN requests.event_address_street; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_address_street IS 'Event address street';


--
-- Name: COLUMN requests.event_address_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_address_unit IS 'Event address unit/apartment';


--
-- Name: COLUMN requests.event_city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_city IS 'Event city';


--
-- Name: COLUMN requests.event_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_state IS 'Event state (default: California)';


--
-- Name: COLUMN requests.event_zipcode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_zipcode IS 'Event zipcode';


--
-- Name: COLUMN requests.event_county; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_county IS 'Event county';


--
-- Name: COLUMN requests.event_start_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_start_time IS 'Event start time';


--
-- Name: COLUMN requests.event_end_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.event_end_time IS 'Event end time';


--
-- Name: COLUMN requests.referred_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.referred_by IS 'How the client was referred';


--
-- Name: COLUMN requests.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.status IS 'Request status (default: pending)';


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    data_type character varying(50) DEFAULT 'string'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by_email text,
    updated_by_email text
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: disclosures disclosures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disclosures
    ADD CONSTRAINT disclosures_pkey PRIMARY KEY (id);


--
-- Name: estimate_approvals estimate_approvals_approval_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_approvals
    ADD CONSTRAINT estimate_approvals_approval_hash_key UNIQUE (approval_hash);


--
-- Name: estimate_approvals estimate_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_approvals
    ADD CONSTRAINT estimate_approvals_pkey PRIMARY KEY (id);


--
-- Name: estimate_disclosures estimate_disclosures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_disclosures
    ADD CONSTRAINT estimate_disclosures_pkey PRIMARY KEY (id);


--
-- Name: estimate_items estimate_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_pkey PRIMARY KEY (id);


--
-- Name: estimates estimates_estimate_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_estimate_number_unique UNIQUE (estimate_number);


--
-- Name: estimates estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);


--
-- Name: invoice_approvals invoice_approvals_approval_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_approvals
    ADD CONSTRAINT invoice_approvals_approval_hash_key UNIQUE (approval_hash);


--
-- Name: invoice_approvals invoice_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_approvals
    ADD CONSTRAINT invoice_approvals_pkey PRIMARY KEY (id);


--
-- Name: invoice_disclosures invoice_disclosures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_disclosures
    ADD CONSTRAINT invoice_disclosures_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_payments invoice_payments_payment_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_payment_hash_key UNIQUE (payment_hash);


--
-- Name: invoice_payments invoice_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: request_items request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_contact_id ON public.activity_logs USING btree (contact_id);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at);


--
-- Name: idx_activity_logs_entity_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_entity_type_id ON public.activity_logs USING btree (entity_type, entity_id);


--
-- Name: idx_activity_logs_event_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_event_date ON public.activity_logs USING btree (event_date);


--
-- Name: idx_activity_logs_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_organization_id ON public.activity_logs USING btree (organization_id);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_disclosures_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disclosures_active ON public.disclosures USING btree (is_active, sort_order);


--
-- Name: idx_estimate_approvals_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_approvals_contact_id ON public.estimate_approvals USING btree (contact_id);


--
-- Name: idx_estimate_approvals_estimate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_approvals_estimate_id ON public.estimate_approvals USING btree (estimate_id);


--
-- Name: idx_estimate_approvals_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_approvals_hash ON public.estimate_approvals USING btree (approval_hash);


--
-- Name: idx_estimate_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_approvals_status ON public.estimate_approvals USING btree (status);


--
-- Name: idx_estimate_disclosures_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_disclosures_contact_id ON public.estimate_disclosures USING btree (contact_id);


--
-- Name: idx_estimate_disclosures_estimate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_disclosures_estimate_id ON public.estimate_disclosures USING btree (estimate_id);


--
-- Name: idx_estimate_items_service_fee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_items_service_fee ON public.estimate_items USING btree (is_service_fee, estimate_id);


--
-- Name: idx_estimate_items_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estimate_items_sort_order ON public.estimate_items USING btree (estimate_id, sort_order);


--
-- Name: idx_invoice_approvals_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_approvals_contact_id ON public.invoice_approvals USING btree (contact_id);


--
-- Name: idx_invoice_approvals_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_approvals_hash ON public.invoice_approvals USING btree (approval_hash);


--
-- Name: idx_invoice_approvals_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_approvals_invoice_id ON public.invoice_approvals USING btree (invoice_id);


--
-- Name: idx_invoice_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_approvals_status ON public.invoice_approvals USING btree (status);


--
-- Name: idx_invoice_disclosures_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_disclosures_contact_id ON public.invoice_disclosures USING btree (contact_id);


--
-- Name: idx_invoice_disclosures_disclosure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_disclosures_disclosure_id ON public.invoice_disclosures USING btree (disclosure_id);


--
-- Name: idx_invoice_disclosures_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_disclosures_invoice_id ON public.invoice_disclosures USING btree (invoice_id);


--
-- Name: idx_invoice_items_service_fee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_service_fee ON public.invoice_items USING btree (is_service_fee, invoice_id);


--
-- Name: idx_invoice_items_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_sort_order ON public.invoice_items USING btree (invoice_id, sort_order);


--
-- Name: idx_invoice_payments_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_payments_hash ON public.invoice_payments USING btree (payment_hash);


--
-- Name: idx_invoice_payments_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments USING btree (invoice_id);


--
-- Name: idx_products_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_default ON public.products USING btree (is_default);


--
-- Name: idx_products_is_internal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_internal ON public.products USING btree (is_internal);


--
-- Name: contacts contacts_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contacts_touch_ts BEFORE INSERT OR UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: estimate_approvals estimate_approvals_sync_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER estimate_approvals_sync_trigger AFTER INSERT OR DELETE OR UPDATE ON public.estimate_approvals FOR EACH ROW EXECUTE FUNCTION public.sync_estimate_status();


--
-- Name: estimates estimate_default_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER estimate_default_status_trigger BEFORE INSERT ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.set_estimate_default_status();


--
-- Name: estimate_items estimate_items_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER estimate_items_touch_ts BEFORE INSERT OR UPDATE ON public.estimate_items FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: estimates estimate_update_timestamp_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER estimate_update_timestamp_trigger BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.update_estimate_timestamp();


--
-- Name: estimates estimates_generate_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER estimates_generate_number BEFORE INSERT ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.trg_generate_estimate_number();


--
-- Name: estimates estimates_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER estimates_touch_ts BEFORE INSERT OR UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: invoice_approvals invoice_approvals_sync_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_approvals_sync_delete_trigger AFTER DELETE ON public.invoice_approvals FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_status();


--
-- Name: invoice_approvals invoice_approvals_sync_insert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_approvals_sync_insert_trigger AFTER INSERT ON public.invoice_approvals FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_status();


--
-- Name: invoice_approvals invoice_approvals_sync_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_approvals_sync_update_trigger AFTER UPDATE ON public.invoice_approvals FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_status();


--
-- Name: invoice_items invoice_items_lock_d; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_items_lock_d BEFORE DELETE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_items_lock_after_paid();


--
-- Name: invoice_items invoice_items_lock_u; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_items_lock_u BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_items_lock_after_paid();


--
-- Name: invoice_items invoice_items_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_items_snapshot BEFORE INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_items_snapshot();


--
-- Name: invoice_items invoice_items_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_items_touch_ts BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: invoices invoices_generate_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoices_generate_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trg_generate_invoice_number();


--
-- Name: invoices invoices_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoices_touch_ts BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: organizations organizations_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER organizations_touch_ts BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: products products_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_touch_ts BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: request_items request_items_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER request_items_touch_ts BEFORE INSERT OR UPDATE ON public.request_items FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: requests requests_touch_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requests_touch_ts BEFORE INSERT OR UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.trg_touch_timestamps();


--
-- Name: settings settings_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER settings_updated_at_trigger BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_settings_updated_at();


--
-- Name: estimate_items trg_update_estimate_total_cost_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_estimate_total_cost_delete AFTER DELETE ON public.estimate_items FOR EACH ROW EXECUTE FUNCTION public.update_estimate_total_cost();


--
-- Name: estimate_items trg_update_estimate_total_cost_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_estimate_total_cost_insert AFTER INSERT ON public.estimate_items FOR EACH ROW EXECUTE FUNCTION public.update_estimate_total_cost();


--
-- Name: estimate_items trg_update_estimate_total_cost_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_estimate_total_cost_update AFTER UPDATE ON public.estimate_items FOR EACH ROW EXECUTE FUNCTION public.update_estimate_total_cost();


--
-- Name: invoice_items trg_update_invoice_total_cost_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_invoice_total_cost_delete AFTER DELETE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_invoice_total_cost();


--
-- Name: invoice_items trg_update_invoice_total_cost_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_invoice_total_cost_insert AFTER INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_invoice_total_cost();


--
-- Name: invoice_items trg_update_invoice_total_cost_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_invoice_total_cost_update AFTER UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_invoice_total_cost();


--
-- Name: activity_logs trigger_populate_user_profile_info; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_populate_user_profile_info BEFORE INSERT ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.populate_user_profile_info();


--
-- Name: activity_logs trigger_update_activity_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_activity_logs_updated_at BEFORE UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_payments trigger_update_invoice_payment_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_invoice_payment_status AFTER UPDATE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_status();


--
-- Name: estimate_approvals update_estimate_approvals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estimate_approvals_updated_at BEFORE UPDATE ON public.estimate_approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_approvals update_invoice_approvals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoice_approvals_updated_at BEFORE UPDATE ON public.invoice_approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: estimate_approvals estimate_approvals_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_approvals
    ADD CONSTRAINT estimate_approvals_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: estimate_approvals estimate_approvals_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_approvals
    ADD CONSTRAINT estimate_approvals_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE;


--
-- Name: estimate_disclosures estimate_disclosures_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_disclosures
    ADD CONSTRAINT estimate_disclosures_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: estimate_disclosures estimate_disclosures_disclosure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_disclosures
    ADD CONSTRAINT estimate_disclosures_disclosure_id_fkey FOREIGN KEY (disclosure_id) REFERENCES public.disclosures(id);


--
-- Name: estimate_disclosures estimate_disclosures_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_disclosures
    ADD CONSTRAINT estimate_disclosures_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE;


--
-- Name: estimate_items estimate_items_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE CASCADE;


--
-- Name: estimate_items estimate_items_product_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_product_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: estimate_items estimate_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimate_items
    ADD CONSTRAINT estimate_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: estimates estimates_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: estimates estimates_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: estimates estimates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: estimates estimates_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: invoice_approvals invoice_approvals_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_approvals
    ADD CONSTRAINT invoice_approvals_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: invoice_approvals invoice_approvals_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_approvals
    ADD CONSTRAINT invoice_approvals_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_disclosures invoice_disclosures_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_disclosures
    ADD CONSTRAINT invoice_disclosures_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: invoice_disclosures invoice_disclosures_disclosure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_disclosures
    ADD CONSTRAINT invoice_disclosures_disclosure_id_fkey FOREIGN KEY (disclosure_id) REFERENCES public.disclosures(id);


--
-- Name: invoice_disclosures invoice_disclosures_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_disclosures
    ADD CONSTRAINT invoice_disclosures_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_product_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: invoice_items invoice_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: invoice_payments invoice_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: request_items request_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: request_items request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: requests requests_accepted_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_accepted_estimate_id_fkey FOREIGN KEY (accepted_estimate_id) REFERENCES public.estimates(id) ON DELETE SET NULL;


--
-- Name: disclosures Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.disclosures USING (true);


--
-- Name: estimate_disclosures Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.estimate_disclosures USING (true);


--
-- Name: invoice_payments Allow anonymous users to read invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anonymous users to read invoice payments" ON public.invoice_payments FOR SELECT TO anon USING (true);


--
-- Name: invoice_payments Allow authenticated users to create invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to create invoice payments" ON public.invoice_payments FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: invoice_payments Allow authenticated users to read invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to read invoice payments" ON public.invoice_payments FOR SELECT TO authenticated USING (true);


--
-- Name: invoice_payments Allow authenticated users to update invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to update invoice payments" ON public.invoice_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: estimate_approvals Allow public updates by approval hash; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public updates by approval hash" ON public.estimate_approvals FOR UPDATE USING ((approval_hash IS NOT NULL)) WITH CHECK ((approval_hash IS NOT NULL));


--
-- Name: invoice_payments Allow service role full access to invoice payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow service role full access to invoice payments" ON public.invoice_payments TO service_role USING (true) WITH CHECK (true);


--
-- Name: estimate_approvals Authenticated users can create estimate approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create estimate approvals" ON public.estimate_approvals FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: estimate_approvals Authenticated users can update estimate approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update estimate approvals" ON public.estimate_approvals FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: settings Enable insert/update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert/update for authenticated users" ON public.settings USING ((auth.role() = 'authenticated'::text));


--
-- Name: settings Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for authenticated users" ON public.settings FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: estimate_approvals Public can view estimate approvals by hash; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view estimate approvals by hash" ON public.estimate_approvals FOR SELECT USING (true);


--
-- Name: invoice_approvals Users can delete invoice approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete invoice approvals" ON public.invoice_approvals FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: activity_logs Users can delete their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own activity logs" ON public.activity_logs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: invoice_approvals Users can insert invoice approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert invoice approvals" ON public.invoice_approvals FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: activity_logs Users can insert their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own activity logs" ON public.activity_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoice_approvals Users can manage invoice_approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage invoice_approvals" ON public.invoice_approvals USING ((auth.role() = 'authenticated'::text));


--
-- Name: invoice_approvals Users can update invoice approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update invoice approvals" ON public.invoice_approvals FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: activity_logs Users can update their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own activity logs" ON public.activity_logs FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: invoice_approvals Users can view invoice approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invoice approvals" ON public.invoice_approvals FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: activity_logs Users can view their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: estimate_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estimate_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict jwa3VovqNNgmstL4wehhL2ViYtfTe35jIriW483wtPzV2BKCm0W74suAT2j84rw

