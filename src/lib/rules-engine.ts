import { StudyAnswers } from './types';

interface Clause {
  id: string;
  clause_key: string;
  section: string;
  subsection: string;
  clause_text: string;
  content_type: 'locked' | 'required_editable' | 'free_text' | 'conditional_pack';
  required_level: 'required' | 'conditional';
  trigger_expression: Record<string, unknown> | null;
  must_include: boolean;
  mutually_exclusive_group: string | null;
  editable_fields: unknown[] | null;
  sort_order: number;
  active: boolean;
}

interface IncludedClause extends Clause {
  inclusion_reason: string;
}

export function evaluateClause(
  clause: Clause,
  answers: StudyAnswers
): { included: boolean; reason: string } {
  if (clause.required_level === 'required' || clause.must_include) {
    return { included: true, reason: 'Required template language' };
  }

  if (!clause.trigger_expression || Object.keys(clause.trigger_expression).length === 0) {
    return { included: false, reason: '' };
  }

  const triggers = clause.trigger_expression as Record<string, unknown>;

  // Evaluate conditions: all must match (AND logic)
  for (const [key, expectedValue] of Object.entries(triggers)) {
    const actualValue = (answers as unknown as Record<string, unknown>)[key];

    if (typeof expectedValue === 'boolean') {
      if (actualValue !== expectedValue) {
        return { included: false, reason: '' };
      }
    } else if (typeof expectedValue === 'string') {
      if (actualValue !== expectedValue) {
        return { included: false, reason: '' };
      }
    } else if (Array.isArray(expectedValue)) {
      if (!expectedValue.includes(actualValue as string)) {
        return { included: false, reason: '' };
      }
    }
  }

  const reasons = Object.entries(triggers).map(([key, val]) => {
    const label = key.replace(/_/g, ' ');
    return `${label} = ${val}`;
  });

  return {
    included: true,
    reason: `Included because: ${reasons.join(', ')}`,
  };
}

export function assembleConsentForm(
  clauses: Clause[],
  answers: StudyAnswers
): IncludedClause[] {
  const activeClauses = clauses.filter((c) => c.active);
  const included: IncludedClause[] = [];
  const usedExclusionGroups = new Set<string>();

  const sorted = [...activeClauses].sort((a, b) => a.sort_order - b.sort_order);

  for (const clause of sorted) {
    if (clause.mutually_exclusive_group && usedExclusionGroups.has(clause.mutually_exclusive_group)) {
      continue;
    }

    const { included: shouldInclude, reason } = evaluateClause(clause, answers);

    if (shouldInclude) {
      included.push({ ...clause, inclusion_reason: reason });
      if (clause.mutually_exclusive_group) {
        usedExclusionGroups.add(clause.mutually_exclusive_group);
      }
    }
  }

  return included;
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
