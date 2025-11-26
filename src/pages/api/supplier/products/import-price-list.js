import dbConnect from '../../../../lib/mongodb';
import Product from '../../../../models/Product';
import SupplierManager from '../../../../models/SupplierManager';
import { getToken } from 'next-auth/jwt';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    let tempFilePath = null;

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

        const supplierId = supplierManager.supplier._id;

        // Get all products for this supplier
        const products = await Product.find({ supplier: supplierId })
            .select('_id name')
            .lean();

        if (products.length === 0) {
            return res.status(400).json({ message: 'Aucun produit trouvé. Veuillez d\'abord créer des produits.' });
        }

        // Parse the uploaded file
        const { fileData, fileName, fileType } = req.body;

        if (!fileData || !fileName) {
            return res.status(400).json({ message: 'Fichier requis' });
        }

        // Validate file type
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const fileExt = path.extname(fileName).toLowerCase();
        if (!allowedTypes.includes(fileExt)) {
            return res.status(400).json({
                message: `Format de fichier non supporté. Formats acceptés: ${allowedTypes.join(', ')}`
            });
        }

        // Decode base64 file data
        const fileBuffer = Buffer.from(fileData, 'base64');

        // Create temp directory if it doesn't exist
        const tempDir = path.join(process.cwd(), 'tmp');
        try {
            await mkdir(tempDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }

        // Save file temporarily
        tempFilePath = path.join(tempDir, `price-list-${Date.now()}${fileExt}`);
        await writeFile(tempFilePath, fileBuffer);

        // Prepare products JSON
        const productsJson = JSON.stringify(products);

        // Call Python script
        const scriptsDir = path.join(process.cwd(), 'scripts');
        const pythonScript = path.join(scriptsDir, 'import-price-list.py');

        console.log(`🔮 Appel du script Python pour analyser le fichier: ${fileName}`);

        const { stdout, stderr } = await execAsync(
            `python3 "${pythonScript}" "${tempFilePath}" '${productsJson.replace(/'/g, "'\"'\"'")}'`,
            {
                cwd: scriptsDir,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1'
                }
            }
        );

        // Parse Python script output
        let result;
        try {
            result = JSON.parse(stdout);
        } catch (parseError) {
            console.error('Erreur parsing résultat Python:', parseError);
            console.error('Stdout:', stdout);
            console.error('Stderr:', stderr);
            return res.status(500).json({
                message: 'Erreur lors de l\'analyse du fichier',
                error: 'Impossible de parser la réponse du script Python'
            });
        }

        if (!result.success) {
            return res.status(400).json({
                message: result.error || 'Erreur lors de l\'analyse du fichier',
                reasoning: result.reasoning
            });
        }

        // Update products with matched prices
        const updates = [];
        const updatedProducts = [];

        for (const match of result.matches || []) {
            if (match.productId && match.pricePickup !== undefined) {
                try {
                    const product = await Product.findById(match.productId);
                    if (product && product.supplier.toString() === supplierId.toString()) {
                        product.pricePickup = parseFloat(match.pricePickup);
                        await product.save();
                        updatedProducts.push({
                            id: product._id,
                            name: product.name,
                            pricePickup: product.pricePickup,
                            confidence: match.confidence
                        });
                        updates.push({
                            productId: match.productId,
                            productName: match.productName,
                            oldPrice: product.pricePickup,
                            newPrice: match.pricePickup,
                            confidence: match.confidence
                        });
                    }
                } catch (updateError) {
                    console.error(`Erreur mise à jour produit ${match.productId}:`, updateError);
                }
            }
        }

        // Clean up temp file
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
            } catch (cleanupError) {
                console.warn('Erreur suppression fichier temporaire:', cleanupError);
            }
        }

        return res.status(200).json({
            success: true,
            message: `${updatedProducts.length} produit(s) mis à jour avec succès`,
            reasoning: result.reasoning,
            stats: {
                totalExtracted: result.totalExtracted || 0,
                totalMatches: result.totalMatches || 0,
                totalUpdated: updatedProducts.length
            },
            updatedProducts,
            updates
        });

    } catch (error) {
        console.error('Error importing price list:', error);

        // Clean up temp file on error
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
            } catch (cleanupError) {
                console.warn('Erreur suppression fichier temporaire:', cleanupError);
            }
        }

        return res.status(500).json({
            message: 'Erreur lors de l\'import de la liste de prix',
            error: error.message
        });
    }
}

