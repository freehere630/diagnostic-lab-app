-- Appointments / queue
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  patient_name text not null,
  patient_phone text,
  scheduled_at timestamptz not null,
  status text not null default 'waiting',
  token_no int,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint appointments_status_chk check (status in
    ('waiting','in_consultation','completed','cancelled','missed'))
);
create index if not exists idx_appointments_doctor_date
  on appointments(doctor_id, scheduled_at);

-- Favorites
create table if not exists medicine_favorites (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  brand_name text not null,
  generic_name text,
  strength text,
  dosage_form text,
  manufacturer text,
  created_at timestamptz default now(),
  unique (doctor_id, brand_name, strength, dosage_form)
);

-- Templates
create table if not exists prescription_templates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Investigation orders
create table if not exists investigation_orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete set null,
  visit_id uuid,
  tests jsonb not null default '[]'::jsonb,
  status text not null default 'ordered',
  ordered_at timestamptz default now(),
  result_summary text,
  result_document_url text,
  constraint inv_orders_status_chk check (status in
    ('ordered','in_progress','completed','cancelled'))
);
create index if not exists idx_inv_orders_doctor on investigation_orders(doctor_id, ordered_at desc);
create index if not exists idx_inv_orders_patient on investigation_orders(patient_id);

-- RLS: owner-only (adjust to your auth model)
alter table appointments            enable row level security;
alter table medicine_favorites      enable row level security;
alter table prescription_templates  enable row level security;
alter table investigation_orders    enable row level security;

create policy "own appointments" on appointments
  for all using (doctor_id in (select id from doctors where staff_profile_id = auth.uid()));
create policy "own favorites" on medicine_favorites
  for all using (doctor_id in (select id from doctors where staff_profile_id = auth.uid()));
create policy "own templates" on prescription_templates
  for all using (doctor_id in (select id from doctors where staff_profile_id = auth.uid()));
create policy "own investigations" on investigation_orders
  for all using (doctor_id in (select id from doctors where staff_profile_id = auth.uid()));