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
} from 'docx';
import { saveAs } from 'file-saver';
import type { ClauseEdits } from '@/components/ConsentPreview';
import { SECTION_ORDER, ANCHOR_ORDER } from './types';

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

/** Sections rendered as signature blocks, not normal body text */
const SIGNATURE_SECTION = 'signatures';

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
    .replace(/\[CONTACT_EMAIL\]/g, study.contact_email || '');

  if (fieldValues) {
    for (const [key, value] of Object.entries(fieldValues)) {
      result = result.replace(new RegExp(`\\[${key}\\]`, 'gi'), value || '');
    }
  }

  return result;
}

/**
 * Find unresolved placeholders (anything like [SOME_FIELD] still in the text).
 */
export function findUnresolvedPlaceholders(
  clauses: ExportClause[],
  study: StudyInfo,
  clauseEdits?: ClauseEdits
): string[] {
  const unresolved = new Set<string>();
  for (const clause of clauses) {
    const edits = clauseEdits?.[clause.clause_key];
    let text: string;
    if (clause.content_type === 'free_text' && edits?.full_text !== undefined) {
      text = substitutePlaceholders(edits.full_text, study);
    } else {
      text = substitutePlaceholders(clause.clause_text, study, edits?.fields);
    }
    const matches = text.match(/\[[A-Z_]+\]/g);
    if (matches) matches.forEach((m) => unresolved.add(m));
  }
  return Array.from(unresolved);
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
  clauseEdits?: ClauseEdits
) {
  // --- Validate required header fields ---
  if (!study.pi_name || !study.title) {
    throw new Error('Protocol Title and Protocol Director are required for the Stanford repeating header');
  }

  // --- Validate placeholders ---
  const unresolved = findUnresolvedPlaceholders(clauses, study, clauseEdits);
  if (unresolved.length > 0) {
    throw new Error(`Unresolved placeholders: ${unresolved.join(', ')}`);
  }

  const children: Paragraph[] = [];

  // ===== TITLE AREA =====
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'STANFORD UNIVERSITY', bold: true, size: TITLE_SIZE, font: HEADING_FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Research Consent Form', bold: true, size: 28, font: HEADING_FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    }),
  );

  // Metadata
  const metaLines: [string, string][] = [
    ['Protocol Title:', study.title || '[TBD]'],
    ['Protocol Number:', study.protocol_number || '[TBD]'],
    ['Principal Investigator:', study.pi_name || '[TBD]'],
    ['Sponsor:', study.sponsor || '[TBD]'],
  ];
  for (const [label, value] of metaLines) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${label}  `, bold: true, font: BODY_FONT, size: BODY_SIZE }),
          new TextRun({ text: value, font: BODY_FONT, size: BODY_SIZE }),
        ],
        spacing: { after: 80 },
      })
    );
  }

  // Institutional title block
  children.push(
    new Paragraph({ spacing: { before: 360 }, children: [] }),
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
  const introClauses = clauses.filter((c) => INTRO_SECTIONS.has(c.section));
  for (const clause of introClauses) {
    const text = resolveClauseText(clause, study, clauseEdits);
    for (const line of text.split('\n').filter(Boolean)) {
      children.push(bodyParagraph(line));
    }
  }

  // ===== RENDER BODY SECTIONS =====
  let currentSection = '';
  let currentAnchor = '';

  const bodyClauses = clauses.filter(
    (c) => !INTRO_SECTIONS.has(c.section) && c.section !== SIGNATURE_SECTION
  );

  for (const clause of bodyClauses) {
    // Section heading
    if (clause.section !== currentSection) {
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
      currentAnchor = anchor;
      const anchorHeading = ANCHOR_HEADING_MAP[anchor];
      if (anchorHeading) {
        children.push(subHeading(anchorHeading));
      }
    }

    // Body text
    const text = resolveClauseText(clause, study, clauseEdits);
    for (const line of text.split('\n').filter(Boolean)) {
      children.push(bodyParagraph(line));
    }
  }

  // ===== SIGNATURE BLOCKS =====
  const sigClauses = clauses.filter((c) => c.section === SIGNATURE_SECTION);
  if (sigClauses.length > 0) {
    children.push(new Paragraph({ spacing: { before: 480 }, children: [] }));

    for (const clause of sigClauses) {
      const text = resolveClauseText(clause, study, clauseEdits);
      // Detect signature-style clauses by key patterns
      if (clause.clause_key.includes('signature') || clause.clause_key.includes('consent_block')) {
        // Render as a signature block
        const label = text.split('\n')[0] || 'Signature';
        children.push(...signatureBlock(label));
        // Render remaining lines as body text
        const remaining = text.split('\n').slice(1).filter(Boolean);
        for (const line of remaining) {
          children.push(bodyParagraph(line, { size: META_LABEL_SIZE }));
        }
      } else {
        // Attestation or other text — render as body
        for (const line of text.split('\n').filter(Boolean)) {
          children.push(bodyParagraph(line));
        }
      }
    }
  }

  // ===== BUILD DOCUMENT =====
  const doc = new Document({
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
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${study.short_title || study.title}`,
                    size: 16,
                    font: HEADING_FONT,
                    color: '888888',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
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
