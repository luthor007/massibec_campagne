import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const RapportFilters = ({ onFiltersChange, students }) => {
  const [filters, setFilters] = useState({
    search: '',
    minSales: '',
    maxSales: '',
    minOrders: '',
    maxOrders: '',
    dateFrom: null,
    dateTo: null,
    sortBy: 'totalSales',
    sortOrder: 'desc'
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      minSales: '',
      maxSales: '',
      minOrders: '',
      maxOrders: '',
      dateFrom: null,
      dateTo: null,
      sortBy: 'totalSales',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== null && value !== 'totalSales' && value !== 'desc'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filtres et Recherche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div>
          <Label htmlFor="search">Recherche</Label>
          <Input
            id="search"
            placeholder="Nom, email, parent..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        {/* Sales Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minSales">Ventes Min ($)</Label>
            <Input
              id="minSales"
              type="number"
              placeholder="0"
              value={filters.minSales}
              onChange={(e) => handleFilterChange('minSales', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="maxSales">Ventes Max ($)</Label>
            <Input
              id="maxSales"
              type="number"
              placeholder="1000"
              value={filters.maxSales}
              onChange={(e) => handleFilterChange('maxSales', e.target.value)}
            />
          </div>
        </div>

        {/* Orders Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minOrders">Commandes Min</Label>
            <Input
              id="minOrders"
              type="number"
              placeholder="0"
              value={filters.minOrders}
              onChange={(e) => handleFilterChange('minOrders', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="maxOrders">Commandes Max</Label>
            <Input
              id="maxOrders"
              type="number"
              placeholder="50"
              value={filters.maxOrders}
              onChange={(e) => handleFilterChange('maxOrders', e.target.value)}
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date Début</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, 'PPP', { locale: fr }) : 'Sélectionner'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => handleFilterChange('dateFrom', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Date Fin</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? format(filters.dateTo, 'PPP', { locale: fr }) : 'Sélectionner'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => handleFilterChange('dateTo', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Sort Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Trier par</Label>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalSales">Ventes Totales</SelectItem>
                <SelectItem value="totalStudentProfit">Profits Étudiants</SelectItem>
                <SelectItem value="orderCount">Nombre de Commandes</SelectItem>
                <SelectItem value="firstName">Prénom</SelectItem>
                <SelectItem value="lastName">Nom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ordre</Label>
            <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Décroissant</SelectItem>
                <SelectItem value="asc">Croissant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {hasActiveFilters && 'Filtres actifs'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Effacer les filtres
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RapportFilters;

