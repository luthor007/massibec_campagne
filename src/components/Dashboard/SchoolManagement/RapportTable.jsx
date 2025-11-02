import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getTerminology } from '@/utils/organizationHelpers';

const RapportTable = ({ students, loading, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Toggle row expansion
  const toggleRow = (userId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;

    const searchLower = searchTerm.toLowerCase();
    return students.filter(student => {
      return (
        student.firstName?.toLowerCase().includes(searchLower) ||
        student.lastName?.toLowerCase().includes(searchLower) ||
        student.parentFirstName?.toLowerCase().includes(searchLower) ||
        student.parentLastName?.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower) ||
        student.parentEmail?.toLowerCase().includes(searchLower)
      );
    });
  }, [students, searchTerm]);

  // Sort students
  const sortedStudents = useMemo(() => {
    if (!sortConfig.key) return filteredStudents;

    return [...filteredStudents].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`;
          bValue = `${b.firstName} ${b.lastName}`;
          break;
        case 'sales':
          aValue = a.metrics.totalSales;
          bValue = b.metrics.totalSales;
          break;
        case 'profit':
          aValue = a.metrics.totalStudentProfit;
          bValue = b.metrics.totalStudentProfit;
          break;
        case 'orders':
          aValue = a.metrics.orderCount;
          bValue = b.metrics.orderCount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredStudents, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement des données...</p>
      </div>
    );
  }

  // Empty state
  if (!students || students.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucun {terminology.participant} trouvé pour cette campagne.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher par nom, email, parent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12"></TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Nom {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sales')}
              >
                Ventes $ {sortConfig.key === 'sales' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('profit')}
              >
                Profits $ {sortConfig.key === 'profit' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('orders')}
              >
                Commandes {sortConfig.key === 'orders' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStudents.map((student) => {
              const isExpanded = expandedRows.has(student.userId);
              const productBreakdown = student.productBreakdown
                .map(p => `${p.name}: ${p.quantity}`)
                .join(', ');

              return (
                <React.Fragment key={student.userId}>
                  <TableRow 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleRow(student.userId)}
                  >
                    <TableCell>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{student.email}</div>
                        {student.parentPhone && (
                          <div className="text-gray-500">{student.parentPhone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.parentFirstName} {student.parentLastName}
                      {student.parentEmail && (
                        <div className="text-sm text-gray-500">{student.parentEmail}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {student.metrics.totalSales.toFixed(2)}$
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {student.metrics.totalStudentProfit.toFixed(2)}$
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.metrics.orderCount}</Badge>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Row */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <TableCell colSpan={7} className="p-0">
                          <div className="bg-gray-50 p-4">
                            {/* Detailed Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                              <div className="bg-white p-3 rounded-lg">
                                <div className="text-xs text-gray-500">Profit {terminology.participant}</div>
                                <div className="text-lg font-semibold text-green-600">
                                  {(student.metrics.studentCashProfit + student.metrics.studentSchoolAccountProfit).toFixed(2)}$
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg">
                                <div className="text-xs text-gray-500">Dons {terminology.participant}</div>
                                <div className="text-lg font-semibold text-orange-600">
                                  {(student.metrics.studentDonations || 0).toFixed(2)}$
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg">
                                <div className="text-xs text-gray-500">Total {terminology.participant}</div>
                                <div className="text-lg font-semibold text-blue-700">
                                  {(student.metrics.studentCashProfit + student.metrics.studentSchoolAccountProfit + (student.metrics.studentDonations || 0)).toFixed(2)}$
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg">
                                <div className="text-xs text-gray-500">Profit {terminology.organization}</div>
                                <div className="text-lg font-semibold text-blue-600">
                                  {student.metrics.schoolProjectEarnings.toFixed(2)}$
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg">
                                <div className="text-xs text-gray-500">Dons {terminology.organization}</div>
                                <div className="text-lg font-semibold text-purple-600">
                                  {(student.metrics.schoolDonations || 0).toFixed(2)}$
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg">
                                <div className="text-xs text-gray-500">Total {terminology.organization}</div>
                                <div className="text-lg font-semibold text-indigo-600">
                                  {(student.metrics.schoolProjectEarnings + (student.metrics.schoolDonations || 0)).toFixed(2)}$
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-4">
                              <div className="bg-white p-3 rounded-lg">
                                <div className="text-xs text-gray-500">Montant à Payer</div>
                                <div className="text-lg font-semibold text-red-600">
                                  {student.metrics.studentPaymentAmount.toFixed(2)}$
                                </div>
                              </div>
                              <div className="bg-white p-3 rounded-lg">
                                <div className="text-xs text-gray-500">Coût Produits</div>
                                <div className="text-lg font-semibold text-gray-600">
                                  {student.metrics.totalProductCost.toFixed(2)}$
                                </div>
                              </div>
                            </div>

                            {/* Product Breakdown */}
                            <div className="mb-4">
                              <h4 className="font-semibold mb-2">Produits Vendus:</h4>
                              <p className="text-sm text-gray-600">{productBreakdown || 'Aucun'}</p>
                            </div>

                            {/* Orders */}
                            {student.orders && student.orders.length > 0 ? (
                              <div>
                                <h4 className="font-semibold mb-2">Commandes ({student.orders.length}):</h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Produits</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Dons</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Statut</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {student.orders.map((order) => (
                                        <TableRow key={order.orderId}>
                                          <TableCell className="font-mono text-xs">
                                            {order.orderId}
                                          </TableCell>
                                          <TableCell>
                                            <div className="text-sm">
                                              <div>{order.customerName}</div>
                                              <div className="text-gray-500">{order.customerEmail}</div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {order.products?.map((p, i) => (
                                              <div key={i}>{p.productName} x{p.quantity}</div>
                                            ))}
                                          </TableCell>
                                          <TableCell className="font-semibold">
                                            {order.totalAmount.toFixed(2)}$
                                          </TableCell>
                                          <TableCell className="font-semibold text-orange-600">
                                            {Number(order.studentDonation || order.tip || 0).toFixed(2)}$ / {Number(order.schoolDonation || 0).toFixed(2)}$
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {new Date(order.createdAt).toLocaleDateString('fr-CA')}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={
                                              order.status === 'Complété' ? 'default' :
                                              order.status === 'Payé' ? 'secondary' : 'outline'
                                            }>
                                              {order.status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">Aucune commande</p>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="mt-4 text-sm text-gray-600">
        {sortedStudents.length} {terminology.participant}{sortedStudents.length > 1 ? 's' : ''} trouvé{sortedStudents.length > 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default RapportTable;

