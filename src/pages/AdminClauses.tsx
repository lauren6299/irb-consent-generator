import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { CONSENT_SECTIONS } from '@/lib/types';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';

interface Clause {
  id: string;
  clause_key: string;
  section: string;
  subsection: string;
  clause_text: string;
  content_type: 'locked' | 'required_editable' | 'free_text' | 'conditional_pack';
  required_level: 'required' | 'conditional';
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
  const [filterSection, setFilterSection] = useState<string>('all');

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadClauses();
  }, [isAdmin]);

  async function loadClauses() {
    const { data } = await supabase.from('clauses').select('*').order('sort_order');
    setClauses((data as any) ?? []);
    setLoading(false);
  }

  function openEdit(clause: Clause) {
    setEditing(clause);
    setForm({
      clause_key: clause.clause_key,
      section: clause.section,
      subsection: clause.subsection,
      clause_text: clause.clause_text,
      content_type: clause.content_type,
      required_level: clause.required_level,
      trigger_expression: clause.trigger_expression,
      must_include: clause.must_include,
      mutually_exclusive_group: clause.mutually_exclusive_group,
      editable_fields: clause.editable_fields,
      sort_order: clause.sort_order,
      template_version: clause.template_version,
      active: clause.active,
    });
    setTriggerText(JSON.stringify(clause.trigger_expression ?? {}, null, 2));
    setEditableFieldsText(JSON.stringify(clause.editable_fields ?? [], null, 2));
    setDialogOpen(true);
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_CLAUSE);
    setTriggerText('{}');
    setEditableFieldsText('[]');
    setDialogOpen(true);
  }

  async function handleSave() {
    let parsedTrigger = {};
    let parsedEditable: any = [];
    try {
      parsedTrigger = JSON.parse(triggerText);
    } catch {
      toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Fix the trigger expression JSON.' });
      return;
    }
    try {
      parsedEditable = JSON.parse(editableFieldsText);
    } catch {
      toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Fix the editable fields JSON.' });
      return;
    }

    const payload = { ...form, trigger_expression: parsedTrigger, editable_fields: parsedEditable };

    if (editing) {
      await supabase.from('clauses').update(payload as any).eq('id', editing.id);
    } else {
      await supabase.from('clauses').insert(payload as any);
    }
    setDialogOpen(false);
    loadClauses();
    toast({ title: 'Saved' });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this clause?')) return;
    await supabase.from('clauses').delete().eq('id', id);
    loadClauses();
  }

  const filtered = filterSection === 'all' ? clauses : clauses.filter((c) => c.section === filterSection);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-heading text-lg font-semibold">Clause Library</h1>
          <div className="ml-auto flex items-center gap-3">
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {CONSENT_SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Add Clause
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-3">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No clauses found. Add your first clause above.</CardContent></Card>
        ) : (
          filtered.map((clause) => (
            <Card key={clause.id} className={!clause.active ? 'opacity-50' : ''}>
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={clause.content_type === 'locked' ? 'default' : clause.required_level === 'conditional' ? 'secondary' : 'outline'} className="text-xs">
                      {clause.content_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{clause.required_level}</Badge>
                    <span className="text-xs text-muted-foreground">{clause.section}</span>
                    <span className="text-xs text-muted-foreground">• Order: {clause.sort_order}</span>
                  </div>
                  <h3 className="font-medium text-sm font-mono">{clause.clause_key}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{clause.clause_text}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(clause)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(clause.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Clause' : 'Add Clause'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clause Key (unique)</Label>
                <Input value={form.clause_key} onChange={(e) => setForm({ ...form, clause_key: e.target.value })} placeholder="e.g. intro_purpose" />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSENT_SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={form.content_type} onValueChange={(v: any) => setForm({ ...form, content_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locked">Locked</SelectItem>
                    <SelectItem value="required_editable">Required Editable</SelectItem>
                    <SelectItem value="free_text">Free Text</SelectItem>
                    <SelectItem value="conditional_pack">Conditional Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Required Level</Label>
                <Select value={form.required_level} onValueChange={(v: any) => setForm({ ...form, required_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Required</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subsection</Label>
              <Input value={form.subsection} onChange={(e) => setForm({ ...form, subsection: e.target.value })} placeholder="Optional subsection" />
            </div>
            <div className="space-y-2">
              <Label>Clause Text (verbatim)</Label>
              <Textarea value={form.clause_text} onChange={(e) => setForm({ ...form, clause_text: e.target.value })} rows={6} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Exclusion Group</Label>
                <Input value={form.mutually_exclusive_group ?? ''} onChange={(e) => setForm({ ...form, mutually_exclusive_group: e.target.value || null })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Template Version</Label>
                <Input value={form.template_version} onChange={(e) => setForm({ ...form, template_version: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trigger Expression (JSON)</Label>
              <Textarea value={triggerText} onChange={(e) => setTriggerText(e.target.value)} rows={4} className="font-mono text-xs" placeholder='{"hipaa_required": true}' />
              <p className="text-xs text-muted-foreground">Keys must match study answer field names. All conditions use AND logic.</p>
            </div>
            <div className="space-y-2">
              <Label>Editable Fields (JSON)</Label>
              <Textarea value={editableFieldsText} onChange={(e) => setEditableFieldsText(e.target.value)} rows={3} className="font-mono text-xs" placeholder='[{"field": "duration", "label": "Study Duration"}]' />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.must_include} onCheckedChange={(v) => setForm({ ...form, must_include: v })} />
                  <Label>Must Include</Label>
                </div>
              </div>
              <Button onClick={handleSave}>Save Clause</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
