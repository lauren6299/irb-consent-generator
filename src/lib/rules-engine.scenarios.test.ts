import { describe, it, expect } from 'vitest';
import { assembleConsentForm, IncludedClause } from './rules-engine';
import { DEFAULT_STUDY_ANSWERS, StudyAnswers } from './types';

/**
 * Build a minimal clause fixture. Only the fields the engine inspects are required.
 */
function makeClause(overrides: Partial<IncludedClause> & { clause_key: string }): IncludedClause {
  return {
    id: overrides.id ?? overrides.clause_key,
    clause_key: overrides.clause_key,
    section: overrides.section ?? 'procedures',
    subsection: overrides.subsection ?? '',
    clause_text: overrides.clause_text ?? `Default text for ${overrides.clause_key}`,
    child_only_text: overrides.child_only_text ?? null,
    mixed_population_text: overrides.mixed_population_text ?? null,
    content_type: overrides.content_type ?? 'locked',
    required_level: overrides.required_level ?? 'conditional',
    trigger_expression: overrides.trigger_expression ?? null,
    must_include: overrides.must_include ?? false,
    mutually_exclusive_group: overrides.mutually_exclusive_group ?? null,
    editable_fields: overrides.editable_fields ?? null,
    sort_order: overrides.sort_order ?? 0,
    subsection_order: overrides.subsection_order ?? null,
    insertion_anchor: overrides.insertion_anchor ?? null,
    active: overrides.active ?? true,
    inclusion_reason: '',
  };
}

/**
 * Representative clause catalogue that mirrors the real DB rows the engine evaluates.
 */
const CLAUSE_CATALOGUE: IncludedClause[] = [
  // Required / always-included
  makeClause({ clause_key: 'stanford_consent_title', section: 'header', must_include: true, required_level: 'required', sort_order: 1 }),
  makeClause({ clause_key: 'purpose_of_research', section: 'purpose', must_include: true, required_level: 'required', sort_order: 10, child_only_text: 'Child-only purpose text' }),
  makeClause({ clause_key: 'voluntary_participation', section: 'voluntary_participation', must_include: true, required_level: 'required', sort_order: 20 }),
  makeClause({ clause_key: 'procedures', section: 'procedures', insertion_anchor: 'procedures_main', must_include: true, required_level: 'required', sort_order: 30, child_only_text: 'Child-only procedures text' }),
  makeClause({ clause_key: 'risks_section', section: 'risks', must_include: true, required_level: 'required', sort_order: 100, child_only_text: 'Child-only risks text' }),

  // Adult+child mixed intro
  makeClause({ clause_key: 'adult_child_mixed_intro', section: 'header', trigger_expression: { population_adults: true, includes_children: true }, sort_order: 2 }),

  // Future use / specimens
  makeClause({ clause_key: 'future_use_intro', section: 'procedures', insertion_anchor: 'future_use_of_information_and_specimens', trigger_expression: { collects_specimens: true }, sort_order: 40 }),
  makeClause({ clause_key: 'future_use_not_allowed', section: 'procedures', insertion_anchor: 'future_use_of_information_and_specimens', trigger_expression: { collects_specimens: true, future_research_use_allowed: false }, sort_order: 41 }),
  makeClause({ clause_key: 'future_use_allowed_identifiers_removed', section: 'procedures', insertion_anchor: 'future_use_of_information_and_specimens', trigger_expression: { future_research_use_allowed: true }, sort_order: 42 }),
  makeClause({ clause_key: 'specimen_storage_description', section: 'procedures', insertion_anchor: 'future_use_of_information_and_specimens', trigger_expression: { collects_specimens: true }, sort_order: 43 }),

  // Genetics
  makeClause({ clause_key: 'genetic_testing_description', section: 'procedures', insertion_anchor: 'genetic_testing_and_future_research', trigger_expression: { includes_genetic_testing: true }, sort_order: 50 }),
  makeClause({ clause_key: 'genetic_testing_future_research', section: 'procedures', insertion_anchor: 'genetic_testing_and_future_research', trigger_expression: { includes_genetic_testing: true }, sort_order: 51 }),
  makeClause({ clause_key: 'whole_genome_sequencing_statement', section: 'procedures', insertion_anchor: 'genetic_testing_and_future_research', trigger_expression: { collects_specimens: true, includes_genetics_section: true }, sort_order: 52 }),

  // MRI
  makeClause({ clause_key: 'mri_base_description', section: 'procedures', insertion_anchor: 'mri', trigger_expression: { includes_mri: true }, sort_order: 60 }),
  makeClause({ clause_key: 'mri_discomfort_stop', section: 'procedures', insertion_anchor: 'mri', trigger_expression: { includes_mri: true }, sort_order: 61 }),

  // HIPAA
  makeClause({ clause_key: 'hipaa_authorization', section: 'hipaa', trigger_expression: { include_hipaa_authorization: true }, sort_order: 200 }),
];

function answers(overrides: Partial<StudyAnswers> = {}): StudyAnswers {
  return { ...DEFAULT_STUDY_ANSWERS, ...overrides };
}

function keys(result: IncludedClause[]): string[] {
  return result.map((c) => c.clause_key);
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

describe('Consent assembly scenarios', () => {
  // 1 ─ adult_only_minimal
  describe('adult_only_minimal', () => {
    const result = assembleConsentForm(
      CLAUSE_CATALOGUE,
      answers({ population_adults: true, includes_adults: true }),
    );
    const k = keys(result);

    it('includes required clauses', () => {
      expect(k).toContain('stanford_consent_title');
      expect(k).toContain('purpose_of_research');
      expect(k).toContain('procedures');
    });

    it('does NOT include adult+child participation box', () => {
      expect(k).not.toContain('adult_child_mixed_intro');
    });

    it('does NOT include future use section', () => {
      expect(k).not.toContain('future_use_intro');
      expect(k).not.toContain('future_use_not_allowed');
      expect(k).not.toContain('future_use_allowed_identifiers_removed');
    });

    it('does NOT include genetics section', () => {
      expect(k).not.toContain('genetic_testing_description');
      expect(k).not.toContain('whole_genome_sequencing_statement');
    });

    it('does NOT include MRI section', () => {
      expect(k).not.toContain('mri_base_description');
    });
  });

  // 2 ─ child_only_minimal
  describe('child_only_minimal', () => {
    const result = assembleConsentForm(
      CLAUSE_CATALOGUE,
      answers({ population_children: true, includes_children: true }),
    );
    const k = keys(result);

    it('uses child-only wording where child_only_text exists', () => {
      const purpose = result.find((c) => c.clause_key === 'purpose_of_research');
      expect(purpose).toBeDefined();
      expect(purpose!.clause_text).toBe('Child-only purpose text');
    });

    it('does NOT include adult+child participation box', () => {
      expect(k).not.toContain('adult_child_mixed_intro');
    });
  });

  // 3 ─ mixed_adult_child
  describe('mixed_adult_child', () => {
    const result = assembleConsentForm(
      CLAUSE_CATALOGUE,
      answers({ population_adults: true, population_children: true, includes_adults: true, includes_children: true }),
    );
    const k = keys(result);

    it('includes adult+child participation box', () => {
      expect(k).toContain('adult_child_mixed_intro');
    });

    it('does NOT use child-only global wording', () => {
      const purpose = result.find((c) => c.clause_key === 'purpose_of_research');
      expect(purpose).toBeDefined();
      // Should use default clause_text, not child_only_text
      expect(purpose!.clause_text).not.toBe('Child-only purpose text');
    });
  });

  // 4 ─ specimens_study_only
  describe('specimens_study_only', () => {
    const a = answers({
      population_adults: true,
      includes_adults: true,
      specimen_storage_mode: 'stored_for_this_study_only',
      collects_specimens: true,
      future_research_use_allowed: false,
    });
    const result = assembleConsentForm(CLAUSE_CATALOGUE, a);
    const k = keys(result);

    it('derives collects_specimens = true', () => {
      expect(a.collects_specimens).toBe(true);
    });

    it('derives future_research_use_allowed = false', () => {
      expect(a.future_research_use_allowed).toBe(false);
    });

    it('includes future use section intro', () => {
      expect(k).toContain('future_use_intro');
    });

    it('includes "will not be used for future research" statement', () => {
      expect(k).toContain('future_use_not_allowed');
    });

    it('does NOT include future research allowed statement', () => {
      expect(k).not.toContain('future_use_allowed_identifiers_removed');
    });
  });

  // 5 ─ specimens_future_research
  describe('specimens_future_research', () => {
    const a = answers({
      population_adults: true,
      includes_adults: true,
      specimen_storage_mode: 'stored_for_future_research',
      collects_specimens: true,
      future_research_use_allowed: true,
    });
    const result = assembleConsentForm(CLAUSE_CATALOGUE, a);
    const k = keys(result);

    it('derives collects_specimens = true', () => {
      expect(a.collects_specimens).toBe(true);
    });

    it('derives future_research_use_allowed = true', () => {
      expect(a.future_research_use_allowed).toBe(true);
    });

    it('includes future use section intro', () => {
      expect(k).toContain('future_use_intro');
    });

    it('includes "identifiers might be removed" statement', () => {
      expect(k).toContain('future_use_allowed_identifiers_removed');
    });

    it('does NOT include non-future-research statement', () => {
      expect(k).not.toContain('future_use_not_allowed');
    });
  });

  // 6 ─ genetics_off
  describe('genetics_off', () => {
    const result = assembleConsentForm(
      CLAUSE_CATALOGUE,
      answers({
        population_adults: true,
        includes_adults: true,
        includes_genetics_section: false,
        includes_genetic_testing: false,
      }),
    );
    const k = keys(result);

    it('does NOT include whole genome sequencing clause', () => {
      expect(k).not.toContain('whole_genome_sequencing_statement');
    });

    it('does NOT include genetic testing language', () => {
      expect(k).not.toContain('genetic_testing_description');
      expect(k).not.toContain('genetic_testing_future_research');
    });
  });
});
