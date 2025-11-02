/**
 * Export utilities for rapport data
 */
import { toast } from 'sonner';

/**
 * Export student data to CSV (one row per student)
 */
export const exportStudentDataCSV = (students, campaignInfo) => {
  if (!students || students.length === 0) {
    toast.info('Aucune donnée à exporter');
    return;
  }

  // Create CSV headers
    const headers = [
      'Prénom',
      'Nom',
      'Prénom Parent',
      'Nom Parent',
      'Email',
      'Email Parent',
      'Téléphone Parent',
      'Ventes Totales ($)',
      'Coût Total Produits ($)',
      'Profits Étudiant ($)',
      'Bénéfices École ($)',
      'Bénéfices Tirage ($)',
      'Dons Étudiants ($)',
      'Dons École ($)',
      'Total Dons ($)',
      'Nombre de Commandes',
      'Produits Vendus'
    ];

  // Create CSV rows
  const rows = students.map(student => {
    const productBreakdown = student.productBreakdown
      .map(p => `${p.name}: ${p.quantity}`)
      .join(', ');

    return [
      student.firstName || '',
      student.lastName || '',
      student.parentFirstName || '',
      student.parentLastName || '',
      student.email || '',
      student.parentEmail || '',
      student.parentPhone || '',
      student.metrics.totalSales.toFixed(2),
      student.metrics.totalProductCost.toFixed(2),
      student.metrics.studentProfit.toFixed(2),
      student.metrics.schoolEarnings.toFixed(2),
      student.metrics.raffleEarnings.toFixed(2),
      (student.metrics.studentDonations || 0).toFixed(2),
      (student.metrics.schoolDonations || 0).toFixed(2),
      student.metrics.totalDons.toFixed(2),
      student.metrics.orderCount,
      productBreakdown
    ];
  });

  // Create CSV content
  const csvContent = [
    // Campaign info as comments
    `# Campagne: ${campaignInfo?.name || 'N/A'}`,
    `# Code: ${campaignInfo?.code || 'N/A'}`,
    `# Date: ${new Date().toLocaleDateString('fr-CA')}`,
    '',
    // Headers
    headers.join(','),
    // Rows
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `rapport-etudiants-${campaignInfo?.code || 'campagne'}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export all orders to CSV (one row per order with student context)
 */
export const exportAllOrdersCSV = (students, campaignInfo) => {
  if (!students || students.length === 0) {
    toast.info('Aucune donnée à exporter');
    return;
  }

  // Create CSV headers
  const headers = [
    'Prénom Étudiant',
    'Nom Étudiant',
    'Email Étudiant',
    'Email Parent',
    'Téléphone Parent',
    'ID Commande',
    'Nom Client',
    'Email Client',
    'Téléphone Client',
    'Produits',
    'Total ($)',
    'Pourboire ($)',
    'Date',
    'Statut'
  ];

  // Create CSV rows
  const rows = [];
  students.forEach(student => {
    student.orders.forEach(order => {
      const products = order.products
        .map(p => `${p.productName} x${p.quantity}`)
        .join(', ');

      rows.push([
        student.firstName || '',
        student.lastName || '',
        student.email || '',
        student.parentEmail || '',
        student.parentPhone || '',
        order.orderId || '',
        order.customerName || '',
        order.customerEmail || '',
        order.customerPhone || '',
        products,
        order.totalAmount.toFixed(2),
        (order.tip || 0).toFixed(2),
        new Date(order.createdAt).toLocaleDateString('fr-CA'),
        order.status || ''
      ]);
    });
  });

  // Create CSV content
  const csvContent = [
    // Campaign info as comments
    `# Campagne: ${campaignInfo?.name || 'N/A'}`,
    `# Code: ${campaignInfo?.code || 'N/A'}`,
    `# Date: ${new Date().toLocaleDateString('fr-CA')}`,
    '',
    // Headers
    headers.join(','),
    // Rows
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `rapport-commandes-${campaignInfo?.code || 'campagne'}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Print student summary
 */
export const printStudentSummary = (students, campaignInfo, aggregateStats) => {
  // Create print-friendly HTML
  const printWindow = window.open('', '_blank');
  
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Rapport Campagne - ${campaignInfo?.name || 'N/A'}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            padding: 20px;
            color: #333;
          }
          .header {
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .campaign-info {
            margin-top: 10px;
            font-size: 14px;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .stat-card {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport de Campagne</h1>
          <div class="campaign-info">
            <strong>Campagne:</strong> ${campaignInfo?.name || 'N/A'}<br>
            <strong>Code:</strong> ${campaignInfo?.code || 'N/A'}<br>
            <strong>Date d'impression:</strong> ${new Date().toLocaleDateString('fr-CA')}
          </div>
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${aggregateStats?.totalStudents || 0}</div>
            <div class="stat-label">Étudiants</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${aggregateStats?.totalSales?.toFixed(2) || '0.00'}$</div>
            <div class="stat-label">Ventes Totales</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${aggregateStats?.totalStudentEarnings?.toFixed(2) || '0.00'}$</div>
            <div class="stat-label">Profits Étudiants</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${aggregateStats?.totalOrders || 0}</div>
            <div class="stat-label">Commandes</div>
          </div>
        </div>

        ${students && students.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Email</th>
                <th>Parent</th>
                <th>Ventes ($)</th>
                <th>Profits ($)</th>
                <th>Commandes</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(student => `
                <tr>
                  <td>${student.firstName} ${student.lastName}</td>
                  <td>${student.email}</td>
                  <td>${student.parentFirstName} ${student.parentLastName}</td>
                  <td>${student.metrics.totalSales.toFixed(2)}</td>
                  <td>${student.metrics.studentProfit.toFixed(2)}</td>
                  <td>${student.metrics.orderCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="no-data">
            Aucune donnée à afficher
          </div>
        `}
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
};


