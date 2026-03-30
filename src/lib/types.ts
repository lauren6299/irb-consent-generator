export interface StudyAnswers {
  // Population
  population_adults: boolean;
  population_children: boolean;
  population_healthy: boolean;
  population_disease: boolean;

  // Procedures
  procedure_blood_draw: boolean;
  procedure_genetic_testing: boolean;
  procedure_imaging: boolean;
  procedure_surveys_only: boolean;
  procedure_recording: boolean;

  // Data type
  data_type: 'identifiable' | 'coded' | 'anonymous' | '';

  // Study design
  study_design: 'single_visit' | 'multiple_visits' | 'optional_second_visit' | '';

  // Specimens
  specimens: 'no_storage' | 'stored_this_study' | 'stored_future_research' | '';

  // Compensation
  compensation_none: boolean;
  compensation_gift_card: boolean;
  compensation_cash: boolean;
  compensation_per_visit: boolean;

  // Regulatory
  hipaa_required: boolean;
  return_of_results: boolean;
  vulnerable_populations: boolean;
}

export const DEFAULT_STUDY_ANSWERS: StudyAnswers = {
  population_adults: false,
  population_children: false,
  population_healthy: false,
  population_disease: false,
  procedure_blood_draw: false,
  procedure_genetic_testing: false,
  procedure_imaging: false,
  procedure_surveys_only: false,
  procedure_recording: false,
  data_type: '',
  study_design: '',
  specimens: '',
  compensation_none: false,
  compensation_gift_card: false,
  compensation_cash: false,
  compensation_per_visit: false,
  hipaa_required: false,
  return_of_results: false,
  vulnerable_populations: false,
};

export const CONSENT_SECTIONS = [
  'Invitation and Purpose',
  'Why You Were Selected',
  'Study Procedures',
  'Risks and Discomforts',
  'Benefits',
  'Alternatives',
  'Confidentiality',
  'Costs and Payments',
  'Voluntary Participation',
  'Contact Information',
  'Signature Block',
  'HIPAA Authorization',
] as const;

export type ConsentSection = typeof CONSENT_SECTIONS[number];
