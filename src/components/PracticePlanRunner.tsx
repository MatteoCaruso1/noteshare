import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Route, Plus, Trash2, Play, Pause, SkipForward, Coffee,
  Music2, Save, ChevronLeft, X, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  PlanItem,
  PlanItemKind,
  PracticePlan,
  usePracticePlans,
  useSavePracticePlan,
  useDeletePracticePlan,
  useTouchPracticePlan,
} from '@/hooks/usePracticePlans';
import { toast } from 'sonner';

export interface RunningPlan {
  name: string;
  items: PlanItem[];
  planId?: string;
}

interface PracticePlanRunnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartRun: (plan: RunningPlan) => void;
}

type Mode = 'list' | 'build';

const newId = () => `it-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const STARTER_TEMPLATE: PlanItem[] = [
  { id: newId(), kind: 'section', title: 'Warm-up', minutes: 10 },
  { id: newId(), kind: 'break', title: 'Short break', minutes: 2 },
  { id: newId(), kind: 'section', title: 'Technique', minutes: 15 },
  { id: newId(), kind: 'break', title: 'Short break', minutes: 3 },
  { id: newId(), kind: 'section', title: 'Repertoire', minutes: 20 },
];

function formatHM(total: number) {
  const m = Math.max(0, Math.floor(total / 60));
  const s = Math.max(0, total % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function idxOfSection(items: PlanItem[], at: number) {
  let n = 0;
  for (let i = 0; i <= at; i++) {
    if (items[i]?.kind === 'section') n++;
  }
  return n;
}

/** Setup dialog: list saved plans, build/edit, then hand off to inline runner. */
export function PracticePlanRunner({ open, onOpenChange, onStartRun }: PracticePlanRunnerProps) {
  const { profile } = useAuth();
  const { data: plans } = usePracticePlans(profile?.id);
  const savePlan = useSavePracticePlan();
  const deletePlan = useDeletePracticePlan();
  const touchPlan = useTouchPracticePlan();

  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('My Practice Plan');
  const [items, setItems] = useState<PlanItem[]>(STARTER_TEMPLATE);

  const totalMinutes = useMemo(() => items.reduce((s, i) => s + (i.minutes || 0), 0), [items]);

  useEffect(() => {
    if (!open) setMode('list');
  }, [open]);

  // If the dialog is opened and there are no saved plans, jump straight into building.
  useEffect(() => {
    if (open && mode === 'list' && plans && plans.length === 0) {
      startBuilderForNew();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, plans]);

  const addSection = () => setItems(p => [...p, { id: newId(), kind: 'section', title: 'New section', minutes: 10 }]);
  const addBreak = () => setItems(p => [...p, { id: newId(), kind: 'break', title: 'Break', minutes: 5 }]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const updateItem = (id: string, patch: Partial<PlanItem>) =>
    setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
  const moveItem = (idx: number, dir: -1 | 1) => {
    setItems(p => {
      const next = [...p];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const startBuilderForNew = () => {
    setEditingId(null);
    setName('My Practice Plan');
    setItems([]);
    setMode('build');
  };

  const startBuilderForEdit = (plan: PracticePlan) => {
    setEditingId(plan.id);
    setName(plan.name);
    setItems(plan.sections.length ? plan.sections : STARTER_TEMPLATE);
    setMode('build');
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!items.length) { toast.error('Add at least one section'); return; }
    if (items.some(i => !i.title.trim() || i.minutes <= 0)) {
      toast.error('Every block needs a title and minutes > 0'); return;
    }
    await savePlan.mutateAsync({
      id: editingId || undefined,
      user_id: profile.id,
      name: name.trim() || 'My Practice Plan',
      sections: items,
    });
    setMode('list');
  };

  const handleStartRun = (plan?: PracticePlan) => {
    const runName = plan ? plan.name : (name.trim() || 'My Practice Plan');
    const runItems = plan ? plan.sections : items;
    if (!runItems.length) { toast.error('Build a plan first'); return; }
    if (plan) touchPlan.mutate({ id: plan.id });
    onStartRun({ name: runName, items: runItems, planId: plan?.id ?? editingId ?? undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            {mode === 'list' && 'Structured Session'}
            {mode === 'build' && (editingId ? 'Edit Plan' : 'New Plan')}
          </DialogTitle>
          {mode === 'list' && (
            <DialogDescription className="sr-only">Structured Session</DialogDescription>
          )}
          {mode === 'build' && <DialogDescription className="sr-only">Build your practice plan.</DialogDescription>}
        </DialogHeader>

        {mode === 'list' && (
          <div className="p-5 space-y-4">
            <Button onClick={startBuilderForNew} className="w-full bg-gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Build a new plan
            </Button>

            {plans && plans.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saved plans</p>
                {plans.map(plan => {
                  const total = plan.sections.reduce((s, i) => s + (i.minutes || 0), 0);
                  return (
                    <Card key={plan.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.sections.length} blocks • {total} min
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => startBuilderForEdit(plan)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deletePlan.mutate({ id: plan.id, user_id: profile!.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleStartRun(plan)}>
                        <Play className="w-3.5 h-3.5 mr-1" /> Start
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}

            {(!plans || plans.length === 0) && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary/60" />
                No saved plans yet. Build your first to run focused, on-rails sessions.
              </div>
            )}
          </div>
        )}

        {mode === 'build' && (
          <div className="p-5 space-y-4">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Plan name (e.g. Morning Routine)"
              className="font-medium"
            />

            <div className="space-y-2">
              {items.map((item, idx) => (
                <Card
                  key={item.id}
                  className={`p-3 flex items-center gap-2 ${item.kind === 'break' ? 'bg-muted/40 border-dashed' : ''}`}
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-1"
                      aria-label="Move up"
                    >▲</button>
                    <button
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === items.length - 1}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-1"
                      aria-label="Move down"
                    >▼</button>
                  </div>
                  <div
                    className="shrink-0 w-9 h-9 rounded-md border border-input flex items-center justify-center text-muted-foreground"
                    aria-label={item.kind === 'break' ? 'Break' : 'Section'}
                    title={item.kind === 'break' ? 'Break' : 'Section'}
                  >
                    {item.kind === 'break'
                      ? <Coffee className="w-4 h-4" />
                      : <Music2 className="w-4 h-4" />}
                  </div>
                  <Input
                    value={item.title}
                    onChange={e => updateItem(item.id, { title: e.target.value })}
                    placeholder={item.kind === 'break' ? 'Break description' : 'What to practice'}
                    className="flex-1 min-w-0 h-9"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={item.minutes}
                    onChange={e => updateItem(item.id, { minutes: parseInt(e.target.value, 10) || 0 })}
                    className="w-16 h-9"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addSection} className="flex-1">
                <Music2 className="w-3.5 h-3.5 mr-1.5" /> Add section
              </Button>
              <Button variant="outline" size="sm" onClick={addBreak} className="flex-1">
                <Coffee className="w-3.5 h-3.5 mr-1.5" /> Add break
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Total: {totalMinutes} min • {items.length} blocks
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setMode('list')} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button variant="secondary" onClick={handleSave} disabled={savePlan.isPending} className="flex-1">
                <Save className="w-4 h-4 mr-1.5" /> Save
              </Button>
              <Button onClick={() => handleStartRun()} className="flex-1 bg-gradient-primary text-primary-foreground">
                <Play className="w-4 h-4 mr-1.5" /> Start
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 * Inline runner — lives inside the practice session card so the
 * user can still see/edit notes, navigate, and watch the header timer.
 * ============================================================ */

interface PracticePlanRunnerInlineProps {
  plan: RunningPlan;
  onExit: () => void;
}

export function PracticePlanRunnerInline({ plan, onExit }: PracticePlanRunnerInlineProps) {
  const { name, items } = plan;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertedRef = useRef<Set<number>>(new Set());

  const totalMinutes = useMemo(() => items.reduce((s, i) => s + (i.minutes || 0), 0), [items]);

  // Reset when plan changes
  useEffect(() => {
    setCurrentIdx(0);
    setElapsed(0);
    setRunning(true);
    alertedRef.current.clear();
  }, [plan]);

  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const tone = (freq: number, t: number, vol = 0.18) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = freq; o.type = 'sine';
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        o.start(t); o.stop(t + 0.6);
      };
      const now = ctx.currentTime;
      tone(587, now);
      tone(880, now + 0.18);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => {
    const item = items[currentIdx];
    if (!item) return;
    const target = item.minutes * 60;
    if (elapsed >= target && !alertedRef.current.has(currentIdx)) {
      alertedRef.current.add(currentIdx);
      playChime();
      toast(`${item.title} target reached — keep going or tap Next`, { duration: 4000 });
    }
  }, [elapsed, currentIdx, items, playChime]);

  const advance = () => {
    setElapsed(0);
    if (currentIdx < items.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      setRunning(false);
      toast.success('🎉 Plan complete! Great session.');
      onExit();
    }
  };

  const currentItem = items[currentIdx];
  if (!currentItem) return null;
  const targetSec = currentItem.minutes * 60;
  const overtime = elapsed - targetSec;

  return (
    <Card className="mb-4 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Compact header — always visible */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
        <Route className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{name}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Block {currentIdx + 1}/{items.length} • {totalMinutes} min total
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand plan' : 'Collapse plan'}
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onExit}
          aria-label="Exit plan"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Body */}
      <div className={`px-3 ${collapsed ? 'py-2' : 'py-3'} space-y-3`}>
        {/* Current block */}
        <div className="flex items-center gap-3">
          <Badge
            variant={currentItem.kind === 'break' ? 'secondary' : 'default'}
            className="shrink-0"
          >
            {currentItem.kind === 'break' ? (
              <><Coffee className="w-3 h-3 mr-1" /> Break</>
            ) : (
              <><Music2 className="w-3 h-3 mr-1" /> Sec {idxOfSection(items, currentIdx)}</>
            )}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentItem.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {overtime > 0
                ? `+${formatHM(overtime)} over ${currentItem.minutes}m target`
                : `Target ${currentItem.minutes} min`}
            </p>
          </div>
          <div className={`text-2xl font-mono font-bold tabular-nums shrink-0 ${
            overtime > 0 ? 'text-destructive' : 'text-foreground'
          }`}>
            {formatHM(elapsed)}
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${overtime > 0 ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${Math.min(100, (elapsed / Math.max(1, targetSec)) * 100)}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {running ? (
            <Button variant="outline" size="sm" onClick={() => setRunning(false)} className="flex-1">
              <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setRunning(true)}
              className="flex-1 bg-gradient-primary text-primary-foreground"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
            </Button>
          )}
          <Button size="sm" onClick={advance} className="flex-1">
            <SkipForward className="w-3.5 h-3.5 mr-1.5" />
            {currentIdx === items.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>

        {/* Up next — hidden when collapsed */}
        {!collapsed && currentIdx < items.length - 1 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Up next
            </p>
            <div className="space-y-1">
              {items.slice(currentIdx + 1, currentIdx + 3).map((it) => (
                <div
                  key={it.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                    it.kind === 'break' ? 'bg-muted/30' : 'bg-card border border-border'
                  }`}
                >
                  {it.kind === 'break'
                    ? <Coffee className="w-3 h-3 text-muted-foreground" />
                    : <Music2 className="w-3 h-3 text-primary" />}
                  <span className="flex-1 truncate">{it.title}</span>
                  <span className="text-muted-foreground">{it.minutes}m</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
