ALTER TABLE public.clauses ADD COLUMN IF NOT EXISTS subsection_order integer;
ALTER TABLE public.clauses ADD COLUMN IF NOT EXISTS insertion_anchor text;