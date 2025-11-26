import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  ShoppingCart,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Package,
  BarChart3,
  Download
} from 'lucide-react';

const SupplierStats = ({ stats, loading, periode, onPeriodeChange, onRefresh }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Ventes totales',
      value: `${stats.totalVentes?.toLocaleString('fr-CA') || 0} $`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+12.5%'
    },
    {
      title: 'Nombre de commandes',
      value: stats.nombreCommandes?.toLocaleString('fr-CA') || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+8.2%'
    },
    {
      title: 'Écoles actives',
      value: stats.ecolesActives || 0,
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+3.1%'
    },
    {
      title: 'Revenus',
      value: `${stats.revenus?.toLocaleString('fr-CA') || 0} $`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+15.3%'
    }
  ];

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'info':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-green-200 bg-green-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-sm sm:text-base text-gray-600">Vue d'ensemble des performances</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <select
            value={periode}
            onChange={(e) => onPeriodeChange(e.target.value)}
            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 md:flex-none min-w-[140px]"
          >
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="annee">Cette année</option>
            <option value="all">Tout le temps</option>
          </select>

          <Button onClick={onRefresh} variant="outline" size="sm" className="flex-1 md:flex-none">
            <BarChart3 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          <Button variant="outline" size="sm" className="flex-1 md:flex-none">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {stats.alertes && stats.alertes.length > 0 && (
        <div className="space-y-2">
          {stats.alertes.map((alerte, index) => (
            <div key={index} className={`p-4 rounded-lg border ${getAlertColor(alerte.type)}`}>
              <div className="flex items-center gap-3">
                {getAlertIcon(alerte.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{alerte.message}</p>
                  {alerte.action && (
                    <p className="text-xs text-gray-600 mt-1">{alerte.action}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  Voir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl lg:text-2xl font-bold text-gray-900 break-words">{kpi.value}</div>
                <div className="flex flex-wrap items-center gap-1 lg:gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {kpi.change}
                  </Badge>
                  <span className="text-xs text-gray-500">vs période précédente</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Graphiques et analyses */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Top écoles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Top 10 Écoles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topEcoles && stats.topEcoles.length > 0 ? (
              <div className="space-y-3">
                {stats.topEcoles.map((ecole, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{ecole.nomEcole}</div>
                        <div className="text-xs text-gray-500">{ecole.nombreCommandes} commandes</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{ecole.totalVentes?.toLocaleString('fr-CA')} $</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune donnée disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top produits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
              Top 10 Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProduits && stats.topProduits.length > 0 ? (
              <div className="space-y-3">
                {stats.topProduits.map((produit, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{produit.nomProduit}</div>
                        <div className="text-xs text-gray-500">{produit.quantiteVendue} vendus</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{produit.revenus?.toLocaleString('fr-CA')} $</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune donnée disponible</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Répartition des campagnes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Répartition des Campagnes par Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.campagnesParMode && Object.keys(stats.campagnesParMode).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {Object.entries(stats.campagnesParMode).map(([mode, count]) => (
                <div key={mode} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600 capitalize">
                    {mode === 'production' ? 'Production' : mode === 'test' ? 'Test' : mode}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Aucune donnée disponible</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierStats;
