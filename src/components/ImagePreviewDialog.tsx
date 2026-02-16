import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SignedImage } from '@/components/SignedImage';

interface ImagePreviewDialogProps {
  src: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signed?: boolean;
}

export function ImagePreviewDialog({ src, open, onOpenChange, signed = true }: ImagePreviewDialogProps) {
  if (!src) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none [&>button]:text-white [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:p-1">
        <div className="flex items-center justify-center max-h-[90vh]">
          {signed ? (
            <SignedImage
              src={src}
              alt="Full preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          ) : (
            <img
              src={src}
              alt="Full preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
