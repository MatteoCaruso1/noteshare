import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, Mic, Image, Loader2 } from 'lucide-react';

interface MediaUploadButtonProps {
  onAudioUpload: (file: File) => void;
  onImageUpload: (file: File) => void;
  uploading?: boolean;
  iconOnly?: boolean;
}

export function MediaUploadButton({ onAudioUpload, onImageUpload, uploading, iconOnly }: MediaUploadButtonProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAudioUpload(file);
      e.target.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      e.target.value = '';
    }
  };

  // Handle touch end to blur button and prevent stuck focus states
  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
  };

  const triggerButton = iconOnly ? (
    <Button 
      variant="ghost" 
      size="icon" 
      disabled={uploading} 
      className="h-8 w-8 focus:outline-none focus-visible:outline-none"
      onTouchEnd={handleTouchEnd}
    >
      {uploading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Upload className="w-4 h-4 text-muted-foreground" />
      )}
    </Button>
  ) : (
    <Button 
      variant="outline" 
      disabled={uploading} 
      className="gap-2 focus:outline-none focus-visible:outline-none"
      onTouchEnd={handleTouchEnd}
    >
      {uploading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Upload className="w-4 h-4" />
      )}
      Upload Media
    </Button>
  );

  return (
    <>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/webm,audio/flac,audio/aiff,.mp3,.m4a,.aac,.ogg,.wav,.webm,.flac,.aiff,.mp4"
        onChange={handleAudioChange}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />
      
      <DropdownMenu>
        {iconOnly ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                {triggerButton}
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Upload media</TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>
            {triggerButton}
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="start" className="bg-popover">
          <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
            <Mic className="w-4 h-4 mr-2" />
            Upload Audio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <Image className="w-4 h-4 mr-2" />
            Upload Image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}