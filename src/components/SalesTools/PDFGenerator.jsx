// components/SalesTools/PDFGenerator.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Edit } from 'lucide-react';
import dynamic from 'next/dynamic';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { generate } from '@pdfme/generator';
import { createPosterTemplate, preparePosterInputs } from './posterTemplate';
import { getFullStoreUrl } from '../../utils/storeUrlHelpers';
import ImageUpload from '../ImageUpload';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

// Custom CSS for smaller toolbar
const quillStyles = `
  .ql-toolbar {
    padding: 6px 8px !important;
    font-size: 11px !important;
    border-bottom: 1px solid #ccc !important;
  }
  .ql-toolbar .ql-formats {
    margin-right: 6px !important;
  }
  .ql-toolbar button {
    width: 20px !important;
    height: 20px !important;
    padding: 1px !important;
  }
  .ql-toolbar button svg {
    width: 14px !important;
    height: 14px !important;
  }
  .ql-toolbar .ql-picker {
    font-size: 11px !important;
    height: 20px !important;
  }
  .ql-toolbar .ql-picker-label {
    padding: 1px 3px !important;
  }
  .ql-toolbar .ql-picker-options {
    font-size: 11px !important;
    padding: 4px !important;
  }
  .ql-container {
    font-size: 14px !important;
  }
  .ql-editor {
    min-height: 300px !important;
  }
`;

// Build default message based on discount enabled status (HTML format with beautiful styling)
const getDefaultMessage = (discountEnabled = true, boutiqueUrl = '') => {
  // Shorter, friendlier default message matching the template style with proper line breaks
  return `Salut! Je participe à la campagne de financement de mon école 🎓
Commandez mes pâtés et tartes Massibec,
ils sont vraiment délicieux et à bon prix 😋
Les profits aide mon école et mes activités!
Merci à l'avance :)`;
};

// Quill editor modules configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'font': [] }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'size', 'font', 'align',
  'blockquote', 'code-block', 'list', 'bullet', 'link'
];

export default function PDFGenerator({ storeInfo }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customName, setCustomName] = useState(() => {
    return storeInfo?.ownerName || storeInfo?.name || '';
  });
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(null);
  const [schoolName, setSchoolName] = useState(() => {
    return storeInfo?.schoolName || null;
  });
  const [previewProducts, setPreviewProducts] = useState([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const [studentPhotoUrl, setStudentPhotoUrl] = useState(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined' && storeInfo?.storeId) {
      const storageKey = `studentPhoto_${storeInfo.storeId}`;
      const saved = localStorage.getItem(storageKey);
      return saved || '';
    }
    return '';
  });
  const [studentSchoolText, setStudentSchoolText] = useState(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined' && storeInfo?.storeId) {
      const storageKey = `studentPhoto_${storeInfo.storeId}`;
      const saved = localStorage.getItem(`${storageKey}_text`);
      return saved || '';
    }
    return '';
  });

  // Rich text editor content (HTML)
  const [richTextContent, setRichTextContent] = useState(() => {
    const discountEnabled = storeInfo?.discountEnabled !== false;
    const boutiqueUrl = storeInfo ? getFullStoreUrl(storeInfo) : '';
    return getDefaultMessage(discountEnabled, boutiqueUrl);
  });

  useEffect(() => {
    // Set student name automatically from storeInfo
    if (storeInfo?.ownerName) {
      setCustomName(storeInfo.ownerName);
    } else if (storeInfo?.name) {
      setCustomName(storeInfo.name);
    }

    // Set school name
    if (storeInfo?.schoolName) {
      setSchoolName(storeInfo.schoolName);
      // Set default school text if not already set
      if (!studentSchoolText) {
        setStudentSchoolText(`Élève de ${storeInfo.schoolName}`);
      }
    }

    // Set student photo if available (check localStorage first, then storeInfo)
    if (storeInfo?.storeId && typeof window !== 'undefined') {
      const storageKey = `studentPhoto_${storeInfo.storeId}`;
      const savedPhoto = localStorage.getItem(storageKey);

      if (savedPhoto) {
        setStudentPhotoUrl(savedPhoto);
      } else if (storeInfo?.ownerImage || storeInfo?.studentImage) {
        const photoUrl = storeInfo.ownerImage || storeInfo.studentImage;
        setStudentPhotoUrl(photoUrl);
        // Save to localStorage
        localStorage.setItem(storageKey, photoUrl);
      }

      // Load student school text from localStorage
      const savedText = localStorage.getItem(`${storageKey}_text`);
      if (savedText && !studentSchoolText) {
        setStudentSchoolText(savedText);
      }
    } else if (storeInfo?.ownerImage || storeInfo?.studentImage) {
      setStudentPhotoUrl(storeInfo.ownerImage || storeInfo.studentImage);
    }

    // Update default message if discountEnabled changes or storeInfo changes
    const discountEnabled = storeInfo?.discountEnabled !== false; // Default to true if not set
    const boutiqueUrl = storeInfo ? getFullStoreUrl(storeInfo) : '';
    setRichTextContent(getDefaultMessage(discountEnabled, boutiqueUrl));

    // Fetch school logo if school ID is available
    const fetchSchoolLogo = async () => {
      const schoolId = storeInfo?.ownerSchool;
      if (!schoolId) return;

      try {
        const response = await fetch(`/api/schools/${schoolId}`);
        if (response.ok) {
          const schoolData = await response.json();

          // Set school name if not already set
          if (schoolData.name && !storeInfo?.schoolName) {
            setSchoolName(schoolData.name);
          }

          // Convert logo to URL if available
          if (schoolData.logo) {
            let logoUrl = null;
            if (schoolData.logo.startsWith('http')) {
              logoUrl = schoolData.logo;
            } else if (schoolData.logo.startsWith('school-logo/')) {
              const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
              if (cloudName) {
                logoUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${schoolData.logo}.png`;
              }
            } else if (schoolData.logoUrl) {
              logoUrl = schoolData.logoUrl;
            }
            setSchoolLogoUrl(logoUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching school logo:', error);
      }
    };

    fetchSchoolLogo();

    // Fetch products for preview
    const fetchPreviewProducts = async () => {
      try {
        // Get campaignId and schoolId from storeInfo to fetch products with correct prices
        // campaignId is preferred as it's more reliable for getting custom prices
        const campaignId = storeInfo?.campaignId;
        const schoolId = storeInfo?.ownerSchool;

        // Only fetch if we have storeInfo
        if (!storeInfo) return;

        // Prefer campaignId over schoolId for custom pricing
        const apiUrl = campaignId
          ? `/api/products?limit=100&campaignId=${campaignId}`
          : schoolId
            ? `/api/products?limit=100&schoolId=${schoolId}`
            : '/api/products?limit=100';

        console.log('[PDFGenerator] Fetching products for preview with campaignId:', campaignId, 'schoolId:', schoolId, 'URL:', apiUrl);

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const fetchedProducts = Array.isArray(data.products) ? data.products : [];
          const topProducts = fetchedProducts
            .map(p => ({ ...p, order: p.order || 0 }))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .slice(0, 4) // Show 4 products to match PNG output
            .map(p => ({
              name: p.name || '',
              price: p.price || 0, // Use sales price from API (already includes custom prices)
              image: p.image || '/images/placeholder-product.svg'
            }));

          console.log('[PDFGenerator] Preview products fetched:', topProducts.map(p => `${p.name}: $${p.price}`));
          setPreviewProducts(topProducts);
        } else {
          console.error('[PDFGenerator] Failed to fetch products:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching products for preview:', error);
      }
    };

    fetchPreviewProducts();

    // Generate QR code for preview
    const generatePreviewQR = async () => {
      if (storeInfo) {
        try {
          const boutiqueUrl = getFullStoreUrl(storeInfo);
          const qrDataUrl = await QRCode.toDataURL(boutiqueUrl, {
            width: 200,
            margin: 1,
            color: {
              dark: '#000000', // Black to match PNG output
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrDataUrl);
        } catch (error) {
          console.error('Error generating QR code for preview:', error);
        }
      }
    };

    generatePreviewQR();
  }, [storeInfo]);

  // Separate effect to reload products when campaignId or schoolId becomes available
  useEffect(() => {
    if (!storeInfo) return;

    // Get campaignId and schoolId from storeInfo - campaignId is preferred
    const campaignId = storeInfo?.campaignId;
    const schoolId = storeInfo?.ownerSchool;

    if (!campaignId && !schoolId) {
      console.log('[PDFGenerator] No campaignId or schoolId found in storeInfo:', {
        campaignId: storeInfo?.campaignId,
        ownerSchool: storeInfo?.ownerSchool,
        storeInfoKeys: Object.keys(storeInfo || {})
      });
      return;
    }

    // Fetch products with correct campaignId or schoolId
    const fetchProducts = async () => {
      try {
        // Prefer campaignId over schoolId for custom pricing
        const apiUrl = campaignId
          ? `/api/products?limit=100&campaignId=${campaignId}`
          : `/api/products?limit=100&schoolId=${schoolId}`;

        console.log('[PDFGenerator] Reloading products with campaignId:', campaignId, 'schoolId:', schoolId);

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const fetchedProducts = Array.isArray(data.products) ? data.products : [];
          const topProducts = fetchedProducts
            .map(p => ({ ...p, order: p.order || 0 }))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .slice(0, 4)
            .map(p => ({
              name: p.name || '',
              price: p.price || 0,
              image: p.image || '/images/placeholder-product.svg'
            }));

          console.log('[PDFGenerator] Reloaded preview products:', topProducts.map(p => `${p.name}: $${p.price}`));
          setPreviewProducts(topProducts);
        }
      } catch (error) {
        console.error('Error reloading products:', error);
      }
    };

    fetchProducts();
  }, [storeInfo?.campaignId, storeInfo?.ownerSchool, storeInfo]);

  // Helper function to parse HTML and render formatted text in PDF
  const renderFormattedTextToPDF = (pdf, html, startX, startY, maxWidth, baseFontSize = 9) => {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = maxWidth + 'mm';
    tempDiv.innerHTML = html;

    // Add to DOM temporarily so getComputedStyle works
    document.body.appendChild(tempDiv);

    let currentY = startY;

    // Helper to get font size multiplier based on size classes and headers
    const getFontSizeMultiplier = (node, checkParents = true) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return 1.0;

      const className = typeof node.className === 'string' ? node.className : (node.className?.baseVal || '');
      const tagName = node.tagName?.toLowerCase() || '';
      const style = node.style || {};
      const computedStyle = window.getComputedStyle ? window.getComputedStyle(node) : null;

      // Priority 1: Check for Quill size classes FIRST (most reliable) - these are applied by Quill
      if (typeof className === 'string') {
        if (className.includes('ql-size-small')) return 0.75;
        if (className.includes('ql-size-large')) return 1.5;
        if (className.includes('ql-size-huge')) return 2.5; // Quill uses 2.5em for huge

        // Check for Quill size classes with values (e.g., ql-size-10, ql-size-12)
        const sizeMatch = className.match(/ql-size-(\d+)/);
        if (sizeMatch) {
          const sizeValue = parseInt(sizeMatch[1]);
          if (!isNaN(sizeValue)) return sizeValue / baseFontSize;
        }
      }

      // Priority 2: Check for inline font-size style
      if (style.fontSize) {
        const fontSizeStr = style.fontSize;
        if (fontSizeStr.includes('px')) {
          const pxValue = parseFloat(fontSizeStr);
          if (!isNaN(pxValue)) return pxValue / baseFontSize;
        } else if (fontSizeStr.includes('em')) {
          const emValue = parseFloat(fontSizeStr);
          if (!isNaN(emValue)) return emValue;
        } else if (fontSizeStr.includes('%')) {
          const pctValue = parseFloat(fontSizeStr);
          if (!isNaN(pctValue)) return pctValue / 100;
        }
      }

      // Priority 3: Check computed style (includes CSS classes) - only if element is in DOM
      if (computedStyle && computedStyle.fontSize) {
        const fontSizeStr = computedStyle.fontSize;
        if (fontSizeStr.includes('px')) {
          const pxValue = parseFloat(fontSizeStr);
          if (!isNaN(pxValue)) {
            const multiplier = pxValue / baseFontSize;
            if (Math.abs(multiplier - 1.0) > 0.05) return multiplier; // Only return if significantly different
          }
        } else if (fontSizeStr.includes('em')) {
          const emValue = parseFloat(fontSizeStr);
          if (!isNaN(emValue) && Math.abs(emValue - 1.0) > 0.05) return emValue;
        }
      }

      // Check for Quill size classes with values (e.g., ql-size-10, ql-size-12)
      const sizeMatch = className.match(/ql-size-(\d+)/);
      if (sizeMatch) {
        const sizeValue = parseInt(sizeMatch[1]);
        if (!isNaN(sizeValue)) return sizeValue / baseFontSize;
      }

      // Check for headers
      if (tagName === 'h1') return 2.0;
      if (tagName === 'h2') return 1.75;
      if (tagName === 'h3') return 1.5;
      if (tagName === 'h4') return 1.25;
      if (tagName === 'h5') return 1.1;
      if (tagName === 'h6') return 1.0;

      // Check parent nodes recursively for size classes (Quill wraps text in spans)
      if (checkParents) {
        let parent = node.parentNode;
        let depth = 0;
        while (parent && depth < 5) {
          if (parent.nodeType === Node.ELEMENT_NODE) {
            const parentMultiplier = getFontSizeMultiplier(parent, false); // Don't check parents recursively
            if (parentMultiplier !== 1.0) return parentMultiplier;
          }
          parent = parent.parentNode;
          depth++;
        }
      }

      return 1.0;
    };

    const processNode = (node, x, y, width, parentFontSize = baseFontSize) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text.trim()) {
          pdf.setFontSize(parentFontSize);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(60, 60, 60);
          const lineHeight = parentFontSize * 0.35; // mm
          const lines = pdf.splitTextToSize(text, width);
          lines.forEach((line, idx) => {
            pdf.text(line, x, y + (idx * lineHeight));
          });
          return y + (lines.length * lineHeight);
        }
        return y;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        let newX = x;
        let newY = y;

        // Calculate font size for this node - pass baseFontSize to helper
        const fontSizeMultiplier = getFontSizeMultiplier(node);
        const nodeFontSize = Math.max(4, Math.min(72, parentFontSize * fontSizeMultiplier)); // Clamp between 4 and 72
        const lineHeight = nodeFontSize * 0.35; // mm

        // Debug logging (can be removed later)
        if (fontSizeMultiplier !== 1.0 && tagName === 'span') {
          console.log('Size detected:', {
            className: node.className,
            style: node.style?.fontSize,
            multiplier: fontSizeMultiplier,
            calculatedSize: nodeFontSize
          });
        }

        // Apply styles based on tag
        const isBold = tagName === 'b' || tagName === 'strong' ||
          (node.style && node.style.fontWeight === 'bold') ||
          (node.style && node.style.fontWeight === '700');
        const isItalic = tagName === 'i' || tagName === 'em' ||
          (node.style && node.style.fontStyle === 'italic');
        const isUnderline = tagName === 'u' ||
          (node.style && node.style.textDecoration === 'underline') ||
          (node.style && node.style.textDecoration?.includes('underline'));

        // Get color
        let textColor = [60, 60, 60];
        if (node.style && node.style.color) {
          const colorStr = node.style.color;
          // Handle rgb() format
          if (colorStr.startsWith('rgb')) {
            const matches = colorStr.match(/\d+/g);
            if (matches && matches.length >= 3) {
              textColor = [parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2])];
            }
          } else {
            // Handle hex format
            const color = colorStr.replace('#', '');
            if (color.length === 6) {
              textColor = [
                parseInt(color.substring(0, 2), 16),
                parseInt(color.substring(2, 4), 16),
                parseInt(color.substring(4, 6), 16)
              ];
            }
          }
        }

        // Set font style
        if (isBold && isItalic) {
          pdf.setFont('helvetica', 'bolditalic');
        } else if (isBold) {
          pdf.setFont('helvetica', 'bold');
        } else if (isItalic) {
          pdf.setFont('helvetica', 'italic');
        } else {
          pdf.setFont('helvetica', 'normal');
        }

        // Set font size and color BEFORE processing children
        pdf.setFontSize(nodeFontSize);
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);

        // Process child nodes recursively with current font size
        Array.from(node.childNodes).forEach(child => {
          newY = processNode(child, newX, newY, width, nodeFontSize);
        });

        // Draw underline if needed
        if (isUnderline && node.textContent) {
          pdf.setFontSize(nodeFontSize);
          const textWidth = pdf.getTextWidth(node.textContent);
          pdf.setDrawColor(textColor[0], textColor[1], textColor[2]);
          pdf.setLineWidth(0.5);
          pdf.line(x, newY + 1, x + textWidth, newY + 1);
        }

        // Handle block elements
        if (tagName === 'p' || tagName === 'div') {
          newY += lineHeight * 0.5; // Add spacing after paragraph
        } else if (tagName === 'br') {
          newY += lineHeight;
        } else if (tagName.startsWith('h')) {
          newY += lineHeight * 0.5; // Add spacing after headers
        }

        return newY;
      }

      return y;
    };

    Array.from(tempDiv.childNodes).forEach(node => {
      currentY = processNode(node, startX, currentY, maxWidth, baseFontSize);
    });

    // Remove tempDiv from DOM
    document.body.removeChild(tempDiv);

    return currentY;
  };

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
      (!!navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
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
        toast.success('PDF téléchargé! Vérifiez vos téléchargements ou votre dossier de fichiers.');
      } catch (error) {
        console.error('Mobile download failed:', error);
        toast.error('Erreur lors du téléchargement. Essayez d\'ouvrir dans Chrome ou Safari.');
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

  // Generate PDF with pdfme (professional approach)
  const generatePDFWithPdfme = async () => {
    if (!storeInfo) {
      toast.error('Informations de la boutique non disponibles');
      return;
    }

    setIsGenerating(true);

    try {
      // Generate QR code
      const boutiqueUrl = getFullStoreUrl(storeInfo);
      const qrCodeDataUrl = await QRCode.toDataURL(boutiqueUrl, {
        width: 400,
        margin: 1,
        color: {
          dark: '#1E3A8A', // Dark blue to match template
          light: '#FFFFFF'
        }
      });

      // Fetch products ordered by order field (top 3-4 products)
      let products = [];
      try {
        // Get campaignId and schoolId from storeInfo to fetch products with correct prices
        // campaignId is preferred as it's more reliable for getting custom prices
        const campaignId = storeInfo?.campaignId;
        const schoolId = storeInfo?.ownerSchool;

        // Prefer campaignId over schoolId for custom pricing
        const apiUrl = campaignId
          ? `/api/products?limit=100&campaignId=${campaignId}`
          : schoolId
            ? `/api/products?limit=100&schoolId=${schoolId}`
            : '/api/products?limit=100';

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const fetchedProducts = Array.isArray(data.products) ? data.products : [];
          // Sort by order field and take top 4
          products = fetchedProducts
            .map(p => ({ ...p, order: p.order || 0 }))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .slice(0, 4)
            .map(p => ({
              name: p.name || '',
              price: p.price || 0, // Use sales price from API (already includes custom prices)
              image: p.image || '/images/placeholder-product.svg'
            }));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to empty products array
        products = [];
      }

      // Get student image URL (check if available in storeInfo or user data)
      // For now, we'll use placeholder or empty string
      // TODO: Add student image field to User model if needed
      const studentImageUrl = storeInfo?.ownerImage || storeInfo?.studentImage || null;

      // Convert HTML message to plain text for student text
      const stripHtml = (html) => {
        if (typeof window === 'undefined') return html;
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
      };
      const studentText = stripHtml(richTextContent);

      // Prepare inputs for pdfme
      const posterInputs = await preparePosterInputs({
        studentImageUrl,
        studentName: customName,
        studentText,
        products,
        qrCodeDataUrl,
      });

      // Create template (now async)
      const template = await createPosterTemplate();

      // Generate PDF
      const pdf = await generate({ template, inputs: posterInputs });

      // Download PDF
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `affiche-${storeInfo.name || 'boutique'}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Affiche PDF téléchargée avec succès!');
      setIsGenerating(false);
    } catch (error) {
      console.error('Error generating PDF with pdfme:', error);
      toast.error('Erreur lors de la génération du PDF: ' + (error.message || 'Erreur inconnue'));
      setIsGenerating(false);
    }
  };

  // Helper function to convert HTML to plain text
  const stripHtml = (html) => {
    if (typeof window === 'undefined') return html;
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Helper function to wrap text to fit within width
  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Helper function to draw speech bubble with tail
  const drawSpeechBubble = (ctx, x, y, width, height, tailX, tailY, tailSize = 30) => {
    ctx.beginPath();

    // Start from top-left corner
    const radius = 20;
    ctx.moveTo(x + radius, y);

    // Top edge
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);

    // Right edge
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);

    // Bottom edge (until tail starts)
    ctx.lineTo(tailX + tailSize, y + height);

    // Draw tail (triangle pointing down-left)
    ctx.lineTo(tailX, y + height + tailSize);
    ctx.lineTo(tailX - tailSize, y + height);

    // Continue bottom edge
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);

    // Left edge
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);

    ctx.closePath();
  };

  // Generate PNG using template image
  const generatePNG = async () => {
    if (!storeInfo) {
      toast.error('Informations de la boutique non disponibles');
      return;
    }

    setIsGenerating(true);

    try {
      // Template dimensions are fixed: 2550 x 3300 px
      const templateWidth = 2550;
      const templateHeight = 3300;

      // Load template image and bubble image in parallel
      const [templateImg, bubbleImg] = await Promise.all([
        loadImage('/images/template-massibec1.png'),
        loadImage('/images/icon_for_price.png')
      ]);

      // Create canvas with template dimensions
      const canvas = document.createElement('canvas');
      canvas.width = templateWidth;
      canvas.height = templateHeight;
      const ctx = canvas.getContext('2d');

      // Draw template as base (scale if needed)
      ctx.drawImage(templateImg, 0, 0, templateWidth, templateHeight);

      // Fetch products ordered by order field (top 4)
      let products = [];
      try {
        // Get campaignId and schoolId from storeInfo to fetch products with correct prices
        // campaignId is preferred as it's more reliable for getting custom prices
        const campaignId = storeInfo?.campaignId;
        const schoolId = storeInfo?.ownerSchool;

        // Prefer campaignId over schoolId for custom pricing
        const apiUrl = campaignId
          ? `/api/products?limit=100&campaignId=${campaignId}`
          : schoolId
            ? `/api/products?limit=100&schoolId=${schoolId}`
            : '/api/products?limit=100';

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const fetchedProducts = Array.isArray(data.products) ? data.products : [];
          products = fetchedProducts
            .map(p => ({ ...p, order: p.order || 0 }))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .slice(0, 4)
            .map(p => ({
              name: p.name || '',
              price: p.price || 0, // Use sales price from API (already includes custom prices)
              image: p.image || '/images/placeholder-product.svg'
            }));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }

      // Canvas dimensions (should match template dimensions)
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Scale factor (should be 1.0 if template is correct)
      const scaleX = canvasWidth / templateWidth;
      const scaleY = canvasHeight / templateHeight;

      // Helper function to scale coordinates
      const scaleCoord = (coord, useX = true) => coord * (useX ? scaleX : scaleY);

      // Product positions and sizes (exact coordinates from new template)
      const productConfigs = [
        // First product - Pâté à la viande
        {
          image: { x: 1218.9, y: 541.4, width: 845.8, height: 833.4 },
          name: { x: 1476.3, y: 1397.8, width: 384.9, height: 62.5 },
          // Bubble positioned to overlap top-right of product: product ends at ~2064, bubble starts at ~1850
          bubble: { x: 1850, y: 470, width: 371.8, height: 239.5, rotation: 0 }
        },
        // Second product - Pâté au poulet
        {
          image: { x: 341.5, y: 1616.6, width: 571.1, height: 563.6 },
          name: { x: 449.2, y: 2202.9, width: 355.7, height: 62.5 },
          // Bubble positioned to overlap upper portion: product ends at ~912, bubble starts at ~750
          bubble: { x: 750, y: 1550, width: 239.8, height: 154.4, rotation: -180 }
        },
        // Third product - Tarte au sucre à la crème
        {
          image: { x: 1034.3, y: 1616.6, width: 568.3, height: 563.6 },
          name: { x: 997.9, y: 2204.9, width: 617.7, height: 62.5 },
          // Bubble positioned to overlap upper portion: product ends at ~1602, bubble starts at ~1440
          bubble: { x: 1440, y: 1550, width: 239.8, height: 154.4, rotation: -180 }
        },
        // Fourth product - Tarte aux framboises
        {
          image: { x: 1712.9, y: 1616.6, width: 568.3, height: 563.6 },
          name: { x: 1737.6, y: 2202.9, width: 519.0, height: 62.5 },
          // Bubble positioned to overlap upper portion: product ends at ~2281, bubble starts at ~2120
          bubble: { x: 2120, y: 1550, width: 239.8, height: 154.4, rotation: -180 }
        }
      ];

      // Draw products (4 products with bubbles)
      for (let i = 0; i < Math.min(products.length, 4); i++) {
        const product = products[i];
        const config = productConfigs[i];

        const baseWidth = config.image.width;
        const baseHeight = config.image.height;

        const baseDrawX = scaleCoord(config.image.x);
        const baseDrawY = scaleCoord(config.image.y, false);
        const baseDrawWidth = scaleCoord(baseWidth);
        const baseDrawHeight = scaleCoord(baseHeight, false);

        let productImg = null;
        try {
          productImg = await loadImage(product.image);
        } catch (error) {
          console.error(`Error loading product image for ${product.name}:`, error);
        }

        if (productImg) {
          const imgAspectRatio = productImg.width / productImg.height;
          let imgWidth = baseWidth;
          let imgHeight = baseHeight;

          if (imgAspectRatio > baseWidth / baseHeight) {
            imgWidth = baseWidth;
            imgHeight = baseWidth / imgAspectRatio;
            if (imgHeight > baseHeight + 20) {
              imgHeight = baseHeight + 20;
              imgWidth = imgHeight * imgAspectRatio;
            } else if (imgHeight < baseHeight - 20) {
              imgHeight = baseHeight - 20;
              imgWidth = imgHeight * imgAspectRatio;
            }
          } else {
            imgHeight = baseHeight;
            imgWidth = baseHeight * imgAspectRatio;
            if (imgWidth > baseWidth + 20) {
              imgWidth = baseWidth + 20;
              imgHeight = imgWidth / imgAspectRatio;
            } else if (imgWidth < baseWidth - 20) {
              imgWidth = baseWidth - 20;
              imgHeight = imgWidth / imgAspectRatio;
            }
          }

          const centerXTemplate = config.image.x + baseWidth / 2;
          const centerYTemplate = config.image.y + baseHeight / 2;
          const finalImgXTemplate = centerXTemplate - imgWidth / 2;
          const finalImgYTemplate = centerYTemplate - imgHeight / 2;

          const finalImgX = scaleCoord(finalImgXTemplate);
          const finalImgY = scaleCoord(finalImgYTemplate, false);
          const scaledImgWidth = scaleCoord(imgWidth);
          const scaledImgHeight = scaleCoord(imgHeight, false);

          ctx.drawImage(productImg, finalImgX, finalImgY, scaledImgWidth, scaledImgHeight);
        } else {
          ctx.fillStyle = '#E0E0E0';
          ctx.fillRect(baseDrawX, baseDrawY, baseDrawWidth, baseDrawHeight);
        }

        // Draw product name below product image (rendered beneath bubble)
        const nameX = scaleCoord(config.name.x);
        const nameY = scaleCoord(config.name.y, false);
        const nameWidth = scaleCoord(config.name.width);
        const nameHeight = scaleCoord(config.name.height, false);

        // Improved font styling: larger base size, better line height
        // Top product gets larger font, others get consistent smaller size
        const baseFontSize = i === 0 ? Math.max(28, Math.min(42, nameHeight * 0.65)) : Math.max(24, Math.min(34, nameHeight * 0.75));
        ctx.font = `600 ${baseFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
        ctx.fillStyle = '#000000'; // Pure black for maximum contrast
        ctx.textBaseline = 'top';

        // Calculate product image center for better alignment
        const productCenterX = scaleCoord(config.image.x + config.image.width / 2);

        // For bottom three products (i > 0), center text relative to product image
        // For top product (i === 0), keep left alignment
        if (i === 0) {
          ctx.textAlign = 'left';
        } else {
          ctx.textAlign = 'center';
        }

        // Wrap text with better spacing
        const productNameLines = wrapText(ctx, product.name, nameWidth);
        const lineHeight = baseFontSize * 1.3; // Slightly increased line spacing for better readability
        const maxLines = Math.floor(nameHeight / lineHeight);
        const displayLines = productNameLines.slice(0, maxLines);

        // Center text vertically within the available height
        const totalTextHeight = displayLines.length * lineHeight;
        const verticalOffset = (nameHeight - totalTextHeight) / 2;

        // Use centered X for bottom products, original X for top product
        const finalX = i === 0 ? nameX : productCenterX;

        displayLines.forEach((line, lineIdx) => {
          ctx.fillText(line, finalX, nameY + verticalOffset + lineIdx * lineHeight);
        });
      }

      // Draw all price bubbles AFTER all products (so they appear on top)
      for (let i = 0; i < Math.min(products.length, 4); i++) {
        const product = products[i];
        const config = productConfigs[i];

        // Draw price bubble image above other layers
        const rawPrice = product.price;
        let numericPrice = typeof rawPrice === 'number'
          ? rawPrice
          : parseFloat(String(rawPrice).replace(',', '.').replace(/[^0-9.-]/g, ''));
        if (Number.isNaN(numericPrice)) {
          numericPrice = null;
        }
        const priceText = numericPrice !== null ? `$${numericPrice.toFixed(2)}` : (rawPrice ? String(rawPrice) : '');

        if (config.bubble && bubbleImg && priceText) {
          const bubbleX = scaleCoord(config.bubble.x);
          const bubbleY = scaleCoord(config.bubble.y, false);
          const bubbleWidth = scaleCoord(config.bubble.width);
          const bubbleHeight = scaleCoord(config.bubble.height, false);
          const rotation = config.bubble.rotation || 0;
          const centerX = bubbleX + bubbleWidth / 2;
          const centerY = bubbleY + bubbleHeight / 2;

          ctx.save();

          // Apply rotation if needed
          if (rotation !== 0) {
            ctx.translate(centerX, centerY);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
          }

          // Draw the full bubble image at exact coordinates
          ctx.drawImage(bubbleImg, bubbleX, bubbleY, bubbleWidth, bubbleHeight);

          ctx.restore();

          // Draw price text inside bubble (always upright, regardless of bubble rotation)
          // Adjust position slightly higher and left for better centering
          const textOffsetX = -bubbleWidth * 0.02; // Slightly left
          const textOffsetY = -bubbleHeight * 0.05; // Slightly higher
          const textX = centerX + textOffsetX;
          const textY = centerY + textOffsetY;

          // Larger font size for first product (top bubble), smaller for others
          const priceFontSize = i === 0
            ? Math.max(28, Math.min(58, bubbleHeight * 0.5)) // First product: larger
            : Math.max(18, Math.min(48, bubbleHeight * 0.4)); // Other products: smaller
          ctx.font = `bold ${priceFontSize}px sans-serif`;
          ctx.fillStyle = '#333333';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Text is always upright - no rotation applied to text
          ctx.fillText(priceText, textX, textY);
        }
      }

      // Products loop continues here for drawing names...
      // Actually, we already drew names above, so this is fine

      // Draw student name (positioned above photo)
      const studentNameX = scaleCoord(142.0);
      const studentNameY = scaleCoord(2403.6, false);
      const studentNameWidth = scaleCoord(628.6);
      const studentNameHeight = scaleCoord(102.6, false);

      const studentName = customName || storeInfo?.ownerName || storeInfo?.name || '';
      const nameFontSize = Math.max(20, Math.min(40, studentNameHeight * 0.5));
      ctx.font = `bold ${nameFontSize}px sans-serif`;
      ctx.fillStyle = '#1E3A8A'; // Dark blue
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Wrap student name (can be on two lines)
      const studentNameLines = wrapText(ctx, studentName, studentNameWidth);
      const nameLineHeight = nameFontSize * 1.2;
      const maxNameLines = Math.floor(studentNameHeight / nameLineHeight);
      const displayNameLines = studentNameLines.slice(0, maxNameLines);

      displayNameLines.forEach((line, lineIdx) => {
        ctx.fillText(line, studentNameX, studentNameY + lineIdx * nameLineHeight);
      });

      // Draw student photo (if available)
      const photoX = scaleCoord(142.0);
      const photoY = scaleCoord(2529.2, false);
      const photoWidth = scaleCoord(632.6);
      const photoHeight = scaleCoord(702.9, false);

      if (studentPhotoUrl) {
        try {
          const studentPhotoImg = await loadImage(studentPhotoUrl);

          // Calculate aspect ratio to maintain proportions
          const photoAspectRatio = studentPhotoImg.width / studentPhotoImg.height;
          let finalPhotoWidth = photoWidth;
          let finalPhotoHeight = photoHeight;

          // Maintain aspect ratio while fitting in the area
          if (photoAspectRatio > photoWidth / photoHeight) {
            finalPhotoWidth = photoWidth;
            finalPhotoHeight = photoWidth / photoAspectRatio;
          } else {
            finalPhotoHeight = photoHeight;
            finalPhotoWidth = photoHeight * photoAspectRatio;
          }

          // Center photo in the area
          const centerX = photoX + photoWidth / 2;
          const centerY = photoY + photoHeight / 2;
          const finalPhotoX = centerX - finalPhotoWidth / 2;
          const finalPhotoY = centerY - finalPhotoHeight / 2;

          // Draw student photo
          ctx.drawImage(studentPhotoImg, finalPhotoX, finalPhotoY, finalPhotoWidth, finalPhotoHeight);
        } catch (error) {
          console.error('Error loading student photo:', error);
        }
      }

      // Draw student text (to the right of photo)
      const studentTextX = scaleCoord(804.9);
      const studentTextY = scaleCoord(2536.1, false);
      const studentTextWidth = scaleCoord(1239.6);
      const studentTextHeight = scaleCoord(730.9, false);

      // Draw text box border
      ctx.strokeStyle = '#E0E0E0'; // Light gray border
      ctx.lineWidth = 2;
      ctx.strokeRect(studentTextX, studentTextY, studentTextWidth, studentTextHeight);

      const studentText = stripHtml(richTextContent);

      // Padding inside the box
      const padding = scaleCoord(20);
      const innerX = studentTextX + padding;
      const innerY = studentTextY + padding;
      const innerWidth = studentTextWidth - (padding * 2);
      const innerHeight = studentTextHeight - (padding * 2);

      // Improved styling: bold, clean, readable font
      // Calculate font size to fit text within the box area
      let studentFontSize = Math.max(32, Math.min(42, innerHeight / 12));
      let textFits = false;
      let attempts = 0;
      const maxAttempts = 15;

      // Function to smartly wrap text respecting line breaks and box width
      const smartWrapText = (text, maxWidth, fontSize) => {
        const lines = [];
        const rawLines = text.split('\n').filter(line => line.trim().length > 0);

        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
        ctx.textAlign = 'center';

        rawLines.forEach(rawLine => {
          const words = rawLine.trim().split(/\s+/);
          let currentLine = '';

          words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width <= maxWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) {
                lines.push(currentLine);
              }
              currentLine = word;
            }
          });

          if (currentLine) {
            lines.push(currentLine);
          }
        });

        return lines;
      };

      // Find optimal font size that fits the text in the box
      let finalLines = [];
      while (!textFits && attempts < maxAttempts) {
        ctx.font = `bold ${studentFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
        finalLines = smartWrapText(studentText, innerWidth, studentFontSize);
        const lineHeight = studentFontSize * 1.5;
        const totalHeight = finalLines.length * lineHeight;

        if (totalHeight <= innerHeight) {
          textFits = true;
        } else {
          studentFontSize = studentFontSize * 0.92; // Reduce font size
          attempts++;
        }
      }

      // Draw the text
      ctx.font = `bold ${studentFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillStyle = '#000000'; // Pure black for maximum contrast
      ctx.textAlign = 'center'; // Center-aligned text
      ctx.textBaseline = 'top';

      const studentLineHeight = studentFontSize * 1.5; // Generous line spacing
      const textCenterX = innerX + innerWidth / 2;

      // Center text vertically within the box
      const totalTextHeight = finalLines.length * studentLineHeight;
      const verticalOffset = (innerHeight - totalTextHeight) / 2;

      finalLines.forEach((line, lineIdx) => {
        const lineY = innerY + verticalOffset + lineIdx * studentLineHeight;
        ctx.fillText(line, textCenterX, lineY);
      });

      // Generate and draw QR code in bottom right
      const boutiqueUrl = getFullStoreUrl(storeInfo);
      const qrCodeDataUrl = await QRCode.toDataURL(boutiqueUrl, {
        width: 400,
        margin: 1,
        color: {
          dark: '#000000', // Pure black for better contrast and scanability
          light: '#FFFFFF'
        }
      });

      // Draw QR code at exact template position (adjusted slightly left and up)
      const qrX = scaleCoord(2140);
      const qrY = scaleCoord(2702, false);
      const qrSize = scaleCoord(278.4); // Exact size from template

      const qrImg = await loadImage(qrCodeDataUrl);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Erreur lors de la création de l\'image');
          setIsGenerating(false);
          return;
        }

        try {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `affiche-${storeInfo.name || 'boutique'}.png`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);

          toast.success('Affiche PNG téléchargée! Vous pouvez maintenant l\'imprimer.');
        } catch (downloadError) {
          console.error('Download error:', downloadError);
          const dataUrl = canvas.toDataURL('image/png');
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(`<img src="${dataUrl}" style="max-width: 100%;" />`);
            toast.info('Image ouverte dans une nouvelle fenêtre. Faites clic droit pour enregistrer.');
          } else {
            toast.error('Impossible de télécharger l\'image. Vérifiez les paramètres de votre navigateur.');
          }
        }
        setIsGenerating(false);
      }, 'image/png', 1.0); // Maximum quality

    } catch (error) {
      console.error('Error generating PNG:', error);
      toast.error('Erreur lors de la génération de l\'image: ' + (error.message || 'Erreur inconnue'));
      setIsGenerating(false);
    }
  };

  const generatePDF = async () => {
    if (!storeInfo) {
      toast.error('Informations de la boutique non disponibles');
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

      // Header section with improved design
      const headerY = 18;
      const headerHeight = 35;

      // Header background with gradient effect (using multiple rectangles)
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(15, headerY, pageWidth - 30, headerHeight, 3, 3, 'F');

      // Decorative border
      pdf.setDrawColor(139, 69, 19);
      pdf.setLineWidth(1);
      pdf.roundedRect(15, headerY, pageWidth - 30, headerHeight, 3, 3, 'S');

      // Inner decorative line
      pdf.setDrawColor(218, 165, 32);
      pdf.setLineWidth(0.5);
      pdf.line(18, headerY + headerHeight - 2, pageWidth - 18, headerY + headerHeight - 2);

      // Logo - Use school logo if available, otherwise Massibec logo (MUCH BIGGER)
      let logoLoaded = false;
      const logoWidth = 70; // Increased from 40
      const logoHeight = 25; // Increased from 15
      const logoX = pageWidth / 2 - logoWidth / 2; // Centered
      const logoY = headerY + 5;

      if (schoolLogoUrl) {
        try {
          const logoImg = await loadImage(schoolLogoUrl);
          // Maintain aspect ratio
          const logoAspectRatio = logoImg.width / logoImg.height;
          let finalLogoWidth = logoWidth;
          let finalLogoHeight = logoHeight;

          if (logoAspectRatio > logoWidth / logoHeight) {
            finalLogoHeight = logoWidth / logoAspectRatio;
          } else {
            finalLogoWidth = logoHeight * logoAspectRatio;
          }

          const centeredLogoX = pageWidth / 2 - finalLogoWidth / 2;
          pdf.addImage(logoImg, 'PNG', centeredLogoX, logoY, finalLogoWidth, finalLogoHeight);
          logoLoaded = true;
        } catch (e) {
          console.log('School logo non charge, utilisation du logo Massibec');
        }
      }

      if (!logoLoaded) {
        try {
          const logoImg = await loadImage('/images/logo_massibec.png');
          const logoAspectRatio = logoImg.width / logoImg.height;
          let finalLogoWidth = logoWidth;
          let finalLogoHeight = logoHeight;

          if (logoAspectRatio > logoWidth / logoHeight) {
            finalLogoHeight = logoWidth / logoAspectRatio;
          } else {
            finalLogoWidth = logoHeight * logoAspectRatio;
          }

          const centeredLogoX = pageWidth / 2 - finalLogoWidth / 2;
          pdf.addImage(logoImg, 'PNG', centeredLogoX, logoY, finalLogoWidth, finalLogoHeight);
        } catch (e) {
          console.log('Logo Massibec non charge');
        }
      }

      // Titre principal - moved below logo
      pdf.setTextColor(139, 69, 19);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Campagne de Financement', pageWidth / 2, logoY + logoHeight + 8, { align: 'center' });

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      // Use school/organization name instead of "Massibec" if available
      const organizationName = schoolName || 'Massibec';
      pdf.setTextColor(160, 82, 45);
      pdf.text(organizationName, pageWidth / 2, logoY + logoHeight + 14, { align: 'center' });

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

      let yPos = headerY + headerHeight + 15;

      // Titre "Nos Produits" with decorative underline
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(139, 69, 19);
      pdf.text('Nos Délicieux Produits', pageWidth / 2, yPos, { align: 'center' });

      // Decorative underline
      const underlineWidth = 80;
      const underlineX = pageWidth / 2 - underlineWidth / 2;
      pdf.setDrawColor(218, 165, 32);
      pdf.setLineWidth(2);
      pdf.line(underlineX, yPos + 2, underlineX + underlineWidth, yPos + 2);

      yPos += 15;

      // Liste des produits en 2 colonnes avec images
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const colWidth = (pageWidth - 50) / 2;
      const col1X = 20;
      const col2X = pageWidth / 2 + 5;
      const rowHeight = 22; // Increased height
      const imgSize = 20; // Increased image size

      for (let i = 0; i < productList.length; i++) {
        const product = productList[i];
        const isLeftColumn = i % 2 === 0;
        const xPos = isLeftColumn ? col1X : col2X;

        // Carte de produit avec fond blanc et ombre légère
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(xPos, yPos - 2, colWidth - 5, rowHeight, 3, 3, 'F');

        // Subtle border
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(xPos, yPos - 2, colWidth - 5, rowHeight, 3, 3, 'S');

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

          const imgX = xPos + 4;
          const imgY = yPos + (rowHeight - finalImgHeight) / 2 - 2;

          pdf.addImage(productImg, 'PNG', imgX, imgY, finalImgWidth, finalImgHeight);
        } catch (e) {
          console.log(`Image ${product.name} non chargee`);
        }

        // Nom du produit
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(50, 50, 50);
        const textX = xPos + imgSize + 8;
        pdf.text(product.name, textX, yPos + 6);

        // Prix with highlight background
        pdf.setFillColor(255, 248, 220);
        pdf.roundedRect(textX - 1, yPos + 10, 25, 8, 2, 2, 'F');
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(139, 69, 19);
        pdf.text(product.price, textX + 2, yPos + 15);
        pdf.setFont('helvetica', 'normal');

        if (!isLeftColumn) {
          yPos += rowHeight + 3;
        }
      }

      // Section QR Code + Message Etudiant with improved design
      yPos += 18;
      const sectionHeight = 75; // Increased height

      // Cadre general avec fond blanc et ombre
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(15, yPos, pageWidth - 30, sectionHeight, 6, 6, 'F');

      // Double border effect
      pdf.setDrawColor(139, 69, 19);
      pdf.setLineWidth(1.5);
      pdf.roundedRect(15, yPos, pageWidth - 30, sectionHeight, 6, 6, 'S');

      // Inner decorative border
      pdf.setDrawColor(218, 165, 32);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(17, yPos + 2, pageWidth - 34, sectionHeight - 4, 4, 4, 'S');

      // QR CODE - Larger and better positioned
      const qrSize = 50; // Increased from 45
      const qrX = 22;
      const qrY = yPos + (sectionHeight - qrSize) / 2;

      const boutiqueUrl = getFullStoreUrl(storeInfo);
      const qrCodeDataUrl = await QRCode.toDataURL(boutiqueUrl, {
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

      // MESSAGE PERSONNALISE DE L'ETUDIANT - A droite with better styling
      const textAreaX = qrX + qrSize + 12;
      const textAreaWidth = pageWidth - 30 - (qrX + qrSize + 12) - 12;
      const textAreaY = yPos + 12;

      // Nom de l'etudiant - use automatically from storeInfo with highlight
      const studentName = customName || storeInfo?.ownerName || storeInfo?.name || 'Votre nom';
      pdf.setFillColor(255, 248, 220);
      pdf.roundedRect(textAreaX - 2, textAreaY - 6, textAreaWidth + 4, 8, 2, 2, 'F');
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(139, 69, 19);
      pdf.text(studentName, textAreaX, textAreaY);

      // Message personnalise avec formatage riche (HTML)
      let messageY = textAreaY + 8;
      messageY = renderFormattedTextToPDF(pdf, richTextContent, textAreaX, messageY, textAreaWidth, 9);

      // Add closing message at the bottom
      messageY += 8;
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text('🙏 Merci pour votre soutien et votre participation !', textAreaX, messageY, { maxWidth: textAreaWidth });

      // Save PDF with mobile-friendly method
      const fileName = `affiche-${storeInfo.name || 'boutique'}.pdf`;
      downloadPDF(pdf, fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la generation du PDF');
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
            <Label htmlFor="studentSchoolText" className="text-sm font-medium">Texte sous votre photo (ex: Élève de...)</Label>
            <Input
              id="studentSchoolText"
              value={studentSchoolText}
              onChange={(e) => {
                const value = e.target.value;
                setStudentSchoolText(value);
                // Save to localStorage
                if (typeof window !== 'undefined' && storeInfo?.storeId) {
                  const storageKey = `studentPhoto_${storeInfo.storeId}`;
                  if (value) {
                    localStorage.setItem(`${storageKey}_text`, value);
                  } else {
                    localStorage.removeItem(`${storageKey}_text`);
                  }
                }
              }}
              placeholder="Ex: Élève du Séminaire Saint-Joseph"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="studentPhoto" className="text-sm font-medium">Photo de l'élève</Label>
            <ImageUpload
              value={studentPhotoUrl}
              onChange={(url) => {
                setStudentPhotoUrl(url);
                // Save to localStorage
                if (typeof window !== 'undefined' && storeInfo?.storeId) {
                  const storageKey = `studentPhoto_${storeInfo.storeId}`;
                  if (url) {
                    localStorage.setItem(storageKey, url);
                  } else {
                    localStorage.removeItem(storageKey);
                  }
                }
              }}
              className="mt-1"
              showPreview={true}
              previewClassName="max-w-xs"
            />
            <p className="text-xs text-gray-500 mt-2">
              Ajoutez une photo de l'élève qui apparaîtra dans le coin inférieur gauche de l'affiche
            </p>
          </div>

          <div>
            <Label htmlFor="richTextEditor" className="text-sm font-medium">Message personnalisé</Label>
            <style dangerouslySetInnerHTML={{ __html: quillStyles }} />
            <div className="mt-1" style={{ minHeight: '380px' }}>
              <ReactQuill
                theme="snow"
                value={richTextContent}
                onChange={setRichTextContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Écrivez votre message personnalisé..."
                style={{ minHeight: '330px' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Utilisez la barre d'outils pour formater votre texte : gras, italique, couleurs, taille, etc.
            </p>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={generatePDFWithPdfme}
              disabled={isGenerating || !storeInfo}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-4 sm:py-6"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generation...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Telecharger PDF
                </>
              )}
            </Button>

            <Button
              onClick={generatePNG}
              disabled={isGenerating || !storeInfo}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 sm:py-6"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generation...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Telecharger PNG
                </>
              )}
            </Button>
          </div>

          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">💡 Note:</span> Téléchargez l'affiche au format PDF ou PNG haute qualité, prête pour l'impression. Le PNG utilise le template Massibec avec vos produits et votre message personnalisé.
            </p>
          </div>
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
          <div className="p-3 sm:p-4 rounded-lg">
            {/* Template dimensions: 2550 x 3300 px */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden relative" style={{ aspectRatio: '2550/3300' }} data-poster-preview>
              {/* Template background */}
              <img
                src="/images/template-massibec1.png"
                alt="Template"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Product 1 - Pâté à la viande: (1218.9, 541.4), size 845.8 x 833.4 */}
              {previewProducts[0] && (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: `${(1218.9 / 2550) * 100}%`,
                      top: `${(541.4 / 3300) * 100}%`,
                      width: `${(845.8 / 2550) * 100}%`,
                      height: `${(833.4 / 3300) * 100}%`
                    }}
                  >
                    <img
                      src={previewProducts[0].image}
                      alt={previewProducts[0].name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                  {/* Product 1 name: (1476.3, 1397.8), size 384.9 x 62.5 */}
                  <div
                    className="absolute font-bold text-black text-left"
                    style={{
                      left: `${(1476.3 / 2550) * 100}%`,
                      top: `${(1397.8 / 3300) * 100}%`,
                      width: `${(384.9 / 2550) * 100}%`,
                      height: `${(62.5 / 3300) * 100}%`,
                      fontSize: 'clamp(5px, 0.6vw, 10px)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {previewProducts[0].name}
                  </div>
                  {/* Product 1 bubble: (1850, 540), size 371.8 x 239.5 */}
                  <div
                    className="absolute"
                    style={{
                      left: `${(1850 / 2550) * 100}%`,
                      top: `${(540 / 3300) * 100}%`,
                      width: `${(371.8 / 2550) * 100}%`,
                      height: `${(239.5 / 3300) * 100}%`
                    }}
                  >
                    <img
                      src="/images/icon_for_price.png"
                      alt="Price bubble"
                      className="w-full h-full object-contain"
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center font-bold text-black"
                      style={{ fontSize: 'clamp(5px, 0.7vw, 12px)' }}
                    >
                      ${previewProducts[0].price.toFixed(2)}
                    </div>
                  </div>
                </>
              )}

              {/* Product 2 - Pâté au poulet: (341.5, 1616.6), size 571.1 x 563.6 */}
              {previewProducts[1] && (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: `${(341.5 / 2550) * 100}%`,
                      top: `${(1616.6 / 3300) * 100}%`,
                      width: `${(571.1 / 2550) * 100}%`,
                      height: `${(563.6 / 3300) * 100}%`
                    }}
                  >
                    <img
                      src={previewProducts[1].image}
                      alt={previewProducts[1].name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                  {/* Product 2 name: (449.2, 2202.9), size 355.7 x 62.5, centered */}
                  <div
                    className="absolute font-bold text-black text-center"
                    style={{
                      left: `${(449.2 / 2550) * 100}%`,
                      top: `${(2202.9 / 3300) * 100}%`,
                      width: `${(355.7 / 2550) * 100}%`,
                      height: `${(62.5 / 3300) * 100}%`,
                      fontSize: 'clamp(4px, 0.5vw, 9px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {previewProducts[1].name}
                  </div>
                  {/* Product 2 bubble: (750, 1550), size 239.8 x 154.4, rotated -180° */}
                  <div
                    className="absolute"
                    style={{
                      left: `${(750 / 2550) * 100}%`,
                      top: `${(1550 / 3300) * 100}%`,
                      width: `${(239.8 / 2550) * 100}%`,
                      height: `${(154.4 / 3300) * 100}%`,
                      transform: 'rotate(-180deg)',
                      transformOrigin: 'center'
                    }}
                  >
                    <img
                      src="/images/icon_for_price.png"
                      alt="Price bubble"
                      className="w-full h-full object-contain"
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center font-bold text-black"
                      style={{ fontSize: 'clamp(4px, 0.5vw, 9px)', transform: 'rotate(180deg)' }}
                    >
                      ${previewProducts[1].price.toFixed(2)}
                    </div>
                  </div>
                </>
              )}

              {/* Product 3 - Tarte au sucre: (1034.3, 1616.6), size 568.3 x 563.6 */}
              {previewProducts[2] && (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: `${(1034.3 / 2550) * 100}%`,
                      top: `${(1616.6 / 3300) * 100}%`,
                      width: `${(568.3 / 2550) * 100}%`,
                      height: `${(563.6 / 3300) * 100}%`
                    }}
                  >
                    <img
                      src={previewProducts[2].image}
                      alt={previewProducts[2].name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                  {/* Product 3 name: (997.9, 2204.9), size 617.7 x 62.5, centered */}
                  <div
                    className="absolute font-bold text-black text-center"
                    style={{
                      left: `${(997.9 / 2550) * 100}%`,
                      top: `${(2204.9 / 3300) * 100}%`,
                      width: `${(617.7 / 2550) * 100}%`,
                      height: `${(62.5 / 3300) * 100}%`,
                      fontSize: 'clamp(4px, 0.5vw, 9px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {previewProducts[2].name}
                  </div>
                  {/* Product 3 bubble: (1440, 1550), size 239.8 x 154.4, rotated -180° */}
                  <div
                    className="absolute"
                    style={{
                      left: `${(1440 / 2550) * 100}%`,
                      top: `${(1550 / 3300) * 100}%`,
                      width: `${(239.8 / 2550) * 100}%`,
                      height: `${(154.4 / 3300) * 100}%`,
                      transform: 'rotate(-180deg)',
                      transformOrigin: 'center'
                    }}
                  >
                    <img
                      src="/images/icon_for_price.png"
                      alt="Price bubble"
                      className="w-full h-full object-contain"
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center font-bold text-black"
                      style={{ fontSize: 'clamp(4px, 0.5vw, 9px)', transform: 'rotate(180deg)' }}
                    >
                      ${previewProducts[2].price.toFixed(2)}
                    </div>
                  </div>
                </>
              )}

              {/* Product 4 - Tarte aux framboises: (1712.9, 1616.6), size 568.3 x 563.6 */}
              {previewProducts[3] && (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: `${(1712.9 / 2550) * 100}%`,
                      top: `${(1616.6 / 3300) * 100}%`,
                      width: `${(568.3 / 2550) * 100}%`,
                      height: `${(563.6 / 3300) * 100}%`
                    }}
                  >
                    <img
                      src={previewProducts[3].image}
                      alt={previewProducts[3].name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                  {/* Product 4 name: (1737.6, 2202.9), size 519.0 x 62.5, centered */}
                  <div
                    className="absolute font-bold text-black text-center"
                    style={{
                      left: `${(1737.6 / 2550) * 100}%`,
                      top: `${(2202.9 / 3300) * 100}%`,
                      width: `${(519.0 / 2550) * 100}%`,
                      height: `${(62.5 / 3300) * 100}%`,
                      fontSize: 'clamp(4px, 0.5vw, 9px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {previewProducts[3].name}
                  </div>
                  {/* Product 4 bubble: (2120, 1550), size 239.8 x 154.4, rotated -180° */}
                  <div
                    className="absolute"
                    style={{
                      left: `${(2120 / 2550) * 100}%`,
                      top: `${(1550 / 3300) * 100}%`,
                      width: `${(239.8 / 2550) * 100}%`,
                      height: `${(154.4 / 3300) * 100}%`,
                      transform: 'rotate(-180deg)',
                      transformOrigin: 'center'
                    }}
                  >
                    <img
                      src="/images/icon_for_price.png"
                      alt="Price bubble"
                      className="w-full h-full object-contain"
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center font-bold text-black"
                      style={{ fontSize: 'clamp(4px, 0.5vw, 9px)', transform: 'rotate(180deg)' }}
                    >
                      ${previewProducts[3].price.toFixed(2)}
                    </div>
                  </div>
                </>
              )}

              {/* Student name: (142.0, 2403.6), size 628.6 x 102.6 */}
              <div
                className="absolute font-bold text-blue-800"
                style={{
                  left: `${(142.0 / 2550) * 100}%`,
                  top: `${(2403.6 / 3300) * 100}%`,
                  width: `${(628.6 / 2550) * 100}%`,
                  height: `${(102.6 / 3300) * 100}%`,
                  fontSize: 'clamp(5px, 0.6vw, 11px)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {customName || 'Votre nom'}
              </div>

              {/* Student photo: (142.0, 2529.2), size 632.6 x 702.9 */}
              {studentPhotoUrl && (
                <div
                  className="absolute overflow-hidden rounded-lg"
                  style={{
                    left: `${(142.0 / 2550) * 100}%`,
                    top: `${(2529.2 / 3300) * 100}%`,
                    width: `${(632.6 / 2550) * 100}%`,
                    height: `${(702.9 / 3300) * 100}%`
                  }}
                >
                  <img
                    src={studentPhotoUrl}
                    alt="Student"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Student text box: (804.9, 2536.1), size 1239.6 x 730.9 */}
              <div
                className="absolute border-2 border-gray-300 bg-white"
                style={{
                  left: `${(804.9 / 2550) * 100}%`,
                  top: `${(2536.1 / 3300) * 100}%`,
                  width: `${(1239.6 / 2550) * 100}%`,
                  height: `${(730.9 / 3300) * 100}%`,
                  padding: 'clamp(5px, 1vw, 20px)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  className="font-bold text-black text-center w-full"
                  style={{
                    fontSize: 'clamp(6px, 0.6vw, 10px)',
                    lineHeight: '1.5',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    fontWeight: 'bold',
                    color: '#000000',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-line',
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}
                >
                  {stripHtml(richTextContent).split('\n').filter(line => line.trim()).map((line, idx, arr) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: idx < arr.length - 1 ? 'clamp(2px, 0.5vw, 6px)' : '0',
                        whiteSpace: 'normal',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        textAlign: 'center'
                      }}
                    >
                      {line.trim()}
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Code: (2140, 2702), size 278.4 x 278.4 */}
              <div
                className="absolute"
                style={{
                  left: `${(2140 / 2550) * 100}%`,
                  top: `${(2702 / 3300) * 100}%`,
                  width: `${(278.4 / 2550) * 100}%`,
                  height: `${(278.4 / 3300) * 100}%`
                }}
              >
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                    style={{ filter: 'contrast(1.2)' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                    QR Code
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
