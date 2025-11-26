import { getToken } from 'next-auth/jwt';
import multer from 'multer';
import { parseExcelStructure } from '../../../../lib/reports/excelGenerator';
import { analyzeTemplateMapping } from '../../../../lib/reports/geminiMapper';
import { getAvailableFields } from '../../../../lib/reports/geminiMapper';

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
            'application/csv'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté. Utilisez Excel (.xlsx, .xls) ou CSV (.csv)'));
        }
    }
});

// Helper to run multer middleware
function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        // Handle file upload
        await runMiddleware(req, res, upload.single('template'));

        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier fourni' });
        }

        const { buffer, mimetype, originalname } = req.file;

        // Parse file structure
        let templateStructure;

        if (mimetype.includes('csv') || originalname.endsWith('.csv')) {
            // Handle CSV - convert to structure
            const csvText = buffer.toString('utf-8');
            const lines = csvText.split('\n').filter(line => line.trim());

            if (lines.length === 0) {
                return res.status(400).json({ message: 'Fichier CSV vide' });
            }

            // Parse CSV header
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const sampleRows = lines.slice(1, 6).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const obj = {};
                headers.forEach((header, idx) => {
                    obj[header] = values[idx] || null;
                });
                return obj;
            }).filter(row => Object.values(row).some(v => v !== null));

            templateStructure = {
                columns: headers.map((header, idx) => ({
                    name: header || `Colonne ${idx + 1}`,
                    order: idx,
                    index: idx
                })),
                sampleData: sampleRows,
                sheetName: 'Sheet1'
            };
        } else {
            // Handle Excel
            templateStructure = parseExcelStructure(buffer);
        }

        if (!templateStructure.columns || templateStructure.columns.length === 0) {
            return res.status(400).json({ message: 'Aucune colonne trouvée dans le fichier' });
        }

        // Analyze with Gemini
        const mapping = await analyzeTemplateMapping(templateStructure);

        // Return structure and mapping
        res.status(200).json({
            templateStructure: {
                columns: templateStructure.columns,
                sampleData: templateStructure.sampleData.slice(0, 5), // Limit sample data
                sheetName: templateStructure.sheetName
            },
            mapping: {
                mappings: mapping.mappings.map(m => ({
                    templateColumn: m.templateColumn,
                    sourceField: m.sourceField,
                    confidence: m.confidence,
                    order: templateStructure.columns.findIndex(c => c.name === m.templateColumn)
                })),
                customColumns: mapping.customColumns
            },
            availableFields: getAvailableFields()
        });
    } catch (error) {
        console.error('Error analyzing template:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'analyse du template',
            error: error.message
        });
    }
}

// Disable body parsing for file upload
export const config = {
    api: {
        bodyParser: false
    }
};


