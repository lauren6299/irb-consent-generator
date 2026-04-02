import { StudyAnswers } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

interface Props {
  answers: StudyAnswers;
  onChange: (answers: StudyAnswers) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

function BoolGrid({ items, answers, onChange }: { items: [keyof StudyAnswers, string][]; answers: StudyAnswers; onChange: Props['onChange'] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={answers[key] as boolean} onCheckedChange={() => onChange({ ...answers, [key]: !answers[key] })} />
          {label}
        </label>
      ))}
    </div>
  );
}

function ToggleRow({ items, answers, onChange }: { items: [keyof StudyAnswers, string][]; answers: StudyAnswers; onChange: Props['onChange'] }) {
  return (
    <div className="space-y-3">
      {items.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={key} className="text-sm">{label}</Label>
          <Switch id={key} checked={answers[key] as boolean} onCheckedChange={() => onChange({ ...answers, [key]: !answers[key] })} />
        </div>
      ))}
    </div>
  );
}

export default function StudyCharacteristicsForm({ answers, onChange }: Props) {
  const set = (key: keyof StudyAnswers, value: string) => onChange({ ...answers, [key]: value });

  const toggleVisit = (key: 'has_single_visit' | 'has_multiple_required_visits' | 'has_optional_followup_visits') => {
    const updated = { ...answers, [key]: !answers[key] };
    updated.has_study_visits = updated.has_single_visit || updated.has_multiple_required_visits || updated.has_optional_followup_visits;
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-lg font-semibold">Study Characteristics</h3>

      {/* Population */}
      <Section title="Population">
        <BoolGrid answers={answers} onChange={onChange} items={[
          ['population_adults', 'Adults'],
          ['population_children', 'Children'],
          ['population_healthy', 'Healthy Volunteers'],
          ['population_disease', 'Disease Population'],
          ['includes_adults', 'Includes Adults (trigger)'],
          ['includes_children', 'Includes Children (trigger)'],
        ]} />
      </Section>

      {/* Procedures */}
      <Section title="Procedures">
        <BoolGrid answers={answers} onChange={onChange} items={[
          ['procedure_blood_draw', 'Blood Draw'],
          ['procedure_genetic_testing', 'Genetic Testing'],
          ['procedure_imaging', 'Imaging'],
          ['procedure_surveys_only', 'Surveys Only'],
          ['procedure_recording', 'Audio/Video Recording'],
        ]} />
      </Section>

      {/* Data Type */}
      <div className="space-y-2">
        <Label>Data Type</Label>
        <Select value={answers.data_type} onValueChange={(v) => set('data_type', v)}>
          <SelectTrigger><SelectValue placeholder="Select data type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="identifiable">Identifiable</SelectItem>
            <SelectItem value="coded">Coded</SelectItem>
            <SelectItem value="anonymous">Anonymous</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Study Design */}
      <Section title="Study Design">
        <div className="space-y-3">
          {([
            ['has_single_visit', 'Single required visit'],
            ['has_multiple_required_visits', 'Multiple required visits'],
            ['has_optional_followup_visits', 'Optional follow-up visit(s)'],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="text-sm">{label}</Label>
              <Switch id={key} checked={answers[key] as boolean} onCheckedChange={() => toggleVisit(key)} />
            </div>
          ))}
          <ToggleRow answers={answers} onChange={onChange} items={[
            ['interventional_study', 'Interventional Study'],
          ]} />
          {(answers.has_multiple_required_visits || answers.has_optional_followup_visits) && (
            <div className="space-y-1">
              <Label htmlFor="required_visit_schedule_text" className="text-sm">Required visit schedule</Label>
              <Textarea
                id="required_visit_schedule_text"
                className="text-sm min-h-[60px] bg-background"
                placeholder="e.g. 3 visits over 6 months, each lasting about 1 hour"
                value={answers.required_visit_schedule_text || ''}
                onChange={(e) => onChange({ ...answers, required_visit_schedule_text: e.target.value })}
              />
            </div>
          )}
          {answers.has_optional_followup_visits && (
            <div className="space-y-1">
              <Label htmlFor="optional_followup_text" className="text-sm">Optional follow-up details</Label>
              <Textarea
                id="optional_followup_text"
                className="text-sm min-h-[60px] bg-background"
                placeholder="e.g. You may be invited back for 1 optional follow-up visit lasting 30 minutes"
                value={answers.optional_followup_text || ''}
                onChange={(e) => onChange({ ...answers, optional_followup_text: e.target.value })}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Specimens */}
      <Section title="Specimens">
        <div className="space-y-3">
          <Select
            value={answers.specimen_storage_mode}
            onValueChange={(v) => {
              const mode = v as StudyAnswers['specimen_storage_mode'];
              const collectsSpecimens = mode !== 'no_specimens' && mode !== '';
              const futureResearch = mode === 'stored_for_future_research';
              onChange({
                ...answers,
                specimen_storage_mode: mode,
                collects_specimens: collectsSpecimens,
                future_research_use_allowed: futureResearch,
                // Reset secondary fields when no specimens
                specimens_unlinked: collectsSpecimens ? answers.specimens_unlinked : false,
                specimens_sent_outside_stanford: collectsSpecimens ? answers.specimens_sent_outside_stanford : false,
                commercial_value_possible: collectsSpecimens ? answers.commercial_value_possible : false,
              });
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select specimen handling" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no_specimens">No specimens collected</SelectItem>
              <SelectItem value="stored_for_this_study_only">Specimens stored for this study only</SelectItem>
              <SelectItem value="stored_for_future_research">Specimens stored for future research</SelectItem>
            </SelectContent>
          </Select>

          {/* Derived status indicators */}
          {answers.specimen_storage_mode && answers.specimen_storage_mode !== 'no_specimens' && (
            <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
              <p>• Collects specimens: <span className="font-medium text-foreground">Yes</span></p>
              <p>• Future research use: <span className="font-medium text-foreground">{answers.future_research_use_allowed ? 'Yes' : 'No'}</span></p>
            </div>
          )}

          {/* Secondary options – only when specimens are collected */}
          {answers.collects_specimens && (
            <div className="space-y-3 pl-2 border-l-2 border-primary/20">
              <ToggleRow answers={answers} onChange={onChange} items={[
                ['specimens_unlinked', 'Specimens Unlinked'],
                ['specimens_sent_outside_stanford', 'Sent Outside Stanford'],
                ['commercial_value_possible', 'Commercial Value Possible'],
              ]} />
            </div>
          )}
        </div>
      </Section>

      <Separator />

      {/* Genetics */}
      <Section title="Genetics">
        <ToggleRow answers={answers} onChange={(a) => {
          if (a.includes_genetics_section === false) {
            onChange({ ...a, includes_genetics_section: false, includes_genetic_testing: false, whole_genome_sequencing_choice: false, return_results_policy: '', deposits_genetic_data_in_nih_repository: false });
          } else {
            onChange(a);
          }
        }} items={[
          ['includes_genetics_section', 'Includes Genetics Section'],
        ]} />
        {answers.includes_genetics_section && (
          <div className="space-y-3 pl-2 border-l-2 border-primary/20 mt-3">
            <ToggleRow answers={answers} onChange={onChange} items={[
              ['includes_genetic_testing', 'Includes Genetic Testing'],
              ['whole_genome_sequencing_choice', 'Whole Genome Sequencing Choice'],
              ['deposits_genetic_data_in_nih_repository', 'Deposits Genetic Data in NIH Repository'],
            ]} />
            <div className="space-y-2">
              <Label>Return of Results Policy</Label>
              <Select value={answers.return_results_policy} onValueChange={(v) => set('return_results_policy', v)}>
                <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Results Returned</SelectItem>
                  <SelectItem value="clinical_only">Clinical Results Only</SelectItem>
                  <SelectItem value="choice_or_recontact">Choice / Re-contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Section>

      {/* MRI */}
      <Section title="MRI">
        <ToggleRow answers={answers} onChange={(a) => {
          if (a.includes_mri === false) {
            onChange({ ...a, includes_mri: false, mri_non_fda_components: false, mri_research_only: false, mri_uses_contrast: false, mri_field_strength_gte_3t: false });
          } else {
            onChange(a);
          }
        }} items={[
          ['includes_mri', 'Includes MRI'],
        ]} />
        {answers.includes_mri && (
          <div className="space-y-3 pl-2 border-l-2 border-primary/20 mt-3">
            <ToggleRow answers={answers} onChange={onChange} items={[
              ['mri_non_fda_components', 'Non-FDA Components'],
              ['mri_research_only', 'Research Only Scans'],
              ['mri_uses_contrast', 'Uses Contrast'],
              ['mri_field_strength_gte_3t', 'Field Strength ≥ 3T'],
            ]} />
          </div>
        )}
      </Section>

      {/* Pregnancy */}
      <Section title="Pregnancy">
        <ToggleRow answers={answers} onChange={(a) => {
          if (a.includes_pregnancy_section === false) {
            onChange({ ...a, includes_pregnancy_section: false, childbearing_potential_risk_language_needed: false, partner_pregnancy_risk_language_needed: false, minor_pregnancy_testing: false });
          } else {
            onChange(a);
          }
        }} items={[
          ['includes_pregnancy_section', 'Includes Pregnancy Section'],
        ]} />
        {answers.includes_pregnancy_section && (
          <div className="space-y-3 pl-2 border-l-2 border-primary/20 mt-3">
            <ToggleRow answers={answers} onChange={onChange} items={[
              ['childbearing_potential_risk_language_needed', 'Childbearing Potential Risk Language'],
              ['partner_pregnancy_risk_language_needed', 'Partner Pregnancy Risk Language'],
              ['minor_pregnancy_testing', 'Minor Pregnancy Testing'],
            ]} />
          </div>
        )}
      </Section>

      {/* Communicable Disease */}
      <Section title="Communicable Disease">
        <ToggleRow answers={answers} onChange={(a) => {
          if (a.includes_communicable_disease_section === false) {
            onChange({ ...a, includes_communicable_disease_section: false, tests_reportable_communicable_disease: false, tests_hiv: false });
          } else {
            onChange(a);
          }
        }} items={[
          ['includes_communicable_disease_section', 'Includes Communicable Disease Section'],
        ]} />
        {answers.includes_communicable_disease_section && (
          <div className="space-y-3 pl-2 border-l-2 border-primary/20 mt-3">
            <ToggleRow answers={answers} onChange={onChange} items={[
              ['tests_reportable_communicable_disease', 'Tests Reportable Disease'],
              ['tests_hiv', 'Tests HIV'],
            ]} />
          </div>
        )}
      </Section>

      {/* Gene Transfer */}
      <Section title="Gene Transfer">
        <ToggleRow answers={answers} onChange={(a) => {
          if (a.gene_transfer_study === false) {
            onChange({ ...a, gene_transfer_study: false, autopsy_may_be_requested: false, prior_recipients_n: '', long_term_followup_duration: '' });
          } else {
            onChange(a);
          }
        }} items={[
          ['gene_transfer_study', 'Gene Transfer Study'],
        ]} />
        {answers.gene_transfer_study && (
          <div className="space-y-3 pl-2 border-l-2 border-primary/20 mt-3">
            <ToggleRow answers={answers} onChange={onChange} items={[
              ['autopsy_may_be_requested', 'Autopsy May Be Requested'],
            ]} />
            <div className="space-y-1">
              <Label htmlFor="prior_recipients_n" className="text-sm">Prior Recipients (N)</Label>
              <Input
                id="prior_recipients_n"
                className="text-sm bg-background"
                placeholder="e.g. 50"
                value={answers.prior_recipients_n || ''}
                onChange={(e) => onChange({ ...answers, prior_recipients_n: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="long_term_followup_duration" className="text-sm">Long-term Follow-up Duration</Label>
              <Input
                id="long_term_followup_duration"
                className="text-sm bg-background"
                placeholder="e.g. 15 years"
                value={answers.long_term_followup_duration || ''}
                onChange={(e) => onChange({ ...answers, long_term_followup_duration: e.target.value })}
              />
            </div>
          </div>
        )}
      </Section>

      <Separator />

      {/* Compensation */}
      <Section title="Compensation">
        <BoolGrid answers={answers} onChange={onChange} items={[
          ['compensation_none', 'None'],
          ['compensation_gift_card', 'Gift Card'],
          ['compensation_cash', 'Cash'],
          ['compensation_per_visit', 'Per Visit Payments'],
        ]} />
      </Section>

      {/* Financial */}
      <Section title="Financial">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['participants_paid', 'Participants Paid'],
          ['participants_reimbursed', 'Participants Reimbursed'],
          ['payment_requires_ssn', 'Payment Requires SSN'],
        ]} />
      </Section>

      {/* Sponsor / COI */}
      <Section title="Sponsor & COI">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['has_sponsor_or_material_support', 'Has Sponsor or Material Support'],
          ['has_investigator_financial_relationships', 'Investigator Financial Relationships'],
        ]} />
      </Section>

      <Separator />

      {/* Regulatory */}
      <Section title="Regulatory">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['include_hipaa_authorization', 'Include HIPAA Authorization Page'],
          ['include_sensitive_information_authorization', 'Include Sensitive Information Consent Block'],
          ['return_of_results', 'Return of Results'],
          ['vulnerable_populations', 'Vulnerable Populations'],
          ['federally_supported', 'Federally Supported'],
          ['fda_regulated', 'FDA Regulated'],
        ]} />
      </Section>

      {/* Consent Process */}
      <Section title="Consent Process">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['uses_legally_authorized_representative', 'Uses Legally Authorized Representative'],
          ['needs_witness_or_short_form_process', 'Needs Witness / Short Form'],
        ]} />
      </Section>

      {/* Site Config / Participant ID Footer */}
      <Section title="Site Config / Participant ID">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['site_requires_participant_id_on_each_page', 'Participant ID on Each Page (SHC/SMCH)'],
        ]} />
        {answers.site_requires_participant_id_on_each_page && (
          <div className="space-y-3 mt-3 pl-2 border-l-2 border-primary/20">
            <div className="space-y-1">
              <Label htmlFor="participant_id_value" className="text-sm">Participant ID Value</Label>
              <Input
                id="participant_id_value"
                className="text-sm bg-background"
                placeholder="Name, initials, MRN, or study number (leave blank to fill in Word)"
                value={answers.participant_id_value || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ ...answers, participant_id_value: val });
                }}
              />
              {answers.participant_id_value && /^\d{3}-?\d{2}-?\d{4}$/.test(answers.participant_id_value.replace(/\s/g, '')) && (
                <p className="text-xs text-destructive font-medium">⚠ Participant ID must not use a social security number</p>
              )}
              <p className="text-xs text-muted-foreground">Allowed: name, initials, MRN, study number. Not allowed: signature, SSN.</p>
            </div>
            <ToggleRow answers={answers} onChange={onChange} items={[
              ['use_alternate_page_identification_method', 'Use Alternate ID Method (e.g. chart label)'],
            ]} />
            {answers.use_alternate_page_identification_method && (
              <ToggleRow answers={answers} onChange={onChange} items={[
                ['keep_blank_box_for_label_cover', 'Keep Blank Box for Label Cover'],
              ]} />
            )}
          </div>
        )}
      </Section>

      {/* Contacts */}
      <Section title="Contacts">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['include_appointment_contact', 'Include Appointment Contact'],
          ['future_contact_permission_requested', 'Future Contact Permission'],
        ]} />
      </Section>

      {/* Concise Summary */}
      <Section title="Concise Summary">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="include_summary" className="text-sm">Include Concise Summary</Label>
            <Switch
              id="include_summary"
              checked={answers.federally_supported ? true : answers.include_summary}
              disabled={answers.federally_supported}
              onCheckedChange={() => onChange({ ...answers, include_summary: !answers.include_summary })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Concise Summary is required for federally supported studies and recommended for all studies.
          </p>
        </div>
      </Section>

      {/* Optional Inclusion Controls */}
      <Section title="Optional Inclusion Controls">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['include_failure_follow_instructions_reason', 'Include Failure to Follow Instructions'],
          ['include_unanticipated_circumstances_reason', 'Include Unanticipated Circumstances'],
          ['use_no_participation_alternative', 'Include No-Participation Alternative'],
        ]} />
      </Section>
    </div>
  );
}
