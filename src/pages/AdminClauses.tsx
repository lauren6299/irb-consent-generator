import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CONSENT_SECTIONS } from '@/lib/types';
import { ArrowLeft, Plus, Pencil, Copy, EyeOff, Eye, Lock, PenLine, FileText, GitBranch } from 'lucide-react';

interface Clause {
  id: string;
  clause_key: string;
  section: string;
  subsection: string;
  clause_text: string;
  content_type: 'locked' | 'required_editable' | 'free_text' | 'conditional_pack' | 'structured_block';
  required_level: 'required' | 'conditional' | 'optional';
  trigger_expression: any;
  must_include: boolean;
  mutually_exclusive_group: string | null;
  editable_fields: any;
  sort_order: number;
  template_version: string;
  active: boolean;
}

const EMPTY_CLAUSE: Omit<Clause, 'id'> = {
  clause_key: '',
  section: CONSENT_SECTIONS[0],
  subsection: '',
  clause_text: '',
  content_type: 'locked',
  required_level: 'required',
  trigger_expression: {},
  must_include: true,
  mutually_exclusive_group: null,
  editable_fields: [],
  sort_order: 0,
  template_version: '1.0',
  active: true,
};

const CONTENT_TYPE_OPTIONS = [
  { value: 'locked', label: 'Locked' },
  { value: 'required_editable', label: 'Required Editable' },
  { value: 'free_text', label: 'Free Text' },
  { value: 'conditional_pack', label: 'Conditional Pack' },
  { value: 'structured_block', label: 'Structured Block' },
] as const;

const REQUIRED_LEVEL_OPTIONS = [
  { value: 'required', label: 'Required' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'optional', label: 'Optional' },
] as const;

const CONTENT_TYPE_META: Record<string, { icon: React.ElementType; className: string }> = {
  locked: { icon: Lock, className: 'text-primary' },
  required_editable: { icon: PenLine, className: 'text-amber-600' },
  free_text: { icon: FileText, className: 'text-emerald-600' },
  conditional_pack: { icon: GitBranch, className: 'text-blue-600' },
  structured_block: { icon: GitBranch, className: 'text-violet-600' },
};

export default function AdminClauses() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Clause | null>(null);
  const [form, setForm] = useState(EMPTY_CLAUSE);
  const [triggerText, setTriggerText] = useState('{}');
  const [editableFieldsText, setEditableFieldsText] = useState('[]');

  // Filters
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterSubsection, setFilterSubsection] = useState<string>('all');
  const [filterContentType, setFilterContentType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadClauses();
  }, [isAdmin]);

  async function loadClauses() {
    const { data } = await supabase.from('clauses').select('*').order('sort_order');
    setClauses((data as any) ?? []);
    setLoading(false);
  }

  // Unique subsections for filter
  const subsections = useMemo(
    () => [...new Set(clauses.map((c) => c.subsection).filter(Boolean))].sort(),
    [clauses]
  );

  const filtered = useMemo(() => {
    return clauses.filter((c) => {
      if (filterSection !== 'all' && c.section !== filterSection) return false;
      if (filterSubsection !== 'all' && c.subsection !== filterSubsection) return false;
      if (filterContentType !== 'all' && c.content_type !== filterContentType) return false;
      if (filterActive === 'active' && !c.active) return false;
      if (filterActive === 'inactive' && c.active) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !c.clause_key.toLowerCase().includes(q) &&
          !c.clause_text.toLowerCase().includes(q) &&
          !c.section.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [clauses, filterSection, filterSubsection, filterContentType, filterActive, searchQuery]);

  function openForm(clause?: Clause, duplicate = false) {
    if (clause && !duplicate) {
      setEditing(clause);
    } else {
      setEditing(null);
    }
    const source = clause ?? EMPTY_CLAUSE;
    setForm({
      clause_key: duplicate ? `${(clause as Clause).clause_key}_copy` : ('clause_key' in source ? source.clause_key : ''),
      section: source.section,
      subsection: source.subsection,
      clause_text: source.clause_text,
      content_type: source.content_type,
      required_level: source.required_level,
      trigger_expression: source.trigger_expression,
      must_include: source.must_include,
      mutually_exclusive_group: source.mutually_exclusive_group,
      editable_fields: source.editable_fields,
      sort_order: source.sort_order,
      template_version: source.template_version,
      active: source.active,
    });
    setTriggerText(JSON.stringify(source.trigger_expression ?? {}, null, 2));
    setEditableFieldsText(JSON.stringify(source.editable_fields ?? [], null, 2));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.clause_key.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Clause key is required.' });
      return;
    }
    let parsedTrigger = {};
    let parsedEditable: any = [];
    try { parsedTrigger = JSON.parse(triggerText); } catch {
      toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Fix trigger expression.' }); return;
    }
    try { parsedEditable = JSON.parse(editableFieldsText); } catch {
      toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Fix editable fields.' }); return;
    }

    const payload = { ...form, trigger_expression: parsedTrigger, editable_fields: parsedEditable };

    if (editing) {
      const { error } = await supabase.from('clauses').update(payload as any).eq('id', editing.id);
      if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
    } else {
      const { error } = await supabase.from('clauses').insert(payload as any);
      if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
    }
    setDialogOpen(false);
    loadClauses();
    toast({ title: 'Saved', description: `Clause "${form.clause_key}" saved.` });
  }

  async function toggleActive(clause: Clause) {
    await supabase.from('clauses').update({ active: !clause.active } as any).eq('id', clause.id);
    loadClauses();
    toast({ title: clause.active ? 'Deactivated' : 'Activated' });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="container flex h-14 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-heading text-lg font-semibold">Clause Library</h1>
          <Badge variant="secondary" className="text-xs">{filtered.length} clauses</Badge>
          <div className="ml-auto">
            <Button size="sm" onClick={() => openForm()}>
              <Plus className="h-4 w-4 mr-1" /> Add Clause
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b bg-card/50 shrink-0">
        <div className="container py-3 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search clauses…"
            className="w-56"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {CONSENT_SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSubsection} onValueChange={setFilterSubsection}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Subsection" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subsections</SelectItem>
              {subsections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterContentType} onValueChange={setFilterContentType}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Content Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTENT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="container py-4">
            {loading ? (
              <p className="text-muted-foreground py-12 text-center">Loading…</p>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No clauses match your filters.</CardContent></Card>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="w-12">Must</TableHead>
                      <TableHead className="w-12">Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((clause) => {
                      const meta = CONTENT_TYPE_META[clause.content_type] ?? CONTENT_TYPE_META.locked;
                      const Icon = meta.icon;
                      return (
                        <TableRow key={clause.id} className={!clause.active ? 'opacity-50' : ''}>
                          <TableCell className="text-xs text-muted-foreground">{clause.sort_order}</TableCell>
                          <TableCell>
                            <button
                              className="text-sm font-mono font-medium text-left hover:text-primary transition-colors"
                              onClick={() => openForm(clause)}
                            >
                              {clause.clause_key}
                            </button>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-xs">
                              {clause.clause_text.slice(0, 80)}…
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">{clause.section}</span>
                            {clause.subsection && (
                              <span className="text-xs text-muted-foreground block">{clause.subsection}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`}>
                              <Icon className="h-3 w-3" /> {clause.content_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={clause.required_level === 'required' ? 'default' : 'secondary'} className="text-[10px]">
                              {clause.required_level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {clause.must_include ? '✓' : '–'}
                          </TableCell>
                          <TableCell className="text-center">
                            <button onClick={() => toggleActive(clause)} className="hover:opacity-70 transition-opacity">
                              {clause.active ? (
                                <Eye className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(clause)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(clause, true)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Edit / Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Clause' : 'Add Clause'}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-4">
            {/* Form side */}
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Clause Key (unique)</Label>
                    <Input value={form.clause_key} onChange={(e) => setForm({ ...form, clause_key: e.target.value })} placeholder="e.g. intro_purpose" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Section</Label>
                    <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CONSENT_SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Content Type</Label>
                    <Select value={form.content_type} onValueChange={(v: any) => setForm({ ...form, content_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CONTENT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Required Level</Label>
                    <Select value={form.required_level} onValueChange={(v: any) => setForm({ ...form, required_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{REQUIRED_LEVEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subsection</Label>
                  <Input value={form.subsection} onChange={(e) => setForm({ ...form, subsection: e.target.value })} placeholder="Optional subsection" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Clause Text</Label>
                  <Textarea value={form.clause_text} onChange={(e) => setForm({ ...form, clause_text: e.target.value })} rows={6} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sort Order</Label>
                    <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Exclusion Group</Label>
                    <Input value={form.mutually_exclusive_group ?? ''} onChange={(e) => setForm({ ...form, mutually_exclusive_group: e.target.value || null })} placeholder="Optional" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Template Version</Label>
                    <Input value={form.template_version} onChange={(e) => setForm({ ...form, template_version: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trigger Expression (JSON)</Label>
                  <Textarea value={triggerText} onChange={(e) => setTriggerText(e.target.value)} rows={3} className="font-mono text-xs" placeholder='{"hipaa_required": true}' />
                  <p className="text-[10px] text-muted-foreground">Keys must match study answer fields. All conditions are ANDed.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Editable Fields (JSON)</Label>
                  <Textarea value={editableFieldsText} onChange={(e) => setEditableFieldsText(e.target.value)} rows={3} className="font-mono text-xs" placeholder='[{"field_key": "duration", "label": "Study Duration"}]' />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                    <Label className="text-xs">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.must_include} onCheckedChange={(v) => setForm({ ...form, must_include: v })} />
                    <Label className="text-xs">Must Include</Label>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Preview side */}
            <div className="w-72 shrink-0 border-l pl-4 flex flex-col">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
              <ScrollArea className="flex-1">
                <ClausePreviewCard form={form} />
              </ScrollArea>
            </div>
          </div>

          <Separator />
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave}>Save Clause</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Live preview of the clause as it would render in the consent form */
function ClausePreviewCard({ form }: { form: Omit<Clause, 'id'> }) {
  const meta = CONTENT_TYPE_META[form.content_type] ?? CONTENT_TYPE_META.locked;
  const Icon = meta.icon;

  const LABEL_MAP: Record<string, string> = {
    locked: 'Verbatim Stanford language',
    required_editable: 'Required editable language',
    free_text: 'Study-specific text',
    conditional_pack: 'Conditionally included',
    structured_block: 'Conditionally included',
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">{form.section}</div>
      {form.subsection && <div className="text-[10px] text-muted-foreground">{form.subsection}</div>}
      <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`}>
        <Icon className="h-3 w-3" /> {LABEL_MAP[form.content_type] ?? form.content_type}
      </Badge>
      <div
        className={`text-xs leading-relaxed whitespace-pre-wrap rounded-md p-3 border ${
          form.content_type === 'locked'
            ? 'bg-primary/5 border-primary/20'
            : form.content_type === 'free_text'
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
            : 'bg-muted/50 border-muted'
        }`}
      >
        {form.clause_text || <span className="italic text-muted-foreground">No text entered yet…</span>}
      </div>
      {form.must_include && (
        <p className="text-[10px] text-muted-foreground">⚑ Always included</p>
      )}
      {form.mutually_exclusive_group && (
        <p className="text-[10px] text-muted-foreground">⊘ Exclusive group: {form.mutually_exclusive_group}</p>
      )}
    </div>
  );
}
