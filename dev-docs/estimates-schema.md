# Estimates and Estimate Items Schema

# Estimates
create table public.estimates (
id uuid not null default gen_random_uuid (),
organization_id uuid null,
contact_id uuid not null,
status text not null,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now(),
deleted_at timestamp with time zone null,
estimate_number text not null,
organization text null default 'no'::text,
guests integer null default 1,
event_type text null,
event_address_street text null,
event_address_unit text null,
event_city text null,
event_state text null default 'California'::text,
event_zipcode text null,
event_county text null,
event_date date null,
event_start_time time without time zone null,
event_end_time time without time zone null,
comment text null,
referred_by text null,
total_cost numeric(12, 2) null default 0,
approved_by uuid null,
rejected_by uuid null,
constraint estimates_pkey primary key (id),
constraint estimates_estimate_number_unique unique (estimate_number),
constraint estimates_approved_by_fkey foreign KEY (approved_by) references contacts (id) on delete set null,
constraint estimates_contact_id_fkey foreign KEY (contact_id) references contacts (id) on delete set null,
constraint estimates_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete set null,
constraint estimates_rejected_by_fkey foreign KEY (rejected_by) references contacts (id) on delete set null
) TABLESPACE pg_default;

create trigger estimate_default_status_trigger BEFORE INSERT on estimates for EACH row
execute FUNCTION set_estimate_default_status ();

create trigger estimate_update_timestamp_trigger BEFORE
update on estimates for EACH row
execute FUNCTION update_estimate_timestamp ();

create trigger estimates_generate_number BEFORE INSERT on estimates for EACH row
execute FUNCTION trg_generate_estimate_number ();

create trigger estimates_touch_ts BEFORE INSERT
or
update on estimates for EACH row
execute FUNCTION trg_touch_timestamps ();

# estimate_items
create table public.estimate_items (
id uuid not null default gen_random_uuid (),
estimate_id uuid not null,
product_id uuid null,
qty numeric(12, 3) not null,
unit_price numeric(12, 2) null,
item_name text null,
item_description text null,
item_sku text null,
item_featured_image text null,
is_custom boolean not null default false,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now(),
sort_order integer not null default 0,
is_service_fee boolean null default false,
fee_type character varying(20) null,
fee_rate numeric(10, 4) null,
service_fee_base_amount numeric(10, 2) null,
service_fee_type text null,
service_fee_rate numeric(10, 4) null,
constraint estimate_items_pkey primary key (id),
constraint estimate_items_product_fk foreign KEY (product_id) references products (id) on delete set null,
constraint estimate_items_estimate_id_fkey foreign KEY (estimate_id) references estimates (id) on delete CASCADE,
constraint estimate_items_product_id_fkey foreign KEY (product_id) references products (id),
constraint estimate_items_product_or_custom check (
(
(
(product_id is not null)
and (is_custom = false)
)
or (
(product_id is null)
and (is_custom = true)
and (
COALESCE(
TRIM(
both
from
item_name
),
''::text
) <> ''::text
)
)
)
),
constraint estimate_items_qty_check check ((qty > (0)::numeric)),
constraint estimate_items_service_fee_type_check check (
(
(
service_fee_type = any (array['percentage'::text, 'fixed'::text])
)
or (service_fee_type is null)
)
)
) TABLESPACE pg_default;

create index IF not exists idx_estimate_items_sort_order on public.estimate_items using btree (estimate_id, sort_order) TABLESPACE pg_default;

create index IF not exists idx_estimate_items_service_fee on public.estimate_items using btree (is_service_fee, estimate_id) TABLESPACE pg_default;

create trigger estimate_items_touch_ts BEFORE INSERT
or
update on estimate_items for EACH row
execute FUNCTION trg_touch_timestamps ();

create trigger trg_update_estimate_total_cost_delete
after DELETE on estimate_items for EACH row
execute FUNCTION update_estimate_total_cost ();

create trigger trg_update_estimate_total_cost_insert
after INSERT on estimate_items for EACH row
execute FUNCTION update_estimate_total_cost ();

create trigger trg_update_estimate_total_cost_update
after
update on estimate_items for EACH row
execute FUNCTION update_estimate_total_cost ();