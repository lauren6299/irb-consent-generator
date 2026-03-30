
-- Create enums
DO $$ BEGIN
  CREATE TYPE public.clause_content_type AS ENUM ('locked', 'required_editable', 'free_text', 'conditional_pack');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.clause_required_level AS ENUM ('required', 'conditional');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop old columns
ALTER TABLE public.clauses
  DROP COLUMN IF EXISTS clause_title,
  DROP COLUMN IF EXISTS clause_type,
  DROP COLUMN IF EXISTS section_name,
  DROP COLUMN IF EXISTS subsection_name,
  DROP COLUMN IF EXISTS trigger_json,
  DROP COLUMN IF EXISTS exclusion_group;

-- Add new columns without unique on clause_key yet
ALTER TABLE public.clauses
  ADD COLUMN IF NOT EXISTS clause_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subsection text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS content_type clause_content_type NOT NULL DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS required_level clause_required_level NOT NULL DEFAULT 'required',
  ADD COLUMN IF NOT EXISTS trigger_expression jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS must_include boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mutually_exclusive_group text,
  ADD COLUMN IF NOT EXISTS editable_fields jsonb DEFAULT '[]'::jsonb;

-- Give existing rows unique keys
UPDATE public.clauses SET clause_key = 'clause_' || id::text WHERE clause_key = '';

-- Add unique constraint
ALTER TABLE public.clauses ADD CONSTRAINT clauses_clause_key_key UNIQUE (clause_key);
