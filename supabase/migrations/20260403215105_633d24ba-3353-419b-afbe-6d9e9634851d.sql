
-- ============================================
-- STUDIES: Drop all existing policies
-- ============================================
DROP POLICY IF EXISTS "Admins can view all studies" ON public.studies;
DROP POLICY IF EXISTS "Users can view own studies" ON public.studies;
DROP POLICY IF EXISTS "Users can create own studies" ON public.studies;
DROP POLICY IF EXISTS "Users can update own studies" ON public.studies;
DROP POLICY IF EXISTS "Users can delete own studies" ON public.studies;

-- Recreate strict per-user policies
CREATE POLICY "Users can view own studies"
  ON public.studies FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own studies"
  ON public.studies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own studies"
  ON public.studies FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own studies"
  ON public.studies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- STUDY_ANSWERS: Drop and recreate
-- ============================================
DROP POLICY IF EXISTS "Users can manage own study answers" ON public.study_answers;

CREATE POLICY "Users can manage own study answers"
  ON public.study_answers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.studies
      WHERE studies.id = study_answers.study_id
        AND studies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studies
      WHERE studies.id = study_answers.study_id
        AND studies.user_id = auth.uid()
    )
  );
