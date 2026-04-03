
-- Drop existing granular policies
DROP POLICY IF EXISTS "Users can select own study answers" ON public.study_answers;
DROP POLICY IF EXISTS "Users can insert own study answers" ON public.study_answers;
DROP POLICY IF EXISTS "Users can update own study answers" ON public.study_answers;
DROP POLICY IF EXISTS "Users can delete own study answers" ON public.study_answers;
DROP POLICY IF EXISTS "Users can manage own study answers" ON public.study_answers;

-- Recreate as a single ALL policy with both USING and WITH CHECK
CREATE POLICY "Users can manage own study answers"
  ON public.study_answers
  FOR ALL
  TO authenticated
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
