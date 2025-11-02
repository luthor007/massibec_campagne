import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getTerminology } from '@/utils/organizationHelpers';

const RapportAnalytics = ({ students, aggregateStats, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  if (!students || students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-600">Aucune donnée disponible pour les analyses.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const topPerformers = students
    .sort((a, b) => b.metrics.totalSales - a.metrics.totalSales)
    .slice(0, 10)
    .map(student => ({
      name: `${student.firstName} ${student.lastName}`,
      sales: student.metrics.totalSales,
      profit: student.metrics.totalStudentProfit,
      orders: student.metrics.orderCount
    }));

  const profitDistribution = [
    { name: `${terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} (Comptant)`, value: aggregateStats?.totalStudentCashProfit || 0, color: '#10B981' },
    { name: `${terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)} (Compte)`, value: aggregateStats?.totalStudentSchoolAccountProfit || 0, color: '#3B82F6' },
    { name: `Projet ${terminology.organizationLabel}`, value: aggregateStats?.totalSchoolProjectEarnings || 0, color: '#8B5CF6' },
    { name: 'Tirage', value: aggregateStats?.totalRaffleEarnings || 0, color: '#F59E0B' }
  ];

  const productBreakdown = students.reduce((acc, student) => {
    student.productBreakdown.forEach(product => {
      if (acc[product.name]) {
        acc[product.name] += product.quantity;
      } else {
        acc[product.name] = product.quantity;
      }
    });
    return acc;
  }, {});

  const productData = Object.entries(productBreakdown)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const performanceRanges = students.reduce((acc, student) => {
    const sales = student.metrics.totalSales;
    if (sales >= 1000) acc['1000+']++;
    else if (sales >= 500) acc['500-999']++;
    else if (sales >= 200) acc['200-499']++;
    else if (sales >= 100) acc['100-199']++;
    else acc['0-99']++;
    return acc;
  }, { '0-99': 0, '100-199': 0, '200-499': 0, '500-999': 0, '1000+': 0 });

  const rangeData = Object.entries(performanceRanges).map(([range, count]) => ({
    range,
    count,
    percentage: ((count / students.length) * 100).toFixed(1)
  }));

  return (
    <div className="space-y-6">
      {/* Top Performers Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPerformers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `$${value.toFixed(2)}`, 
                  name === 'sales' ? 'Ventes' : name === 'profit' ? 'Profits' : 'Commandes'
                ]}
              />
              <Bar dataKey="sales" fill="#10B981" name="sales" />
              <Bar dataKey="profit" fill="#3B82F6" name="profit" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution des Profits</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={profitDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {profitDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Top Produits Vendus</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                <Tooltip formatter={(value) => [`${value} unités`, 'Quantité']} />
                <Bar dataKey="quantity" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution des Performances par Tranche de Ventes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rangeData.map(({ range, count, percentage }) => (
              <div key={range} className="flex items-center space-x-4">
                <div className="w-20 text-sm font-medium">{range}$</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 w-16">
                      {count} ({percentage}%)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights Clés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800">Meilleur Performer</h4>
              <p className="text-sm text-blue-600">
                {topPerformers[0]?.name} avec ${topPerformers[0]?.sales.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800">Moyenne par {terminology.participantLabel.charAt(0).toUpperCase() + terminology.participantLabel.slice(1)}</h4>
              <p className="text-sm text-green-600">
                ${((aggregateStats?.totalSales || 0) / (aggregateStats?.totalStudents || 1)).toFixed(2)}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800">Taux de Conversion</h4>
              <p className="text-sm text-purple-600">
                {((aggregateStats?.totalOrders || 0) / (aggregateStats?.totalStudents || 1)).toFixed(1)} commandes/étudiant
              </p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800">Produit Populaire</h4>
              <p className="text-sm text-yellow-600">
                {productData[0]?.name} ({productData[0]?.quantity} unités)
              </p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800">Montant Total à Payer</h4>
              <p className="text-sm text-red-600">
                ${aggregateStats?.totalStudentPaymentAmount?.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h4 className="font-semibold text-indigo-800">Dons Collectés</h4>
              <p className="text-sm text-indigo-600">
                ${aggregateStats?.totalDons?.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RapportAnalytics;

