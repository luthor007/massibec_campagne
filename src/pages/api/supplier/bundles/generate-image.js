import sharp from 'sharp';
import cloudinary from '@/utils/cloudinary';
import { getToken } from 'next-auth/jwt';
import SupplierManager from '../../../../models/SupplierManager';
import dbConnect from '../../../../lib/mongodb';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        await dbConnect();

        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || (token.role !== 'supplier' && token.role !== 'fournisseur')) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        // Get supplier for this user
        const supplierManager = await SupplierManager.findOne({
            user: token.sub,
            status: 'active'
        }).populate('supplier');

        if (!supplierManager || !supplierManager.supplier) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        const { items, width = 1200, height = 1200, bg = 'transparent', mode = 'badges' } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Items array is required' });
        }

        // Validate items have imageUrl and qty
        for (const item of items) {
            if (!item.imageUrl || !item.qty || item.qty < 1) {
                return res.status(400).json({ message: 'Each item must have imageUrl and qty >= 1' });
            }
        }

        // 1) Decide how many tiles to show
        const distinct = items.length;
        const total = items.reduce((s, it) => s + Math.max(1, it.qty), 0);

        // "badges" = show each product once with a qty badge
        // "mosaic" = repeat images up to a cap (prevents 1000 tiles)
        const tiles =
            mode === 'mosaic'
                ? items.flatMap((it) => Array(Math.min(it.qty, 6)).fill({ ...it, qty: 1 }))
                : items.map((it) => ({ ...it, qty: Math.max(1, it.qty) }));

        const n = tiles.length;

        // 2) Compute grid (compact square)
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);

        // 3) Canvas + background
        const base = sharp({
            create: {
                width,
                height,
                channels: 4,
                background: bg === 'transparent' ? { r: 0, g: 0, b: 0, alpha: 0 } : parseColor(bg),
            },
        }).png();

        // 4) Tile sizing and margins
        const pad = Math.round(width * 0.04);        // outer padding
        const gap = Math.round(width * 0.02);        // gap between tiles
        const innerW = width - pad * 2 - gap * (cols - 1);
        const innerH = height - pad * 2 - gap * (rows - 1);
        const tileW = Math.floor(innerW / cols);
        const tileH = Math.floor(innerH / rows);
        const tileSize = Math.min(tileW, tileH);

        // 5) Fetch and prep images in parallel
        async function fetchBuffer(url) {
            try {
                // Handle relative URLs (convert to absolute if needed)
                let imageUrl = url;
                if (url.startsWith('/')) {
                    // If it's a relative URL, make it absolute using the app URL
                    const baseUrl = process.env.NEXTAUTH_URL || 'https://jappuie.ca';
                    imageUrl = `${baseUrl}${url}`;
                }

                // Use Node.js native fetch (available in Node 18+)
                const response = await fetch(imageUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; BundleImageGenerator/1.0)',
                        'Accept': 'image/*'
                    },
                    // Add timeout
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${imageUrl} (${response.status})`);
                }

                const arrayBuffer = await response.arrayBuffer();
                return Buffer.from(arrayBuffer);
            } catch (error) {
                console.error(`Error fetching image ${url}:`, error.message);
                // Return a placeholder image if fetch fails
                return await sharp({
                    create: {
                        width: tileSize,
                        height: tileSize,
                        channels: 4,
                        background: { r: 200, g: 200, b: 200, alpha: 1 },
                    },
                })
                    .png()
                    .toBuffer();
            }
        }

        // 6) Build composites (images + optional badges)
        const composites = [];

        for (let i = 0; i < n; i++) {
            const it = tiles[i];
            const imgBuf = await fetchBuffer(it.imageUrl);

            // Fit product image nicely inside tile with subtle rounded corners
            const product = await sharp(imgBuf)
                .resize(tileSize, tileSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toBuffer();

            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = pad + col * (tileSize + gap);
            const y = pad + row * (tileSize + gap);

            // Optional rounded mask
            const radius = Math.round(tileSize * 0.1);
            const maskSvg = Buffer.from(
                `<svg width="${tileSize}" height="${tileSize}">
         <rect x="0" y="0" width="${tileSize}" height="${tileSize}" rx="${radius}" ry="${radius}"/>
       </svg>`
            );
            const masked = await sharp(product)
                .composite([{ input: await sharp(maskSvg).png().toBuffer(), blend: 'dest-in' }])
                .png()
                .toBuffer();

            // Drop shadow (soft)
            const shadow = await sharp({
                create: {
                    width: tileSize + 20,
                    height: tileSize + 20,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                },
            })
                .png()
                .composite([
                    {
                        input: masked,
                        top: 10,
                        left: 10,
                        blend: 'over',
                    },
                ])
                .blur(5)
                .toBuffer();

            composites.push({ input: shadow, left: x - 10, top: y - 10 });
            composites.push({ input: masked, left: x, top: y });

            // 7) Quantity badge (only for "badges" mode or if original qty >1 in mosaic)
            const showBadge = (mode === 'badges' && it.qty > 1);

            if (showBadge) {
                const badgeSize = Math.round(tileSize * 0.28);
                const badgeSvg = Buffer.from(`
          <svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 100 100">
            <defs>
              <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
              </filter>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#111" filter="url(#s)"/>
            <circle cx="50" cy="50" r="44" fill="#ffffff"/>
            <text x="50" y="60" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="56" font-weight="700" text-anchor="middle" fill="#111">×${it.qty}</text>
          </svg>
        `);

                composites.push({
                    input: badgeSvg,
                    left: x + tileSize - badgeSize + Math.round(badgeSize * 0.08),
                    top: y - Math.round(badgeSize * 0.08),
                });
            }
        }

        const out = await base.composite(composites).png().toBuffer();

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'bundle-images',
                    resource_type: 'image',
                    format: 'png',
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(out);
        });

        res.status(200).json({
            imageUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
        });
    } catch (error) {
        console.error('Error generating bundle image:', error);
        res.status(500).json({ message: 'Erreur lors de la génération de l\'image', error: error.message });
    }
}

// Helper to parse color string to RGBA object
function parseColor(color) {
    if (color === 'transparent') {
        return { r: 0, g: 0, b: 0, alpha: 0 };
    }

    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b, alpha: 1 };
    }

    // Default to white
    return { r: 255, g: 255, b: 255, alpha: 1 };
}

