import { CONSENT_SECTIONS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Lock, Info } from 'lucide-react';

interface PreviewClause {
  id: string;
  section: string;
  clause_text: string;
  content_type: string;
  required_level: string;
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

interface Props {
  clauses: PreviewClause[];
  study: StudyInfo;
}

function replacePlaceholders(text: string, study: StudyInfo): string {
  return text
    .replace(/\[STUDY_TITLE\]/g, study.title || '[STUDY TITLE]')
    .replace(/\[SHORT_TITLE\]/g, study.short_title || '[SHORT TITLE]')
    .replace(/\[PI_NAME\]/g, study.pi_name || '[PI NAME]')
    .replace(/\[PROTOCOL_NUMBER\]/g, study.protocol_number || '[PROTOCOL NUMBER]')
    .replace(/\[SPONSOR\]/g, study.sponsor || '[SPONSOR]')
    .replace(/\[CONTACT_NAME\]/g, study.contact_name || '[CONTACT NAME]')
    .replace(/\[CONTACT_PHONE\]/g, study.contact_phone || '[CONTACT PHONE]')
    .replace(/\[CONTACT_EMAIL\]/g, study.contact_email || '[CONTACT EMAIL]');
}

export default function ConsentPreview({ clauses, study }: Props) {
  const grouped = CONSENT_SECTIONS.reduce((acc, section) => {
    acc[section] = clauses.filter((c) => c.section === section);
    return acc;
  }, {} as Record<string, PreviewClause[]>);

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

      {CONSENT_SECTIONS.map((section) => {
        const sectionClauses = grouped[section];
        if (!sectionClauses || sectionClauses.length === 0) return null;

        return (
          <div key={section} id={`section-${section.replace(/\s+/g, '-').toLowerCase()}`}>
            <h3 className="font-heading text-base font-bold border-b border-primary/20 pb-1 mb-3">
              {section}
            </h3>
            <div className="space-y-3">
              {sectionClauses.map((clause) => (
                <div
                  key={clause.id}
                  className={
                    clause.content_type === 'locked'
                      ? 'clause-required'
                      : clause.required_level === 'conditional'
                      ? 'clause-conditional'
                      : 'clause-optional'
                  }
                >
                  <div className="flex items-center gap-2 mb-1">
                    {clause.content_type === 'locked' && (
                      <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                        <Lock className="h-3 w-3" /> Required template language
                      </Badge>
                    )}
                    {clause.required_level === 'conditional' && clause.content_type !== 'locked' && (
                      <Badge variant="outline" className="text-xs gap-1 border-info/30 text-info">
                        <Info className="h-3 w-3" /> {clause.inclusion_reason}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {replacePlaceholders(clause.clause_text, study)}
                  </div>
                </div>
              ))}
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
