import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FilePlus, FolderOpen, Copy, Library, FileText, Settings, LogOut, Trash2 } from 'lucide-react';
import FontSizeSelector from '@/components/FontSizeSelector';
import { toast } from 'sonner';

interface Study {
  id: string;
  title: string;
  status: string;
  updated_at: string;
}

export default function Dashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Study | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('studies')
      .select('id, title, status, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setStudies(data ?? []);
        setLoading(false);
      });
  }, [user]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('studies').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Unable to delete draft. Please try again.');
    } else {
      setStudies((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success('Draft deleted');
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const drafts = studies.filter((s) => s.status === 'draft');
  const completed = studies.filter((s) => s.status === 'completed');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary px-3 py-1">
              <span className="font-heading text-sm font-bold text-primary-foreground tracking-wide">STANFORD</span>
            </div>
            <h1 className="font-heading text-lg font-semibold text-foreground">IRB Consent Builder</h1>
          </div>
          <div className="flex items-center gap-3">
            <FontSizeSelector />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            {isAdmin && <Badge variant="secondary">Admin</Badge>}
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/study/new">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FilePlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">New Consent Form</h3>
                  <p className="text-sm text-muted-foreground">Start a new study consent form</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {isAdmin && (
            <>
              <Link to="/admin/clauses">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="flex items-center gap-4 py-6">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Library className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">Clause Library</h3>
                      <p className="text-sm text-muted-foreground">Manage template clauses</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/admin/templates">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="flex items-center gap-4 py-6">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">Template Versions</h3>
                      <p className="text-sm text-muted-foreground">Manage template versions</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
        </div>

        {/* Drafts */}
        <section>
          <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            Open Drafts
          </h2>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : drafts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No drafts yet. Create your first consent form above.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {drafts.map((s) => (
                <Card key={s.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="flex items-center justify-between py-4">
                    <Link to={`/study/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{s.title}</span>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline">{s.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.updated_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.preventDefault(); setDeleteTarget(s); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Completed */}
        {completed.length > 0 && (
          <section>
            <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
              <Copy className="h-5 w-5 text-muted-foreground" />
              Generated Documents
            </h2>
            <div className="grid gap-3">
              {completed.map((s) => (
                <Link key={s.id} to={`/study/${s.id}`}>
                  <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-success" />
                        <span className="font-medium">{s.title}</span>
                      </div>
                      <Badge className="bg-success text-success-foreground">Completed</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground pt-8">
          Final IRB and institutional review required before use
        </p>
      </main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
