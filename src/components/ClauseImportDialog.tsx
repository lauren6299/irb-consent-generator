import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Upload, AlertCircle, CheckCircle2, FileJson, Loader2 } from 'lucide-react';

const VALID_CONTENT_TYPES = ['locked', 'required_editable', 'free_text', 'conditional_pack', 'structured_block'];
const VALID_REQUIRED_LEVELS = ['required', 'conditional', 'optional'];

interface ImportRow {
  index: number;
  data: Record<string, unknown>;
  errors: string[];
  valid: boolean;
}

interface Props {
  onImported: () => void;
}

function validateRow(row: unknown, index: number): ImportRow {
  const errors: string[] = [];
  if (!row || typeof row !== 'object') {
    return { index, data: {}, errors: ['Row is not an object'], valid: false };
  }
  const r = row as Record<string, unknown>;

  if (!r.clause_key || typeof r.clause_key !== 'string' || !r.clause_key.trim()) {
    errors.push('clause_key is required');
  }
  if (!r.clause_text || typeof r.clause_text !== 'string' || !r.clause_text.trim()) {
    errors.push('clause_text is required');
  }
  if (!r.template_version || typeof r.template_version !== 'string') {
    errors.push('template_version is required');
  }
  if (!r.section || typeof r.section !== 'string') {
    errors.push('section is required');
  }
  if (r.content_type && !VALID_CONTENT_TYPES.includes(r.content_type as string)) {
    errors.push(`content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`);
  }
  if (r.required_level && !VALID_REQUIRED_LEVELS.includes(r.required_level as string)) {
    errors.push(`required_level must be one of: ${VALID_REQUIRED_LEVELS.join(', ')}`);
  }
  if (r.trigger_expression !== undefined && r.trigger_expression !== null && typeof r.trigger_expression !== 'object') {
    errors.push('trigger_expression must be an object or null');
  }
  if (r.editable_fields !== undefined && r.editable_fields !== null && !Array.isArray(r.editable_fields)) {
    errors.push('editable_fields must be an array or null');
  }
  if (r.sort_order !== undefined && typeof r.sort_order !== 'number') {
    errors.push('sort_order must be a number');
  }

  return { index, data: r, errors, valid: errors.length === 0 };
}

function buildPayload(r: Record<string, unknown>) {
  return {
    clause_key: (r.clause_key as string).trim(),
    section: (r.section as string) || '',
    subsection: (r.subsection as string) || '',
    clause_text: (r.clause_text as string).trim(),
    content_type: (r.content_type as string) || 'locked',
    required_level: (r.required_level as string) || 'required',
    trigger_expression: r.trigger_expression ?? {},
    must_include: r.must_include === true || r.must_include === 'true',
    mutually_exclusive_group: (r.mutually_exclusive_group as string) || null,
    editable_fields: r.editable_fields ?? [],
    sort_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
    template_version: (r.template_version as string),
    active: r.active !== false && r.active !== 'false',
  };
}

export default function ClauseImportDialog({ onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState('');

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setParseError('File too large (max 5 MB)');
      return;
    }
    setParseError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const arr = Array.isArray(parsed) ? parsed : parsed.clauses;
        if (!Array.isArray(arr)) {
          setParseError('JSON must be an array or an object with a "clauses" array.');
          setRows([]);
          return;
        }
        if (arr.length === 0) {
          setParseError('File contains no clauses.');
          setRows([]);
          return;
        }
        if (arr.length > 500) {
          setParseError('Maximum 500 clauses per import.');
          setRows([]);
          return;
        }
        setRows(arr.map((item, i) => validateRow(item, i)));
      } catch {
        setParseError('Invalid JSON file.');
        setRows([]);
      }
    };
    reader.readAsText(file);
  }, []);

  async function handleImport() {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      if (mode === 'replace') {
        const { error: delError } = await supabase.from('clauses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delError) throw delError;
      }

      const payloads = validRows.map((r) => buildPayload(r.data));

      // Insert in batches of 50
      for (let i = 0; i < payloads.length; i += 50) {
        const batch = payloads.slice(i, i + 50);
        const { error } = await supabase.from('clauses').insert(batch as any);
        if (error) throw error;
      }

      toast({
        title: 'Import complete',
        description: `${validRows.length} clause(s) imported${invalidCount > 0 ? `, ${invalidCount} skipped` : ''}.`,
      });
      setOpen(false);
      setRows([]);
      setParseError('');
      if (fileRef.current) fileRef.current.value = '';
      onImported();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Import failed', description: err?.message || 'Unknown error' });
    }
    setImporting(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1" /> Import JSON
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRows([]); setParseError(''); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <FileJson className="h-5 w-5" /> Import Clauses from JSON
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* File picker */}
            <div className="space-y-2">
              <Label className="text-xs">Select JSON file</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFile}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer text-muted-foreground"
              />
              <p className="text-[10px] text-muted-foreground">
                Expects a JSON array of clause objects, or an object with a "clauses" key. Max 500 rows, 5 MB.
              </p>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {parseError}
              </div>
            )}

            {rows.length > 0 && (
              <>
                {/* Summary */}
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {validCount} valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertCircle className="h-3 w-3" /> {invalidCount} invalid
                    </Badge>
                  )}
                </div>

                {/* Mode selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Import mode</Label>
                  <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'append' | 'replace')} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="append" id="mode-append" />
                      <Label htmlFor="mode-append" className="text-sm font-normal">Append new clauses</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="replace" id="mode-replace" />
                      <Label htmlFor="mode-replace" className="text-sm font-normal text-destructive">Replace all existing clauses</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Preview table */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>clause_key</TableHead>
                          <TableHead>section</TableHead>
                          <TableHead>type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.index} className={!row.valid ? 'bg-destructive/5' : ''}>
                            <TableCell className="text-xs text-muted-foreground">{row.index + 1}</TableCell>
                            <TableCell className="text-xs font-mono">
                              {(row.data.clause_key as string) || '—'}
                            </TableCell>
                            <TableCell className="text-xs">{(row.data.section as string) || '—'}</TableCell>
                            <TableCell className="text-xs">{(row.data.content_type as string) || '—'}</TableCell>
                            <TableCell>
                              {row.valid ? (
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Valid</Badge>
                              ) : (
                                <div>
                                  <Badge variant="destructive" className="text-[10px]">Invalid</Badge>
                                  <ul className="mt-1 text-[10px] text-destructive list-disc list-inside">
                                    {row.errors.map((e, i) => <li key={i}>{e}</li>)}
                                  </ul>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </>
            )}
          </div>

          {rows.length > 0 && validCount > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between pt-2">
                {mode === 'replace' && (
                  <p className="text-xs text-destructive font-medium">⚠ This will delete all existing clauses first.</p>
                )}
                <div className="ml-auto">
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    {importing ? 'Importing…' : `Import ${validCount} clause(s)`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
