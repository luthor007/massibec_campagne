import { Parser } from 'json2csv';

/**
 * Generate CSV from data array
 */
export function generateCSV(data, options = {}) {
    if (!data || data.length === 0) {
        return '';
    }

    const {
        fields = null, // If null, use all fields from first object
        fieldNames = null, // Custom field names mapping
        delimiter = ',',
        withBOM = true // Add BOM for Excel compatibility
    } = options;

    // Get all fields from data if not specified
    const allFields = fields || Object.keys(data[0] || {});

    // Build field configuration
    const fieldConfig = allFields.map(field => {
        const fieldName = fieldNames?.[field] || field;
        return {
            label: fieldName,
            value: field
        };
    });

    const parser = new Parser({
        fields: fieldConfig,
        delimiter,
        withBOM
    });

    try {
        return parser.parse(data);
    } catch (error) {
        console.error('Error generating CSV:', error);
        throw new Error('Failed to generate CSV');
    }
}

/**
 * Generate CSV with custom column order and names
 */
export function generateCSVWithMapping(data, columnMapping) {
    // columnMapping: [{ sourceField: 'orderId', targetField: 'Numéro Commande', order: 1 }, ...]

    if (!data || data.length === 0) {
        return '';
    }

    // Sort columns by order
    const sortedColumns = [...columnMapping].sort((a, b) => (a.order || 0) - (b.order || 0));

    const fieldConfig = sortedColumns.map(col => ({
        label: col.targetField,
        value: col.sourceField
    }));

    const parser = new Parser({
        fields: fieldConfig,
        withBOM: true
    });

    try {
        return parser.parse(data);
    } catch (error) {
        console.error('Error generating CSV with mapping:', error);
        throw new Error('Failed to generate CSV');
    }
}


