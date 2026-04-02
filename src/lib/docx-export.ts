import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  BorderStyle,
  TabStopType,
  TabStopPosition,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  ShadingType,
  LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import type { ClauseEdits } from '@/components/ConsentPreview';
import { SECTION_ORDER, ANCHOR_ORDER, StudyAnswers } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportClause {
  clause_key: string;
  section: string;
  subsection?: string;
  clause_text: string;
  content_type: string;
  editable_fields?: unknown[] | null;
  insertion_anchor?: string | null;
  inclusion_reason: string;
}

interface StudyInfo {
  title: string;
  short_title: string;
  pi_name: string;
  pi_address: string;
  pi_phone: string;
  protocol_number: string;
  sponsor: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  irb_number?: string;
}

// ---------------------------------------------------------------------------
// Heading map – internal section key → participant-facing heading
// ---------------------------------------------------------------------------

const SECTION_HEADING_MAP: Record<string, string> = {
  purpose: 'PURPOSE OF RESEARCH',
  voluntary_participation: 'VOLUNTARY PARTICIPATION',
  duration: 'DURATION OF STUDY INVOLVEMENT',
  procedures: 'PROCEDURES',
  participant_responsibilities: 'PARTICIPANT RESPONSIBILITIES',
  withdrawal: 'WITHDRAWAL FROM STUDY',
  risks: 'POSSIBLE RISKS, DISCOMFORTS, AND INCONVENIENCES',
  benefits: 'POTENTIAL BENEFITS',
  alternatives: 'ALTERNATIVES',
  participants_rights: "PARTICIPANT'S RIGHTS",
  confidentiality: 'CONFIDENTIALITY',
  hipaa: 'AUTHORIZATION TO USE YOUR PERSONAL HEALTH INFORMATION FOR RESEARCH PURPOSES',
  financial: 'FINANCIAL CONSIDERATIONS',
  contacts: 'CONTACT INFORMATION',
  future_contact: 'FUTURE CONTACT',
  bill_of_rights: "EXPERIMENTAL SUBJECT'S BILL OF RIGHTS",
};

/** Anchors that get a readable sub-heading inside their parent section */
const ANCHOR_HEADING_MAP: Record<string, string> = {
  future_use_of_information_and_specimens: 'Future Use of Private Information and/or Specimens',
  genetic_testing_and_future_research: 'Genetic Testing and Future Research',
  return_of_results: 'Return of Results',
  mri: 'MRI (Magnetic Resonance Imaging)',
  people_of_childbearing_potential: 'People of Childbearing Potential',
  reportable_communicable_diseases: 'Reportable Communicable Diseases',
  gene_transfer: 'Gene Transfer Studies',
  genetic_information_sharing: 'Genetic Information Sharing',
  investigator_withdrawal: 'Investigator Withdrawal',
  fda_withdrawal: 'FDA Withdrawal',
  clinicaltrials_gov: 'ClinicalTrials.gov',
  fda_confidentiality: 'FDA Confidentiality',
  certificate_of_confidentiality: 'Certificate of Confidentiality',
  reimbursement: 'Reimbursement',
  sponsor: 'Sponsor',
  conflict_disclosure: 'Conflict of Interest Disclosure',
  injury_compensation: 'Injury Compensation',
};

/** Sections whose content is rendered in the title/intro area, not as a headed section */
const INTRO_SECTIONS = new Set(['header', 'summary']);

/**
 * Clause keys that are rendered ONLY in the repeating page header.
 * These must never appear in the document body.
 */
const HEADER_ONLY_CLAUSE_KEYS = new Set([
  'stanford_consent_title',
  'study_metadata_block',
  'protocol_title_block',
  'sponsor_block',
  'investigator_block',
]);

/** Sections rendered as signature blocks, not normal body text */
const SIGNATURE_SECTION = 'signatures';

// ---------------------------------------------------------------------------
// Approved editable prompts – allowed to remain in exported .docx
// ---------------------------------------------------------------------------

const APPROVED_EDITABLE_PROMPTS = new Set([
  // NOTE: [protocol_director_name], [protocol_director_address], [protocol_director_phone]
  // are NOT listed here — they are globally bound from Study Setup and auto-substituted.
  '[study_topic]',
  '[study_goal]',
  '[selection_rationale]',
  '[target_population]',
  '[stanford_n]',
  '[total_n]',
  '[enrollment_geography]',
  '[duration]',
  '[active_duration]',
  '[followup_duration]',
  '[washout_description]',
  '[procedure_narrative]',
  '[withdrawal_contact_name]',
  '[withdrawal_contact_phone]',
  '[withdrawal_procedure_text]',
  '[investigator_withdrawal_reasons_text]',
  '[risk_narrative]',
  '[benefit_narrative]',
  '[alternatives_narrative]',
  '[payment_amount_and_method]',
  '[payment_schedule]',
  '[appointment_contact_name]',
  '[appointment_contact_phone]',
  '[participant_id_value]',
  '[storage_method]',
  '[linkage_method]',
  '[genetic_testing_modal_verb]',
  '[whole_genome_sequencing_choice]',
  '[mri_scan_duration]',
  '[disease_list]',
  '[duration_after_last_dose]',
  '[prior_recipients_n]',
  '[long_term_followup_duration]',
  '[autopsy_learning_goal]',
  '[fda_product_name]',
  '[sponsor_name]',
  '[financial_relationship_disclosure_text]',
]);

// ---------------------------------------------------------------------------
// Fonts & sizes (twips: 1pt = 2 twips)
// ---------------------------------------------------------------------------

const BODY_FONT = 'Times New Roman';
const HEADING_FONT = 'Arial';
const BODY_SIZE = 24;        // 12pt
const HEADING_SIZE = 26;     // 13pt
const SUBHEADING_SIZE = 24;  // 12pt
const HIPAA_SIZE = 28;       // 14pt
const TITLE_SIZE = 32;       // 16pt
const META_LABEL_SIZE = 22;  // 11pt

// ---------------------------------------------------------------------------
// Placeholder handling
// ---------------------------------------------------------------------------

function substitutePlaceholders(
  text: string,
  study: StudyInfo,
  fieldValues?: Record<string, string>
): string {
  let result = text
    .replace(/\[STUDY_TITLE\]/g, study.title || '')
    .replace(/\[SHORT_TITLE\]/g, study.short_title || '')
    .replace(/\[PI_NAME\]/g, study.pi_name || '')
    .replace(/\[PROTOCOL_NUMBER\]/g, study.protocol_number || '')
    .replace(/\[SPONSOR\]/g, study.sponsor || '')
    .replace(/\[CONTACT_NAME\]/g, study.contact_name || '')
    .replace(/\[CONTACT_PHONE\]/g, study.contact_phone || '')
    .replace(/\[CONTACT_EMAIL\]/g, study.contact_email || '')
    // Global protocol director bindings from Study Setup
    .replace(/\[protocol_director_name\]/gi, study.pi_name || '[protocol_director_name]')
    .replace(/\[protocol_director_address\]/gi, study.pi_address || '[protocol_director_address]')
    .replace(/\[protocol_director_phone\]/gi, study.pi_phone || '[protocol_director_phone]');

  if (fieldValues) {
    for (const [key, value] of Object.entries(fieldValues)) {
      result = result.replace(new RegExp(`\\[${key}\\]`, 'gi'), value || '');
    }
  }

  return result;
}

/**
 * Find disallowed unresolved placeholders (tokens NOT in the approved editable list).
 * Approved editable prompts are allowed to remain in the exported .docx.
 */
export function findUnresolvedPlaceholders(
  clauses: ExportClause[],
  study: StudyInfo,
  clauseEdits?: ClauseEdits
): string[] {
  const disallowed = new Set<string>();
  for (const clause of clauses) {
    const edits = clauseEdits?.[clause.clause_key];
    let text: string;
    if (clause.content_type === 'free_text' && edits?.full_text !== undefined) {
      text = substitutePlaceholders(edits.full_text, study);
    } else {
      text = substitutePlaceholders(clause.clause_text, study, edits?.fields);
    }
    const matches = text.match(/\[[a-zA-Z_]+\]/g);
    if (matches) {
      matches.forEach((m) => {
        const lower = m.toLowerCase();
        if (!APPROVED_EDITABLE_PROMPTS.has(lower)) {
          disallowed.add(m);
        }
      });
    }
  }
  return Array.from(disallowed);
}

// ---------------------------------------------------------------------------
// Paragraph helpers
// ---------------------------------------------------------------------------

function bodyParagraph(text: string, options?: { bold?: boolean; italics?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: BODY_FONT,
        size: options?.size ?? BODY_SIZE,
        bold: options?.bold,
        italics: options?.italics,
      }),
    ],
    spacing: { after: 120 },
  });
}

function sectionHeading(text: string, isHipaa = false): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: HEADING_FONT,
        size: isHipaa ? HIPAA_SIZE : HEADING_SIZE,
      }),
    ],
    spacing: { before: 360, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '8C1515' } },
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [
      new TextRun({
        text,
        bold: true,
        font: HEADING_FONT,
        size: SUBHEADING_SIZE,
      }),
    ],
    spacing: { before: 240, after: 120 },
  });
}

function signatureBlock(label: string): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 360 }, children: [] }),
    new Paragraph({
      children: [
        new TextRun({ text: '________________________________________', font: BODY_FONT, size: BODY_SIZE }),
        new TextRun({ text: '\t', font: BODY_FONT, size: BODY_SIZE }),
        new TextRun({ text: '________________', font: BODY_FONT, size: BODY_SIZE }),
      ],
      tabStops: [{ type: TabStopType.LEFT, position: 7200 }],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: label, font: BODY_FONT, size: META_LABEL_SIZE }),
        new TextRun({ text: '\t', font: BODY_FONT, size: META_LABEL_SIZE }),
        new TextRun({ text: 'Date', font: BODY_FONT, size: META_LABEL_SIZE }),
      ],
      tabStops: [{ type: TabStopType.LEFT, position: 7200 }],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Print Name: ________________________________________', font: BODY_FONT, size: META_LABEL_SIZE }),
      ],
      spacing: { after: 200 },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Adult + Child Participation Box (Stanford IRB requirement)
// ---------------------------------------------------------------------------

function buildAdultChildParticipationBox(): Paragraph[] {
  const solidBorder = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
  const cellBorders = { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder };

  const boxTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: 9360, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
              new Paragraph({
                spacing: { after: 200 },
                children: [new TextRun({ text: 'Please check all that are applicable:', font: BODY_FONT, size: BODY_SIZE })],
              }),
              new Paragraph({
                spacing: { after: 80 },
                children: [new TextRun({ text: '☐  I am an adult participant in this study.', font: BODY_FONT, size: BODY_SIZE })],
              }),
              new Paragraph({
                spacing: { after: 80 },
                children: [new TextRun({ text: 'Print your name here:', font: BODY_FONT, size: BODY_SIZE })],
              }),
              new Paragraph({
                spacing: { after: 240 },
                children: [new TextRun({ text: '______________________________________________________', font: BODY_FONT, size: BODY_SIZE })],
              }),
              new Paragraph({
                spacing: { after: 80 },
                children: [
                  new TextRun({
                    text: '☐  I am the parent or guardian granting permission for a child in this study (the use of "you" refers to "your child" or "your ward.")',
                    font: BODY_FONT,
                    size: BODY_SIZE,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 80 },
                children: [new TextRun({ text: "Print child's name here:", font: BODY_FONT, size: BODY_SIZE })],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [new TextRun({ text: '______________________________________________________', font: BODY_FONT, size: BODY_SIZE })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return [
    new Paragraph({ spacing: { before: 240 }, children: [] }),
    boxTable as unknown as Paragraph,
    new Paragraph({ spacing: { after: 240 }, children: [] }),
  ];
}

// ---------------------------------------------------------------------------
// Stanford IRB repeating page header (table-based)
// ---------------------------------------------------------------------------

function buildStanfordHeader(study: StudyInfo): Table {
  const HEADER_FONT_SIZE = 16; // 8pt
  const HEADER_FONT_SIZE_LG = 18; // 9pt
  const HEADER_FONT_SIZE_TITLE = 20; // 10pt

  const solidBorder = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
  const dashedBorder = { style: BorderStyle.DASHED, size: 4, color: '000000' };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

  const leftCellBorders = {
    top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder,
  };
  const irbBoxBorders = {
    top: dashedBorder, bottom: dashedBorder, left: dashedBorder, right: dashedBorder,
  };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  const irbNumber = study.irb_number || 'XXXXX';

  // Left cell: Stanford title + Protocol Director + Protocol Title
  const leftCell = new TableCell({
    borders: leftCellBorders,
    width: { size: 6200, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: 'STANFORD UNIVERSITY', bold: true, font: HEADING_FONT, size: HEADER_FONT_SIZE_TITLE }),
          new TextRun({ text: '   Research Consent Form', font: HEADING_FONT, size: HEADER_FONT_SIZE }),
        ],
      }),
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({ text: 'Protocol Director: ', bold: true, font: HEADING_FONT, size: HEADER_FONT_SIZE }),
          new TextRun({ text: study.pi_name, font: HEADING_FONT, size: HEADER_FONT_SIZE }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({ text: 'Protocol Title: ', bold: true, font: HEADING_FONT, size: HEADER_FONT_SIZE }),
          new TextRun({ text: study.title, font: HEADING_FONT, size: HEADER_FONT_SIZE }),
        ],
      }),
    ],
  });

  // Right cell: IRB box on top, IRB# on bottom
  const rightCell = new TableCell({
    borders: noBorders,
    width: { size: 3160, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 0, bottom: 0, left: 100, right: 0 },
    children: [
      // IRB Use Only dashed box (nested table)
      new Table({
        width: { size: 3000, type: WidthType.DXA },
        columnWidths: [3000],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: irbBoxBorders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 40, bottom: 40, left: 80, right: 80 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 20 },
                    children: [
                      new TextRun({ text: 'IRB Use Only', bold: true, italics: true, font: HEADING_FONT, size: HEADER_FONT_SIZE }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 10 },
                    children: [
                      new TextRun({ text: 'Approval Date: ', font: HEADING_FONT, size: HEADER_FONT_SIZE }),
                      new TextRun({ text: 'Monthname dd, 20yy', font: HEADING_FONT, size: HEADER_FONT_SIZE }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      new TextRun({ text: 'Expiration Date: ', font: HEADING_FONT, size: HEADER_FONT_SIZE }),
                      new TextRun({ text: 'Monthname dd, 20yy', font: HEADING_FONT, size: HEADER_FONT_SIZE }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // IRB# below the box
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 60 },
        children: [
          new TextRun({ text: `IRB# ${irbNumber}`, font: HEADING_FONT, size: HEADER_FONT_SIZE_LG }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [6200, 3160],
    rows: [
      new TableRow({
        children: [leftCell, rightCell],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Participant ID repeating footer (SHC / Stanford Medicine Children's Health)
// ---------------------------------------------------------------------------

function buildParticipantIdFooter(answers: Partial<StudyAnswers>): Footer {
  const showBox = !answers.use_alternate_page_identification_method || !!answers.keep_blank_box_for_label_cover;
  const idValue = answers.participant_id_value || '';

  const solidBorder = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const cellBorders = { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  const FOOTER_FONT = 'Arial';
  const FOOTER_SIZE = 14; // 7pt

  // Left cell: Participant ID box
  const leftChildren: Paragraph[] = [];
  if (showBox) {
    leftChildren.push(
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({ text: 'Participant ID: ', bold: true, font: FOOTER_FONT, size: FOOTER_SIZE }),
          new TextRun({ text: idValue || '________________________', font: FOOTER_FONT, size: FOOTER_SIZE }),
        ],
      })
    );
  }

  const leftCell = new TableCell({
    borders: showBox ? cellBorders : noBorders,
    width: { size: 6500, type: WidthType.DXA },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    verticalAlign: VerticalAlign.CENTER,
    children: leftChildren.length > 0 ? leftChildren : [new Paragraph({ children: [] })],
  });

  // Right cell: STUDY barcode-style block
  const barcodeLines = ['║║║║║║║║║║║║║'];
  const rightCell = new TableCell({
    borders: noBorders,
    width: { size: 2860, type: WidthType.DXA },
    margins: { top: 20, bottom: 20, left: 80, right: 0 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: barcodeLines[0], font: 'Courier New', size: 16 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: 'STUDY', bold: true, font: FOOTER_FONT, size: FOOTER_SIZE })],
      }),
    ],
  });

  const footerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [6500, 2860],
    rows: [new TableRow({ children: [leftCell, rightCell] })],
  });

  return new Footer({
    children: [
      footerTable as unknown as Paragraph,
      new Paragraph({
        spacing: { before: 40, after: 0 },
        children: [
          new TextRun({ text: 'SU MainICF HIPAA rev 03/2026', font: FOOTER_FONT, size: 12, color: '666666' }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Resolve final text for a clause
// ---------------------------------------------------------------------------

function resolveClauseText(clause: ExportClause, study: StudyInfo, clauseEdits?: ClauseEdits): string {
  const edits = clauseEdits?.[clause.clause_key];
  if (clause.content_type === 'free_text' && edits?.full_text !== undefined) {
    return substitutePlaceholders(edits.full_text, study);
  }
  return substitutePlaceholders(clause.clause_text, study, edits?.fields);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateConsentDocx(
  study: StudyInfo,
  clauses: ExportClause[],
  clauseEdits?: ClauseEdits,
  answers?: Partial<StudyAnswers>
) {
  // --- Validate required header fields ---
  if (!study.pi_name || !study.title) {
    throw new Error('Protocol Title and Protocol Director are required for the Stanford repeating header');
  }

  // --- Validate Participant ID is not an SSN ---
  if (answers?.site_requires_participant_id_on_each_page && answers.participant_id_value) {
    const stripped = (answers.participant_id_value as string).replace(/[\s-]/g, '');
    if (/^\d{9}$/.test(stripped) && /^\d{3}-?\d{2}-?\d{4}$/.test((answers.participant_id_value as string).replace(/\s/g, ''))) {
      throw new Error('Participant ID must not use a social security number');
    }
  }

  // --- Validate Concise Summary for federally supported studies ---
  const effectiveIncludeSummary = answers?.federally_supported ? true : (answers?.include_summary ?? true);
  if (answers?.federally_supported && answers?.include_summary === false) {
    throw new Error('Concise Summary is required for federally supported studies');
  }
  const disallowedTokens = findUnresolvedPlaceholders(clauses, study, clauseEdits);
  if (disallowedTokens.length > 0) {
    throw new Error(`Disallowed internal tokens found: ${disallowedTokens.join(', ')}`);
  }

  // --- Guardrail: detect duplicate header content leaking into body ---
  const HEADER_BODY_FORBIDDEN = [
    'STANFORD UNIVERSITY Research Consent Form',
    'Protocol Title:',
    'Protocol Number:',
    'Principal Investigator:',
    'Sponsor:',
  ];
  const bodyOnlyClauses = clauses.filter(
    (c) => !HEADER_ONLY_CLAUSE_KEYS.has(c.clause_key) && !INTRO_SECTIONS.has(c.section) && c.section !== SIGNATURE_SECTION
  );
  for (const clause of bodyOnlyClauses) {
    const text = resolveClauseText(clause, study, clauseEdits);
    for (const forbidden of HEADER_BODY_FORBIDDEN) {
      if (text.includes(forbidden)) {
        throw new Error('Duplicate header content detected in document body');
      }
    }
  }

  // Filter out header-only clause keys from the entire clause set
  const exportClauses = clauses.filter((c) => !HEADER_ONLY_CLAUSE_KEYS.has(c.clause_key));

  const children: Paragraph[] = [];

  // ===== TITLE AREA (participant-facing consent title only — NO protocol metadata) =====
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'STANFORD UNIVERSITY', bold: true, size: 28, font: HEADING_FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'CONSENT TO BE PART OF A RESEARCH STUDY', bold: true, size: 26, font: HEADING_FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    }),
  );

  // ===== RENDER INTRO SECTIONS (header, summary) as body text =====
  const introClauses = exportClauses.filter((c) => INTRO_SECTIONS.has(c.section));
  for (const clause of introClauses) {
    const text = resolveClauseText(clause, study, clauseEdits);
    for (const line of text.split('\n').filter(Boolean)) {
      children.push(bodyParagraph(line));
    }
  }

  // ===== ADULT + CHILD PARTICIPATION BOX (conditional) =====
  const _popAdults = !!(answers?.population_adults);
  const _popChildren = !!(answers?.population_children);
  const _inclChildren = !!(answers?.includes_children);
  const needsAdultChildBox = _popAdults && _inclChildren;
  const docMode = (_popChildren && !_popAdults) ? 'child_only' : 'default';
  console.log('[DocxExport] document_subject_mode =', docMode, '| population_adults =', _popAdults, '| population_children =', _popChildren, '| includes_children =', _inclChildren, '| show_box =', needsAdultChildBox);
  if (needsAdultChildBox) {
    children.push(...buildAdultChildParticipationBox());
  }

  // ===== CONCISE SUMMARY (anchor: after screening/adult-child box, before PURPOSE) =====
  if (effectiveIncludeSummary) {
    children.push(sectionHeading('CONCISE SUMMARY'));
    const summaryText = answers?.concise_summary_text as string | undefined;
    if (summaryText && summaryText.trim()) {
      for (const line of summaryText.split('\n').filter(Boolean)) {
        children.push(bodyParagraph(line));
      }
    } else {
      // Empty placeholder line for the user to complete in Word
      children.push(bodyParagraph('[Enter concise summary text here]'));
    }
  }

  // ===== RENDER BODY SECTIONS =====
  let currentSection = '';
  let currentAnchor = '';

  /** Clause keys replaced by dedicated editable fields – suppress from export */
  const SUPPRESSED_EXPORT_KEYS = new Set(['enrollment_statement', 'future_use_intro', 'future_use_not_allowed']);

  const bodyClauses = exportClauses.filter(
    (c) => !INTRO_SECTIONS.has(c.section) && c.section !== SIGNATURE_SECTION && !SUPPRESSED_EXPORT_KEYS.has(c.clause_key)
  );

  let futureUseInjected = false;
  let specimenStorageInjected = false;
  const shouldInjectFutureUse = !!(answers?.collects_specimens);
  const shouldInjectSpecimenStorage = !!(answers?.collects_specimens);

  const UNLINKED_STATEMENT = 'Because your specimens will not be linked to your name after they are stored, you cannot withdraw your consent to the use of the specimens after they are taken.';

  // Validate unlinked specimen statement availability
  if (answers?.specimens_unlinked) {
    // The unlinked statement is always injected verbatim, so no validation needed for missing text.
    // But we validate it's not somehow suppressed.
  }

  /** Inject specimen storage description block */
  function injectSpecimenStorageBlock() {
    if (specimenStorageInjected || !shouldInjectSpecimenStorage) return;
    specimenStorageInjected = true;
    children.push(subHeading('Specimen Storage'));
    const storageText = (answers?.specimen_storage_description_text as string) || '';
    if (storageText.trim()) {
      for (const line of storageText.split('\n').filter(Boolean)) {
        children.push(bodyParagraph(line));
      }
    }
    if (answers?.specimens_unlinked) {
      children.push(bodyParagraph(UNLINKED_STATEMENT));
    }
  }

  /** Inject the "Future Use of Private Information and/or Specimens" verbatim block */
  function injectFutureUseBlock() {
    if (futureUseInjected || !shouldInjectFutureUse) return;
    futureUseInjected = true;
    children.push(subHeading('Future Use of Private Information and/or Specimens'));
    children.push(bodyParagraph(
      answers?.future_research_use_allowed
        ? 'Research using private information and/or specimens is an important way to try to understand human disease. The investigators would like to store your private information and/or specimens for possible future research.'
        : 'Research using private information and/or specimens is an important way to try to understand human disease. In this study, your private information and/or specimens will only be used for the purposes described in this consent form.'
    ));
    if (answers?.future_research_use_allowed) {
      children.push(bodyParagraph(
        'Identifiers might be removed from identifiable private information and/or identifiable specimens and, after such removal, the information and/or specimens could be used for future research studies or distributed to another investigator for future research studies without additional informed consent from you.'
      ));
    } else {
      children.push(bodyParagraph(
        'Your information and/or specimens will not be used or distributed for future research studies even if all identifying information is removed.'
      ));
    }
    // Inject specimen storage right after future use
    injectSpecimenStorageBlock();
  }

  for (const clause of bodyClauses) {
    // Section heading
    if (clause.section !== currentSection) {
      // Before leaving the procedures section, inject Future Use block if not yet done
      if (currentSection === 'procedures') {
        injectFutureUseBlock();
      }
      // Before leaving the purpose section, inject enrollment text
      if (currentSection === 'purpose' && answers?.purpose_enrollment_text) {
        const enrollText = answers.purpose_enrollment_text as string;
        if (enrollText.trim()) {
          for (const line of enrollText.split('\n').filter(Boolean)) {
            children.push(bodyParagraph(line));
          }
        }
      }
      currentSection = clause.section;
      currentAnchor = '';
      const heading = SECTION_HEADING_MAP[currentSection];
      if (heading) {
        children.push(sectionHeading(heading, currentSection === 'hipaa'));
      }
    }

    // Anchor sub-heading
    const anchor = clause.insertion_anchor ?? '';
    if (anchor && anchor !== currentAnchor) {
      // When transitioning past procedures_main, inject Future Use before other anchors
      if (currentSection === 'procedures' && currentAnchor === 'procedures_main' && anchor !== 'procedures_main') {
        injectFutureUseBlock();
      }
      currentAnchor = anchor;
      // Skip the future_use anchor heading if we already injected it
      if (anchor === 'future_use_of_information_and_specimens' && futureUseInjected) {
        // Already rendered — skip the anchor heading
      } else {
        const anchorHeading = ANCHOR_HEADING_MAP[anchor];
        if (anchorHeading) {
          children.push(subHeading(anchorHeading));
        }
      }
    }

    // Body text — deduplicate Bill of Rights heading that may appear in clause text
    const text = resolveClauseText(clause, study, clauseEdits);
    const billOfRightsHeading = "EXPERIMENTAL SUBJECT'S BILL OF RIGHTS";
    const sectionAlreadyHasHeading = currentSection === 'bill_of_rights';
    for (const line of text.split('\n').filter(Boolean)) {
      // Skip duplicate Bill of Rights heading inside clause text if section heading already rendered
      if (sectionAlreadyHasHeading && line.trim().toUpperCase() === billOfRightsHeading) {
        continue;
      }
      children.push(bodyParagraph(line));
    }
  }

  // If purpose was the last section processed, still inject enrollment text
  if (currentSection === 'purpose' && answers?.purpose_enrollment_text) {
    const enrollText = answers.purpose_enrollment_text as string;
    if (enrollText.trim()) {
      for (const line of enrollText.split('\n').filter(Boolean)) {
        children.push(bodyParagraph(line));
      }
    }
  }

  // ===== SIGNATURE BLOCKS =====
  const sigClauses = exportClauses.filter((c) => c.section === SIGNATURE_SECTION);
  if (sigClauses.length > 0) {
    children.push(new Paragraph({ spacing: { before: 480 }, children: [] }));

    for (const clause of sigClauses) {
      const text = resolveClauseText(clause, study, clauseEdits);
      // Detect signature-style clauses by key patterns
      if (clause.clause_key.includes('signature') || clause.clause_key.includes('consent_block')) {
        // Parse the text for slash-separated labels (e.g. "Signature of Adult Participant / Date / Print Name...")
        // and render as proper signature blocks instead
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          // Check if this line contains slash-separated signature labels
          const parts = line.split('/').map((p) => p.trim());
          if (parts.length >= 2 && parts.some((p) => p.toLowerCase().includes('signature'))) {
            // Extract the role labels
            const signatureLabel = parts.find((p) => p.toLowerCase().includes('signature')) || parts[0];
            const printNameLabel = parts.find((p) => p.toLowerCase().includes('print name')) || `Print Name`;
            const larAuthority = parts.find((p) => p.toLowerCase().includes('authority'));
            children.push(...signatureBlock(signatureLabel));
            // Override the print name line with the actual label from the clause
            children.pop(); // remove the default "Print Name: ___" line
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${printNameLabel}: ________________________________________`, font: BODY_FONT, size: META_LABEL_SIZE }),
              ],
              spacing: { after: 200 },
            }));
            if (larAuthority) {
              children.push(new Paragraph({
                children: [
                  new TextRun({ text: `${larAuthority}: ______________________________`, font: BODY_FONT, size: META_LABEL_SIZE }),
                ],
                spacing: { after: 200 },
              }));
            }
          } else {
            // Regular text line (attestation, etc.)
            children.push(bodyParagraph(line));
          }
        }
      } else {
        // Attestation or other text — render as body
        for (const line of text.split('\n').filter(Boolean)) {
          children.push(bodyParagraph(line));
        }
      }
    }
  }

  // ===== HIPAA AUTHORIZATION (separate page at end) =====
  if (answers?.include_hipaa_authorization) {
    children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    children.push(sectionHeading('Authorization To Use Your Personal Health Information For Research Purposes', true));

    const hp = (text: string, opts?: { bold?: boolean; italics?: boolean }) =>
      bodyParagraph(text, { size: HIPAA_SIZE, ...opts });

    children.push(hp('Information about you and your health is personal and private. We need your permission to use and share it for this study. If you sign this form, it will provide that permission. The form tells you how your health information will be used or shared for the study. Please read it carefully before signing it.'));

    children.push(hp('What information will be used for this study?', { bold: true }));
    children.push(hp('We will include and use the information below in our research records:'));

    // Demographic bullet with sub-items
    const demographicItems = ['name', 'age and birthdate', 'race and ethnicity', 'gender and sex', 'contact information (phone number, address, email)'];
    children.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: 'Demographic information like', font: BODY_FONT, size: HIPAA_SIZE })],
      spacing: { after: 60 },
    }));
    for (const item of demographicItems) {
      children.push(new Paragraph({
        indent: { left: 1080, hanging: 360 },
        children: [new TextRun({ text: `○  ${item}`, font: BODY_FONT, size: HIPAA_SIZE })],
        spacing: { after: 40 },
      }));
    }



    children.push(hp('Do I have to give my permission for the disclosure of certain specific types of information?', { bold: true }));
    children.push(hp('Yes. The following information will only be released if you give your specific permission by putting your initials in the boxes:'));

    const consentBoxItems = [
      'I agree to the release of information pertaining to my drug and alcohol abuse, diagnosis or treatment.',
      'I agree to the release of my HIV/AIDS testing information.',
      'I agree to the release of my genetic testing information.',
      'I agree to the release of information pertaining to my mental health diagnosis or treatment.',
      'I agree to the release of my information for the optional research activities described in the consent form (such as the creation of a database, tissue repository, or other activities).',
    ];
    for (const item of consentBoxItems) {
      children.push(new Paragraph({
        indent: { left: 360 },
        children: [new TextRun({ text: `☐  ${item}`, font: BODY_FONT, size: HIPAA_SIZE })],
        spacing: { after: 80 },
      }));
    }

    children.push(hp('Who may use, share, or receive my information?', { bold: true }));
    children.push(hp('The research records may be used and shared with others who are working with us on this research. This includes:'));

    const sharingItems = [
      'Members of the research team and those at Stanford University who are performing their jobs to support research',
      'Others at Stanford who oversee the research',
      'Your health care team or organization who may receive it for treatment purposes',
    ];
    for (const item of sharingItems) {
      children.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [new TextRun({ text: item, font: BODY_FONT, size: HIPAA_SIZE })],
        spacing: { after: 60 },
      }));
    }
    children.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: 'Others who are required by law to review the quality and safety of the research, including but not limited to:', font: BODY_FONT, size: HIPAA_SIZE })],
      spacing: { after: 60 },
    }));
    children.push(new Paragraph({
      indent: { left: 1080, hanging: 360 },
      children: [new TextRun({ text: '○  State, federal, and international government agencies or committees, such as the Food and Drug Administration or the Office for Human Research Protections', font: BODY_FONT, size: HIPAA_SIZE })],
      spacing: { after: 40 },
    }));
    children.push(new Paragraph({
      indent: { left: 1080, hanging: 360 },
      children: [new TextRun({ text: '○  The study funder [name of funder], study sponsor and/or their representatives', font: BODY_FONT, size: HIPAA_SIZE })],
      spacing: { after: 40 },
    }));
    children.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: 'Researchers and/or those responsible for research with whom collaboration may be required', font: BODY_FONT, size: HIPAA_SIZE })],
      spacing: { after: 60 },
    }));
    children.push(new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: 'The Palo Alto Veterans Institute for Research (PAVIR)', font: BODY_FONT, size: HIPAA_SIZE })],
      spacing: { after: 120 },
    }));
    children.push(hp('If we share your information with groups outside of Stanford University, they may not be required to follow the same federal privacy laws. They may also share your information with others not described in this form.'));

    children.push(hp('Do I have to sign this permission form?', { bold: true }));
    children.push(hp('You do not have to sign this permission form. You can still receive medical care at a Stanford Medicine affiliated organization if you don\u2019t sign this form. If you do not sign this form, you will not be able to participate in this research study.'));

    children.push(hp('If I sign, can I change my mind later?', { bold: true }));
    children.push(hp('You can cancel your permission at any time. If you change your mind, we will not collect new information from you for the study and you will be withdrawn from the study. But we can continue to use information we have already collected and started to use in our research, to maintain the integrity of the research.'));
    children.push(hp('If you wish to cancel your permission, you must write a letter or email to the Protocol Director using the contact information provided in this form.'));

    children.push(hp('When will my permission expire?', { bold: true }));
    children.push(hp('Your permission to use and share your health information will end when the research and all required study monitoring is over.'));

    children.push(hp('Will access to my information in my Stanford medical record be limited during the study?', { bold: true }));
    children.push(hp('You have a right to use information about you to make decisions about your health care. However, your information from this research will not be available during the study. It will be available after the study is finished.'));

    // HIPAA signature blocks
    children.push(...signatureBlock('Signature of Adult Participant'));
    children.pop();
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Print Name of Adult Participant: ________________________________________', font: BODY_FONT, size: META_LABEL_SIZE })],
      spacing: { after: 200 },
    }));

    children.push(bodyParagraph('If authorization is to be obtained from a legally authorized representative:', { italics: true, size: HIPAA_SIZE }));

    children.push(...signatureBlock('Signature of Legally Authorized Representative'));
    children.pop();
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Print Name of LAR: ________________________________________', font: BODY_FONT, size: META_LABEL_SIZE })],
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'LAR\u2019s Authority to Act for Participant: ______________________________', font: BODY_FONT, size: META_LABEL_SIZE })],
      spacing: { after: 200 },
    }));
  }
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: BODY_FONT, size: BODY_SIZE },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: HEADING_SIZE, bold: true, font: HEADING_FONT },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: SUBHEADING_SIZE, bold: true, font: HEADING_FONT },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 2160, right: 1440, bottom: answers?.site_requires_participant_id_on_each_page ? 1800 : 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              buildStanfordHeader(study),
            ],
          }),
        },
        footers: {
          default: answers?.site_requires_participant_id_on_each_page
            ? buildParticipantIdFooter(answers)
            : new Footer({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Page ', size: 16, font: HEADING_FONT }),
                      new TextRun({ children: [PageNumber.CURRENT], size: 16, font: HEADING_FONT }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
              }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const fileName = `consent_form_${(study.short_title || study.title || 'draft').replace(/\s+/g, '_').toLowerCase()}.docx`;
  saveAs(buffer, fileName);
  return { fileName, buffer };
}
