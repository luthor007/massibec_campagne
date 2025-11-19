import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Users,
    Search,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertCircle,
    DollarSign,
    Package,
    Mail,
    Phone,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

const CampaignStudentsList = ({ campaign }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'withSales', 'withoutSales'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'sales', 'units'
    const [sortDirection, setSortDirection] = useState('asc');
    const [isExpanded, setIsExpanded] = useState(true); // Expanded by default

    useEffect(() => {
        if (campaign?._id) {
            fetchStudents();
        }
    }, [campaign?._id]);

    const fetchStudents = async () => {
        if (!campaign?._id) {
            console.log('No campaign ID:', campaign);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const campaignId = campaign._id?.toString() || campaign._id;
            console.log('Fetching students for campaign:', campaignId);
            const response = await fetch(`/api/campaigns/${campaignId}/participants`);
            if (!response.ok) {
                throw new Error(`Failed to fetch students: ${response.status}`);
            }

            const data = await response.json();
            console.log('Students data:', data);
            setStudents(data.participants || []);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount);
    };

    // Filter and sort students
    const filteredAndSortedStudents = React.useMemo(() => {
        let filtered = students.filter(student => {
            // Search filter
            const matchesSearch =
                student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.parentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.parentPhone?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            // Status filter
            const hasSales = student.totalSales > 0;
            if (filterStatus === 'withSales') return hasSales;
            if (filterStatus === 'withoutSales') return !hasSales;
            return true; // 'all'
        });

        // Sort
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'name':
                    aValue = a.name?.toLowerCase() || '';
                    bValue = b.name?.toLowerCase() || '';
                    break;
                case 'sales':
                    aValue = a.totalSales || 0;
                    bValue = b.totalSales || 0;
                    break;
                case 'units':
                    aValue = a.totalUnits || 0;
                    bValue = b.totalUnits || 0;
                    break;
                default:
                    return 0;
            }

            if (sortBy === 'name') {
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else {
                return sortDirection === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }
        });

        return filtered;
    }, [students, searchTerm, filterStatus, sortBy, sortDirection]);

    const handleSort = (key) => {
        if (sortBy === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDirection('asc');
        }
    };

    const studentsWithSales = students.filter(s => s.totalSales > 0).length;
    const studentsWithoutSales = students.filter(s => s.totalSales === 0).length;

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" />
                        Étudiants ({students.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Chargement...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" />
                        Étudiants
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-red-600">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                        <p>Erreur: {error}</p>
                        <Button onClick={fetchStudents} variant="outline" className="mt-4">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Réessayer
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5" />
                        Étudiants ({students.length})
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {studentsWithSales} avec ventes
                        </Badge>
                        <Badge variant="outline" className="text-gray-500 border-gray-300">
                            <XCircle className="h-3 w-3 mr-1" />
                            {studentsWithoutSales} sans ventes
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Rechercher par nom, email, parent..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filtrer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous</SelectItem>
                                <SelectItem value="withSales">Avec ventes</SelectItem>
                                <SelectItem value="withoutSales">Sans ventes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Students Table */}
                    {filteredAndSortedStudents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>
                                {searchTerm || filterStatus !== 'all'
                                    ? 'Aucun étudiant trouvé'
                                    : 'Aucun étudiant inscrit'}
                            </p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="w-12">Statut</TableHead>
                                        <TableHead
                                            className="cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('name')}
                                        >
                                            Nom {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead>Parent</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead
                                            className="text-right cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('sales')}
                                        >
                                            Ventes {sortBy === 'sales' && (sortDirection === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead
                                            className="text-right cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('units')}
                                        >
                                            Unités {sortBy === 'units' && (sortDirection === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead className="text-right">Commandes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedStudents.map((student) => {
                                        const hasSales = student.totalSales > 0;
                                        return (
                                            <TableRow
                                                key={student._id}
                                                className={`hover:bg-gray-50 ${!hasSales ? 'opacity-75' : ''}`}
                                            >
                                                <TableCell className="w-12">
                                                    {hasSales ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-500" title="A commencé à vendre" />
                                                    ) : (
                                                        <AlertCircle className="h-5 w-5 text-gray-400" title="N'a pas encore vendu" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {student.name}
                                                        {student.role === 'school_manager' && (
                                                            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                                                Manager
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-700">
                                                    {student.parentName || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-700">
                                                    <div className="space-y-1">
                                                        {student.email && (
                                                            <div className="flex items-center gap-1 text-xs">
                                                                <Mail className="h-3 w-3" />
                                                                {student.email}
                                                            </div>
                                                        )}
                                                        {student.parentPhone && (
                                                            <div className="flex items-center gap-1 text-xs">
                                                                <Phone className="h-3 w-3" />
                                                                {student.parentPhone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`text-right font-semibold ${hasSales ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {hasSales ? formatCurrency(student.totalSales) : '-'}
                                                </TableCell>
                                                <TableCell className={`text-right ${hasSales ? '' : 'text-gray-400'}`}>
                                                    {hasSales ? student.totalUnits : '-'}
                                                </TableCell>
                                                <TableCell className={`text-right ${hasSales ? '' : 'text-gray-400'}`}>
                                                    {hasSales ? student.orderCount : '-'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
};

export default CampaignStudentsList;

