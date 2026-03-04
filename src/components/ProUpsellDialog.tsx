import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { usePremium } from '@/contexts/PremiumContext';
import proStatsImg from '@/assets/pro-upsell-stats.png';
import proOrganizeImg from '@/assets/pro-upsell-organize.png';
import proCalendarImg from '@/assets/pro-upsell-calendar.png';

const UPSELL_SHOWN_KEY = 'noteshare_20_note_pro_upsell_shown';

export function hasProUpsellBeenShown(): boolean {
  try {
    return localStorage.getItem(UPSELL_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markProUpsellShown(): void {
  try {
    localStorage.setItem(UPSELL_SHOWN_KEY, 'true');
  } catch {
    // fail silently
  }
}

interface ProUpsellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProUpsellDialog({ open, onOpenChange }: ProUpsellDialogProps) {
  const { openPremiumDialog } = usePremium();

  const handleExplore = () => {
    onOpenChange(false);
    openPremiumDialog();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh] overflow-hidden"
        hideCloseButton={false}
        closeButtonClassName="h-6 w-6 top-3 right-3 z-10"
      >
        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-6 pb-4 space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              There is so much more to Noteshare
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For the price of 1/5th a music lesson, improve your practice quality forever and help me sustain indie development 💙. Thank you!
            </p>
          </div>

          {/* Screenshots */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center font-medium">
              Sample of many Pro features
            </p>
            <div className="space-y-3">
              <img
                src={proStatsImg}
                alt="Practice statistics showing time practiced per week"
                className="w-full rounded-lg border border-border"
                loading="lazy"
                decoding="async"
              />
              <img
                src={proOrganizeImg}
                alt="Organize page with musical goals and folders"
                className="w-full rounded-lg border border-border"
                loading="lazy"
                decoding="async"
              />
              <img
                src={proCalendarImg}
                alt="Practice calendar heatmap showing daily activity"
                className="w-full rounded-lg border border-border"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="shrink-0">
          <div className="flex flex-col gap-2 px-6 pb-6 pt-3">
            <button
              type="button"
              onClick={handleExplore}
              className="w-full rounded-md text-sm px-4 py-3 font-bold touch-manipulation transition-colors duration-200 active:scale-[0.98] [-webkit-tap-highlight-color:transparent] bg-jazz-amber text-jazz-midnight [@media(hover:hover)]:hover:bg-jazz-amber/90 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-jazz-amber focus-visible:outline-offset-2"
            >
              Explore Noteshare Pro
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-md text-sm px-4 py-2 font-medium touch-manipulation transition-colors duration-200 text-muted-foreground [@media(hover:hover)]:hover:text-foreground focus:outline-none"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
