// components/SalesTools/PDFGenerator.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Edit } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function PDFGenerator({ storeInfo }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customMessage, setCustomMessage] = useState('Bonjour! Je participe a une campagne de financement pour soutenir mon projet.\n\nChaque commande compte et fait une vraie difference. Merci de votre soutien et de votre générosité!');
  const [customName, setCustomName] = useState('');
  const [discountEnabled, setDiscountEnabled] = useState(true);

  useEffect(() => {
    if (storeInfo?.name) {
      setCustomName(storeInfo.name);
    }
  }, [storeInfo]);

  // Fetch store data to get discount setting
  useEffect(() => {
    const fetchStoreData = async () => {
      if (storeInfo?.storeId) {
        try {
          const response = await fetch(`/api/stores/${storeInfo.storeId}`);
          if (response.ok) {
            const data = await response.json();
            setDiscountEnabled(data.discountEnabled !== false);
          }
        } catch (error) {
          console.error('Error fetching store data for PDF:', error);
        }
      }
    };

    fetchStoreData();
  }, [storeInfo?.storeId]);

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Helper function to detect mobile browsers
  const isMobileBrowser = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
  };

  // Helper function to download PDF with mobile support
  const downloadPDF = (pdf, fileName) => {
    const isMobile = isMobileBrowser();
    
    if (isMobile) {
      // For mobile browsers, always use blob method
      try {
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        // Show success message for mobile users
        alert('PDF téléchargé! Vérifiez vos téléchargements ou votre dossier de fichiers.');
      } catch (error) {
        console.error('Mobile download failed:', error);
        alert('Erreur lors du téléchargement. Essayez d\'ouvrir dans Chrome ou Safari.');
      }
    } else {
      // For desktop browsers, use standard method
      try {
        pdf.save(fileName);
      } catch (error) {
        console.log('Standard save failed, trying blob method:', error);
        
        // Fallback to blob method
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    }
  };

  const generatePDF = async () => {
    if (!storeInfo) {
      alert('Informations de la boutique non disponibles');
      return;
    }

    setIsGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // FOND BEIGE VINTAGE
      pdf.setFillColor(245, 240, 230);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Bordure décorative
      pdf.setDrawColor(139, 69, 19);
      pdf.setLineWidth(1.5);
      pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
      
      // Logo Massibec
      try {
        const logoImg = await loadImage('/images/logo_massibec.png');
        pdf.addImage(logoImg, 'PNG', 20, 20, 40, 15);
      } catch (e) {
        console.log('Logo non charge');
      }
      
      // Titre principal
      pdf.setTextColor(139, 69, 19);
      pdf.setFontSize(26);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Campagne de Financement', pageWidth / 2, 50, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Massibec', pageWidth / 2, 60, { align: 'center' });
      
      // Section produits avec images
      const productList = [
        { name: 'Tarte aux framboises', price: '10.00$', image: '/images/tarte_framboise.png' },
        { name: 'Tarte aux bleuets', price: '10.00$', image: '/images/tarte_bleuet.png' },
        { name: 'Tarte fraises et rhubarbe', price: '9.00$', image: '/images/tarte_rubarbe.png' },
        { name: 'Tarte pommes et sucre', price: '9.00$', image: '/images/tarte_pomme_sucre.png' },
        { name: 'Tarte aux pommes', price: '9.00$', image: '/images/tarte_pomme.png' },
        { name: 'Tarte aux fraises', price: '9.00$', image: '/images/tarte_fraise.png' },
        { name: 'Pate a la viande', price: '11.00$', image: '/images/pate_viande.png' },
        { name: 'Tarte sucre a la creme', price: '9.00$', image: '/images/tarte_sucre_creme.png' },
        { name: 'Pate au poulet', price: '11.00$', image: '/images/pate_poulet.png' },
        { name: 'Croustade aux pommes', price: '9.00$', image: '/images/croustade_pomme.png' }
      ];

      let yPos = 75;
      
      // Titre "Nos Produits"
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(139, 69, 19);
      pdf.text('Nos Delicieux Produits', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // Liste des produits en 2 colonnes avec images
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const colWidth = (pageWidth - 40) / 2;
      const col1X = 20;
      const col2X = pageWidth / 2 + 5;
      const rowHeight = 20;
      const imgSize = 16;
      
      for (let i = 0; i < productList.length; i++) {
        const product = productList[i];
        const isLeftColumn = i % 2 === 0;
        const xPos = isLeftColumn ? col1X : col2X;
        
        // Carte de produit avec fond blanc
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(xPos, yPos - 3, colWidth - 5, rowHeight, 2, 2, 'F');
        
        // Charger et ajouter l'image du produit avec aspect ratio
        try {
          const productImg = await loadImage(product.image);
          const imgAspectRatio = productImg.width / productImg.height;
          
          let finalImgWidth = imgSize;
          let finalImgHeight = imgSize;
          
          if (imgAspectRatio > 1) {
            finalImgHeight = imgSize / imgAspectRatio;
          } else {
            finalImgWidth = imgSize * imgAspectRatio;
          }
          
          const imgX = xPos + 3;
          const imgY = yPos + (rowHeight - finalImgHeight) / 2 - 3;
          
          pdf.addImage(productImg, 'PNG', imgX, imgY, finalImgWidth, finalImgHeight);
        } catch (e) {
          console.log(`Image ${product.name} non chargee`);
        }
        
        // Nom du produit
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        const textX = xPos + imgSize + 6;
        pdf.text(product.name, textX, yPos + 5);
        
        // Prix
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(139, 69, 19);
        pdf.text(product.price, textX, yPos + 12);
        pdf.setFont('helvetica', 'normal');
        
        if (!isLeftColumn) {
          yPos += rowHeight + 2;
        }
      }

      // Section QR Code + Message Etudiant
      yPos += 20;
      const sectionHeight = 70;
      
      // Cadre general avec fond blanc
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(15, yPos, pageWidth - 30, sectionHeight, 5, 5, 'F');
      
      // Bordure decorative
      pdf.setDrawColor(139, 69, 19);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(15, yPos, pageWidth - 30, sectionHeight, 5, 5, 'S');
      
      // QR CODE - Plus petit et a gauche
      const qrSize = 45;
      const qrX = 25;
      const qrY = yPos + (sectionHeight - qrSize) / 2;
      
      const storeUrl = `${window.location.origin}/boutique/${storeInfo.storeId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(storeUrl, {
        width: 400,
        margin: 1,
        color: {
          dark: '#8B4513',
          light: '#FFFFFF'
        }
      });
      
      pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      
      // Texte sous le QR code
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(139, 69, 19);
      pdf.text('Scannez-moi!', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });
      
      // MESSAGE PERSONNALISE DE L'ETUDIANT - A droite
      const textAreaX = qrX + qrSize + 15;
      const textAreaWidth = pageWidth - 30 - (qrX + qrSize + 15) - 10;
      const textAreaY = yPos + 10;
      
      // Nom de l'etudiant
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(139, 69, 19);
      const studentName = customName || storeInfo.name || 'Votre nom';
      pdf.text(studentName, textAreaX, textAreaY);
      
      // Message personnalise
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      
      const messageLines = customMessage.split('\n');
      
      let messageY = textAreaY + 8;
      messageLines.forEach(line => {
        if (line.trim() === '') {
          messageY += 5;
        } else {
          pdf.text(line, textAreaX, messageY, { maxWidth: textAreaWidth });
          messageY += 5;
        }
      });
      
      // Add discount message at bottom (only if enabled)
      if (discountEnabled) {
        yPos += 20;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text('💡 Réduction automatique: 5% dès 6 produits commandés!', pageWidth / 2, yPos, { align: 'center' });
      }

      // Save PDF with mobile-friendly method
      const fileName = `affiche-${storeInfo.name || 'boutique'}.pdf`;
      downloadPDF(pdf, fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la generation du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const productList = [
    { name: 'Tarte aux framboises', price: '10.00$', image: '/images/tarte_framboise.png' },
    { name: 'Tarte aux bleuets', price: '10.00$', image: '/images/tarte_bleuet.png' },
    { name: 'Tarte fraises et rhubarbe', price: '9.00$', image: '/images/tarte_rubarbe.png' },
    { name: 'Tarte pommes et sucre', price: '9.00$', image: '/images/tarte_pomme_sucre.png' },
    { name: 'Tarte aux pommes', price: '9.00$', image: '/images/tarte_pomme.png' },
    { name: 'Tarte aux fraises', price: '9.00$', image: '/images/tarte_fraise.png' },
    { name: 'Pate a la viande', price: '11.00$', image: '/images/pate_viande.png' },
    { name: 'Tarte sucre a la creme', price: '9.00$', image: '/images/tarte_sucre_creme.png' },
    { name: 'Pate au poulet', price: '11.00$', image: '/images/pate_poulet.png' },
    { name: 'Croustade aux pommes', price: '9.00$', image: '/images/croustade_pomme.png' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Formulaire de personnalisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Edit className="h-5 w-5 mr-2 text-orange-600" />
            Personnaliser l'Affiche
          </CardTitle>
          <CardDescription>
            Modifiez votre nom et message - la previsualisation se met a jour en temps reel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="customName" className="text-sm font-medium">Votre nom</Label>
            <Input
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: Marie Tremblay"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="customMessage" className="text-sm font-medium">Message personnalise</Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Votre message personnalise..."
              rows={6}
              className="mt-1 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Utilisez des sauts de ligne pour separer les paragraphes
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <span className="font-semibold">💡 Conseil:</span> Imprimez sur papier mat ou recycle pour un effet vintage authentique!
            </p>
          </div>

          <Button 
            onClick={generatePDF} 
            disabled={isGenerating || !storeInfo}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-4 sm:py-6"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generation en cours...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Telecharger l'Affiche PDF
              </>
            )}
          </Button>
          
          {isMobileBrowser() && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">📱 Sur mobile:</span> Le PDF sera téléchargé dans votre dossier de fichiers. 
                Vérifiez l'application Fichiers ou Téléchargements.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prévisualisation en temps réel */}
      <Card className="lg:sticky lg:top-4 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
            Previsualisation
          </CardTitle>
          <CardDescription className="text-sm">
            Apercu de votre affiche en temps reel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4 rounded-lg border-2 border-orange-200">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ aspectRatio: '210/297' }}>
              {/* Header avec bordure marron */}
              <div className="border-2 border-amber-900 m-3 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <img 
                    src="/images/logo_massibec.png" 
                    alt="Massibec" 
                    className="h-8 object-contain"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
                <h2 className="text-xl font-bold text-amber-900 text-center">Campagne de Financement</h2>
                <p className="text-base text-amber-800 text-center">Massibec</p>
              </div>

              {/* Products section */}
              <div className="px-3 mb-3">
                <h3 className="text-center font-bold text-amber-900 mb-2 text-sm">Nos Delicieux Produits</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {productList.map((product, i) => (
                    <div key={i} className="bg-gray-50 rounded p-1.5 flex items-center gap-1.5">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-10 h-10 object-contain flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.6rem] text-gray-700 leading-tight truncate">{product.name}</p>
                        <p className="text-[0.65rem] font-bold text-amber-900">{product.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Code + Message section */}
              <div className="mx-3 mb-3 border border-amber-900 rounded p-2.5 flex gap-3 bg-white">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-[0.5rem] text-gray-500 text-center">QR<br/>Code</span>
                  </div>
                  <p className="text-[0.5rem] text-center mt-1 text-amber-900 font-semibold">Scannez-moi!</p>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-amber-900 text-xs mb-1 truncate">
                    {customName || 'Votre nom'}
                  </h4>
                  <p className="text-[0.6rem] text-gray-700 whitespace-pre-wrap leading-tight">
                    {customMessage}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
