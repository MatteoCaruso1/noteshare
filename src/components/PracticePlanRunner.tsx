import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Route, Plus, Trash2, Play, Pause, SkipForward, Coffee,
  Music2, GripVertical, Save, FolderOpen, ChevronLeft, X, Sparkles,
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

interface PracticePlanRunnerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = 'list' | 'build' | 'run';

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

export function PracticePlanRunner({ open, onOpenChange }: PracticePlanRunnerProps) {
  const { profile } = useAuth();
  const { data: plans } = usePracticePlans(profile?.id);
  const savePlan = useSavePracticePlan();
  const deletePlan = useDeletePracticePlan();
  const touchPlan = useTouchPracticePlan();

  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('My Practice Plan');
  const [items, setItems] = useState<PlanItem[]>(STARTER_TEMPLATE);

  // Runner state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds spent on current item
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertedRef = useRef<Set<number>>(new Set());

  const totalMinutes = useMemo(() => items.reduce((s, i) => s + (i.minutes || 0), 0), [items]);

  // Reset transient state when dialog reopens fresh
  useEffect(() => {
    if (!open) {
      setMode('list');
      setRunning(false);
      setCurrentIdx(0);
      setElapsed(0);
      alertedRef.current.clear();
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [open]);

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
      tone(587, now);        // D5
      tone(880, now + 0.18); // A5
    } catch { /* ignore */ }
  }, []);

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Soft alert when target reached (once per item)
  useEffect(() => {
    if (mode !== 'run') return;
    const item = items[currentIdx];
    if (!item) return;
    const target = item.minutes * 60;
    if (elapsed >= target && !alertedRef.current.has(currentIdx)) {
      alertedRef.current.add(currentIdx);
      playChime();
      toast(`${item.title} target reached — keep going or tap Next`, { duration: 4000 });
    }
  }, [elapsed, currentIdx, items, mode, playChime]);

  // Builder helpers
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
    setItems(STARTER_TEMPLATE.map(i => ({ ...i, id: newId() })));
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
    if (plan) {
      setName(plan.name);
      setItems(plan.sections);
      setEditingId(plan.id);
      touchPlan.mutate({ id: plan.id });
    }
    if (!items.length) { toast.error('Build a plan first'); return; }
    setCurrentIdx(0);
    setElapsed(0);
    alertedRef.current.clear();
    setRunning(true);
    setMode('run');
  };

  const advance = () => {
    setElapsed(0);
    if (currentIdx < items.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      setRunning(false);
      toast.success('🎉 Plan complete! Great session.');
      setMode('list');
    }
  };

  const currentItem = items[currentIdx];
  const targetSec = currentItem ? currentItem.minutes * 60 : 0;
  const overtime = currentItem ? elapsed - targetSec : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-primary" />
            {mode === 'list' && 'Practice on Rails'}
            {mode === 'build' && (editingId ? 'Edit Plan' : 'New Plan')}
            {mode === 'run' && (name || 'Running')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === 'list' && 'Run a structured practice with sections, breaks, and per-section timers.'}
            {mode === 'build' && 'Drag-free reorder with arrows. Tap a block to edit.'}
            {mode === 'run' && `${items.length} blocks • ${totalMinutes} min total`}
          </DialogDescription>
        </DialogHeader>

        {/* LIST MODE */}
        {mode === 'list' && (
          <div className="p-5 space-y-4">
            <Button
              onClick={startBuilderForNew}
              className="w-full bg-gradient-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Build a new plan
            </Button>

            {plans && plans.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Saved plans
                </p>
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
                      <Button size="sm" variant="ghost" onClick={() => startBuilderForEdit(plan)}>
                        Edit
                      </Button>
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

        {/* BUILD MODE */}
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
                  className={`p-3 flex items-center gap-2 ${
                    item.kind === 'break' ? 'bg-muted/40 border-dashed' : ''
                  }`}
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
                  <Select
                    value={item.kind}
                    onValueChange={(v: PlanItemKind) => updateItem(item.id, { kind: v })}
                  >
                    <SelectTrigger className="w-[110px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="section">
                        <span className="flex items-center gap-1.5"><Music2 className="w-3.5 h-3.5" /> Section</span>
                      </SelectItem>
                      <SelectItem value="break">
                        <span className="flex items-center gap-1.5"><Coffee className="w-3.5 h-3.5" /> Break</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={item.title}
                    onChange={e => updateItem(item.id, { title: e.target.value })}
                    placeholder={item.kind === 'break' ? 'Break' : 'Title'}
                    className="flex-1 h-9"
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

        {/* RUN MODE */}
        {mode === 'run' && currentItem && (
          <div className="p-5 space-y-5">
            {/* Big timer card */}
            <Card className={`p-6 text-center ${
              currentItem.kind === 'break'
                ? 'bg-muted/40 border-dashed'
                : 'bg-primary/5 border-primary/30'
            }`}>
              <Badge variant={currentItem.kind === 'break' ? 'secondary' : 'default'} className="mb-2">
                {currentItem.kind === 'break' ? (
                  <><Coffee className="w-3 h-3 mr-1" /> Break</>
                ) : (
                  <><Music2 className="w-3 h-3 mr-1" /> Section {idxOfSection(items, currentIdx)}</>
                )}
              </Badge>
              <h3 className="text-lg font-semibold mb-3">{currentItem.title}</h3>
              <div className={`text-5xl font-mono font-bold tabular-nums ${
                overtime > 0 ? 'text-destructive' : 'text-foreground'
              }`}>
                {formatHM(elapsed)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {overtime > 0
                  ? `+${formatHM(overtime)} over target (${currentItem.minutes} min)`
                  : `Target ${currentItem.minutes} min`}
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    overtime > 0 ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, (elapsed / Math.max(1, targetSec)) * 100)}%` }}
                />
              </div>
            </Card>

            {/* Controls */}
            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={() => setRunning(false)} className="flex-1">
                  <Pause className="w-4 h-4 mr-1.5" /> Pause
                </Button>
              ) : (
                <Button onClick={() => setRunning(true)} className="flex-1 bg-gradient-primary text-primary-foreground">
                  <Play className="w-4 h-4 mr-1.5" /> Resume
                </Button>
              )}
              <Button onClick={advance} className="flex-1">
                <SkipForward className="w-4 h-4 mr-1.5" />
                {currentIdx === items.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>

            {/* Up next */}
            {currentIdx < items.length - 1 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Up next
                </p>
                <div className="space-y-1">
                  {items.slice(currentIdx + 1, currentIdx + 4).map((it) => (
                    <div
                      key={it.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                        it.kind === 'break' ? 'bg-muted/30' : 'bg-card border border-border'
                      }`}
                    >
                      {it.kind === 'break' ? <Coffee className="w-3.5 h-3.5 text-muted-foreground" /> : <Music2 className="w-3.5 h-3.5 text-primary" />}
                      <span className="flex-1 truncate">{it.title}</span>
                      <span className="text-xs text-muted-foreground">{it.minutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setRunning(false); setMode('list'); }}
              className="w-full text-muted-foreground"
            >
              Exit plan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function idxOfSection(items: PlanItem[], at: number) {
  let n = 0;
  for (let i = 0; i <= at; i++) {
    if (items[i]?.kind === 'section') n++;
  }
  return n;
}
