
DROP POLICY IF EXISTS "Users can manage own study answers" ON public.study_answers;

CREATE POLICY "Users can select own study answers"
ON public.study_answers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM studies WHERE studies.id = study_answers.study_id AND studies.user_id = auth.uid()
));

CREATE POLICY "Users can insert own study answers"
ON public.study_answers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM studies WHERE studies.id = study_answers.study_id AND studies.user_id = auth.uid()
));

CREATE POLICY "Users can update own study answers"
ON public.study_answers FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM studies WHERE studies.id = study_answers.study_id AND studies.user_id = auth.uid()
));

CREATE POLICY "Users can delete own study answers"
ON public.study_answers FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM studies WHERE studies.id = study_answers.study_id AND studies.user_id = auth.uid()
));
