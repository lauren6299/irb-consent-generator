export interface StudyAnswers {
  // Population
  population_adults: boolean;
  population_children: boolean;
  population_healthy: boolean;
  population_disease: boolean;
  includes_adults: boolean;
  includes_children: boolean;

  // Procedures
  procedure_blood_draw: boolean;
  procedure_genetic_testing: boolean;
  procedure_imaging: boolean;
  procedure_surveys_only: boolean;
  procedure_recording: boolean;

  // Data type
  data_type: 'identifiable' | 'coded' | 'anonymous' | '';

  // Study design
  study_design: 'single_visit' | 'multiple_visits' | 'optional_second_visit' | ''; // legacy
  has_single_visit: boolean;
  has_multiple_required_visits: boolean;
  has_optional_followup_visits: boolean;
  interventional_study: boolean;
  has_study_visits: boolean;
  required_visit_schedule_text: string;
  optional_followup_text: string;

  // Specimens
  specimens: 'no_storage' | 'stored_this_study' | 'stored_future_research' | '';
  collects_specimens: boolean;
  specimens_unlinked: boolean;
  specimens_sent_outside_stanford: boolean;

  // Future use
  future_research_use_allowed: boolean;
  commercial_value_possible: boolean;

  // Genetics
  includes_genetic_testing: boolean;
  return_results_policy: 'none' | 'clinical_only' | 'choice_or_recontact' | '';

  // MRI
  includes_mri: boolean;
  mri_non_fda_components: boolean;
  mri_research_only: boolean;
  mri_uses_contrast: boolean;
  mri_field_strength_gte_3t: boolean;

  // Pregnancy
  childbearing_potential_risk_language_needed: boolean;
  partner_pregnancy_risk_language_needed: boolean;
  minor_pregnancy_testing: boolean;

  // Communicable Disease
  tests_reportable_communicable_disease: boolean;
  tests_hiv: boolean;

  // Gene Transfer
  gene_transfer_study: boolean;
  autopsy_may_be_requested: boolean;

  // NIH
  deposits_genetic_data_in_nih_repository: boolean;

  // Regulatory
  hipaa_required: boolean;
  return_of_results: boolean;
  vulnerable_populations: boolean;
  federally_supported: boolean;
  fda_regulated: boolean;

  // Financial
  compensation_none: boolean;
  compensation_gift_card: boolean;
  compensation_cash: boolean;
  compensation_per_visit: boolean;
  participants_paid: boolean;
  participants_reimbursed: boolean;
  payment_requires_ssn: boolean;

  // Sponsor / COI
  has_sponsor_or_material_support: boolean;
  has_investigator_financial_relationships: boolean;

  // Consent Process
  uses_legally_authorized_representative: boolean;
  needs_witness_or_short_form_process: boolean;

  // Site Config
  site_requires_participant_id_on_each_page: boolean;
  participant_id_value: string;
  use_alternate_page_identification_method: boolean;
  keep_blank_box_for_label_cover: boolean;

  // Contacts
  include_appointment_contact: boolean;
  future_contact_permission_requested: boolean;

  // Concise Summary
  include_summary: boolean;
  concise_summary_text: string;

  // Optional Inclusion Controls
  include_failure_follow_instructions_reason: boolean;
  include_unanticipated_circumstances_reason: boolean;
  use_no_participation_alternative: boolean;
}

// ---------------------------------------------------------------------------
// Document subject mode – determines which clause text variant to render
// ---------------------------------------------------------------------------

export type DocumentSubjectMode = 'default' | 'child_only';

export function getDocumentSubjectMode(answers: Partial<StudyAnswers>): DocumentSubjectMode {
  if (answers.population_children && !answers.population_adults) {
    return 'child_only';
  }
  return 'default';
}

/**
 * Resolve the correct text variant for a clause based on document subject mode.
 */
export function resolveClauseTextVariant(
  clause: { clause_text: string; child_only_text?: string | null; mixed_population_text?: string | null },
  mode: DocumentSubjectMode
): string {
  if (mode === 'child_only' && clause.child_only_text) {
    return clause.child_only_text;
  }
  return clause.clause_text;
}

export const DEFAULT_STUDY_ANSWERS: StudyAnswers = {
  population_adults: false,
  population_children: false,
  population_healthy: false,
  population_disease: false,
  includes_adults: false,
  includes_children: false,
  procedure_blood_draw: false,
  procedure_genetic_testing: false,
  procedure_imaging: false,
  procedure_surveys_only: false,
  procedure_recording: false,
  data_type: '',
  study_design: '',
  has_single_visit: false,
  has_multiple_required_visits: false,
  has_optional_followup_visits: false,
  interventional_study: false,
  has_study_visits: false,
  required_visit_schedule_text: '',
  optional_followup_text: '',
  specimens: '',
  collects_specimens: false,
  specimens_unlinked: false,
  specimens_sent_outside_stanford: false,
  future_research_use_allowed: false,
  commercial_value_possible: false,
  includes_genetic_testing: false,
  return_results_policy: '',
  includes_mri: false,
  mri_non_fda_components: false,
  mri_research_only: false,
  mri_uses_contrast: false,
  mri_field_strength_gte_3t: false,
  childbearing_potential_risk_language_needed: false,
  partner_pregnancy_risk_language_needed: false,
  minor_pregnancy_testing: false,
  tests_reportable_communicable_disease: false,
  tests_hiv: false,
  gene_transfer_study: false,
  autopsy_may_be_requested: false,
  deposits_genetic_data_in_nih_repository: false,
  hipaa_required: false,
  return_of_results: false,
  vulnerable_populations: false,
  federally_supported: false,
  fda_regulated: false,
  compensation_none: false,
  compensation_gift_card: false,
  compensation_cash: false,
  compensation_per_visit: false,
  participants_paid: false,
  participants_reimbursed: false,
  payment_requires_ssn: false,
  has_sponsor_or_material_support: false,
  has_investigator_financial_relationships: false,
  uses_legally_authorized_representative: false,
  needs_witness_or_short_form_process: false,
  site_requires_participant_id_on_each_page: false,
  participant_id_value: '',
  use_alternate_page_identification_method: false,
  keep_blank_box_for_label_cover: false,
  include_appointment_contact: false,
  future_contact_permission_requested: false,
  include_summary: true,
  include_failure_follow_instructions_reason: false,
  include_unanticipated_circumstances_reason: false,
  use_no_participation_alternative: false,
};

/**
 * Canonical Stanford IRB section ordering.
 * Every section in the clauses table must appear here.
 * Lower number = earlier in the document.
 */
export const SECTION_ORDER: Record<string, number> = {
  header: 1,
  summary: 2,
  purpose: 3,
  voluntary_participation: 4,
  duration: 5,
  procedures: 6,
  participant_responsibilities: 7,
  withdrawal: 8,
  risks: 9,
  benefits: 10,
  alternatives: 11,
  participants_rights: 12,
  confidentiality: 13,
  hipaa: 14,
  financial: 15,
  contacts: 16,
  future_contact: 17,
  bill_of_rights: 18,
  signatures: 19,
};

/**
 * Insertion anchor ordering within each section.
 * Anchors not listed here sort to 999.
 */
export const ANCHOR_ORDER: Record<string, number> = {
  // procedures
  procedures_main: 1,
  future_use_of_information_and_specimens: 2,
  genetic_testing_and_future_research: 3,
  return_of_results: 4,
  mri: 5,
  people_of_childbearing_potential: 6,
  reportable_communicable_diseases: 7,
  gene_transfer: 8,
  genetic_information_sharing: 9,
  // participant_responsibilities
  responsibilities_main: 1,
  // withdrawal
  withdrawal_main: 1,
  investigator_withdrawal: 2,
  fda_withdrawal: 3,
  // confidentiality
  confidentiality_main: 1,
  clinicaltrials_gov: 2,
  fda_confidentiality: 3,
  certificate_of_confidentiality: 4,
  // financial
  payment: 1,
  reimbursement: 2,
  sponsor: 3,
  conflict_disclosure: 4,
  injury_compensation: 5,
};

/** Sections in canonical document order. Derived from SECTION_ORDER. */
export const CONSENT_SECTIONS = Object.keys(SECTION_ORDER).sort(
  (a, b) => SECTION_ORDER[a] - SECTION_ORDER[b]
) as unknown as readonly string[];

export type ConsentSection = keyof typeof SECTION_ORDER;
