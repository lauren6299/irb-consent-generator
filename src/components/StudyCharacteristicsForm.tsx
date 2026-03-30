import { StudyAnswers } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Props {
  answers: StudyAnswers;
  onChange: (answers: StudyAnswers) => void;
}

export default function StudyCharacteristicsForm({ answers, onChange }: Props) {
  const toggle = (key: keyof StudyAnswers) => {
    onChange({ ...answers, [key]: !answers[key] });
  };

  const set = (key: keyof StudyAnswers, value: string) => {
    onChange({ ...answers, [key]: value });
  };

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-lg font-semibold">Study Characteristics</h3>

      {/* Population */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Population</legend>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['population_adults', 'Adults'],
            ['population_children', 'Children'],
            ['population_healthy', 'Healthy Volunteers'],
            ['population_disease', 'Disease Population'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={answers[key] as boolean}
                onCheckedChange={() => toggle(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Procedures */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Procedures</legend>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['procedure_blood_draw', 'Blood Draw'],
            ['procedure_genetic_testing', 'Genetic Testing'],
            ['procedure_imaging', 'Imaging'],
            ['procedure_surveys_only', 'Surveys Only'],
            ['procedure_recording', 'Audio/Video Recording'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={answers[key] as boolean}
                onCheckedChange={() => toggle(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

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
      <div className="space-y-2">
        <Label>Study Design</Label>
        <Select value={answers.study_design} onValueChange={(v) => set('study_design', v)}>
          <SelectTrigger><SelectValue placeholder="Select study design" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="single_visit">Single Visit</SelectItem>
            <SelectItem value="multiple_visits">Multiple Visits</SelectItem>
            <SelectItem value="optional_second_visit">Optional Second Visit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Specimens */}
      <div className="space-y-2">
        <Label>Specimens</Label>
        <Select value={answers.specimens} onValueChange={(v) => set('specimens', v)}>
          <SelectTrigger><SelectValue placeholder="Select specimen handling" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="no_storage">No Storage</SelectItem>
            <SelectItem value="stored_this_study">Stored for This Study Only</SelectItem>
            <SelectItem value="stored_future_research">Stored for Future Research</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compensation */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Compensation</legend>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['compensation_none', 'None'],
            ['compensation_gift_card', 'Gift Card'],
            ['compensation_cash', 'Cash'],
            ['compensation_per_visit', 'Per Visit Payments'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={answers[key] as boolean}
                onCheckedChange={() => toggle(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Regulatory */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Regulatory</legend>
        <div className="space-y-3">
          {([
            ['hipaa_required', 'HIPAA Authorization Required'],
            ['return_of_results', 'Return of Results'],
            ['vulnerable_populations', 'Vulnerable Populations'],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="text-sm">{label}</Label>
              <Switch
                id={key}
                checked={answers[key] as boolean}
                onCheckedChange={() => toggle(key)}
              />
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
