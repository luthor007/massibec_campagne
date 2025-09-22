'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SchoolSalesData = ({ schoolId }) => {
  const [products, setProducts] = useState([]);
  const [salesData, setSalesData] = useState({ live: {}, prediction: {} });
  const [loadingSales, setLoadingSales] = useState(true);
  const [errorSales, setErrorSales] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (schoolId) {
      fetchSalesData(schoolId);
    }
  }, [schoolId]);

  const fetchSalesData = async (id) => {
    setLoadingSales(true);
    setErrorSales(null);
    try {
      const response = await fetch(`/api/schools/${id}/sales-data`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales data.');
      }
      const data = await response.json();
      setProducts(data.products);
      setSalesData(data.data);
    } catch (error) {
      setErrorSales(error.message);
    } finally {
      setLoadingSales(false);
    }
  };

  const exportToCSV = () => {
    if (products.length === 0) {
      toast({ title: 'No sales data to export.' });
      return;
    }

    // Define headers
    const headers = [...products.map(product => product), 'Total Sales'];

    // Define rows
    const rows = [
      {
        label: 'Commande Live',
        data: { ...salesData.live },
      },
      {
        label: 'Prediction',
        data: { ...salesData.prediction },
      },
    ];

    // Generate CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Label,' + headers.join(',') + '\n';

    rows.forEach(row => {
      const rowData = [row.label];
      headers.forEach(header => {
        rowData.push(row.data[header] !== undefined ? row.data[header] : '');
      });
      csvContent += rowData.join(',') + '\n';
    });

    // Create and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `sales-data-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: 'Sales data has been exported to CSV.',
    });
  };

  return (
    <div className="p-6 bg-white shadow rounded-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Sales Data</h3>
        <Button onClick={exportToCSV}>Export as CSV</Button>
      </div>

      {loadingSales ? (
        <div className="flex justify-center items-center">
          <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
          <span className="ml-2">Loading sales data...</span>
        </div>
      ) : errorSales ? (
        <p className="text-red-500">Error: {errorSales}</p>
      ) : products.length === 0 ? (
        <p>No sales data available for this school.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                {products.map((product) => (
                  <TableHead key={product}>{product}</TableHead>
                ))}
                <TableHead>Total Sales ($)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Commande Live Row */}
              <TableRow>
                <TableCell>Commande Live</TableCell>
                {products.map((product) => (
                  <TableCell key={product}>
                    {salesData.live[product] !== undefined ? salesData.live[product] : 0}
                  </TableCell>
                ))}
                <TableCell>
                  {salesData.live['Total Sales'] !== undefined ? salesData.live['Total Sales'].toFixed(2) : '0.00'}
                </TableCell>
              </TableRow>

              {/* Prediction Row */}
              <TableRow>
                <TableCell>Prediction</TableCell>
                {products.map((product) => (
                  <TableCell key={product}>
                    {salesData.prediction[product] !== undefined ? salesData.prediction[product] : 0}
                  </TableCell>
                ))}
                <TableCell>
                  {salesData.prediction['Total Sales'] !== undefined
                    ? salesData.prediction['Total Sales'].toFixed(2)
                    : '0.00'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default SchoolSalesData; 