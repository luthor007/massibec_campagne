// components/SalesTools/QRCodeGenerator.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy, QrCode, Share2, CheckCircle } from 'lucide-react';
import QRCodeLib from 'qrcode';

export default function QRCodeGenerator({ storeInfo }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (storeInfo?.storeId) {
      generateQRCode();
    }
  }, [storeInfo]);

  const generateQRCode = async () => {
    try {
      const storeUrl = `${window.location.origin}/boutique/${storeInfo.storeId}`;
      const url = await QRCodeLib.toDataURL(storeUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-code-${storeInfo?.name || 'boutique'}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const copyLink = () => {
    const storeUrl = `${window.location.origin}/boutique/${storeInfo?.storeId}`;
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    const storeUrl = `${window.location.origin}/boutique/${storeInfo?.storeId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Boutique ${storeInfo?.name || 'Ma Boutique'}`,
          text: 'Découvrez ma boutique de financement scolaire!',
          url: storeUrl
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      copyLink();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-base sm:text-lg">
          <QrCode className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          QR Code Boutique
        </CardTitle>
        <CardDescription className="text-sm">
          Code QR pour diriger vers votre boutique
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="flex justify-center p-4 sm:p-6 bg-white border-2 border-dashed border-gray-300 rounded-lg">
          {qrCodeUrl ? (
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              className="w-32 h-32 sm:w-48 sm:h-48"
            />
          ) : (
            <div className="w-32 h-32 sm:w-48 sm:h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 break-all">
            <strong>Lien:</strong> {`${window.location.origin}/boutique/${storeInfo?.storeId}`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={copyLink}
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Copié!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copier le lien
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={downloadQRCode}
            disabled={!qrCodeUrl}
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger QR Code
          </Button>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={shareLink}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
        </div>

        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            💡 <strong>Astuce:</strong> Imprimez ce QR code et ajoutez-le sur vos affiches, cartes de visite, ou publiez-le sur les réseaux sociaux!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}



