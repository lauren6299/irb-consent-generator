import { CONSENT_SECTIONS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Lock, PenLine, FileText, GitBranch } from 'lucide-react';
import { useCallback } from 'react';

interface PreviewClause {
  id?: string;
  clause_key: string;
  section: string;
  subsection?: string;
  clause_text: string;
  content_type: string;
  required_level?: string;
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
}

interface EditableField {
  field_key: string;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'textarea';
}

export interface ClauseEdits {
  [clauseKey: string]: {
    /** For free_text: the full edited text */
    full_text?: string;
    /** For required_editable / conditional_pack: individual field values */
    fields?: Record<string, string>;
  };
}

interface Props {
  clauses: PreviewClause[];
  study: StudyInfo;
  edits?: ClauseEdits;
  onEditChange?: (edits: ClauseEdits) => void;
  showAdultChildBox?: boolean;
  includeSummary?: boolean;
  conciseSummaryText?: string;
  onConciseSummaryTextChange?: (text: string) => void;
  purposeEnrollmentText?: string;
  onPurposeEnrollmentTextChange?: (text: string) => void;
  collectsSpecimens?: boolean;
  futureResearchUseAllowed?: boolean;
}

const CONTENT_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  locked: { label: 'Verbatim Stanford language', icon: Lock, className: 'border-primary/30 text-primary' },
  required_editable: { label: 'Required editable language', icon: PenLine, className: 'border-amber-500/30 text-amber-600' },
  free_text: { label: 'Study-specific text', icon: FileText, className: 'border-emerald-500/30 text-emerald-600' },
  conditional_pack: { label: 'Conditionally included', icon: GitBranch, className: 'border-blue-500/30 text-blue-600' },
  structured_block: { label: 'Conditionally included', icon: GitBranch, className: 'border-blue-500/30 text-blue-600' },
};

/** Fields that are globally bound from Study Setup – hide from per-clause editing */
const GLOBAL_BOUND_FIELDS = new Set([
  'protocol_director_name',
  'protocol_director_address',
  'protocol_director_phone',
]);

function replacePlaceholders(text: string, study: StudyInfo, fieldValues?: Record<string, string>): string {
  let result = text
    .replace(/\[STUDY_TITLE\]/g, study.title || '[STUDY TITLE]')
    .replace(/\[SHORT_TITLE\]/g, study.short_title || '[SHORT TITLE]')
    .replace(/\[PI_NAME\]/g, study.pi_name || '[PI NAME]')
    .replace(/\[PROTOCOL_NUMBER\]/g, study.protocol_number || '[PROTOCOL NUMBER]')
    .replace(/\[SPONSOR\]/g, study.sponsor || '[SPONSOR]')
    .replace(/\[CONTACT_NAME\]/g, study.contact_name || '[CONTACT NAME]')
    .replace(/\[CONTACT_PHONE\]/g, study.contact_phone || '[CONTACT PHONE]')
    .replace(/\[CONTACT_EMAIL\]/g, study.contact_email || '[CONTACT EMAIL]')
    // Global protocol director bindings from Study Setup
    .replace(/\[protocol_director_name\]/gi, study.pi_name || '[protocol_director_name]')
    .replace(/\[protocol_director_address\]/gi, study.pi_address || '[protocol_director_address]')
    .replace(/\[protocol_director_phone\]/gi, study.pi_phone || '[protocol_director_phone]');

  // Replace custom field placeholders from editable_fields values
  if (fieldValues) {
    for (const [key, value] of Object.entries(fieldValues)) {
      const placeholder = new RegExp(`\\[${key}\\]`, 'gi');
      result = result.replace(placeholder, value || `[${key}]`);
    }
  }

  return result;
}

function parseEditableFields(fields: unknown[] | null | undefined): EditableField[] {
  if (!fields || !Array.isArray(fields)) return [];
  return fields.filter(
    (f): f is EditableField =>
      typeof f === 'object' && f !== null && 'field_key' in (f as Record<string, unknown>) &&
      !GLOBAL_BOUND_FIELDS.has((f as EditableField).field_key)
  );
}

/** Clause keys suppressed in preview because they are replaced by dedicated editable fields */
const SUPPRESSED_CLAUSE_KEYS = new Set(['enrollment_statement']);

export default function ConsentPreview({ clauses, study, edits = {}, onEditChange, showAdultChildBox = false, includeSummary = true, conciseSummaryText = '', onConciseSummaryTextChange, purposeEnrollmentText = '', onPurposeEnrollmentTextChange, collectsSpecimens = false, futureResearchUseAllowed = false }: Props) {
  const grouped = CONSENT_SECTIONS.reduce((acc, section) => {
    acc[section] = clauses.filter((c) => c.section === section && !SUPPRESSED_CLAUSE_KEYS.has(c.clause_key));
    return acc;
  }, {} as Record<string, PreviewClause[]>);

  const updateEdit = useCallback(
    (clauseKey: string, patch: ClauseEdits[string]) => {
      if (!onEditChange) return;
      onEditChange({
        ...edits,
        [clauseKey]: { ...edits[clauseKey], ...patch },
      });
    },
    [edits, onEditChange]
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1 pb-4 border-b">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">Stanford University</p>
        <h2 className="font-heading text-xl font-bold">Research Consent Form</h2>
        <p className="text-sm text-muted-foreground">{study.title || 'Untitled Study'}</p>
        {study.protocol_number && (
          <p className="text-xs text-muted-foreground">Protocol #{study.protocol_number}</p>
        )}
      </div>

      {/* Adult + Child Participation Box */}
      {showAdultChildBox && (
        <div className="border border-foreground p-4 space-y-3">
          <p className="text-sm">Please check all that are applicable:</p>
          <p className="text-sm">☐  I am an adult participant in this study.</p>
          <p className="text-sm">Print your name here:</p>
          <p className="text-sm">______________________________________________________</p>
          <p className="text-sm">
            ☐  I am the parent or guardian granting permission for a child in this study (the use of
            &quot;you&quot; refers to &quot;your child&quot; or &quot;your ward.&quot;)
          </p>
          <p className="text-sm">Print child&apos;s name here:</p>
          <p className="text-sm">______________________________________________________</p>
        </div>
      )}

      {/* Concise Summary */}
      {includeSummary && (
        <div id="section-summary" className="space-y-3">
          <h3 className="font-heading text-base font-bold border-b border-primary/20 pb-1 mb-3">
            CONCISE SUMMARY
          </h3>

          {/* Editable participant-facing text */}
          <Textarea
            className="text-sm leading-relaxed min-h-[120px] bg-background"
            placeholder="Enter the concise summary text that will appear in the consent form…"
            value={conciseSummaryText}
            onChange={(e) => onConciseSummaryTextChange?.(e.target.value)}
            disabled={!onConciseSummaryTextChange}
          />

          {/* Helper guidance – editor only, never exported */}
          <details className="rounded-md border border-muted p-3 bg-muted/30">
            <summary className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
              Drafting Guidance (not included in export)
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use the bulleted list below to draft your key information as a concise summary.
              </p>
              <p className="text-xs font-medium text-muted-foreground">Required points to cover:</p>
              <ul className="list-disc pl-5 text-xs text-muted-foreground leading-relaxed space-y-0.5">
                <li>The fact that consent is being sought for research and that participation is voluntary</li>
                <li>The purpose(s) of the research, expected duration of the subject's participation, and the procedures to be followed in the research</li>
                <li>Reasonably foreseeable risks or discomforts</li>
                <li>Benefits to subjects or others that may be reasonably expected from the research</li>
                <li>Appropriate alternative procedures or courses of treatment, if any that might be advantageous to the prospective subject</li>
              </ul>
              <p className="text-xs font-medium text-muted-foreground mt-2">Optional other topics to consider:</p>
              <ul className="list-disc pl-5 text-xs text-muted-foreground leading-relaxed space-y-0.5">
                <li>Most important reason why a participant would and would not want to participate</li>
                <li>How will they feel during the study?</li>
                <li>What is the science?</li>
                <li>What's the difference between being in the study, and being treated for their condition?</li>
                <li>Will someone profit from the use of their samples or data? Will they?</li>
                <li>What happens if they want to stop?</li>
                <li>Have other people taken this drug/used this device? What happened to them?</li>
              </ul>
            </div>
          </details>
        </div>
      )}

      {CONSENT_SECTIONS.map((section) => {
        const sectionClauses = grouped[section];
        if (!sectionClauses || sectionClauses.length === 0) return null;

        return (
          <div key={section} id={`section-${section.replace(/\s+/g, '-').toLowerCase()}`}>
            <h3 className="font-heading text-base font-bold border-b border-primary/20 pb-1 mb-3">
              {section}
            </h3>
            <div className="space-y-3">
              {sectionClauses.map((clause) => {
                const meta = CONTENT_TYPE_LABELS[clause.content_type] ?? CONTENT_TYPE_LABELS.locked;
                const Icon = meta.icon;
                const editableFields = parseEditableFields(clause.editable_fields);
                const clauseEdits = edits[clause.clause_key];
                const fieldValues = clauseEdits?.fields;

                return (
                  <div
                    key={clause.clause_key}
                    className={
                      clause.content_type === 'locked'
                        ? 'clause-required'
                        : clause.content_type === 'free_text'
                        ? 'clause-optional'
                        : clause.content_type === 'conditional_pack' || clause.content_type === 'structured_block'
                        ? 'clause-conditional'
                        : 'clause-required'
                    }
                  >
                    {/* Content type label */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </Badge>
                    </div>

                    {/* Clause body */}
                    {clause.content_type === 'free_text' ? (
                      /* free_text → full editing */
                      <>
                        <Textarea
                          className="text-sm leading-relaxed min-h-[80px] bg-background"
                          value={
                            clauseEdits?.full_text !== undefined
                              ? clauseEdits.full_text
                              : replacePlaceholders(clause.clause_text, study)
                          }
                          onChange={(e) => updateEdit(clause.clause_key, { full_text: e.target.value })}
                          disabled={!onEditChange}
                        />
                        {/* Procedures helper guidance – anchored directly under the first free_text box */}
                        {section === 'procedures' && (
                          <>
                            <details className="mt-2 rounded-md border border-muted p-3 bg-muted/30">
                              <summary className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                                Drafting Guidance (not included in export)
                              </summary>
                              <div className="mt-2 space-y-2">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Describe study procedures in plain language. Use a clear, step-by-step or chronological format. Consider including a schedule, chart, or visuals if helpful. Define all medical terms and avoid acronyms when possible.
                                </p>
                                <p className="text-xs font-medium text-muted-foreground">Include, as applicable:</p>
                                <ul className="list-disc pl-5 text-xs text-muted-foreground leading-relaxed space-y-0.5">
                                  <li>What is experimental in the study</li>
                                  <li>The purpose of each procedure</li>
                                  <li>How often procedures occur and how long they take</li>
                                  <li>Any invasive procedures</li>
                                  <li>Contraception requirements, if relevant</li>
                                  <li>Details of samples collected (type, frequency, and amount), expressed in simple terms (e.g., tablespoons of blood)</li>
                                </ul>
                              </div>
                            </details>

                            {/* Future Use of Private Information and/or Specimens – locked verbatim block */}
                            {collectsSpecimens && (
                              <div className="mt-4 clause-required">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <Badge variant="outline" className={`text-[10px] gap-1 ${CONTENT_TYPE_LABELS.locked.className}`}>
                                    <Lock className="h-3 w-3" /> {CONTENT_TYPE_LABELS.locked.label}
                                  </Badge>
                                </div>
                                <h4 className="text-sm font-semibold mb-2">Future Use of Private Information and/or Specimens</h4>
                                <p className="text-sm leading-relaxed mb-3">
                                  Research using private information and/or specimens is an important way to try to understand human disease. You are being given this information because the investigators want to save private information and/or specimens for future research.
                                </p>
                                <p className="text-sm leading-relaxed">
                                  {futureResearchUseAllowed
                                    ? 'Identifiers might be removed from identifiable private information and/or identifiable specimens and, after such removal, the information and/or specimens could be used for future research studies or distributed to another investigator for future research studies without additional informed consent from you.'
                                    : 'Your information and/or specimens will not be used or distributed for future research studies even if all identifying information is removed.'}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Rendered text with placeholders replaced */}
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {replacePlaceholders(clause.clause_text, study, fieldValues)}
                        </div>

                        {/* required_editable or conditional_pack with editable_fields → inline field editors */}
                        {(clause.content_type === 'required_editable' ||
                          (clause.content_type === 'conditional_pack' && editableFields.length > 0)) &&
                          editableFields.length > 0 && (
                            <div className="mt-2 space-y-2 pl-3 border-l-2 border-muted">
                              {editableFields.map((field) => (
                                <div key={field.field_key}>
                                  <label className="text-xs font-medium text-muted-foreground">
                                    {field.label || field.field_key.replace(/_/g, ' ')}
                                  </label>
                                  {field.type === 'textarea' ? (
                                    <Textarea
                                      className="mt-0.5 text-sm bg-background min-h-[60px]"
                                      placeholder={field.placeholder || `Enter ${field.label || field.field_key}`}
                                      value={fieldValues?.[field.field_key] ?? ''}
                                      onChange={(e) =>
                                        updateEdit(clause.clause_key, {
                                          fields: { ...fieldValues, [field.field_key]: e.target.value },
                                        })
                                      }
                                      disabled={!onEditChange}
                                    />
                                  ) : (
                                    <Input
                                      className="mt-0.5 text-sm bg-background"
                                      placeholder={field.placeholder || `Enter ${field.label || field.field_key}`}
                                      value={fieldValues?.[field.field_key] ?? ''}
                                      onChange={(e) =>
                                        updateEdit(clause.clause_key, {
                                          fields: { ...fieldValues, [field.field_key]: e.target.value },
                                        })
                                      }
                                      disabled={!onEditChange}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                );
              })}
              {/* Purpose enrollment block – rendered after purpose clauses */}
              {section === 'purpose' && (
                <div className="clause-required">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${CONTENT_TYPE_LABELS.required_editable.className}`}>
                      <PenLine className="h-3 w-3" /> {CONTENT_TYPE_LABELS.required_editable.label}
                    </Badge>
                  </div>
                  <Textarea
                    className="text-sm leading-relaxed min-h-[100px] bg-background"
                    value={purposeEnrollmentText}
                    onChange={(e) => onPurposeEnrollmentTextChange?.(e.target.value)}
                    disabled={!onPurposeEnrollmentTextChange}
                    placeholder="This research study is looking for [state number] of people with [disease or condition]..."
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="pt-6 border-t mt-8">
        <p className="text-xs text-muted-foreground italic text-center">
          DISCLAIMER: This document was generated using the Stanford IRB Consent Builder. Final IRB and institutional review required before use.
        </p>
      </div>
    </div>
  );
}
