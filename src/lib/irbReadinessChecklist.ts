export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

export const IRB_READINESS_CHECKLIST: ChecklistSection[] = [
  {
    title: 'Study Identity and Framing',
    items: [
      { id: 'sif-1', label: 'Study title is accurate and matches the protocol' },
      { id: 'sif-2', label: 'Short title is provided for headers and footers' },
      { id: 'sif-3', label: 'Protocol number is included' },
      { id: 'sif-4', label: 'Sponsor name is listed' },
      { id: 'sif-5', label: 'IRB number is included if available' },
      { id: 'sif-6', label: 'Template version is current' },
    ],
  },
  {
    title: 'Study Overview',
    items: [
      { id: 'so-1', label: 'Purpose of the study is clearly stated' },
      { id: 'so-2', label: 'Expected enrollment number is provided' },
      { id: 'so-3', label: 'Concise summary is included for federally supported studies' },
      { id: 'so-4', label: 'Study duration is described' },
    ],
  },
  {
    title: 'Study Design',
    items: [
      { id: 'sd-1', label: 'Randomization is described if applicable' },
      { id: 'sd-2', label: 'Placebo use is disclosed if applicable' },
      { id: 'sd-3', label: 'Drug or device status is stated' },
      { id: 'sd-4', label: 'Procedures are listed completely' },
    ],
  },
  {
    title: 'Participant Experience and Safety',
    items: [
      { id: 'pes-1', label: 'Risks and discomforts are described' },
      { id: 'pes-2', label: 'Benefits to participant and others are stated' },
      { id: 'pes-3', label: 'Alternatives to participation are listed' },
      { id: 'pes-4', label: 'Injury and treatment provisions are included' },
      { id: 'pes-5', label: 'Voluntary participation statement is present' },
    ],
  },
  {
    title: 'Specimens, Data, and Future Use',
    items: [
      { id: 'sdfu-1', label: 'Specimen collection is described if applicable' },
      { id: 'sdfu-2', label: 'Future research use of specimens is addressed' },
      { id: 'sdfu-3', label: 'Data storage and retention details are included' },
      { id: 'sdfu-4', label: 'De-identification or unlinking procedures are described' },
    ],
  },
  {
    title: 'Special Conditions',
    items: [
      { id: 'sc-1', label: 'Pregnancy-related risks are disclosed if relevant' },
      { id: 'sc-2', label: 'Genetic testing implications are addressed if applicable' },
      { id: 'sc-3', label: 'Incidental findings policy is stated' },
      { id: 'sc-4', label: 'Certificate of Confidentiality is referenced if applicable' },
    ],
  },
  {
    title: 'Responsibilities and Withdrawal',
    items: [
      { id: 'rw-1', label: 'Participant responsibilities are outlined' },
      { id: 'rw-2', label: 'Withdrawal procedures are explained' },
      { id: 'rw-3', label: 'Consequences of withdrawal are described' },
      { id: 'rw-4', label: 'Investigator termination rights are stated' },
    ],
  },
  {
    title: 'Privacy and Compliance',
    items: [
      { id: 'pc-1', label: 'Confidentiality protections are described' },
      { id: 'pc-2', label: 'Parties with access to records are listed' },
      { id: 'pc-3', label: 'Sensitive information authorization is included if needed' },
    ],
  },
  {
    title: 'HIPAA',
    items: [
      { id: 'hipaa-1', label: 'HIPAA authorization section is included if applicable' },
      { id: 'hipaa-2', label: 'Types of protected health information are listed' },
      { id: 'hipaa-3', label: 'Recipients of PHI are identified' },
      { id: 'hipaa-4', label: 'Authorization expiration is stated' },
    ],
  },
  {
    title: 'Financial and Sponsor',
    items: [
      { id: 'fs-1', label: 'Payment or compensation details are provided' },
      { id: 'fs-2', label: 'Costs to participant are disclosed' },
      { id: 'fs-3', label: 'Funding source is identified' },
      { id: 'fs-4', label: 'Conflict of interest disclosures are included if required' },
    ],
  },
  {
    title: 'Signatures',
    items: [
      { id: 'sig-1', label: 'Participant signature line is present' },
      { id: 'sig-2', label: 'Legally authorized representative line is included if needed' },
      { id: 'sig-3', label: 'Investigator or designee signature line is present' },
      { id: 'sig-4', label: 'Date fields accompany all signature lines' },
    ],
  },
  {
    title: 'Final Quality Check',
    items: [
      { id: 'fqc-1', label: 'Contact information for questions is complete' },
      { id: 'fqc-2', label: 'Contact information for rights and concerns is provided' },
      { id: 'fqc-3', label: 'Language is appropriate for the target population' },
      { id: 'fqc-4', label: 'No placeholder text or incomplete sections remain' },
      { id: 'fqc-5', label: 'Document has been reviewed for spelling and grammar' },
    ],
  },
];
