import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

interface Props {
  study: StudyInfo;
  onChange: (study: StudyInfo) => void;
}

export default function StudySetupForm({ study, onChange }: Props) {
  const update = (field: keyof StudyInfo, value: string) => {
    onChange({ ...study, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-semibold">Study Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Study Title *</Label>
          <Input id="title" value={study.title} onChange={(e) => update('title', e.target.value)} placeholder="Full study title" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="short_title">Short Title</Label>
          <Input id="short_title" value={study.short_title} onChange={(e) => update('short_title', e.target.value)} placeholder="Abbreviated title" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pi_name">Protocol Director / Principal Investigator *</Label>
          <Input id="pi_name" value={study.pi_name} onChange={(e) => update('pi_name', e.target.value)} placeholder="PI full name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pi_phone">Protocol Director Phone</Label>
          <Input id="pi_phone" value={study.pi_phone} onChange={(e) => update('pi_phone', e.target.value)} placeholder="(555) 123-4567" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pi_address">Protocol Director Address</Label>
          <Input id="pi_address" value={study.pi_address} onChange={(e) => update('pi_address', e.target.value)} placeholder="Department, Building, Stanford, CA 94305" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="protocol_number">Protocol Number</Label>
          <Input id="protocol_number" value={study.protocol_number} onChange={(e) => update('protocol_number', e.target.value)} placeholder="IRB protocol #" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sponsor">Sponsor / Funding Source</Label>
          <Input id="sponsor" value={study.sponsor} onChange={(e) => update('sponsor', e.target.value)} placeholder="Sponsor name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_name">Study Contact Name</Label>
          <Input id="contact_name" value={study.contact_name} onChange={(e) => update('contact_name', e.target.value)} placeholder="Contact person" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input id="contact_phone" value={study.contact_phone} onChange={(e) => update('contact_phone', e.target.value)} placeholder="(555) 123-4567" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input id="contact_email" type="email" value={study.contact_email} onChange={(e) => update('contact_email', e.target.value)} placeholder="contact@stanford.edu" />
        </div>
      </div>
    </div>
  );
}
