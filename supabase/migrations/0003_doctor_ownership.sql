-- ============================================================================
-- Doctor ownership — Stage 3
--  • orders.doctor_id (nullable, FK to doctors.id)
--  • Trigger keeps doctor_id in sync from patients.address on every insert/update
--  • Backfill historical rows
--  • RLS policies scoping doctors to their own orders/results
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Column
-- ─────────────────────────────────────────────────────────────────────────────
alter table orders
  add column if not exists doctor_id text references doctors(id) on delete set null;

create index if not exists orders_doctor_idx on orders (doctor_id);
create index if not exists orders_doctor_date_idx on orders (doctor_id, order_date desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Normaliser — MUST match the JS implementation in financeApi.js
--    (lowercase, strip "ref:", cut at "(", drop non-alphanumerics).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function normalise_doctor_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_name is null or p_name = '' then return ''; end if;
  v := lower(p_name);
  v := regexp_replace(v, 'ref:', '', 'gi');
  v := split_part(v, '(', 1);
  v := regexp_replace(v, '[^a-z0-9]', '', 'g');
  return trim(v);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger — derive doctor_id from the patient's "Ref: X" address
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function orders_set_doctor_id()
returns trigger
language plpgsql
as $$
declare
  v_ref  text;
  v_key  text;
  v_doc  text;
begin
  -- Only derive if the caller did not provide an explicit doctor_id.
  if new.doctor_id is not null then
    return new;
  end if;

  select address into v_ref from patients where id = new.patient_id;
  if v_ref is null or v_ref = '' then
    return new;
  end if;

  if not v_ref ilike 'Ref:%' then
    return new;
  end if;

  v_ref := trim(regexp_replace(v_ref, '^Ref:\s*', '', 'i'));
  if v_ref = '' or lower(v_ref) = 'self' then
    return new;
  end if;

  v_key := normalise_doctor_name(v_ref);

  select id into v_doc
    from doctors
   where normalise_doctor_name(name) = v_key
   limit 1;

  if v_doc is not null then
    new.doctor_id := v_doc;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_derive_doctor_id on orders;
create trigger orders_derive_doctor_id
  before insert or update of patient_id, doctor_id on orders
  for each row execute function orders_set_doctor_id();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Backfill historical orders
-- ─────────────────────────────────────────────────────────────────────────────
update orders o
   set doctor_id = d.id
  from patients p, doctors d
 where o.patient_id = p.id
   and o.doctor_id is null
   and p.address ilike 'Ref:%'
   and normalise_doctor_name(regexp_replace(p.address, '^Ref:\s*', '', 'i'))
       = normalise_doctor_name(d.name);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS — doctors can only read their own orders + order_tests + results
--    Staff roles keep their existing access (the migration only adds policies;
--    it does not replace the ones already in place).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function current_doctor_id()
returns text
language sql
stable
as $$
  select id from doctors where user_id = auth.uid() limit 1;
$$;

create or replace function is_staff_role()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from staff_profiles
     where user_id = auth.uid()
       and role in ('developer','manager','admin','verifier',
                    'biochemist','technologist','receptionist','store_keeper')
  );
$$;

alter table orders       enable row level security;
alter table order_tests  enable row level security;
alter table results      enable row level security;

-- Orders: allow when the caller is staff, OR the row belongs to this doctor.
drop policy if exists orders_doctor_read on orders;
create policy orders_doctor_read on orders
  for select to authenticated
  using (
    is_staff_role()
    or doctor_id = current_doctor_id()
  );

drop policy if exists order_tests_doctor_read on order_tests;
create policy order_tests_doctor_read on order_tests
  for select to authenticated
  using (
    is_staff_role()
    or exists (
      select 1 from orders o
       where o.id = order_tests.order_id
         and o.doctor_id = current_doctor_id()
    )
  );

drop policy if exists results_doctor_read on results;
create policy results_doctor_read on results
  for select to authenticated
  using (
    is_staff_role()
    or exists (
      select 1 from orders o
       where o.id = results.order_id
         and o.doctor_id = current_doctor_id()
    )
  );

-- Doctors may write prescriptions for their own orders only.
alter table prescriptions       enable row level security;
alter table prescription_items  enable row level security;

drop policy if exists prescriptions_doctor_rw on prescriptions;
create policy prescriptions_doctor_rw on prescriptions
  for all to authenticated
  using (
    is_staff_role()
    or doctor_id = current_doctor_id()
  )
  with check (
    is_staff_role()
    or doctor_id = current_doctor_id()
  );

drop policy if exists prescription_items_doctor_rw on prescription_items;
create policy prescription_items_doctor_rw on prescription_items
  for all to authenticated
  using (
    is_staff_role()
    or exists (
      select 1 from prescriptions p
       where p.id = prescription_items.prescription_id
         and p.doctor_id = current_doctor_id()
    )
  )
  with check (
    is_staff_role()
    or exists (
      select 1 from prescriptions p
       where p.id = prescription_items.prescription_id
         and p.doctor_id = current_doctor_id()
    )
  );

-- Doctors may not update arbitrary patient rows; they may update their own.
drop policy if exists doctors_self_update on doctors;
create policy doctors_self_update on doctors
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Permission grants
-- ─────────────────────────────────────────────────────────────────────────────
grant execute on function normalise_doctor_name(text) to authenticated;
grant execute on function current_doctor_id()         to authenticated;
grant execute on function is_staff_role()             to authenticated;