import { getToken } from 'next-auth/jwt';
import { getSupplierIdFromToken, aggregateReportData, buildFilters, flattenDataForExport } from '../../../../lib/reports/dataAggregator';
import { generateCSV, generateCSVWithMapping } from '../../../../lib/reports/csvGenerator';
import { generateExcel, generateExcelFromTemplate } from '../../../../lib/reports/excelGenerator';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Méthode non autorisée' });
    }

    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token || token.role !== 'supplier') {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const supplierId = await getSupplierIdFromToken(token);
        if (!supplierId) {
            return res.status(404).json({ message: 'Fournisseur non trouvé' });
        }

        const {
            format = 'csv', // 'csv' or 'excel'
            selectedFields = [], // Array of field names to include
            columnMapping = null, // Custom column mapping for template-based export
            customColumns = [], // Additional empty columns
            filters = {} // Date, school, campaign filters
        } = req.body;

        // Get campaigns to build filters
        const Campaign = (await import('../../../../models/Campaign')).default;
        const campaigns = await Campaign.find({ supplier: supplierId })
            .select('_id school campaignNumber')
            .lean();

        const campaignIds = campaigns.map(c => c._id.toString());
        const schoolIds = [...new Set(campaigns.map(c => {
            const schoolId = c.school?._id?.toString() || c.school?.toString();
            return schoolId;
        }).filter(Boolean))];

        // Merge filters
        const queryFilters = {
            ...filters,
            startDate: filters.startDate || req.query.startDate,
            endDate: filters.endDate || req.query.endDate,
            schoolIds: filters.schoolIds || req.query.schoolIds,
            campaignIds: filters.campaignIds || req.query.campaignIds,
            status: filters.status || req.query.status
        };

        const builtFilters = buildFilters(queryFilters, campaignIds, schoolIds);

        // Aggregate data
        const data = await aggregateReportData(supplierId, builtFilters);

        // Flatten data for export
        const flattenedData = flattenDataForExport(data, selectedFields.length > 0 ? selectedFields : null);

        if (flattenedData.length === 0) {
            return res.status(400).json({ message: 'Aucune donnée à exporter' });
        }

        // Generate file based on format
        if (format === 'excel') {
            let buffer;

            if (columnMapping && columnMapping.length > 0) {
                // Use template structure
                buffer = generateExcelFromTemplate(flattenedData, {
                    columns: columnMapping,
                    customColumns,
                    sheetName: 'Rapport'
                });
            } else {
                // Standard export
                buffer = generateExcel(flattenedData, {
                    sheetName: 'Rapport',
                    customColumns
                });
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="rapport-${new Date().toISOString().split('T')[0]}.xlsx"`);
            return res.send(buffer);
        } else {
            // CSV format
            let csv;

            if (columnMapping && columnMapping.length > 0) {
                csv = generateCSVWithMapping(flattenedData, columnMapping);
            } else {
                csv = generateCSV(flattenedData, {
                    fields: selectedFields.length > 0 ? selectedFields : null
                });
            }

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="rapport-${new Date().toISOString().split('T')[0]}.csv"`);
            return res.send('\ufeff' + csv); // Add BOM for Excel
        }
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            message: 'Erreur lors de la génération du rapport',
            error: error.message
        });
    }
}


