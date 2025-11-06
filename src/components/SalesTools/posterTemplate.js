// Template pdfme pour l'affiche de campagne de financement
// Format lettre 8.5"x11" converti en 300 DPI (2550px x 3300px)
import { BLANK_PDF } from '@pdfme/common';

const FLYER_WIDTH = 2550;
const FLYER_HEIGHT = 3300;

// Sprite sheet coordinates for the price bubbles inside icon_for_price.png
export const BUBBLE_SPRITE_REGIONS = [
    { sx: 31, sy: 49, sw: 2382, sh: 651 },   // Large top bubble
    { sx: 18, sy: 700, sw: 782, sh: 888 },   // Small left bubble
    { sx: 800, sy: 700, sw: 800, sh: 892 },  // Small middle bubble
    { sx: 1600, sy: 700, sw: 813, sh: 863 }, // Small right bubble
];

// Helper function to convert PNG template to PDF base64
const loadTemplateBaseAsBase64 = async () => {
    try {
        // For pdfme, we need to convert the PNG to PDF
        // Since pdfme's basePdf expects a PDF, we'll use jsPDF to create a PDF with the image
        const { jsPDF } = await import('jspdf');

        // Load the PNG image
        const response = await fetch('/images/template-massibec1.png');
        if (!response.ok) throw new Error('Failed to fetch template');
        const blob = await response.blob();
        const imageDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // Create PDF with flyer dimensions and embed the image
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [FLYER_WIDTH, FLYER_HEIGHT],
        });

        pdf.addImage(imageDataUrl, 'PNG', 0, 0, FLYER_WIDTH, FLYER_HEIGHT);

        // Convert PDF to base64 string
        return pdf.output('datauristring');
    } catch (error) {
        console.error('Error loading template base:', error);
        // Fallback to BLANK_PDF if template fails to load
        return BLANK_PDF;
    }
};

// Create template with base image
export const createPosterTemplate = async (basePdfImage = null) => {
    // Use provided basePdf or load the Canva export
    const basePdf = basePdfImage || await loadTemplateBaseAsBase64();

    return {
        basePdf,
        schemas: [
            [
                // Product 1 - Pâté à la viande
                {
                    name: 'product1Image',
                    type: 'image',
                    position: { x: 1218.9, y: 541.4 },
                    width: 845.8,
                    height: 833.4,
                },
                {
                    name: 'product1Bubble',
                    type: 'image',
                    position: { x: 2143.8, y: 661.1 },
                    width: 371.8,
                    height: 239.5,
                },
                {
                    name: 'product1Price',
                    type: 'text',
                    position: { x: 2143.8, y: 661.1 },
                    width: 371.8,
                    height: 239.5,
                    fontSize: 120,
                    fontColor: '#333333',
                    fontName: 'Helvetica-Bold',
                    alignment: 'center',
                    verticalAlignment: 'middle',
                    lineHeight: 1.0,
                },
                {
                    name: 'product1Name',
                    type: 'text',
                    position: { x: 1476.3, y: 1397.8 },
                    width: 384.9,
                    height: 62.5,
                    fontSize: 48,
                    fontColor: '#333333',
                    fontName: 'Helvetica-Bold',
                    alignment: 'center',
                    verticalAlignment: 'middle',
                    lineHeight: 1.2,
                },

                // Product 2 - Pâté au poulet
                {
                    name: 'product2Image',
                    type: 'image',
                    position: { x: 341.5, y: 1616.6 },
                    width: 571.1,
                    height: 563.6,
                },
                {
                    name: 'product2Bubble',
                    type: 'image',
                    position: { x: 967.5, y: 1712.9 },
                    width: 239.8,
                    height: 154.4,
                },
                {
                    name: 'product2Price',
                    type: 'text',
                    position: { x: 967.5, y: 1712.9 },
                    width: 239.8,
                    height: 154.4,
                    fontSize: 72,
                    fontColor: '#333333',
                    fontName: 'Helvetica-Bold',
                    alignment: 'center',
                    verticalAlignment: 'middle',
                    lineHeight: 1.0,
                },
                {
                    name: 'product2Name',
                    type: 'text',
                    position: { x: 449.2, y: 2202.9 },
                    width: 355.7,
                    height: 62.5,
                    fontSize: 44,
                    fontColor: '#333333',
                    fontName: 'Helvetica-Bold',
                    alignment: 'center',
                    verticalAlignment: 'middle',
                    lineHeight: 1.2,
                },

                // Product 3 - Tarte au sucre à la crème
                {
                    name: 'product3Image',
                    type: 'image',
                    position: { x: 1034.3, y: 1616.6 },
                    width: 568.3,
                    height: 563.6,
                },
                {
                    name: 'product3Bubble',
                    type: 'image',
                    position: { x: 1668.7, y: 1712.9 },
                    width: 239.8,
                    height: 154.4,
                },
                {
                    name: 'product3Price',
                    type: 'text',
                    position: { x: 1668.7, y: 1712.9 },
                    width: 239.8,
                    height: 154.4,
                    fontSize: 72,
                    fontColor: '#333333',
                    fontName: 'Helvetica-Bold',
                    alignment: 'center',
                    verticalAlignment: 'middle',
                    lineHeight: 1.0,
                },
                {
                    name: 'product3Name',
                    type: 'text',
                    position: { x: 997.9, y: 2204.9 },
                    width: 617.7,
                    height: 62.5,
                    fontSize: 44,
                    fontColor: '#333333',
                    fontName: 'Helvetica-Bold',
                    alignment: 'center',
                    verticalAlignment: 'middle',
                    lineHeight: 1.2,
                },

                // Product 4 - Tarte aux framboises
                {
                    name: 'product4Image',
                    type: 'image',
                    position: { x: 1712.9, y: 1616.6 },
                    width: 568.3,
                    height: 563.6,
                },
                {
                    name: 'product4Bubble',
                    type: 'image',
                    position: { x: 2368.7, y: 1712.9 },
                    width: 239.8,
                    height: 154.4,
                },
                {
                    name: 'product4Price',
                    type: 'text',
                    position: { x: 2368.7, y: 1712.9 },
                    width: 239.8,
                    height: 154.4,
                    fontSize: 72,
                    fontColor: '#333333',
                    fontName: 'Helvetica-Bold',
                    alignment: 'center',
                    verticalAlignment: 'middle',
                    lineHeight: 1.0,
                },
                {
                    name: 'product4Name',
                    type: 'text',
                    position: { x: 1737.6, y: 2202.9 },
                    width: 519.0,
                    height: 62.5,
                    fontSize: 44,
                    fontColor: '#333333',
                    fontName: 'Helvetica-Bold',
                    alignment: 'center',
                    verticalAlignment: 'middle',
                    lineHeight: 1.2,
                },

                // Student information block
                {
                    name: 'studentName',
                    type: 'text',
                    position: { x: 142.0, y: 2403.6 },
                    width: 628.6,
                    height: 102.6,
                    fontSize: 58,
                    fontColor: '#1E3A8A',
                    fontName: 'Helvetica-Bold',
                    alignment: 'left',
                    verticalAlignment: 'top',
                    lineHeight: 1.2,
                },
                {
                    name: 'studentImage',
                    type: 'image',
                    position: { x: 142.0, y: 2529.2 },
                    width: 632.6,
                    height: 702.9,
                },
                {
                    name: 'studentText',
                    type: 'text',
                    position: { x: 804.9, y: 2536.1 },
                    width: 1239.6,
                    height: 730.9,
                    fontSize: 40,
                    fontColor: '#333333',
                    fontName: 'Helvetica',
                    alignment: 'left',
                    verticalAlignment: 'top',
                    lineHeight: 1.35,
                },

                // QR Code
                {
                    name: 'qrCode',
                    type: 'image',
                    position: { x: 2176.5, y: 2718.4 },
                    width: 278.4,
                    height: 278.4,
                },
            ],
        ],
    };
};

// Helper function to load image as base64 data URL
const loadImageAsDataUrl = async (url) => {
    if (!url) return '';
    try {
        // Handle relative URLs
        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error('Failed to fetch image');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading image:', url, error);
        return '';
    }
};

// Helper function to load an HTML image element (for canvas cropping)
const loadImageElement = async (src) => {
    return new Promise((resolve, reject) => {
        if (typeof Image === 'undefined') {
            reject(new Error('Image constructor unavailable in this environment'));
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

let cachedBubbleSpriteSrc = null;
let cachedBubbleVariants = null;

const getBubbleVariantDataUrls = async (spriteDataUrl) => {
    if (!spriteDataUrl) return [];
    if (typeof document === 'undefined') return [];

    if (cachedBubbleVariants && cachedBubbleSpriteSrc === spriteDataUrl) {
        return cachedBubbleVariants;
    }

    try {
        const spriteImg = await loadImageElement(spriteDataUrl);
        cachedBubbleVariants = BUBBLE_SPRITE_REGIONS.map(region => {
            const canvas = document.createElement('canvas');
            canvas.width = region.sw;
            canvas.height = region.sh;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                spriteImg,
                region.sx,
                region.sy,
                region.sw,
                region.sh,
                0,
                0,
                region.sw,
                region.sh
            );
            return canvas.toDataURL('image/png');
        });
        cachedBubbleSpriteSrc = spriteDataUrl;
        return cachedBubbleVariants;
    } catch (error) {
        console.error('Error preparing bubble variants:', error);
        return [];
    }
};

// Helper function to convert HTML to plain text
const stripHtml = (html) => {
    if (typeof window === 'undefined') return html; // SSR fallback
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

// Helper function to prepare inputs for pdfme generation
export const preparePosterInputs = async ({
    studentImageUrl,
    studentName,
    studentText,
    products, // Array of top products (already sorted by order)
    qrCodeDataUrl,
}) => {
    const MAX_PRODUCTS = 4;

    // Limit to the number of slots supported by the template
    const limitedProducts = products.slice(0, MAX_PRODUCTS);

    // Pad to MAX_PRODUCTS entries if needed to avoid undefined access
    while (limitedProducts.length < MAX_PRODUCTS) {
        limitedProducts.push({ name: '', price: '', image: '' });
    }

    // Load student image
    const studentImageDataUrl = studentImageUrl
        ? await loadImageAsDataUrl(studentImageUrl)
        : '';

    // Load product images
    const productImages = await Promise.all(
        limitedProducts.map(product =>
            loadImageAsDataUrl(product.image || '/images/placeholder-product.svg')
        )
    );

    // Load price bubble sprite and extract variants
    const bubbleImageDataUrl = await loadImageAsDataUrl('/images/icon_for_price.png');
    const bubbleVariants = bubbleImageDataUrl
        ? await getBubbleVariantDataUrls(bubbleImageDataUrl)
        : [];

    // Format price for display
    const formatPrice = (price) => {
        if (!price || price === '') return '';
        if (typeof price === 'number') {
            return `${price.toFixed(2)}$`;
        }
        if (typeof price === 'string') {
            // Remove $ if already present and reformat
            const numPrice = parseFloat(price.replace('$', '').trim());
            if (!isNaN(numPrice)) {
                return `${numPrice.toFixed(2)}$`;
            }
            return price;
        }
        return '';
    };

    const input = {
        qrCode: qrCodeDataUrl || '',
        studentImage: studentImageDataUrl,
        studentName: studentName || "Nom de l'élève",
        studentText: stripHtml(studentText) || '',
    };

    for (let index = 0; index < MAX_PRODUCTS; index += 1) {
        const position = index + 1;
        const product = limitedProducts[index];
        const image = productImages[index] || '';
        const price = formatPrice(product.price);
        const bubbleVariant = bubbleVariants[index] || bubbleImageDataUrl || '';

        input[`product${position}Image`] = image;
        input[`product${position}Name`] = product.name || '';
        input[`product${position}Price`] = price;
        input[`product${position}Bubble`] = price ? bubbleVariant : '';
    }

    return [input];
};
