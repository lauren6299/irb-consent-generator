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
} from 'docx';
import { saveAs } from 'file-saver';
import type { ClauseEdits } from '@/components/ConsentPreview';

interface ExportClause {
  clause_key: string;
  section: string;
  subsection?: string;
  clause_text: string;
  content_type: string;
  editable_fields?: unknown[] | null;
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
}

function substitutePlaceholders(
  text: string,
  study: StudyInfo,
  fieldValues?: Record<string, string>
): string {
  let result = text
    .replace(/\[STUDY_TITLE\]/g, study.title || '[STUDY TITLE]')
    .replace(/\[SHORT_TITLE\]/g, study.short_title || '[SHORT TITLE]')
    .replace(/\[PI_NAME\]/g, study.pi_name || '[PI NAME]')
    .replace(/\[PROTOCOL_NUMBER\]/g, study.protocol_number || '[PROTOCOL NUMBER]')
    .replace(/\[SPONSOR\]/g, study.sponsor || '[SPONSOR]')
    .replace(/\[CONTACT_NAME\]/g, study.contact_name || '[CONTACT NAME]')
    .replace(/\[CONTACT_PHONE\]/g, study.contact_phone || '[CONTACT PHONE]')
    .replace(/\[CONTACT_EMAIL\]/g, study.contact_email || '[CONTACT EMAIL]');

  if (fieldValues) {
    for (const [key, value] of Object.entries(fieldValues)) {
      result = result.replace(new RegExp(`\\[${key}\\]`, 'gi'), value || `[${key}]`);
    }
  }

  return result;
}

export async function generateConsentDocx(
  study: StudyInfo,
  clauses: ExportClause[],
  clauseEdits?: ClauseEdits
) {
  const children: Paragraph[] = [];

  // Title page
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'STANFORD UNIVERSITY', bold: true, size: 28, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Research Consent Form', bold: true, size: 24, font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Protocol Title: ${study.title}`, size: 22, font: 'Arial' })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Protocol Number: ${study.protocol_number || '[TBD]'}`, size: 22, font: 'Arial' })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Principal Investigator: ${study.pi_name || '[TBD]'}`, size: 22, font: 'Arial' })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Sponsor: ${study.sponsor || '[TBD]'}`, size: 22, font: 'Arial' })],
      spacing: { after: 400 },
    })
  );

  let currentSection = '';
  let currentSubsection = '';

  for (const clause of clauses) {
    // Section heading
    if (clause.section !== currentSection) {
      currentSection = clause.section;
      currentSubsection = '';
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: currentSection, bold: true, size: 24, font: 'Arial' })],
          spacing: { before: 400, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '8C1515' } },
        })
      );
    }

    // Subsection heading
    if (clause.subsection && clause.subsection !== currentSubsection) {
      currentSubsection = clause.subsection;
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: currentSubsection, bold: true, size: 22, font: 'Arial' })],
          spacing: { before: 200, after: 100 },
        })
      );
    }

    // Resolve text: use full_text override for free_text, otherwise substitute placeholders + field edits
    const edits = clauseEdits?.[clause.clause_key];
    let finalText: string;

    if (clause.content_type === 'free_text' && edits?.full_text !== undefined) {
      finalText = substitutePlaceholders(edits.full_text, study);
    } else {
      finalText = substitutePlaceholders(clause.clause_text, study, edits?.fields);
    }

    // Write each line as a paragraph
    const lines = finalText.split('\n');
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22, font: 'Arial' })],
          spacing: { after: 100 },
        })
      );
    }
  }

  // Disclaimer
  children.push(
    new Paragraph({ spacing: { before: 600 }, children: [] }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'DISCLAIMER: This document was generated using the Stanford IRB Consent Builder. Final IRB and institutional review required before use.',
          italics: true,
          size: 18,
          font: 'Arial',
          color: '666666',
        }),
      ],
    })
  );

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 22, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
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
                  new TextRun({ text: `${study.short_title || study.title} — Consent Form`, size: 16, font: 'Arial', color: '888888' }),
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
                  new TextRun({ text: 'Page ', size: 16, font: 'Arial' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial' }),
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
