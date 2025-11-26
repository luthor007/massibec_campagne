import * as XLSX from 'xlsx';

/**
 * Generate Excel file from data array
 */
export function generateExcel(data, options = {}) {
    if (!data || data.length === 0) {
        throw new Error('No data to export');
    }

    const {
        sheetName = 'Rapport',
        columnMapping = null, // Custom column mapping
        customColumns = [] // Additional empty columns
    } = options;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data
    let exportData = data;

    // Apply column mapping if provided
    if (columnMapping && columnMapping.length > 0) {
        // Sort columns by order
        const sortedColumns = [...columnMapping].sort((a, b) => (a.order || 0) - (b.order || 0));

        exportData = data.map(row => {
            const mappedRow = {};
            sortedColumns.forEach(col => {
                const value = row[col.sourceField];
                mappedRow[col.targetField] = value !== undefined && value !== null ? value : '';
            });

            // Add custom columns (empty)
            customColumns.forEach(col => {
                mappedRow[col.name] = '';
            });

            return mappedRow;
        });
    } else {
        // Add custom columns to all rows
        if (customColumns.length > 0) {
            exportData = data.map(row => {
                const newRow = { ...row };
                customColumns.forEach(col => {
                    newRow[col.name] = '';
                });
                return newRow;
            });
        }
    }

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths (auto-size)
    const maxWidth = 50;
    const colWidths = [];
    if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        headers.forEach((header, idx) => {
            const maxLength = Math.max(
                header.length,
                ...exportData.slice(0, 100).map(row => {
                    const val = row[header];
                    return val ? String(val).length : 0;
                })
            );
            colWidths[idx] = { wch: Math.min(maxLength + 2, maxWidth) };
        });
        worksheet['!cols'] = colWidths;
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
    });

    return buffer;
}

/**
 * Generate Excel from template structure (preserves column order and names)
 */
export function generateExcelFromTemplate(data, templateStructure) {
    // templateStructure: { columns: [{ name: 'Colonne A', order: 0, sourceField: 'orderId' }, ...], customColumns: [...] }

    if (!data || data.length === 0) {
        throw new Error('No data to export');
    }

    const workbook = XLSX.utils.book_new();
    const { columns = [], customColumns = [], sheetName = 'Rapport' } = templateStructure;

    // Sort columns by order
    const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));

    // Map data to template structure
    const exportData = data.map(row => {
        const mappedRow = {};

        // Map source fields to target columns
        sortedColumns.forEach(col => {
            const value = row[col.sourceField];
            mappedRow[col.name] = value !== undefined && value !== null ? value : '';
        });

        // Add custom columns (empty)
        customColumns.forEach(col => {
            mappedRow[col.name] = '';
        });

        return mappedRow;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = sortedColumns.map((col, idx) => {
        const maxLength = Math.max(
            col.name.length,
            ...exportData.slice(0, 100).map(row => {
                const val = row[col.name];
                return val ? String(val).length : 0;
            })
        );
        return { wch: Math.min(maxLength + 2, 50) };
    });

    // Add widths for custom columns
    customColumns.forEach(() => {
        colWidths.push({ wch: 15 });
    });

    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
    });

    return buffer;
}

/**
 * Parse Excel file to extract structure
 */
export function parseExcelStructure(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON to get headers
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    if (data.length === 0) {
        return { columns: [], sampleData: [] };
    }

    const headers = data[0] || [];
    const sampleRows = data.slice(1, 6).filter(row => row.some(cell => cell !== null));

    const columns = headers.map((header, index) => ({
        name: header || `Colonne ${index + 1}`,
        order: index,
        index
    }));

    return {
        columns,
        sampleData: sampleRows.map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
                obj[header || `Colonne ${idx + 1}`] = row[idx] || null;
            });
            return obj;
        }),
        sheetName
    };
}


