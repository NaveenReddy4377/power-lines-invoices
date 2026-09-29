-- ==============================================================================
-- Power Lines Electrical Works - Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kpooxulrgszxrrfjhqjr/sql/new
-- ==============================================================================

-- 1. Invoices Table (GST Tax Invoices)
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  invoice_no text unique not null,
  invoice_date date,
  customer_name text,
  customer_gstin text,
  total_amount numeric default 0,
  status text default 'Pending',
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Cash Bills Table (Non-GST Cash Memo)
create table if not exists public.cash_bills (
  id uuid default gen_random_uuid() primary key,
  bill_no text unique not null,
  bill_date date,
  customer_name text,
  customer_phone text,
  payment_mode text default 'Cash',
  payment_status text default 'Paid',
  total_amount numeric default 0,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Delivery Challans Table (Delivery Challan & RGP)
create table if not exists public.delivery_challans (
  id uuid default gen_random_uuid() primary key,
  dc_no text unique not null,
  dc_date date,
  client_name text,
  challan_type text default 'returnable',
  vehicle_no text,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Quotations Table (Quotations / Estimates)
create table if not exists public.quotations (
  id uuid default gen_random_uuid() primary key,
  quotation_no text unique not null,
  quotation_date date,
  client_name text,
  total_amount numeric default 0,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Clients Table (CRM Master Directory)
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  gstin text,
  phone text,
  address text,
  place_of_supply text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for lightning fast lookups & sorting
create index if not exists idx_invoices_no on public.invoices(invoice_no);
create index if not exists idx_invoices_created on public.invoices(created_at desc);

create index if not exists idx_cash_bills_no on public.cash_bills(bill_no);
create index if not exists idx_cash_bills_created on public.cash_bills(created_at desc);

create index if not exists idx_dc_no on public.delivery_challans(dc_no);
create index if not exists idx_dc_created on public.delivery_challans(created_at desc);

create index if not exists idx_quotations_no on public.quotations(quotation_no);
create index if not exists idx_quotations_created on public.quotations(created_at desc);

create index if not exists idx_clients_name on public.clients(name);

-- Disable Row Level Security (RLS) for server-side full access or allow all operations
alter table public.invoices enable row level security;
alter table public.cash_bills enable row level security;
alter table public.delivery_challans enable row level security;
alter table public.quotations enable row level security;
alter table public.clients enable row level security;

-- Policies for public/service role access
drop policy if exists "Enable full access for all operations" on public.invoices;
create policy "Enable full access for all operations" on public.invoices for all using (true) with check (true);

drop policy if exists "Enable full access for all operations" on public.cash_bills;
create policy "Enable full access for all operations" on public.cash_bills for all using (true) with check (true);

drop policy if exists "Enable full access for all operations" on public.delivery_challans;
create policy "Enable full access for all operations" on public.delivery_challans for all using (true) with check (true);

drop policy if exists "Enable full access for all operations" on public.quotations;
create policy "Enable full access for all operations" on public.quotations for all using (true) with check (true);

-- 6. Pending Bills & Follow-ups Table
create table if not exists public.pending_bills (
  id text primary key,
  bill_name text not null,
  bill_no text,
  bill_type text default 'Invoice',
  pending_amount numeric default 0,
  total_amount numeric default 0,
  bill_date date,
  due_date date,
  contact_person text,
  contact_phone text,
  contact_email text,
  status text default 'Pending',
  promised_date date,
  last_follow_up_date date,
  next_follow_up_date date,
  notes text,
  follow_ups jsonb default '[]'::jsonb,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for pending bills
create index if not exists idx_pending_bills_name on public.pending_bills(bill_name);
create index if not exists idx_pending_bills_status on public.pending_bills(status);
create index if not exists idx_pending_bills_due on public.pending_bills(due_date);
create index if not exists idx_pending_bills_created on public.pending_bills(created_at desc);

-- RLS policies
alter table public.pending_bills enable row level security;
drop policy if exists "Enable full access for all operations" on public.pending_bills;
create policy "Enable full access for all operations" on public.pending_bills for all using (true) with check (true);
