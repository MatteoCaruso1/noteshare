import { useState } from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface SignedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  fallback?: React.ReactNode;
}

export function SignedImage({ src, fallback, className, alt = '', ...props }: SignedImageProps) {
  const { signedUrl, loading } = useSignedUrl(src);
  const [imageError, setImageError] = useState(false);

  // Show skeleton while loading the signed URL
  if (loading) {
    return <Skeleton className={className} />;
  }

  // Show fallback if there was an error loading the image or no signed URL available
  if (imageError || !signedUrl) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Default grey fallback with icon
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <ImageOff className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
      {...props}
    />
  );
}
