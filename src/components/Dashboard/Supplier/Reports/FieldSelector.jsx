import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, ShoppingCart, School, Calendar, DollarSign, User } from 'lucide-react';

const FIELD_CATEGORIES = {
    'Commande': { icon: ShoppingCart, color: 'text-blue-600' },
    'École': { icon: School, color: 'text-green-600' },
    'Campagne': { icon: Calendar, color: 'text-purple-600' },
    'Client': { icon: User, color: 'text-orange-600' },
    'Produit': { icon: Package, color: 'text-indigo-600' },
    'Financier': { icon: DollarSign, color: 'text-red-600' }
};

export default function FieldSelector({ availableFields, selectedFields = [], onFieldsChange }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});

    // Group fields by category
    const fieldsByCategory = {};
    Object.entries(availableFields).forEach(([key, field]) => {
        const category = field.category || 'Autre';
        if (!fieldsByCategory[category]) {
            fieldsByCategory[category] = [];
        }
        fieldsByCategory[category].push({ key, ...field });
    });

    // Filter fields by search term
    const filteredFieldsByCategory = {};
    Object.entries(fieldsByCategory).forEach(([category, fields]) => {
        const filtered = fields.filter(field => {
            const searchLower = searchTerm.toLowerCase();
            return (
                field.label.toLowerCase().includes(searchLower) ||
                field.description.toLowerCase().includes(searchLower) ||
                field.key.toLowerCase().includes(searchLower)
            );
        });
        if (filtered.length > 0) {
            filteredFieldsByCategory[category] = filtered;
        }
    });

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleFieldToggle = (fieldKey) => {
        const newSelected = selectedFields.includes(fieldKey)
            ? selectedFields.filter(f => f !== fieldKey)
            : [...selectedFields, fieldKey];
        onFieldsChange(newSelected);
    };

    const selectAllInCategory = (category) => {
        const categoryFields = filteredFieldsByCategory[category] || [];
        const categoryKeys = categoryFields.map(f => f.key);
        const allSelected = categoryKeys.every(key => selectedFields.includes(key));

        if (allSelected) {
            // Deselect all in category
            const newSelected = selectedFields.filter(key => !categoryKeys.includes(key));
            onFieldsChange(newSelected);
        } else {
            // Select all in category
            const newSelected = [...new Set([...selectedFields, ...categoryKeys])];
            onFieldsChange(newSelected);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                    type="text"
                    placeholder="Rechercher un champ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Field categories */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {Object.entries(filteredFieldsByCategory).map(([category, fields]) => {
                    const categoryInfo = FIELD_CATEGORIES[category] || { icon: Package, color: 'text-gray-600' };
                    const Icon = categoryInfo.icon;
                    const isExpanded = expandedCategories[category] !== false;
                    const categoryKeys = fields.map(f => f.key);
                    const allSelected = categoryKeys.length > 0 && categoryKeys.every(key => selectedFields.includes(key));
                    const someSelected = categoryKeys.some(key => selectedFields.includes(key));

                    return (
                        <Card key={category} className="border">
                            <CardHeader
                                className="cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => toggleCategory(category)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-5 h-5 ${categoryInfo.color}`} />
                                        <CardTitle className="text-sm font-medium">{category}</CardTitle>
                                        <Badge variant="secondary" className="text-xs">
                                            {fields.length}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={() => selectAllInCategory(category)}
                                            onClick={(e) => e.stopPropagation()}
                                            className={someSelected && !allSelected ? 'data-[state=checked]:bg-orange-500' : ''}
                                        />
                                        <span className="text-xs text-gray-500">
                                            {isExpanded ? '▼' : '▶'}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            {isExpanded && (
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        {fields.map(field => (
                                            <div
                                                key={field.key}
                                                className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 transition-colors"
                                            >
                                                <Checkbox
                                                    id={field.key}
                                                    checked={selectedFields.includes(field.key)}
                                                    onCheckedChange={() => handleFieldToggle(field.key)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <Label
                                                        htmlFor={field.key}
                                                        className="text-sm font-medium cursor-pointer"
                                                    >
                                                        {field.label}
                                                    </Label>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {field.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Selection summary */}
            {selectedFields.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                        <strong>{selectedFields.length}</strong> champ{selectedFields.length > 1 ? 's' : ''} sélectionné{selectedFields.length > 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
}

