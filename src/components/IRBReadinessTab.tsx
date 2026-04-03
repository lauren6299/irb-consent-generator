import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { IRB_READINESS_CHECKLIST } from '@/lib/irbReadinessChecklist';
import { Printer, RotateCcw } from 'lucide-react';

function getStorageKey(studyId: string | undefined) {
  return `irb-readiness-${studyId ?? 'draft'}`;
}

export default function IRBReadinessTab() {
  const { id: studyId } = useParams<{ id: string }>();
  const storageKey = getStorageKey(studyId);

  const allIds = useMemo(
    () => IRB_READINESS_CHECKLIST.flatMap((s) => s.items.map((i) => i.id)),
    [],
  );

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, storageKey]);

  const toggle = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const clearAll = useCallback(() => setChecked({}), []);

  const completedCount = allIds.filter((id) => checked[id]).length;
  const totalCount = allIds.length;
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="max-w-xl mx-auto space-y-5 print:max-w-none print:mx-0">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">IRB Readiness Check</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Use this checklist to review your exported and edited consent form before IRB submission.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Progress value={pct} className="h-2 flex-1 max-w-xs" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedCount} of {totalCount} items reviewed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearAll}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Clear all checks
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print checklist
          </Button>
        </div>
      </div>

      {/* Sections */}
      {IRB_READINESS_CHECKLIST.map((section) => (
        <Card key={section.title} className="shadow-none border">
          <CardHeader className="px-4 py-3 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {section.items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <Checkbox
                  checked={!!checked[item.id]}
                  onCheckedChange={() => toggle(item.id)}
                  className="shrink-0"
                />
                <span className="text-xs text-foreground leading-normal group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
