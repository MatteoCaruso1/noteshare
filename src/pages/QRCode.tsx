import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const LANDING_URL = 'https://jazz-scene-alive.lovable.app';

export default function QRCodePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  // Hide app chrome (header + bottom nav) on this utility page
  useEffect(() => {
    document.body.classList.add('hide-app-chrome');
    return () => document.body.classList.remove('hide-app-chrome');
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, LANDING_URL, {
      width: 2048,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    }).then(() => setReady(true));
  }, []);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'noteshare-qr-code.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-black">Noteshare QR Code</h1>
      <p className="text-gray-500 text-sm">{LANDING_URL}</p>
      <canvas ref={canvasRef} className="w-full max-w-[400px] aspect-square" />
      {ready && (
        <Button onClick={handleDownload} size="lg" className="bg-black text-white hover:bg-gray-800">
          <Download className="w-5 h-5 mr-2" />
          Download PNG (2048×2048)
        </Button>
      )}
    </div>
  );
}
