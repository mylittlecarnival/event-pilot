# Create a requests page that shows requests coming in from the website.
# Create a request index page only, (no slug page)
# Below is the requests supabase schema and the request_items schema
# Use the same table styling as shown on src/app/(app)/estimates/page.tsx but use this table src/components/table.tsx

# requests schema
create table public.requests (
id uuid not null default gen_random_uuid (),
first_name text null,
last_name text null,
phone text null,
organization_name text null,
event_date date null,
notes text null,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now(),
deleted_at timestamp with time zone null,
accepted_estimate_id uuid null,
contact_email text null,
organization text null default 'no'::text,
guests integer null default 1,
event_type text null,
event_address_street text null,
event_address_unit text null,
event_city text null,
event_state text null default 'California'::text,
event_zipcode text null,
event_county text null,
event_start_time time without time zone null,
event_end_time time without time zone null,
referred_by text null,
status text null default 'pending'::text,
constraint requests_pkey primary key (id),
constraint requests_accepted_estimate_id_fkey foreign KEY (accepted_estimate_id) references estimates (id) on delete set null
) TABLESPACE pg_default;

create trigger requests_touch_ts BEFORE INSERT
or
update on requests for EACH row
execute FUNCTION trg_touch_timestamps ();

# request_items
create table public.request_items (
id uuid not null default gen_random_uuid (),
request_id uuid not null,
product_id uuid not null,
qty numeric(12, 3) not null default 1,
created_at timestamp with time zone not null default now(),
updated_at timestamp with time zone not null default now(),
deleted_at timestamp with time zone null,
constraint request_items_pkey primary key (id),
constraint request_items_product_id_fkey foreign KEY (product_id) references products (id),
constraint request_items_request_id_fkey foreign KEY (request_id) references requests (id) on delete CASCADE,
constraint request_items_qty_check check ((qty > (0)::numeric))
) TABLESPACE pg_default;

create trigger request_items_touch_ts BEFORE INSERT
or
update on request_items for EACH row
execute FUNCTION trg_touch_timestamps ();