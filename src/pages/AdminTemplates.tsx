import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';

interface Template {
  id: string;
  version: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export default function AdminTemplates() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ version: '', name: '', description: '', active: true });

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadTemplates();
  }, [isAdmin]);

  async function loadTemplates() {
    const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
    setTemplates(data ?? []);
    setLoading(false);
  }

  async function handleSave() {
    if (editing) {
      await supabase.from('templates').update(form).eq('id', editing.id);
    } else {
      await supabase.from('templates').insert(form);
    }
    setDialogOpen(false);
    loadTemplates();
    toast({ title: 'Saved' });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-heading text-lg font-semibold">Template Versions</h1>
          <Button size="sm" className="ml-auto" onClick={() => { setEditing(null); setForm({ version: '', name: '', description: '', active: true }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Version
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-3">
        {loading ? <p className="text-muted-foreground">Loading...</p> : templates.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No templates yet.</CardContent></Card>
        ) : templates.map((t) => (
          <Card key={t.id} className={!t.active ? 'opacity-50' : ''}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">v{t.version}</Badge>
                  {t.active && <Badge className="bg-success text-success-foreground text-xs">Active</Badge>}
                </div>
                {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                setEditing(t);
                setForm({ version: t.version, name: t.name, description: t.description ?? '', active: t.active });
                setDialogOpen(true);
              }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Version</Label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Stanford Consent Template" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
