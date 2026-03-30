import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CONSENT_SECTIONS } from '@/lib/types';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';

interface Clause {
  id: string;
  section_name: string;
  subsection_name: string | null;
  clause_title: string;
  clause_text: string;
  clause_type: string;
  trigger_json: any;
  exclusion_group: string | null;
  sort_order: number;
  template_version: string;
  active: boolean;
}

const EMPTY_CLAUSE: Omit<Clause, 'id'> = {
  section_name: CONSENT_SECTIONS[0],
  subsection_name: null,
  clause_title: '',
  clause_text: '',
  clause_type: 'required',
  trigger_json: {},
  exclusion_group: null,
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
  const [filterSection, setFilterSection] = useState<string>('all');

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadClauses();
  }, [isAdmin]);

  async function loadClauses() {
    const { data } = await supabase.from('clauses').select('*').order('sort_order');
    setClauses(data ?? []);
    setLoading(false);
  }

  function openEdit(clause: Clause) {
    setEditing(clause);
    setForm({
      section_name: clause.section_name,
      subsection_name: clause.subsection_name,
      clause_title: clause.clause_title,
      clause_text: clause.clause_text,
      clause_type: clause.clause_type,
      trigger_json: clause.trigger_json,
      exclusion_group: clause.exclusion_group,
      sort_order: clause.sort_order,
      template_version: clause.template_version,
      active: clause.active,
    });
    setTriggerText(JSON.stringify(clause.trigger_json ?? {}, null, 2));
    setDialogOpen(true);
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_CLAUSE);
    setTriggerText('{}');
    setDialogOpen(true);
  }

  async function handleSave() {
    let parsedTrigger = {};
    try {
      parsedTrigger = JSON.parse(triggerText);
    } catch {
      toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Fix the trigger rules JSON.' });
      return;
    }

    const payload = { ...form, trigger_json: parsedTrigger };

    if (editing) {
      await supabase.from('clauses').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('clauses').insert(payload);
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

  const filtered = filterSection === 'all' ? clauses : clauses.filter((c) => c.section_name === filterSection);

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
                    <Badge variant={clause.clause_type === 'required' ? 'default' : clause.clause_type === 'conditional' ? 'secondary' : 'outline'} className="text-xs">
                      {clause.clause_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{clause.section_name}</span>
                    <span className="text-xs text-muted-foreground">• Order: {clause.sort_order}</span>
                  </div>
                  <h3 className="font-medium text-sm">{clause.clause_title}</h3>
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
                <Label>Section</Label>
                <Select value={form.section_name} onValueChange={(v) => setForm({ ...form, section_name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONSENT_SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.clause_type} onValueChange={(v) => setForm({ ...form, clause_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Required</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Clause Title</Label>
              <Input value={form.clause_title} onChange={(e) => setForm({ ...form, clause_title: e.target.value })} />
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
                <Input value={form.exclusion_group ?? ''} onChange={(e) => setForm({ ...form, exclusion_group: e.target.value || null })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Template Version</Label>
                <Input value={form.template_version} onChange={(e) => setForm({ ...form, template_version: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trigger Rules (JSON)</Label>
              <Textarea value={triggerText} onChange={(e) => setTriggerText(e.target.value)} rows={4} className="font-mono text-xs" placeholder='{"hipaa_required": true}' />
              <p className="text-xs text-muted-foreground">Keys must match study answer field names. All conditions use AND logic.</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave}>Save Clause</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
