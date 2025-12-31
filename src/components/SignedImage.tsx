import { useState } from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';

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

  // Show fallback if there was an error loading the image
  if (imageError && fallback) {
    return <>{fallback}</>;
  }

  // Show fallback if no signed URL available
  if (!signedUrl) {
    return fallback ? <>{fallback}</> : null;
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
