import { StudyAnswers } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
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
          {(answers.has_single_visit || answers.has_multiple_required_visits) && (
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
          <Select value={answers.specimens} onValueChange={(v) => set('specimens', v)}>
            <SelectTrigger><SelectValue placeholder="Select specimen handling" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no_storage">No Storage</SelectItem>
              <SelectItem value="stored_this_study">Stored for This Study Only</SelectItem>
              <SelectItem value="stored_future_research">Stored for Future Research</SelectItem>
            </SelectContent>
          </Select>
          <ToggleRow answers={answers} onChange={onChange} items={[
            ['collects_specimens', 'Collects Specimens'],
            ['specimens_unlinked', 'Specimens Unlinked'],
            ['specimens_sent_outside_stanford', 'Sent Outside Stanford'],
          ]} />
        </div>
      </Section>

      {/* Future Use */}
      <Section title="Future Use">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['future_research_use_allowed', 'Future Research Use Allowed'],
          ['commercial_value_possible', 'Commercial Value Possible'],
        ]} />
      </Section>

      <Separator />

      {/* Genetics */}
      <Section title="Genetics">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['includes_genetic_testing', 'Includes Genetic Testing'],
        ]} />
        <div className="space-y-2 mt-3">
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
      </Section>

      {/* MRI */}
      <Section title="MRI">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['includes_mri', 'Includes MRI'],
          ['mri_non_fda_components', 'Non-FDA Components'],
          ['mri_research_only', 'Research Only Scans'],
          ['mri_uses_contrast', 'Uses Contrast'],
          ['mri_field_strength_gte_3t', 'Field Strength ≥ 3T'],
        ]} />
      </Section>

      {/* Pregnancy */}
      <Section title="Pregnancy">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['childbearing_potential_risk_language_needed', 'Childbearing Potential Risk Language'],
          ['partner_pregnancy_risk_language_needed', 'Partner Pregnancy Risk Language'],
          ['minor_pregnancy_testing', 'Minor Pregnancy Testing'],
        ]} />
      </Section>

      {/* Communicable Disease */}
      <Section title="Communicable Disease">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['tests_reportable_communicable_disease', 'Tests Reportable Disease'],
          ['tests_hiv', 'Tests HIV'],
        ]} />
      </Section>

      {/* Gene Transfer */}
      <Section title="Gene Transfer">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['gene_transfer_study', 'Gene Transfer Study'],
          ['autopsy_may_be_requested', 'Autopsy May Be Requested'],
        ]} />
      </Section>

      {/* NIH */}
      <Section title="NIH">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['deposits_genetic_data_in_nih_repository', 'Deposits Genetic Data in NIH Repository'],
        ]} />
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
          ['hipaa_required', 'HIPAA Authorization Required'],
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

      {/* Site Config */}
      <Section title="Site Config">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['site_requires_participant_id_on_each_page', 'Participant ID on Each Page'],
        ]} />
      </Section>

      {/* Contacts */}
      <Section title="Contacts">
        <ToggleRow answers={answers} onChange={onChange} items={[
          ['include_appointment_contact', 'Include Appointment Contact'],
          ['future_contact_permission_requested', 'Future Contact Permission'],
        ]} />
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
