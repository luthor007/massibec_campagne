import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplateImporter({ onMappingComplete, onBack }) {
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [mapping, setMapping] = useState(null);
    const [templateStructure, setTemplateStructure] = useState(null);
    const [availableFields, setAvailableFields] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/csv'
        ];

        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

        if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
            toast.error('Format de fichier non supporté. Utilisez Excel (.xlsx, .xls) ou CSV (.csv)');
            return;
        }

        // Validate file size (10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error('Le fichier est trop volumineux. Maximum 10MB');
            return;
        }

        setFile(selectedFile);
        setMapping(null);
        setTemplateStructure(null);
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast.error('Veuillez sélectionner un fichier');
            return;
        }

        setAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append('template', file);

            const response = await fetch('/api/supplier/reports/template-analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erreur lors de l\'analyse du template');
            }

            const data = await response.json();
            setTemplateStructure(data.templateStructure);
            setMapping(data.mapping);
            setAvailableFields(data.availableFields);
            toast.success('Template analysé avec succès');
        } catch (error) {
            console.error('Error analyzing template:', error);
            toast.error(error.message || 'Erreur lors de l\'analyse du template');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleGenerate = async () => {
        if (!mapping || !templateStructure) {
            toast.error('Veuillez d\'abord analyser le template');
            return;
        }

        try {
            // Build column mapping
            const columnMapping = [
                ...mapping.mappings.map((m, idx) => ({
                    sourceField: m.sourceField,
                    targetField: m.templateColumn,
                    order: m.order !== undefined ? m.order : idx
                })),
                ...mapping.customColumns.map(col => ({
                    sourceField: null,
                    targetField: col.name,
                    order: col.order
                }))
            ].sort((a, b) => a.order - b.order);

            await onMappingComplete({
                columnMapping,
                customColumns: mapping.customColumns,
                templateStructure
            });
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Erreur lors de la génération du rapport');
        }
    };

    return (
        <div className="space-y-6">
            {onBack && (
                <Button variant="ghost" onClick={onBack} className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                </Button>
            )}

            {/* File Upload */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Importer un template
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label>Fichier template (Excel ou CSV)</Label>
                            <div className="mt-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Sélectionner un fichier
                                    </Button>
                                    {file && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <FileText className="w-4 h-4" />
                                            {file.name}
                                            <span className="text-xs text-gray-400">
                                                ({(file.size / 1024).toFixed(1)} KB)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Formats supportés: Excel (.xlsx, .xls) ou CSV (.csv). Maximum 10MB.
                            </p>
                        </div>

                        {file && !mapping && (
                            <Button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className="w-full"
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analyse en cours...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Analyser le template avec Gemini
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Mapping Results */}
            {mapping && templateStructure && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                Résultats de l'analyse
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium mb-2">Colonnes mappées ({mapping.mappings.length})</h4>
                                    <div className="space-y-2">
                                        {mapping.mappings.map((m, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <span className="text-sm">
                                                    <strong>{m.templateColumn}</strong> → {availableFields?.[m.sourceField]?.label || m.sourceField}
                                                </span>
                                                <span className="text-xs text-gray-500 ml-auto">
                                                    Confiance: {m.confidence}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {mapping.customColumns.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2">Colonnes personnalisées ({mapping.customColumns.length})</h4>
                                        <div className="space-y-2">
                                            {mapping.customColumns.map((col, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                                    <span className="text-sm">
                                                        <strong>{col.name}</strong> (sera laissée vide)
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sample Data Preview */}
                                {templateStructure.sampleData && templateStructure.sampleData.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2">Aperçu des données</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-xs border">
                                                <thead>
                                                    <tr className="bg-gray-100">
                                                        {templateStructure.columns.slice(0, 5).map((col, idx) => (
                                                            <th key={idx} className="px-2 py-1 border text-left">
                                                                {col.name}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {templateStructure.sampleData.slice(0, 3).map((row, rowIdx) => (
                                                        <tr key={rowIdx}>
                                                            {templateStructure.columns.slice(0, 5).map((col, colIdx) => (
                                                                <td key={colIdx} className="px-2 py-1 border">
                                                                    {row[col.name] || '-'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Generate Button */}
                    <Card>
                        <CardContent className="pt-6">
                            <Button
                                onClick={handleGenerate}
                                className="w-full"
                                size="lg"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Générer le rapport avec ce template
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}


