'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AVAILABLE_COLUMNS = [
  { key: '_id', label: 'Order ID unique' },
  { key: 'orderId', label: 'Order ID' },
  { key: 'campaignNumber', label: 'Numéro de campagne' },
  { key: 'email', label: 'Email' },
  { key: 'studentName', label: 'Student Name' },
  { key: 'parentName', label: 'Parent Name' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'totalUnits', label: 'Total Units' },
  { key: 'totalAmount', label: 'Total Amount ($)' },
  { key: 'amountPaid', label: 'Amount Paid ($)' },
  { key: 'studentBenefit', label: 'Student Benefit ($)' },
  { key: 'organizationBenefit', label: 'Organization Benefit ($)' },
  { key: 'raffleBenefit', label: 'Raffle Benefit ($)' },
  { key: 'campaignEndDate', label: 'Date de fin de campagne' },
  { key: 'timestamp', label: 'Date' },
];

const PRODUCT_MAPPING = {
  "Tarte au fraises": "01650",
  "Tarte aux pommes et sucre à la crème": "10650",
  "Tarte aux framboises": "03650",
  "Tarte aux bleuets": "04650",
  "Tarte aux pommes": "05650",
  "Tarte croustade aux pommes": "06650",
  "Tarte au sucre à la crème": "02600",
  "Tarte fraises et rhubarbe": "09650",
  "Pâté au poulet": "20675",
  "Pâté à la viande": "21675"
};

const SchoolOrders = ({ schoolId, school }) => {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState(null);
  const { toast } = useToast();

  // State for selected columns
  const [selectedColumns, setSelectedColumns] = useState(
    AVAILABLE_COLUMNS.map((col) => col.key)
  );

  // State for expanded rows to show product details
  const [expandedRows, setExpandedRows] = useState([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const [showExpDialog, setShowExpDialog] = useState(false);
  const [expNum, setExpNum] = useState('');
  const [accumba, setAccumba] = useState('');
  const [pendingExportCallback, setPendingExportCallback] = useState(null);

  const [filters, setFilters] = useState({
    studentName: '',
    orderIdFrom: '',
    orderIdTo: '',
    dateFrom: '',
    dateTo: '',
    email: ''
  });

  // Add filtered orders state
  const [filteredOrders, setFilteredOrders] = useState([]);

  const [editingOrder, setEditingOrder] = useState(null);

  const fetchOrders = useCallback(async (id) => {
    setLoadingOrders(true);
    setErrorOrders(null);
    try {
      const response = await fetch(`/api/orderStudent?schoolId=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders.');
      }
      const data = await response.json();

      // Fetch parent names for all orders
      const ordersWithParentNames = await Promise.all(
        data.orders.map(async (order) => {
          const plainOrder = order.toObject ? order.toObject() : { ...order };
          const orderCampaignNumber = plainOrder.campaignNumber ?? order.campaignNumber;
          const campaignDetails = school?.campaigns?.find(
            (campaign) => campaign.campaignNumber === orderCampaignNumber
          );
          const endDateCandidate = campaignDetails?.endDate || school?.finCampagne;
          const campaignEndDate = endDateCandidate
            ? new Date(endDateCandidate).toISOString().split('T')[0]
            : 'N/A';

          const userResponse = await fetch(`/api/users/by-email?email=${order.email}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Use parentInfo name if available, otherwise use user's name as fallback
            const parentName = userData.parentInfo?.prenomParent && userData.parentInfo?.nomParent
              ? `${userData.parentInfo.prenomParent} ${userData.parentInfo.nomParent}`
              : userData.name || 'N/A';
            return {
              ...plainOrder,
              campaignNumber: orderCampaignNumber != null ? String(orderCampaignNumber) : 'N/A',
              campaignEndDate,
              parentName
            };
          }
          return {
            ...plainOrder,
            campaignNumber: orderCampaignNumber != null ? String(orderCampaignNumber) : 'N/A',
            campaignEndDate,
            parentName: 'N/A'
          };
        })
      );

      setOrders(ordersWithParentNames);
    } catch (error) {
      setErrorOrders(error.message);
    } finally {
      setLoadingOrders(false);
    }
  }, [school]);

  useEffect(() => {
    if (schoolId && school) {
      fetchOrders(schoolId);
    }
  }, [schoolId, school, fetchOrders]);

  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      toast({ title: 'No orders to export.' });
      return;
    }

    // Get all unique product names and sort them
    const uniqueProducts = [...new Set(
      filteredOrders.flatMap(order =>
        order.products.map(product => product.productName)
      )
    )].sort();

    // Prepare headers
    const standardHeaders = AVAILABLE_COLUMNS
      .filter(col => selectedColumns.includes(col.key))
      .map(col => col.label);

    const productHeaders = uniqueProducts.map(name => `Quantity - ${name}`);
    const headers = [...standardHeaders, ...productHeaders];

    // Prepare rows with aggregated product quantities
    const rows = filteredOrders.map(order => {
      // Format timestamp
      const orderDate = new Date(order.timestamp).toLocaleDateString('fr-CA');

      // Get standard columns data
      const standardColumns = AVAILABLE_COLUMNS
        .filter(col => selectedColumns.includes(col.key))
        .map(col => {
          switch (col.key) {
            case '_id':
              return order._id;
            case 'campaignNumber':
              return order.campaignNumber || 'N/A';
            case 'timestamp':
              return orderDate;
            case 'campaignEndDate':
              return order.campaignEndDate || 'N/A';
            case 'totalAmount':
            case 'amountPaid':
            case 'studentBenefit':
            case 'organizationBenefit':
            case 'raffleBenefit':
              return order[col.key]?.toFixed(2) || '0.00';
            default:
              return order[col.key];
          }
        });

      // Aggregate product quantities
      const productQuantityMap = new Map();
      order.products.forEach(product => {
        const currentQuantity = productQuantityMap.get(product.productName) || 0;
        productQuantityMap.set(product.productName, currentQuantity + product.quantity);
      });

      // Get quantities for each product in the same order as uniqueProducts
      const productQuantities = uniqueProducts.map(productName =>
        productQuantityMap.get(productName) || 0
      );

      return [...standardColumns, ...productQuantities];
    });

    // Generate CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join(',') + '\n';

    rows.forEach(rowArray => {
      const formattedRow = rowArray.map(field => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      });
      csvContent += formattedRow.join(',') + '\n';
    });

    // Create and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `orders-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: 'Your orders have been exported to CSV.',
    });
  };

  // Handler to toggle expanded rows
  const toggleRowExpansion = (orderId) => {
    setExpandedRows((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  // Column selection dialog content
  const ColumnSelector = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Configure Columns</Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <DialogHeader>
          <DialogTitle>Select Columns to Display</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {AVAILABLE_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center space-x-2">
              <Checkbox
                id={col.key}
                checked={selectedColumns.includes(col.key)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedColumns([...selectedColumns, col.key]);
                  } else {
                    setSelectedColumns(selectedColumns.filter((key) => key !== col.key));
                  }
                }}
              />
              <Label htmlFor={col.key}>{col.label}</Label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  // In the table display, aggregate products for the expanded view
  const getAggregatedProducts = (products) => {
    const productMap = new Map();

    products.forEach(product => {
      if (productMap.has(product.productName)) {
        const existing = productMap.get(product.productName);
        existing.quantity += product.quantity;
        existing.profit += product.profit;
        existing.studentBenefit += product.studentBenefit;
        existing.organizationBenefit += product.organizationBenefit;
        existing.raffleBenefit += product.raffleBenefit;
      } else {
        productMap.set(product.productName, { ...product });
      }
    });

    return Array.from(productMap.values());
  };

  // Add delete handler
  const handleDeleteOrder = async (orderId) => {
    try {
      const response = await fetch(`/api/orderStudent/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Remove the order from the local state
      setOrders(orders.filter(order => order._id !== orderId));

      toast({
        title: 'Order deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error deleting order',
        description: error.message,
        variant: 'destructive',
      });
    }
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  // Add DeleteConfirmDialog component
  const DeleteConfirmDialog = () => (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the order.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 hover:bg-red-600"
            onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const FilterSection = ({ filters, setFilters, applyFilters }) => {
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-4">Filters</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="studentName">Student Name</Label>
            <Input
              id="studentName"
              value={filters.studentName}
              onChange={(e) => setFilters({ ...filters, studentName: e.target.value })}
              placeholder="Search by name..."
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={filters.email}
              onChange={(e) => setFilters({ ...filters, email: e.target.value })}
              placeholder="Search by email..."
            />
          </div>
          <div className="flex gap-2">
            <div>
              <Label htmlFor="orderIdFrom">Order ID From</Label>
              <Input
                id="orderIdFrom"
                type="number"
                value={filters.orderIdFrom}
                onChange={(e) => setFilters({ ...filters, orderIdFrom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="orderIdTo">To</Label>
              <Input
                id="orderIdTo"
                type="number"
                value={filters.orderIdTo}
                onChange={(e) => setFilters({ ...filters, orderIdTo: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        </div>
        <Button
          className="mt-4"
          onClick={applyFilters}
        >
          Apply Filters
        </Button>
      </div>
    );
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.studentName) {
      filtered = filtered.filter(order =>
        order.studentName.toLowerCase().includes(filters.studentName.toLowerCase())
      );
    }

    if (filters.email) {
      filtered = filtered.filter(order =>
        order.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    if (filters.orderIdFrom) {
      filtered = filtered.filter(order =>
        order.orderId >= parseInt(filters.orderIdFrom)
      );
    }

    if (filters.orderIdTo) {
      filtered = filtered.filter(order =>
        order.orderId <= parseInt(filters.orderIdTo)
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(order =>
        new Date(order.timestamp) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59);
      filtered = filtered.filter(order =>
        new Date(order.timestamp) <= toDate
      );
    }

    setFilteredOrders(filtered);
  };

  useEffect(() => {
    setFilteredOrders(orders);
  }, [orders]);

  const exportToOrderFormat = async () => {
    if (filteredOrders.length === 0) {
      toast({ title: 'No orders to export.' });
      return;
    }

    // Get school details
    const schoolResponse = await fetch(`/api/schools/${schoolId}`);
    const school = await schoolResponse.json();

    if (!school.expNum || !school.accumba) {
      // Show dialog to collect missing information
      setExpNum('');
      setAccumba('');
      setShowExpDialog(true);
      // Store school reference for continuation
      setPendingExportCallback(() => school);
      return;
    }

    await continueExport(school);
  };

  const handleExpDialogSubmit = async () => {
    if (!expNum || !accumba) {
      sonnerToast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      // Update school with new information
      await fetch(`/api/schools/${schoolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expNum, accumba })
      });

      // Get updated school data
      const schoolResponse = await fetch(`/api/schools/${schoolId}`);
      const school = await schoolResponse.json();

      school.expNum = expNum;
      school.accumba = accumba;
      setShowExpDialog(false);

      // Continue with export
      await continueExport(school);
      setPendingExportCallback(null);
    } catch (error) {
      sonnerToast.error('Erreur lors de la mise à jour des informations de l\'organisation');
    }
  };

  const continueExport = async (school) => {

    // Get EDI counter value for these orders
    const counterResponse = await fetch('/api/edi-counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increment: filteredOrders.length })
    });
    const { startValue } = await counterResponse.json();

    // Prepare the rows - one row per product
    const rows = filteredOrders.flatMap((order, orderIndex) => {
      const ediNum = startValue + orderIndex;
      const accumbaPrefix = school.accumba.substring(0, 4);
      const parentName = order.parentName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .toUpperCase();
      const commandeClient = `${accumbaPrefix}-${order.orderId}-${parentName}`.substring(0, 20);
      const orderDate = new Date(order.timestamp).toLocaleDateString('fr-CA');

      // Create a row for each product in the order
      return order.products.map((product, lineIndex) => {
        // Get the product ID from the mapping
        const productId = PRODUCT_MAPPING[product.productName] || 'N/A';

        if (productId === 'N/A') {
          console.warn(`No mapping found for product: ${product.productName}`);
          return null;
        }

        return {
          EDINum: ediNum,
          'Client              ': '',
          'Exp ': school.expNum,
          'LivreeA             ': school.accumba,
          'CommandeClient        ': commandeClient,
          'ClientNom                     ': '',
          'ShipToName                    ': school.name,
          'DateCom ': new Date().toLocaleDateString('fr-CA'),
          'DateLiv ': new Date().toLocaleDateString('fr-CA'),
          'Line': lineIndex + 1,
          'Produit             ': productId,
          'Qtee  ': product.quantity,
          'Prix     ': product.cost.toFixed(2),
          '': ''
        };
      });
    }).filter(row => row !== null);

    // Generate CSV
    const headers = [
      'EDINum',
      'Client              ',
      'Exp ',
      'LivreeA             ',
      'CommandeClient        ',
      'ClientNom                     ',
      'ShipToName                    ',
      'DateCom ',
      'DateLiv ',
      'Line',
      'Produit             ',
      'Qtee  ',
      'Prix     ',
      ''
    ];

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += headers.join('|') + '\n';

    rows.forEach(row => {
      const rowContent = headers.map(header => row[header] || '').join('|');
      csvContent += rowContent + '\n';
    });

    // Download file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `orders-format-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: 'Your orders have been exported in order format.',
    });
  };

  // Add this function to handle product updates
  const handleUpdateOrder = async (orderId, updatedProducts) => {
    try {
      const response = await fetch(`/api/orderStudent/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updatedProducts })
      });

      if (!response.ok) throw new Error('Failed to update order');

      // Update local state
      setOrders(orders.map(order =>
        order._id === orderId ? { ...order, products: updatedProducts } : order
      ));

      toast({ title: 'Order updated successfully' });
    } catch (error) {
      toast({
        title: 'Error updating order',
        variant: 'destructive'
      });
    }
    setEditingOrder(null);
  };

  // Add this new component for editing products
  const EditProductsForm = ({ products, onSave, productMapping }) => {
    const [editedProducts, setEditedProducts] = useState(products);

    const addProduct = () => {
      setEditedProducts([...editedProducts, {
        productName: Object.keys(productMapping)[0],
        quantity: 1,
        price: 0,
        cost: 0,
        profit: 0,
        studentBenefit: 0,
        organizationBenefit: 0,
        raffleBenefit: 0
      }]);
    };

    return (
      <div className="space-y-4 bg-white">
        {editedProducts.map((product, index) => (
          <div key={index} className="flex gap-4 items-center">
            <Select
              value={product.productName}
              onValueChange={(value) => {
                const updated = [...editedProducts];
                updated[index] = { ...product, productName: value };
                setEditedProducts(updated);
              }}
            >
              <SelectTrigger>
                <SelectValue>{product.productName}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                {Object.keys(productMapping).map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={product.quantity}
              onChange={(e) => {
                const updated = [...editedProducts];
                updated[index] = { ...product, quantity: parseInt(e.target.value) };
                setEditedProducts(updated);
              }}
              className="w-24"
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setEditedProducts(editedProducts.filter((_, i) => i !== index));
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button onClick={addProduct}>Add Product</Button>
          <Button onClick={() => onSave(editedProducts)}>Save Changes</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white shadow rounded-md">
      <DeleteConfirmDialog />
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-semibold">Orders</h3>
          <ColumnSelector />
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportToCSV}>Export as CSV</Button>
          <Button onClick={exportToOrderFormat}>Export Order Format</Button>
        </div>
      </div>

      <FilterSection
        filters={filters}
        setFilters={setFilters}
        applyFilters={applyFilters}
      />

      {loadingOrders ? (
        <div className="flex justify-center items-center">
          <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
          <span className="ml-2">Loading orders...</span>
        </div>
      ) : errorOrders ? (
        <p className="text-red-500">Error: {errorOrders}</p>
      ) : orders.length === 0 ? (
        <p>No orders found for this school.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                {AVAILABLE_COLUMNS.filter((col) =>
                  selectedColumns.includes(col.key)
                ).map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <React.Fragment key={order.orderId}>
                  <TableRow>
                    {/* Expand/Collapse Button */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => toggleRowExpansion(order.orderId)}
                      >
                        {expandedRows.includes(order.orderId) ? '-' : '+'}
                      </Button>
                    </TableCell>
                    {/* Dynamic Columns */}
                    {AVAILABLE_COLUMNS.filter((col) =>
                      selectedColumns.includes(col.key)
                    ).map((col) => (
                      <TableCell key={col.key}>
                        {col.key === '_id' ? (
                          order._id // MongoDB _id is displayed as is
                        ) : col.key === 'timestamp' ? (
                          new Date(order.timestamp).toLocaleDateString('fr-CA')
                        ) : typeof order[col.key] === 'number' ? (
                          order[col.key].toFixed(2)
                        ) : (
                          order[col.key]
                        )}
                      </TableCell>
                    ))}
                    {/* Add delete button column */}
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setOrderToDelete(order._id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                  {/* Expanded Row for Product Details */}
                  {expandedRows.includes(order.orderId) && (
                    <TableRow>
                      <TableCell colSpan={selectedColumns.length + 1}>
                        <div className="p-4 bg-gray-50 rounded-md">
                          <div className="flex justify-between mb-4">
                            <h4 className="font-semibold">Products in Order</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingOrder(editingOrder === order._id ? null : order._id)}
                            >
                              {editingOrder === order._id ? 'Cancel Edit' : 'Edit Products'}
                            </Button>
                          </div>
                          {editingOrder === order._id ? (
                            <EditProductsForm
                              products={order.products}
                              onSave={(updatedProducts) => handleUpdateOrder(order._id, updatedProducts)}
                              productMapping={PRODUCT_MAPPING}
                            />
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product Name</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Price ($)</TableHead>
                                  <TableHead>Cost ($)</TableHead>
                                  <TableHead>Profit ($)</TableHead>
                                  <TableHead>Student Benefit ($)</TableHead>
                                  <TableHead>Organization Benefit ($)</TableHead>
                                  <TableHead>Raffle Benefit ($)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getAggregatedProducts(order.products).map((product, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{product.productName}</TableCell>
                                    <TableCell>{product.quantity}</TableCell>
                                    <TableCell>{product.price.toFixed(2)}</TableCell>
                                    <TableCell>{product.cost.toFixed(2)}</TableCell>
                                    <TableCell>{product.profit.toFixed(2)}</TableCell>
                                    <TableCell>{product.studentBenefit.toFixed(2)}</TableCell>
                                    <TableCell>{product.organizationBenefit.toFixed(2)}</TableCell>
                                    <TableCell>{product.raffleBenefit.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog for Exp and Accumba numbers */}
      <Dialog open={showExpDialog} onOpenChange={setShowExpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informations requises pour l'export</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="expNum">Numéro Exp</Label>
              <Input
                id="expNum"
                value={expNum}
                onChange={(e) => setExpNum(e.target.value)}
                placeholder="Entrez le numéro Exp"
              />
            </div>
            <div>
              <Label htmlFor="accumba">Numéro Accumba</Label>
              <Input
                id="accumba"
                value={accumba}
                onChange={(e) => setAccumba(e.target.value)}
                placeholder="Entrez le numéro Accumba"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowExpDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleExpDialogSubmit}>
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolOrders;


{/*
  
  
  Add a button on the side of delete in schoolOrder so the admin can go into any users account for debugging purpose, call the button Connect, it should redirect to /dashboard and connect to the user with  a g*/}
