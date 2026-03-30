import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import StudySetupForm from '@/components/StudySetupForm';
import StudyCharacteristicsForm from '@/components/StudyCharacteristicsForm';
import ConsentPreview, { ClauseEdits } from '@/components/ConsentPreview';
import { StudyAnswers, DEFAULT_STUDY_ANSWERS, CONSENT_SECTIONS } from '@/lib/types';
import { assembleConsentForm, getMissingRequiredFields } from '@/lib/rules-engine';
import { generateConsentDocx } from '@/lib/docx-export';
import { ArrowLeft, Save, Download, AlertTriangle } from 'lucide-react';

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

const DEFAULT_STUDY_INFO: StudyInfo = {
  title: '',
  short_title: '',
  pi_name: '',
  protocol_number: '',
  sponsor: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
};

type Tab = 'setup' | 'characteristics';

export default function StudyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isNew = id === 'new';

  const [studyId, setStudyId] = useState<string | null>(isNew ? null : id ?? null);
  const [study, setStudy] = useState<StudyInfo>(DEFAULT_STUDY_INFO);
  const [answers, setAnswers] = useState<StudyAnswers>(DEFAULT_STUDY_ANSWERS);
  const [clauseEdits, setClauseEdits] = useState<ClauseEdits>({});
  const [clauses, setClauses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('setup');
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(CONSENT_SECTIONS[0]);

  // Load clauses
  useEffect(() => {
    supabase.from('clauses').select('*').eq('active', true).order('sort_order').then(({ data }) => {
      setClauses(data ?? []);
    });
  }, []);

  // Load existing study
  useEffect(() => {
    if (isNew || !studyId) return;
    supabase.from('studies').select('*').eq('id', studyId).single().then(({ data }) => {
      if (data) {
        setStudy({
          title: data.title,
          short_title: data.short_title ?? '',
          pi_name: data.pi_name ?? '',
          protocol_number: data.protocol_number ?? '',
          sponsor: data.sponsor ?? '',
          contact_name: data.contact_name ?? '',
          contact_phone: data.contact_phone ?? '',
          contact_email: data.contact_email ?? '',
        });
      }
    });
    supabase.from('study_answers').select('*').eq('study_id', studyId).single().then(({ data }) => {
      if (data?.answer_data) {
        const stored = data.answer_data as Record<string, unknown>;
        // Separate clause_edits from answers
        if (stored.clause_edits && typeof stored.clause_edits === 'object') {
          setClauseEdits(stored.clause_edits as ClauseEdits);
        }
        const { clause_edits: _, ...rest } = stored;
        setAnswers({ ...DEFAULT_STUDY_ANSWERS, ...rest } as StudyAnswers);
      }
    });
  }, [studyId, isNew]);

  const assembled = useMemo(() => assembleConsentForm(clauses, answers), [clauses, answers]);
  const missingFields = useMemo(() => getMissingRequiredFields(answers), [answers]);

  const handleClauseEdits = useCallback((newEdits: ClauseEdits) => {
    setClauseEdits(newEdits);
  }, []);

  async function handleSave() {
    if (!user || !study.title.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Study title is required.' });
      return;
    }
    setSaving(true);
    try {
      // Merge clause_edits into answer_data for persistence
      const answerPayload = { ...answers, clause_edits: clauseEdits } as any;

      if (studyId) {
        await supabase.from('studies').update({
          title: study.title,
          short_title: study.short_title,
          pi_name: study.pi_name,
          protocol_number: study.protocol_number,
          sponsor: study.sponsor,
          contact_name: study.contact_name,
          contact_phone: study.contact_phone,
          contact_email: study.contact_email,
        }).eq('id', studyId);

        await supabase.from('study_answers').upsert({
          study_id: studyId,
          answer_data: answerPayload,
        }, { onConflict: 'study_id' });
      } else {
        const { data: newStudy } = await supabase.from('studies').insert({
          user_id: user.id,
          title: study.title,
          short_title: study.short_title,
          pi_name: study.pi_name,
          protocol_number: study.protocol_number,
          sponsor: study.sponsor,
          contact_name: study.contact_name,
          contact_phone: study.contact_phone,
          contact_email: study.contact_email,
        }).select().single();

        if (newStudy) {
          setStudyId(newStudy.id);
          await supabase.from('study_answers').insert({
            study_id: newStudy.id,
            answer_data: answerPayload,
          });
          navigate(`/study/${newStudy.id}`, { replace: true });
        }
      }
      toast({ title: 'Saved', description: 'Study saved successfully.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save.' });
    }
    setSaving(false);
  }

  async function handleExport() {
    if (missingFields.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: missingFields.join('. '),
      });
      return;
    }
    try {
      const { fileName } = await generateConsentDocx(study, assembled);
      if (studyId) {
        await supabase.from('generated_documents').insert({
          study_id: studyId,
          file_name: fileName,
          document_json: { study, answers } as any,
          included_clauses: assembled.map((c) => ({ id: c.id, key: c.clause_key, reason: c.inclusion_reason })) as any,
        });
      }
      toast({ title: 'Exported', description: `Downloaded ${fileName}` });
    } catch {
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not generate document.' });
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-heading text-base font-semibold truncate max-w-xs">
              {study.title || 'New Consent Form'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {missingFields.length > 0 && (
              <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                <AlertTriangle className="h-3 w-3" />
                {missingFields.length} missing
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export .docx
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-[420px] border-r flex flex-col shrink-0">
          <div className="flex border-b">
            <button
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'setup'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('setup')}
            >
              Study Setup
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'characteristics'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('characteristics')}
            >
              Characteristics
            </button>
          </div>
          <ScrollArea className="flex-1 p-4">
            {activeTab === 'setup' ? (
              <StudySetupForm study={study} onChange={setStudy} />
            ) : (
              <StudyCharacteristicsForm answers={answers} onChange={setAnswers} />
            )}
          </ScrollArea>
        </div>

        {/* Section nav */}
        <div className="w-48 border-r bg-muted/30 shrink-0 hidden lg:block">
          <ScrollArea className="h-full">
            <div className="py-3">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sections</p>
              {CONSENT_SECTIONS.map((section) => {
                const count = assembled.filter((c) => c.section === section).length;
                return (
                  <button
                    key={section}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                      activeSection === section
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => {
                      setActiveSection(section);
                      document.getElementById(`section-${section.replace(/\s+/g, '-').toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span className="truncate">{section}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 min-w-4 justify-center">{count}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right panel - preview */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-2xl mx-auto p-6">
              <ConsentPreview
                clauses={assembled}
                study={study}
                edits={clauseEdits}
                onEditChange={handleClauseEdits}
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
