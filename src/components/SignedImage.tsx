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

  if (loading) {
    return (
      <Skeleton className={className} />
    );
  }

  if (imageError && fallback) {
    return <>{fallback}</>;
  }

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
