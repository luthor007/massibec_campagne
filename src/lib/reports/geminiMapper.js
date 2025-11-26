import { GoogleGenerativeAI } from '@google/generative-ai';

// Available fields mapping for reports
const AVAILABLE_FIELDS = {
    // Order fields
    orderId: { label: 'Numéro de commande', category: 'Commande', description: 'Identifiant unique de la commande' },
    orderNumber: { label: 'Numéro de commande', category: 'Commande', description: 'Numéro de commande' },
    orderDate: { label: 'Date de commande', category: 'Commande', description: 'Date de création de la commande' },
    orderStatus: { label: 'Statut de commande', category: 'Commande', description: 'Statut: En attente, Payé, Commandé, Complété' },
    orderType: { label: 'Type de commande', category: 'Commande', description: 'Type: Étudiant ou Boutique' },

    // School fields
    schoolName: { label: 'Nom de l\'école', category: 'École', description: 'Nom complet de l\'école' },
    schoolCode: { label: 'Code de l\'école', category: 'École', description: 'Code unique de l\'école' },
    schoolAddress: { label: 'Adresse de l\'école', category: 'École', description: 'Adresse complète de l\'école' },
    schoolPhone: { label: 'Téléphone de l\'école', category: 'École', description: 'Numéro de téléphone' },
    schoolEmail: { label: 'Email de l\'école', category: 'École', description: 'Adresse email' },

    // Campaign fields
    campaignName: { label: 'Nom de la campagne', category: 'Campagne', description: 'Nom de la campagne de financement' },
    campaignNumber: { label: 'Numéro de campagne', category: 'Campagne', description: 'Numéro séquentiel de la campagne' },
    campaignCode: { label: 'Code de campagne', category: 'Campagne', description: 'Code unique de la campagne' },
    campaignStartDate: { label: 'Date de début', category: 'Campagne', description: 'Date de début de la campagne' },
    campaignEndDate: { label: 'Date de fin', category: 'Campagne', description: 'Date de fin de la campagne' },
    campaignDeliveryDate: { label: 'Date de livraison', category: 'Campagne', description: 'Date prévue de livraison' },
    campaignStatus: { label: 'Statut de campagne', category: 'Campagne', description: 'Statut: pending_approval, approved, active, completed' },
    campaignMode: { label: 'Mode de campagne', category: 'Campagne', description: 'Mode: test ou production' },
    campaignFinancialGoal: { label: 'Objectif financier', category: 'Campagne', description: 'Objectif financier de la campagne' },

    // Customer fields
    customerName: { label: 'Nom du client', category: 'Client', description: 'Nom complet du client/étudiant' },
    customerEmail: { label: 'Email du client', category: 'Client', description: 'Adresse email du client' },
    customerPhone: { label: 'Téléphone du client', category: 'Client', description: 'Numéro de téléphone' },

    // Product fields
    productName: { label: 'Nom du produit', category: 'Produit', description: 'Nom du produit commandé' },
    productQuantity: { label: 'Quantité', category: 'Produit', description: 'Quantité commandée' },
    productPrice: { label: 'Prix unitaire', category: 'Produit', description: 'Prix unitaire du produit' },
    productCost: { label: 'Coût unitaire', category: 'Produit', description: 'Coût unitaire pour le fournisseur' },
    productProfit: { label: 'Profit unitaire', category: 'Produit', description: 'Profit par unité' },

    // Financial fields
    totalAmount: { label: 'Montant total', category: 'Financier', description: 'Montant total de la commande' },
    amountPaid: { label: 'Montant payé', category: 'Financier', description: 'Montant effectivement payé' },
    transferAmount: { label: 'Montant transféré', category: 'Financier', description: 'Montant transféré via Interac' },
    studentCashBenefit: { label: 'Bénéfice étudiant comptant', category: 'Financier', description: 'Bénéfice pour l\'étudiant en comptant' },
    studentSchoolAccountBenefit: { label: 'Bénéfice compte scolaire', category: 'Financier', description: 'Bénéfice pour le compte scolaire' },
    schoolProjectBenefit: { label: 'Bénéfice projet école', category: 'Financier', description: 'Bénéfice pour le projet de l\'école' },
    raffleBenefit: { label: 'Bénéfice tirage', category: 'Financier', description: 'Bénéfice pour le tirage' },
    tip: { label: 'Donation totale', category: 'Financier', description: 'Montant total des donations' },
    tipStudentCash: { label: 'Donation étudiant comptant', category: 'Financier', description: 'Part de donation pour étudiant comptant' },
    tipStudentAccount: { label: 'Donation compte scolaire', category: 'Financier', description: 'Part de donation pour compte scolaire' },
    tipSchoolProject: { label: 'Donation projet école', category: 'Financier', description: 'Part de donation pour projet école' },

    // Totals
    totalUnits: { label: 'Total unités', category: 'Produit', description: 'Nombre total d\'unités' }
};

/**
 * Initialize Gemini client
 */
function getGeminiClient() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY environment variable is required');
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Analyze template structure and map to available fields using Gemini
 */
export async function analyzeTemplateMapping(templateStructure) {
    const { columns, sampleData } = templateStructure;

    if (!columns || columns.length === 0) {
        return { mappings: [], customColumns: [] };
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build available fields list for prompt
    const availableFieldsList = Object.entries(AVAILABLE_FIELDS).map(([key, value]) =>
        `- ${key}: ${value.label} (${value.category}) - ${value.description}`
    ).join('\n');

    // Build template columns list
    const templateColumnsList = columns.map((col, idx) =>
        `- ${col.name} (position ${idx + 1})`
    ).join('\n');

    // Build sample data preview
    const sampleDataPreview = sampleData.slice(0, 3).map((row, idx) => {
        const values = columns.map(col => `${col.name}: ${row[col.name] || ''}`).join(', ');
        return `Exemple ${idx + 1}: ${values}`;
    }).join('\n');

    const prompt = `Tu es un expert en analyse de données et mapping de colonnes Excel/CSV.

J'ai un template Excel/CSV avec les colonnes suivantes:
${templateColumnsList}

Voici quelques exemples de données:
${sampleDataPreview}

J'ai également une base de données avec les champs suivants disponibles:
${availableFieldsList}

Tâche:
1. Analyse chaque colonne du template
2. Pour chaque colonne, détermine si elle correspond à un champ de ma base de données
3. Si oui, indique le champ correspondant (clé exacte) et un score de confiance (0-100)
4. Si non, marque-la comme colonne personnalisée (custom)

Réponds UNIQUEMENT avec un JSON valide dans ce format exact:
{
  "mappings": [
    {
      "templateColumn": "Nom exact de la colonne du template",
      "sourceField": "orderId" ou null si non mappable,
      "confidence": 85 (0-100),
      "isCustom": false ou true
    }
  ],
  "customColumns": [
    {
      "name": "Nom de la colonne",
      "order": 0 (position dans le template)
    }
  ]
}

Sois précis et conservateur - ne mappe que si tu es sûr à au moins 70% de confiance.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response (might be wrapped in markdown)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        }

        const parsed = JSON.parse(jsonText);

        // Validate and format mappings
        const mappings = parsed.mappings || [];
        const customColumns = parsed.customColumns || [];

        // Ensure all template columns are accounted for
        const mappedColumnNames = new Set(mappings.map(m => m.templateColumn));
        columns.forEach((col, idx) => {
            if (!mappedColumnNames.has(col.name)) {
                customColumns.push({
                    name: col.name,
                    order: idx
                });
            }
        });

        return {
            mappings: mappings.filter(m => m.confidence >= 70 && !m.isCustom),
            customColumns: customColumns.sort((a, b) => a.order - b.order)
        };
    } catch (error) {
        console.error('Error analyzing template with Gemini:', error);

        // Fallback: mark all columns as custom if Gemini fails
        return {
            mappings: [],
            customColumns: columns.map((col, idx) => ({
                name: col.name,
                order: idx
            }))
        };
    }
}

/**
 * Get available fields list for frontend
 */
export function getAvailableFields() {
    return AVAILABLE_FIELDS;
}


