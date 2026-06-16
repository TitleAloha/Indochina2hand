-- ============================================================
-- ReViet (TH-VN Second-hand Shop) — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it
-- once on a fresh project (Database > SQL Editor > New query).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Sequences for human-readable display codes
-- (continue numbering from the prototype's sample data)
-- ------------------------------------------------------------
create sequence product_code_seq start 1050;
create sequence demand_code_seq  start 27;
create sequence tx_code_seq      start 9006;
create sequence order_code_seq   start 5505;

-- ------------------------------------------------------------
-- profiles — one row per app user (mirrors auth.users)
-- ------------------------------------------------------------
create table profiles (
  id           uuid primary key default gen_random_uuid(),
  role         text not null default 'buyer' check (role in ('admin','seller','buyer')),
  display_name text not null default '',
  country      text not null default 'VN' check (country in ('TH','VN')),
  avatar_hue   int  not null default 155,
  points       int  not null default 0,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- products — items listed by Thai sellers
-- ------------------------------------------------------------
create table products (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique default ('P-' || nextval('product_code_seq')),
  name       jsonb not null,
  cat        text not null check (cat in ('bags','shoes','camera','fashion','watch','tech','home')),
  price_thb  numeric not null check (price_thb > 0),
  condition  text not null check (condition in ('A','B','C')),
  seller_id  uuid not null references profiles(id),
  hue        int not null default 155,
  status     text not null default 'review' check (status in ('review','listed','matched','shipping','delivered')),
  likes      int not null default 0,
  image_url  text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- demands — what Vietnam wants from Thailand
-- ------------------------------------------------------------
create table demands (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique default ('D-' || nextval('demand_code_seq')),
  cat        text not null check (cat in ('bags','shoes','camera','fashion','watch','tech','home')),
  label      jsonb not null,
  qty        int not null,
  budget_thb numeric not null,
  trend      text not null default 'steady' check (trend in ('hot','up','steady')),
  filled     int not null default 0,
  hue        int not null default 155,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- matches — admin pairing of a product to a demand
-- ------------------------------------------------------------
create table matches (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references products(id),
  demand_id  uuid not null references demands(id),
  matched_by uuid references profiles(id),
  matched_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- transactions — finance ledger (VND in, THB out)
-- ------------------------------------------------------------
create table transactions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique default ('TX-' || nextval('tx_code_seq')),
  product_id uuid not null references products(id),
  buyer_id   uuid not null references profiles(id),
  vnd        numeric not null,
  thb        numeric not null,
  fee        numeric not null,
  status     text not null default 'pending' check (status in ('pending','converted','paid_out')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- points_ledger — running history of point earns/redemptions
-- ------------------------------------------------------------
create table points_ledger (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id),
  label         jsonb not null,
  pts           int not null,
  reason        text not null,
  related_tx_id uuid references transactions(id),
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- rewards_catalog — redeemable perks
-- ------------------------------------------------------------
create table rewards_catalog (
  id     uuid primary key default gen_random_uuid(),
  label  jsonb not null,
  cost   int not null,
  icon   text not null default '🎁',
  active boolean not null default true
);

-- ------------------------------------------------------------
-- redemptions — history of reward redemptions
-- ------------------------------------------------------------
create table redemptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  reward_id  uuid not null references rewards_catalog(id),
  cost       int not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- orders — cross-border tracking
-- ------------------------------------------------------------
create table orders (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique default ('OD-' || nextval('order_code_seq')),
  product_id uuid not null references products(id),
  buyer_id   uuid not null references profiles(id),
  stage      int not null default 0 check (stage between 0 and 6),
  eta        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Helper functions
-- ============================================================

-- true if the current JWT belongs to an admin profile
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- creates a profile row whenever someone signs up via Supabase Auth
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_country text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'buyer');
  if v_role not in ('seller','buyer') then
    v_role := 'buyer'; -- admin can never be self-assigned at signup
  end if;
  v_country := case when v_role = 'seller' then 'TH' else 'VN' end;

  insert into public.profiles (id, role, display_name, country, avatar_hue)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    v_country,
    (floor(random() * 360))::int
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RPCs (run as table owner so they can write across tables
-- while bypassing RLS for the specific, validated operation)
-- ============================================================

-- buyer checkout: creates transactions + orders + points for a cart
create or replace function checkout(product_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_product products;
  v_total_thb numeric := 0;
  v_pts int;
  v_tx_id uuid;
  v_order_id uuid;
  v_results jsonb := '[]'::jsonb;
begin
  if v_buyer is null then
    raise exception 'Not authenticated';
  end if;

  for v_product in
    select * from products where id = any(product_ids) for update
  loop
    if v_product.status not in ('listed','matched') then
      raise exception 'Product % is not available for purchase', v_product.code;
    end if;

    insert into transactions (product_id, buyer_id, vnd, thb, fee, status)
    values (v_product.id, v_buyer, v_product.price_thb * 730, v_product.price_thb, round(v_product.price_thb * 0.06), 'pending')
    returning id into v_tx_id;

    insert into orders (product_id, buyer_id, stage, eta)
    values (v_product.id, v_buyer, 0, '')
    returning id into v_order_id;

    update products set status = 'shipping' where id = v_product.id;

    v_total_thb := v_total_thb + v_product.price_thb;
    v_results := v_results || jsonb_build_object('product_id', v_product.id, 'tx_id', v_tx_id, 'order_id', v_order_id);
  end loop;

  v_pts := round(v_total_thb / 10);
  if v_pts > 0 then
    insert into points_ledger (profile_id, label, pts, reason)
    values (v_buyer, jsonb_build_object('th','ได้รับแต้มจากการสั่งซื้อ','vn','Điểm từ đơn hàng','en','Points from order'), v_pts, 'order');
    update profiles set points = points + v_pts where id = v_buyer;
  end if;

  return jsonb_build_object('orders', v_results, 'points_earned', v_pts);
end;
$$;

-- admin: pair a product with a Vietnam demand
create or replace function match_product(p_product_id uuid, p_demand_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  insert into matches (product_id, demand_id, matched_by)
  values (p_product_id, p_demand_id, auth.uid())
  on conflict (product_id) do update
    set demand_id = excluded.demand_id, matched_by = excluded.matched_by, matched_at = now();

  update products set status = 'matched' where id = p_product_id and status in ('review','listed');
  update demands set filled = filled + 1 where id = p_demand_id;
end;
$$;

-- admin: advance a transaction pending -> converted -> paid_out
-- (awards seller sale points the moment it reaches paid_out)
create or replace function advance_transaction(p_tx_id uuid)
returns transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx transactions;
  v_product products;
  v_pts int;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_tx from transactions where id = p_tx_id for update;
  if v_tx is null then
    raise exception 'Transaction not found';
  end if;

  if v_tx.status = 'pending' then
    update transactions set status = 'converted' where id = p_tx_id returning * into v_tx;
  elsif v_tx.status = 'converted' then
    update transactions set status = 'paid_out' where id = p_tx_id returning * into v_tx;

    select * into v_product from products where id = v_tx.product_id;
    v_pts := round(v_tx.thb / 10);
    insert into points_ledger (profile_id, label, pts, reason, related_tx_id)
    values (
      v_product.seller_id,
      jsonb_build_object(
        'th', 'ขายสำเร็จ · ' || (v_product.name->>'th'),
        'vn', 'Bán xong · ' || (v_product.name->>'vn'),
        'en', 'Sold · ' || (v_product.name->>'en')
      ),
      v_pts, 'sale', p_tx_id
    );
    update profiles set points = points + v_pts where id = v_product.seller_id;
  end if;

  return v_tx;
end;
$$;

-- buyer/seller: redeem a reward for points
create or replace function redeem_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reward rewards_catalog;
  v_points int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_reward from rewards_catalog where id = p_reward_id and active;
  if v_reward is null then
    raise exception 'Reward not found';
  end if;

  select points into v_points from profiles where id = v_uid for update;
  if v_points < v_reward.cost then
    raise exception 'Not enough points';
  end if;

  insert into redemptions (profile_id, reward_id, cost) values (v_uid, p_reward_id, v_reward.cost);
  insert into points_ledger (profile_id, label, pts, reason) values (v_uid, v_reward.label, -v_reward.cost, 'redeem');
  update profiles set points = points - v_reward.cost where id = v_uid;
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles        enable row level security;
alter table products        enable row level security;
alter table demands          enable row level security;
alter table matches          enable row level security;
alter table transactions     enable row level security;
alter table points_ledger    enable row level security;
alter table rewards_catalog  enable row level security;
alter table redemptions      enable row level security;
alter table orders           enable row level security;

-- profiles: see your own row, or everything if admin
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_admin_write" on profiles for all
  using (is_admin()) with check (is_admin());

-- products: public can see anything not in review; sellers see their own
-- review items too; sellers can create/edit their own review items; admin = all
create policy "products_select" on products for select
  using (status <> 'review' or seller_id = auth.uid() or is_admin());
create policy "products_insert_own" on products for insert
  with check (seller_id = auth.uid() and status = 'review');
create policy "products_update_own_review" on products for update
  using (seller_id = auth.uid() and status = 'review')
  with check (seller_id = auth.uid() and status = 'review');
create policy "products_admin_write" on products for all
  using (is_admin()) with check (is_admin());

-- demands: everyone can read, only admin writes
create policy "demands_select" on demands for select using (true);
create policy "demands_admin_write" on demands for all
  using (is_admin()) with check (is_admin());

-- matches: everyone can read, only admin writes (also via match_product RPC)
create policy "matches_select" on matches for select using (true);
create policy "matches_admin_write" on matches for all
  using (is_admin()) with check (is_admin());

-- transactions: buyer, the product's seller, or admin can read; admin writes
-- (normal writes happen via the checkout/advance_transaction RPCs)
create policy "transactions_select" on transactions for select
  using (
    buyer_id = auth.uid()
    or is_admin()
    or exists (select 1 from products p where p.id = transactions.product_id and p.seller_id = auth.uid())
  );
create policy "transactions_admin_write" on transactions for all
  using (is_admin()) with check (is_admin());

-- points_ledger: own rows or admin; writes via RPCs / admin
create policy "points_ledger_select" on points_ledger for select
  using (profile_id = auth.uid() or is_admin());
create policy "points_ledger_admin_write" on points_ledger for all
  using (is_admin()) with check (is_admin());

-- rewards_catalog: everyone can see active rewards; admin manages
create policy "rewards_select" on rewards_catalog for select
  using (active or is_admin());
create policy "rewards_admin_write" on rewards_catalog for all
  using (is_admin()) with check (is_admin());

-- redemptions: own rows or admin; writes via redeem_reward RPC / admin
create policy "redemptions_select" on redemptions for select
  using (profile_id = auth.uid() or is_admin());
create policy "redemptions_admin_write" on redemptions for all
  using (is_admin()) with check (is_admin());

-- orders: buyer, the product's seller, or admin can read; admin writes
-- (normal writes happen via the checkout RPC)
create policy "orders_select" on orders for select
  using (
    buyer_id = auth.uid()
    or is_admin()
    or exists (select 1 from products p where p.id = orders.product_id and p.seller_id = auth.uid())
  );
create policy "orders_admin_write" on orders for all
  using (is_admin()) with check (is_admin());

-- ============================================================
-- Privileges (Supabase grants these by default for new tables,
-- listed explicitly here for clarity)
-- ============================================================

grant usage on schema public to anon, authenticated;
grant select on products, demands, rewards_catalog to anon, authenticated;
grant select, insert, update on products to authenticated;
grant select on profiles, matches, transactions, points_ledger, redemptions, orders to authenticated;
grant execute on function checkout(uuid[]), match_product(uuid, uuid), advance_transaction(uuid), redeem_reward(uuid) to authenticated;

-- ============================================================
-- Seed data — fixed UUIDs so products/demands/matches/etc. can
-- reference each other. These seed "profiles" are demo sellers
-- and buyers, not tied to real auth.users accounts.
-- ============================================================

insert into profiles (id, role, display_name, country, avatar_hue, points) values
  ('a0000000-0000-0000-0000-000000000001', 'seller', 'ใบเฟิร์น', 'TH', 70,  1040),
  ('a0000000-0000-0000-0000-000000000002', 'seller', 'ต้น',      'TH', 250, 0),
  ('a0000000-0000-0000-0000-000000000003', 'seller', 'มาร์ค',    'TH', 25,  0),
  ('a0000000-0000-0000-0000-000000000004', 'seller', 'พลอย',     'TH', 320, 0),
  ('a0000000-0000-0000-0000-000000000005', 'seller', 'เจมส์',    'TH', 200, 0),
  ('a0000000-0000-0000-0000-000000000006', 'seller', 'ฟ้า',      'TH', 230, 0),
  ('a0000000-0000-0000-0000-000000000007', 'seller', 'ปุ้ย',     'TH', 220, 0),
  ('b0000000-0000-0000-0000-000000000001', 'buyer',  'Linh',     'VN', 200, 1840),
  ('b0000000-0000-0000-0000-000000000002', 'buyer',  'Minh',     'VN', 230, 0),
  ('b0000000-0000-0000-0000-000000000003', 'buyer',  'Trang',    'VN', 320, 0),
  ('b0000000-0000-0000-0000-000000000004', 'buyer',  'Huy',      'VN', 145, 0),
  ('b0000000-0000-0000-0000-000000000005', 'buyer',  'Anh',      'VN', 95,  0);

insert into products (id, code, name, cat, price_thb, condition, seller_id, hue, status, likes) values
  ('c0000000-0000-0000-0000-000000000001', 'P-1042', '{"th":"กระเป๋าหนัง Coach วินเทจ","vn":"Túi da Coach vintage","en":"Coach vintage leather bag"}', 'bags',    3200, 'A', 'a0000000-0000-0000-0000-000000000001', 70,  'matched',   48),
  ('c0000000-0000-0000-0000-000000000002', 'P-1043', '{"th":"กล้องฟิล์ม Canon AE-1","vn":"Máy ảnh phim Canon AE-1","en":"Canon AE-1 film camera"}', 'camera',  4500, 'A', 'a0000000-0000-0000-0000-000000000002', 250, 'listed',    92),
  ('c0000000-0000-0000-0000-000000000003', 'P-1044', '{"th":"รองเท้า Nike Air Jordan 1","vn":"Giày Nike Air Jordan 1","en":"Nike Air Jordan 1"}', 'shoes',   5800, 'B', 'a0000000-0000-0000-0000-000000000003', 25,  'matched',   134),
  ('c0000000-0000-0000-0000-000000000004', 'P-1045', '{"th":"เสื้อยืดวินเทจ Band Tee","vn":"Áo thun band vintage","en":"Vintage band tee"}', 'fashion', 890,  'B', 'a0000000-0000-0000-0000-000000000004', 320, 'listed',    27),
  ('c0000000-0000-0000-0000-000000000005', 'P-1046', '{"th":"นาฬิกา Seiko 5 อัตโนมัติ","vn":"Đồng hồ Seiko 5 tự động","en":"Seiko 5 automatic watch"}', 'watch',   2600, 'A', 'a0000000-0000-0000-0000-000000000005', 200, 'shipping',  71),
  ('c0000000-0000-0000-0000-000000000006', 'P-1047', '{"th":"iPad Gen 7 มือสอง","vn":"iPad Gen 7 cũ","en":"iPad Gen 7 used"}', 'tech',    6900, 'A', 'a0000000-0000-0000-0000-000000000006', 230, 'listed',    58),
  ('c0000000-0000-0000-0000-000000000007', 'P-1048', '{"th":"แจกันเซรามิกลายคราม","vn":"Bình gốm sứ men lam","en":"Blue ceramic vase"}', 'home',    1450, 'A', 'a0000000-0000-0000-0000-000000000007', 220, 'review',    19),
  ('c0000000-0000-0000-0000-000000000008', 'P-1049', '{"th":"กระเป๋า Longchamp Le Pliage","vn":"Túi Longchamp Le Pliage","en":"Longchamp Le Pliage"}', 'bags',    2100, 'A', 'a0000000-0000-0000-0000-000000000001', 145, 'delivered', 86);

insert into demands (id, code, cat, label, qty, budget_thb, trend, filled, hue) values
  ('d0000000-0000-0000-0000-000000000001', 'D-21', 'bags',    '{"th":"กระเป๋าแบรนด์เนม","vn":"Túi xách hàng hiệu","en":"Branded bags"}', 35, 4000, 'up',     22, 70),
  ('d0000000-0000-0000-0000-000000000002', 'D-22', 'shoes',   '{"th":"รองเท้าสนีกเกอร์","vn":"Giày sneaker","en":"Sneakers"}', 50, 6000, 'up',     31, 25),
  ('d0000000-0000-0000-0000-000000000003', 'D-23', 'camera',  '{"th":"กล้องฟิล์ม/วินเทจ","vn":"Máy ảnh phim/vintage","en":"Film/vintage cameras"}', 18, 5000, 'hot',    7,  250),
  ('d0000000-0000-0000-0000-000000000004', 'D-24', 'watch',   '{"th":"นาฬิกาออโต้","vn":"Đồng hồ cơ","en":"Automatic watches"}', 24, 3000, 'steady', 16, 200),
  ('d0000000-0000-0000-0000-000000000005', 'D-25', 'tech',    '{"th":"แท็บเล็ต/แก็ดเจ็ต","vn":"Máy tính bảng/đồ công nghệ","en":"Tablets/gadgets"}', 40, 7500, 'up',     12, 230),
  ('d0000000-0000-0000-0000-000000000006', 'D-26', 'fashion', '{"th":"เสื้อผ้าวินเทจ","vn":"Quần áo vintage","en":"Vintage fashion"}', 60, 1200, 'hot',    44, 320);

insert into matches (product_id, demand_id, matched_by) values
  ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', null),
  ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', null);

insert into transactions (id, code, product_id, buyer_id, vnd, thb, fee, status) values
  ('e0000000-0000-0000-0000-000000000001', 'TX-9001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 2336000, 3200, 192, 'converted'),
  ('e0000000-0000-0000-0000-000000000002', 'TX-9002', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 4234000, 5800, 348, 'paid_out'),
  ('e0000000-0000-0000-0000-000000000003', 'TX-9003', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 1898000, 2600, 156, 'pending'),
  ('e0000000-0000-0000-0000-000000000004', 'TX-9004', 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 1533000, 2100, 126, 'paid_out'),
  ('e0000000-0000-0000-0000-000000000005', 'TX-9005', 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 1058500, 1450, 87,  'converted');

insert into orders (id, code, product_id, buyer_id, stage, eta) values
  ('f0000000-0000-0000-0000-000000000001', 'OD-5501', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 3, '17 มิ.ย.'),
  ('f0000000-0000-0000-0000-000000000002', 'OD-5502', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 5, '15 มิ.ย.'),
  ('f0000000-0000-0000-0000-000000000003', 'OD-5503', 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 6, 'ส่งแล้ว'),
  ('f0000000-0000-0000-0000-000000000004', 'OD-5504', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, '19 มิ.ย.');

insert into points_ledger (profile_id, label, pts, reason) values
  ('a0000000-0000-0000-0000-000000000001', '{"th":"ขายสำเร็จ · Air Jordan 1","vn":"Bán xong · Air Jordan 1","en":"Sold · Air Jordan 1"}', 580, 'sale'),
  ('a0000000-0000-0000-0000-000000000001', '{"th":"ขายสำเร็จ · Longchamp","vn":"Bán xong · Longchamp","en":"Sold · Longchamp"}', 210, 'sale'),
  ('a0000000-0000-0000-0000-000000000001', '{"th":"โบนัสรีวิว 5 ดาว","vn":"Thưởng đánh giá 5 sao","en":"5-star review bonus"}', 100, 'bonus'),
  ('a0000000-0000-0000-0000-000000000001', '{"th":"ลงขายครบ 10 ชิ้น","vn":"Đăng đủ 10 món","en":"Listed 10 items"}', 150, 'bonus'),
  ('b0000000-0000-0000-0000-000000000001', '{"th":"โบนัสสมาชิกใหม่","vn":"Thưởng thành viên mới","en":"Welcome bonus"}', 1840, 'bonus');

insert into rewards_catalog (label, cost, icon) values
  ('{"th":"ส่วนลด 50,000₫","vn":"Giảm 50.000₫","en":"50,000₫ off"}', 500,  '🎫'),
  ('{"th":"ส่งฟรีข้ามแดน","vn":"Free ship","en":"Free shipping"}', 800,  '🚚'),
  ('{"th":"สิทธิ์ซื้อก่อนใคร","vn":"Mua sớm","en":"Early access"}', 1200, '⚡'),
  ('{"th":"กล่องสุ่มวินเทจ","vn":"Hộp bí ẩn","en":"Mystery box"}', 2000, '🎁');
