import { supabase } from '@/integrations/supabase/client';
import { StudyAnswers, SECTION_ORDER, ANCHOR_ORDER } from './types';

interface Clause {
  id: string;
  clause_key: string;
  section: string;
  subsection: string;
  clause_text: string;
  content_type: 'locked' | 'required_editable' | 'free_text' | 'conditional_pack' | 'structured_block';
  required_level: 'required' | 'conditional' | 'optional';
  trigger_expression: Record<string, unknown> | null;
  must_include: boolean;
  mutually_exclusive_group: string | null;
  editable_fields: unknown[] | null;
  sort_order: number;
  subsection_order: number | null;
  insertion_anchor: string | null;
  active: boolean;
}

export interface AssembledClause {
  section: string;
  subsection: string;
  clause_key: string;
  clause_text: string;
  content_type: string;
  editable_fields: unknown[] | null;
  insertion_anchor: string | null;
  inclusion_reason: string;
}

// Also re-export the legacy shape for existing components
export interface IncludedClause extends Clause {
  inclusion_reason: string;
}

function matchesTrigger(
  triggers: Record<string, unknown>,
  answers: Record<string, unknown>
): boolean {
  for (const [key, expectedValue] of Object.entries(triggers)) {
    const actualValue = answers[key];

    if (typeof expectedValue === 'boolean') {
      if (actualValue !== expectedValue) return false;
    } else if (typeof expectedValue === 'string') {
      if (actualValue !== expectedValue) return false;
    } else if (Array.isArray(expectedValue)) {
      if (!expectedValue.includes(actualValue as string)) return false;
    } else {
      return false;
    }
  }
  return true;
}

export function evaluateClause(
  clause: Clause,
  answers: Record<string, unknown>
): { included: boolean; reason: string } {
  if (clause.must_include || clause.required_level === 'required') {
    return { included: true, reason: 'Required template language' };
  }

  if (!clause.trigger_expression || Object.keys(clause.trigger_expression).length === 0) {
    return { included: false, reason: '' };
  }

  const included = matchesTrigger(
    clause.trigger_expression as Record<string, unknown>,
    answers
  );

  return {
    included,
    reason: included ? 'Included based on study selections' : '',
  };
}

/**
 * assembleConsent – fetches clauses + study_answers from DB, runs the engine,
 * and returns structured JSON.
 */
export async function assembleConsent(studyId: string): Promise<AssembledClause[]> {
  // 1 & 2 – fetch active clauses and study answers in parallel
  const [clausesRes, answersRes] = await Promise.all([
    supabase.from('clauses').select('*').eq('active', true).order('sort_order'),
    supabase.from('study_answers').select('answer_data').eq('study_id', studyId).single(),
  ]);

  const clauses: Clause[] = (clausesRes.data ?? []) as unknown as Clause[];
  const answers: Record<string, unknown> = (answersRes.data?.answer_data as Record<string, unknown>) ?? {};

  return assembleFromData(clauses, answers);
}

/**
 * In-memory assembly – used by both `assembleConsent` and existing UI code
 * that already holds clauses + answers in state.
 */
export function assembleConsentForm(
  clauses: Clause[],
  answers: StudyAnswers
): IncludedClause[] {
  const answersMap = answers as unknown as Record<string, unknown>;
  const result = runAssembly(clauses, answersMap);
  return result.map((r) => ({
    ...(r._clause as Clause),
    inclusion_reason: r.inclusion_reason,
  }));
}

// Shared core assembly logic
interface AssemblyResult {
  _clause: Clause;
  section: string;
  subsection: string;
  clause_key: string;
  clause_text: string;
  content_type: string;
  editable_fields: unknown[] | null;
  inclusion_reason: string;
}

function runAssembly(
  clauses: Clause[],
  answers: Record<string, unknown>
): AssemblyResult[] {
  const active = clauses.filter((c) => c.active);

  // Sort by canonical section order, then subsection, then sort_order
  const sorted = [...active].sort((a, b) => {
    const aOrder = SECTION_ORDER[a.section] ?? 999;
    const bOrder = SECTION_ORDER[b.section] ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.subsection !== b.subsection) return a.subsection.localeCompare(b.subsection);
    return a.sort_order - b.sort_order;
  });

  const included: AssemblyResult[] = [];
  const usedGroups = new Set<string>();

  for (const clause of sorted) {
    // 5 – mutual exclusion
    if (clause.mutually_exclusive_group && usedGroups.has(clause.mutually_exclusive_group)) {
      continue;
    }

    const { included: shouldInclude, reason } = evaluateClause(clause, answers);

    if (shouldInclude) {
      included.push({
        _clause: clause,
        section: clause.section,
        subsection: clause.subsection,
        clause_key: clause.clause_key,
        clause_text: clause.clause_text,
        content_type: clause.content_type,
        editable_fields: clause.editable_fields,
        inclusion_reason: reason,
      });
      if (clause.mutually_exclusive_group) {
        usedGroups.add(clause.mutually_exclusive_group);
      }
    }
  }

  return included;
}

function assembleFromData(
  clauses: Clause[],
  answers: Record<string, unknown>
): AssembledClause[] {
  return runAssembly(clauses, answers).map(({ _clause, ...rest }) => rest);
}

export function getMissingRequiredFields(answers: StudyAnswers): string[] {
  const missing: string[] = [];

  const hasPopulation =
    answers.population_adults ||
    answers.population_children ||
    answers.population_healthy ||
    answers.population_disease;
  if (!hasPopulation) missing.push('At least one population must be selected');

  const hasProcedure =
    answers.procedure_blood_draw ||
    answers.procedure_genetic_testing ||
    answers.procedure_imaging ||
    answers.procedure_surveys_only ||
    answers.procedure_recording;
  if (!hasProcedure) missing.push('At least one procedure must be selected');

  if (!answers.data_type) missing.push('Data type must be selected');
  if (!answers.study_design) missing.push('Study design must be selected');
  if (!answers.specimens) missing.push('Specimen handling must be selected');

  const hasCompensation =
    answers.compensation_none ||
    answers.compensation_gift_card ||
    answers.compensation_cash ||
    answers.compensation_per_visit;
  if (!hasCompensation) missing.push('Compensation must be specified');

  return missing;
}
