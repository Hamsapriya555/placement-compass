-- ============================================================
-- Company Intelligence Platform — Supabase Migration
-- Run this once in the Supabase SQL Editor to create the
-- company_intelligence table used by the LangGraph pipeline.
-- ============================================================

create table if not exists public.company_intelligence (
    -- Primary key
    company_id          text        primary key,

    -- Core fields
    company_name        text        not null,
    website             text,
    industry            text,
    headquarters        text,
    founded_year        integer,
    description         text,
    canonical_aliases   text[]      default '{}',

    -- Scoring
    confidence_score    numeric(5, 4),

    -- Pipeline metadata (stored as JSONB for flexibility)
    provenance          jsonb       default '[]',
    audit_logs          jsonb       default '[]',
    validation_results  jsonb       default '[]',
    failed_fields       text[]      default '{}',
    retry_attempts      integer     default 0,

    -- Session tracking
    session_id          text,
    metadata            jsonb       default '{}',

    -- Timestamps
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- Index for fast company name lookups
create index if not exists idx_company_intelligence_name
    on public.company_intelligence (company_name);

-- Index for confidence-score filtering
create index if not exists idx_company_intelligence_confidence
    on public.company_intelligence (confidence_score);

-- Enable Row Level Security (adjust policies for your auth model)
alter table public.company_intelligence enable row level security;

-- Allow anon reads (remove if you need auth-gated reads)
create policy "Allow anon select"
    on public.company_intelligence
    for select
    using (true);

-- Allow anon inserts/upserts from the pipeline
create policy "Allow anon upsert"
    on public.company_intelligence
    for insert
    with check (true);

create policy "Allow anon update"
    on public.company_intelligence
    for update
    using (true);

-- Trigger to auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_company_intelligence_updated_at
    before update on public.company_intelligence
    for each row execute function public.set_updated_at();
