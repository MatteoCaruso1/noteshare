import { useState } from 'react';
import { Ear, Music2, Music4 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IntervalTrainer } from '@/components/IntervalTrainer';
import { ChordProgressionGame } from '@/components/ChordProgressionGame';
import { usePremium } from '@/contexts/PremiumContext';

export function MusicalTrainingShortcut() {
  const { isPremium, openPremiumDialog } = usePremium();
  const [intervalOpen, setIntervalOpen] = useState(false);
  const [chordOpen, setChordOpen] = useState(false);

  const launch = (which: 'interval' | 'chord') => {
    if (!isPremium) {
      openPremiumDialog();
      return;
    }
    if (which === 'interval') setIntervalOpen(true);
    else setChordOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Musical training"
            className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 active:bg-primary/25 transition-colors touch-manipulation"
          >
            <Ear className="w-[18px] h-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => launch('interval')} className="gap-2 cursor-pointer">
            <Music4 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Interval Trainer</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => launch('chord')} className="gap-2 cursor-pointer">
            <Music2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Guess the Chord Progression</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <IntervalTrainer open={intervalOpen} onOpenChange={setIntervalOpen} />
      <ChordProgressionGame open={chordOpen} onOpenChange={setChordOpen} />
    </>
  );
}
