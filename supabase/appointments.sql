create extension if not exists pgcrypto;

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  booking_reference text unique not null,
  customer_name text not null,
  phone text not null,
  email text,
  service_type text not null,
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  tire_size text,
  preferred_date date not null,
  preferred_time time not null,
  status text default 'Pending',
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table appointments enable row level security;

create index if not exists appointments_booking_reference_idx on appointments (booking_reference);
create index if not exists appointments_phone_idx on appointments (phone);
create index if not exists appointments_preferred_date_idx on appointments (preferred_date);
create index if not exists appointments_status_idx on appointments (status);

create or replace function set_appointments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists appointments_updated_at on appointments;

create trigger appointments_updated_at
before update on appointments
for each row
execute function set_appointments_updated_at();
