-- ============================================================================
-- Procurement — Stage 2
-- Purchase Orders, Goods Received Notes, atomic receive-against-PO
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Document number counter (shared by PO and GRN)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists doc_number_counters (
  prefix     text primary key,
  last_seq   integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function next_doc_number(p_prefix text, p_pad int default 4)
returns text
language plpgsql
as $$
declare
  v_seq integer;
begin
  insert into doc_number_counters (prefix, last_seq)
  values (p_prefix, 0)
  on conflict (prefix) do nothing;

  update doc_number_counters
     set last_seq = last_seq + 1,
         updated_at = now()
   where prefix = p_prefix
  returning last_seq into v_seq;

  return p_prefix || '-' || lpad(v_seq::text, p_pad, '0');
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Purchase Orders
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists purchase_orders (
  id              text primary key,
  po_number       text unique not null,
  supplier_id     text references suppliers(id) on delete restrict,
  status          text not null default 'draft'
                    check (status in ('draft','pending_approval','approved',
                                      'partially_received','received',
                                      'cancelled','rejected')),
  order_date      date not null default current_date,
  expected_date   date,
  subtotal        numeric not null default 0,
  tax_amount      numeric not null default 0,
  total_amount    numeric not null default 0,
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  approved_by     uuid references auth.users(id) on delete set null,
  approved_at     timestamptz,
  cancelled_by    uuid references auth.users(id) on delete set null,
  cancelled_at    timestamptz,
  cancel_reason   text,
  updated_at      timestamptz not null default now()
);

create index if not exists purchase_orders_supplier_idx on purchase_orders (supplier_id);
create index if not exists purchase_orders_status_idx   on purchase_orders (status);
create index if not exists purchase_orders_date_idx     on purchase_orders (order_date desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Purchase Order lines
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists purchase_order_items (
  id              text primary key,
  po_id           text not null references purchase_orders(id) on delete cascade,
  item_id         text not null references inventory_items(id) on delete restrict,
  qty_ordered     numeric not null default 0,
  qty_received    numeric not null default 0,
  unit_cost       numeric not null default 0,
  line_total      numeric not null default 0,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists poi_po_idx   on purchase_order_items (po_id);
create index if not exists poi_item_idx on purchase_order_items (item_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Goods Received Notes
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists goods_received_notes (
  id              text primary key,
  grn_number      text unique not null,
  po_id           text references purchase_orders(id) on delete set null,
  supplier_id     text references suppliers(id) on delete set null,
  location_id     text not null references inventory_locations(id) on delete restrict,
  invoice_number  text,
  invoice_date    date,
  subtotal        numeric not null default 0,
  tax_amount      numeric not null default 0,
  total_amount    numeric not null default 0,
  notes           text,
  received_by     uuid references auth.users(id) on delete set null,
  received_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists grn_po_idx       on goods_received_notes (po_id);
create index if not exists grn_supplier_idx on goods_received_notes (supplier_id);
create index if not exists grn_date_idx     on goods_received_notes (received_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. GRN lines
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists grn_items (
  id              text primary key,
  grn_id          text not null references goods_received_notes(id) on delete cascade,
  po_item_id      text references purchase_order_items(id) on delete set null,
  item_id         text not null references inventory_items(id) on delete restrict,
  batch_id        text references inventory_batches(id) on delete set null,
  qty_received    numeric not null default 0,
  qty_rejected    numeric not null default 0,
  unit_cost       numeric not null default 0,
  lot_number      text,
  expiry_date     date,
  barcode         text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists grn_items_grn_idx  on grn_items (grn_id);
create index if not exists grn_items_item_idx on grn_items (item_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Link batches back to their GRN and PO
-- ─────────────────────────────────────────────────────────────────────────────
alter table inventory_batches
  add column if not exists grn_id text references goods_received_notes(id) on delete set null,
  add column if not exists po_id text references purchase_orders(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table purchase_orders       enable row level security;
alter table purchase_order_items  enable row level security;
alter table goods_received_notes  enable row level security;
alter table grn_items             enable row level security;

drop policy if exists po_read        on purchase_orders;
drop policy if exists poi_read       on purchase_order_items;
drop policy if exists grn_read       on goods_received_notes;
drop policy if exists grn_items_read on grn_items;

create policy po_read        on purchase_orders      for select to authenticated using (true);
create policy poi_read       on purchase_order_items for select to authenticated using (true);
create policy grn_read       on goods_received_notes for select to authenticated using (true);
create policy grn_items_read on grn_items            for select to authenticated using (true);

drop policy if exists po_write  on purchase_orders;
drop policy if exists poi_write on purchase_order_items;
drop policy if exists grn_write on goods_received_notes;
drop policy if exists gri_write on grn_items;

create policy po_write on purchase_orders for all to authenticated
  using (exists (select 1 from staff_profiles where user_id = auth.uid()
                 and role in ('store_keeper','manager','admin','developer')))
  with check (exists (select 1 from staff_profiles where user_id = auth.uid()
                 and role in ('store_keeper','manager','admin','developer')));

create policy poi_write on purchase_order_items for all to authenticated
  using (exists (select 1 from staff_profiles where user_id = auth.uid()
                 and role in ('store_keeper','manager','admin','developer')))
  with check (exists (select 1 from staff_profiles where user_id = auth.uid()
                 and role in ('store_keeper','manager','admin','developer')));

create policy grn_write on goods_received_notes for all to authenticated
  using (exists (select 1 from staff_profiles where user_id = auth.uid()
                 and role in ('store_keeper','manager','admin','developer')))
  with check (exists (select 1 from staff_profiles where user_id = auth.uid()
                 and role in ('store_keeper','manager','admin','developer')));

create policy gri_write on grn_items for all to authenticated
  using (exists (select 1 from staff_profiles where user_id = auth.uid()
                 and role in ('store_keeper','manager','admin','developer')))
  with check (exists (select 1 from staff_profiles where user_id = auth.uid()
                 and role in ('store_keeper','manager','admin','developer')));

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RPC: create_purchase_order
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function create_purchase_order(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_po_id      text;
  v_po_number  text;
  v_supplier   text;
  v_order_date date;
  v_expected   date;
  v_notes      text;
  v_lines      jsonb;
  v_line       jsonb;
  v_subtotal   numeric := 0;
  v_tax        numeric := 0;
  v_total      numeric := 0;
  v_line_total numeric;
  v_actor      uuid;
  v_line_id    text;
begin
  v_supplier   := nullif(p_payload->>'supplier_id', '');
  v_order_date := coalesce(nullif(p_payload->>'order_date','')::date, current_date);
  v_expected   := nullif(p_payload->>'expected_date', '')::date;
  v_notes      := nullif(p_payload->>'notes', '');
  v_lines      := p_payload->'lines';
  v_actor      := auth.uid();

  if v_supplier is null then
    raise exception 'supplier_id is required';
  end if;
  if v_lines is null or jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then
    raise exception 'at least one line is required';
  end if;

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    v_subtotal := v_subtotal
                + (coalesce((v_line->>'qty_ordered')::numeric, 0)
                *  coalesce((v_line->>'unit_cost')::numeric, 0));
  end loop;
  v_tax   := coalesce((p_payload->>'tax_amount')::numeric, 0);
  v_total := v_subtotal + v_tax;

  v_po_id     := 'PO-'  || to_char(now(), 'YYYYMMDDHH24MISS') || '-'
                       || substr(md5(random()::text), 1, 4);
  v_po_number := next_doc_number('PO-' || to_char(now(), 'YYMM'), 4);

  insert into purchase_orders (
    id, po_number, supplier_id, status, order_date, expected_date,
    subtotal, tax_amount, total_amount, notes, created_by
  ) values (
    v_po_id, v_po_number, v_supplier, 'draft', v_order_date, v_expected,
    v_subtotal, v_tax, v_total, v_notes, v_actor
  );

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    v_line_total := coalesce((v_line->>'qty_ordered')::numeric, 0)
                  * coalesce((v_line->>'unit_cost')::numeric, 0);
    v_line_id    := 'POI-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-'
                          || substr(md5(random()::text), 1, 4);

    insert into purchase_order_items (
      id, po_id, item_id, qty_ordered, unit_cost, line_total, notes
    ) values (
      v_line_id, v_po_id, v_line->>'item_id',
      coalesce((v_line->>'qty_ordered')::numeric, 0),
      coalesce((v_line->>'unit_cost')::numeric, 0),
      v_line_total,
      nullif(v_line->>'notes', '')
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'po_id',        v_po_id,
    'po_number',    v_po_number,
    'subtotal',     v_subtotal,
    'tax_amount',   v_tax,
    'total_amount', v_total
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RPC: update_po_status
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function update_po_status(
  p_po_id  text,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_actor uuid;
  v_role  text;
begin
  v_actor := auth.uid();
  select role into v_role from staff_profiles where user_id = v_actor;

  if v_role not in ('store_keeper','manager','admin','developer') then
    raise exception 'Insufficient privileges';
  end if;

  if p_status = 'approved' then
    if v_role not in ('manager','admin','developer') then
      raise exception 'Only managers can approve purchase orders';
    end if;
    update purchase_orders
       set status      = 'approved',
           approved_by = v_actor,
           approved_at = now(),
           updated_at  = now()
     where id = p_po_id and status in ('draft','pending_approval');

  elsif p_status = 'pending_approval' then
    update purchase_orders
       set status = 'pending_approval', updated_at = now()
     where id = p_po_id and status = 'draft';

  elsif p_status = 'cancelled' then
    update purchase_orders
       set status        = 'cancelled',
           cancelled_by  = v_actor,
           cancelled_at  = now(),
           cancel_reason = p_reason,
           updated_at    = now()
     where id = p_po_id and status not in ('received','cancelled');

  else
    raise exception 'Unsupported status transition: %', p_status;
  end if;

  return jsonb_build_object('ok', true, 'po_id', p_po_id, 'status', p_status);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. RPC: receive_against_po
--     Creates GRN + GRN items + batches + ledger entries + updates PO lines
--     and PO status in one atomic transaction.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function receive_against_po(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_grn_id         text;
  v_grn_number     text;
  v_po_id          text;
  v_supplier_id    text;
  v_location_id    text;
  v_invoice_number text;
  v_invoice_date   date;
  v_notes          text;
  v_lines          jsonb;
  v_line           jsonb;
  v_po_item_id     text;
  v_item_id        text;
  v_batch_id       text;
  v_lot            text;
  v_expiry         date;
  v_unit_cost      numeric;
  v_qty_recv       numeric;
  v_qty_rej        numeric;
  v_barcode        text;
  v_line_note      text;
  v_actor          uuid;
  v_subtotal       numeric := 0;
  v_all_received   boolean;
  v_any_received   boolean;
begin
  v_actor          := auth.uid();
  v_po_id          := nullif(p_payload->>'po_id', '');
  v_supplier_id    := nullif(p_payload->>'supplier_id', '');
  v_location_id    := p_payload->>'location_id';
  v_invoice_number := nullif(p_payload->>'invoice_number', '');
  v_invoice_date   := nullif(p_payload->>'invoice_date', '')::date;
  v_notes          := nullif(p_payload->>'notes', '');
  v_lines          := p_payload->'lines';

  if v_location_id is null then
    raise exception 'location_id is required';
  end if;
  if v_lines is null or jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then
    raise exception 'at least one line is required';
  end if;

  if v_supplier_id is null and v_po_id is not null then
    select supplier_id into v_supplier_id from purchase_orders where id = v_po_id;
  end if;

  v_grn_id     := 'GRN-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-'
                        || substr(md5(random()::text), 1, 4);
  v_grn_number := next_doc_number('GRN-' || to_char(now(), 'YYMM'), 4);

  insert into goods_received_notes (
    id, grn_number, po_id, supplier_id, location_id,
    invoice_number, invoice_date, subtotal, tax_amount, total_amount,
    notes, received_by
  ) values (
    v_grn_id, v_grn_number, v_po_id, v_supplier_id, v_location_id,
    v_invoice_number, v_invoice_date, 0, 0, 0, v_notes, v_actor
  );

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    v_po_item_id := nullif(v_line->>'po_item_id', '');
    v_item_id    := v_line->>'item_id';
    v_lot        := nullif(v_line->>'lot_number', '');
    v_expiry     := nullif(v_line->>'expiry_date', '')::date;
    v_unit_cost  := coalesce((v_line->>'unit_cost')::numeric, 0);
    v_qty_recv   := coalesce((v_line->>'qty_received')::numeric, 0);
    v_qty_rej    := coalesce((v_line->>'qty_rejected')::numeric, 0);
    v_barcode    := nullif(v_line->>'barcode', '');
    v_line_note  := nullif(v_line->>'notes', '');

    if v_item_id is null or v_item_id = '' then
      raise exception 'line.item_id is required';
    end if;
    if v_qty_recv <= 0 and v_qty_rej <= 0 then
      raise exception 'line must have qty_received or qty_rejected > 0';
    end if;

    v_batch_id := null;
    if v_qty_recv > 0 then
      v_batch_id := 'BAT-' || v_item_id || '-'
                 || to_char(now(), 'YYYYMMDDHH24MISS') || '-'
                 || substr(md5(random()::text), 1, 4);

      insert into inventory_batches (
        id, item_id, lot_number, supplier_id, unit_cost,
        expiry_date, barcode, received_at, grn_id, po_id
      ) values (
        v_batch_id, v_item_id, v_lot, v_supplier_id, v_unit_cost,
        v_expiry, v_barcode, now(), v_grn_id, v_po_id
      );

      insert into inventory_ledger (
        item_id, batch_id, location_id, qty_delta,
        transaction_type, reference_id, reference_type, user_id
      ) values (
        v_item_id, v_batch_id, v_location_id, v_qty_recv,
        'receive', v_grn_id, 'grn', v_actor
      );

      v_subtotal := v_subtotal + (v_qty_recv * v_unit_cost);
    end if;

    insert into grn_items (
      id, grn_id, po_item_id, item_id, batch_id,
      qty_received, qty_rejected, unit_cost,
      lot_number, expiry_date, barcode, notes
    ) values (
      'GRI-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-'
             || substr(md5(random()::text), 1, 4),
      v_grn_id, v_po_item_id, v_item_id, v_batch_id,
      v_qty_recv, v_qty_rej, v_unit_cost,
      v_lot, v_expiry, v_barcode, v_line_note
    );

    if v_po_item_id is not null then
      update purchase_order_items
         set qty_received = qty_received + v_qty_recv
       where id = v_po_item_id;
    end if;
  end loop;

  if v_po_id is not null then
    select bool_and(qty_received >= qty_ordered),
           bool_or (qty_received > 0)
      into v_all_received, v_any_received
      from purchase_order_items
     where po_id = v_po_id;

    if v_all_received = true then
      update purchase_orders set status = 'received',           updated_at = now() where id = v_po_id;
    elsif v_any_received = true then
      update purchase_orders set status = 'partially_received', updated_at = now() where id = v_po_id;
    end if;
  end if;

  update goods_received_notes
     set subtotal = v_subtotal,
         total_amount = v_subtotal
   where id = v_grn_id;

  return jsonb_build_object(
    'ok',          true,
    'grn_id',      v_grn_id,
    'grn_number',  v_grn_number,
    'po_id',       v_po_id,
    'subtotal',    v_subtotal
  );
end;
$$;

grant execute on function next_doc_number(text, int)        to authenticated;
grant execute on function create_purchase_order(jsonb)      to authenticated;
grant execute on function update_po_status(text, text, text) to authenticated;
grant execute on function receive_against_po(jsonb)         to authenticated;