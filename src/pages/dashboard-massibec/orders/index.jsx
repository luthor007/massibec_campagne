import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '../../../components/Dashboard/DashboardLayout';
import { useSupplierSchools } from '@/hooks/useSupplierSchools';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Eye,
  Package,
  Calendar,
  DollarSign,
  Users,
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Handshake,
  Gift,
  Filter,
  Layers,
  FlaskConical,
  Store,
  UserCheck,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const DEFAULT_START_DATE = format(subDays(new Date(), 30), 'yyyy-MM-dd');
const DEFAULT_END_DATE = format(new Date(), 'yyyy-MM-dd');

const STATUS_CONFIG = {
  pending: { label: 'À traiter', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  partial: { label: 'Paiement partiel', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  paid: { label: 'Complétée', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  test: { label: 'Mode test', color: 'bg-purple-100 text-purple-800', icon: FlaskConical },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  })),
];

const normalizeString = (value) => (value ? String(value).toLowerCase() : '');

const formatCurrency = (value = 0) => {
  const amount = Number(value) || 0;
  return amount.toLocaleString('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatNumber = (value = 0) => {
  const amount = Number(value) || 0;
  return amount.toLocaleString('fr-CA');
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  try {
    return format(new Date(value), "dd MMM yyyy 'à' HH'h'mm", { locale: fr });
  } catch {
    return 'N/A';
  }
};

const formatShortDate = (value) => {
  if (!value) return 'Non défini';
  try {
    return format(new Date(value), 'dd MMM yyyy', { locale: fr });
  } catch {
    return 'Non défini';
  }
};

const deriveOrderStatus = (order) => {
  if (order?.isTest) {
    return 'test';
  }
  const totalAmount = Number(order?.totalAmount || 0);
  const transferAmount = Number(order?.transferAmount || 0);
  if (transferAmount >= totalAmount && totalAmount > 0) {
    return 'paid';
  }
  if (transferAmount > 0 && transferAmount < totalAmount) {
    return 'partial';
  }
  return 'pending';
};

const getOrderIdentifier = (order) => {
  if (order?.orderNumber) return `#${order.orderNumber}`;
  if (order?.orderId) return `#${order.orderId}`;
  if (order?._id) {
    const rawId = typeof order._id === 'string' ? order._id : order._id.toString();
    return `#${rawId.slice(-6)}`;
  }
  return '#commande';
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} border-0 flex items-center gap-1`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};

const OrdersPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { schools: supplierSchools, loading: schoolsLoading } = useSupplierSchools();
  const [activeTab, setActiveTab] = useState('student-orders');

  // OrderStudent state (existing)
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filters, setFilters] = useState({ startDate: DEFAULT_START_DATE, endDate: DEFAULT_END_DATE });
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [selectedCampaignFilters, setSelectedCampaignFilters] = useState([]);
  const [summary, setSummary] = useState(null);
  const [breakdowns, setBreakdowns] = useState({ schools: [], campaigns: [] });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Student orders (Order/store orders) state
  const [storeOrders, setStoreOrders] = useState([]);
  const [storeOrdersLoading, setStoreOrdersLoading] = useState(false);
  const [storeOrdersSearchTerm, setStoreOrdersSearchTerm] = useState('');
  const [storeOrdersStatusFilter, setStoreOrdersStatusFilter] = useState('all');
  const [storeOrdersFilters, setStoreOrdersFilters] = useState({ startDate: DEFAULT_START_DATE, endDate: DEFAULT_END_DATE });
  const [storeOrdersSelectedSchoolIds, setStoreOrdersSelectedSchoolIds] = useState([]);
  const [storeOrdersSelectedCampaignIds, setStoreOrdersSelectedCampaignIds] = useState([]);
  const [storeOrdersSummary, setStoreOrdersSummary] = useState(null);
  const [storeOrdersBreakdowns, setStoreOrdersBreakdowns] = useState({ productsBySchool: [], topProducts: [], topStudents: [] });
  const [selectedStoreOrder, setSelectedStoreOrder] = useState(null);
  const [isApplyingStoreOrdersFilters, setIsApplyingStoreOrdersFilters] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/connexion');
      return;
    }
    if (session.user.role !== 'fournisseur') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const campaignNumberFilters = useMemo(() => {
    if (!selectedCampaignFilters.length) {
      return [];
    }
    const numbers = selectedCampaignFilters
      .map((key) => {
        const [, campaignNumber] = key.split('|');
        const parsed = Number(campaignNumber);
        return Number.isNaN(parsed) ? null : parsed;
      })
      .filter((value) => value !== null);
    return Array.from(new Set(numbers));
  }, [selectedCampaignFilters]);

  const schoolOptions = useMemo(() => {
    if (!Array.isArray(supplierSchools)) return [];
    return supplierSchools
      .map((school) => ({
        id: school._id,
        label: school.name || school.nomEcole || 'École sans nom',
      }))
      .filter((school) => !!school.id);
  }, [supplierSchools]);

  const campaignOptions = useMemo(() => {
    if (!Array.isArray(supplierSchools)) return [];
    const baseSchools = selectedSchoolIds.length
      ? supplierSchools.filter((school) => selectedSchoolIds.includes(school._id))
      : supplierSchools;

    const options = [];
    baseSchools.forEach((school) => {
      (school.campaigns || []).forEach((campaign) => {
        if (typeof campaign.campaignNumber === 'number') {
          options.push({
            key: `${school._id}|${campaign.campaignNumber}`,
            label: `${school.name || school.nomEcole || 'École'} • Campagne #${campaign.campaignNumber}`,
            value: campaign.campaignNumber,
            schoolId: school._id,
          });
        }
      });
    });

    const seen = new Set();
    return options.filter((option) => {
      const key = `${option.schoolId}|${option.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [supplierSchools, selectedSchoolIds]);

  const fetchOrders = useCallback(
    async (override = {}) => {
      const appliedDates = {
        startDate: override.date?.startDate ?? filters.startDate,
        endDate: override.date?.endDate ?? filters.endDate,
      };
      const appliedSchoolIds = override.schoolIds ?? selectedSchoolIds;
      const appliedCampaignNumbers = override.campaignNumbers ?? campaignNumberFilters;

      const params = new URLSearchParams();
      if (appliedDates.startDate) params.set('startDate', appliedDates.startDate);
      if (appliedDates.endDate) params.set('endDate', appliedDates.endDate);
      if (appliedSchoolIds.length) params.set('schoolIds', appliedSchoolIds.join(','));
      if (appliedCampaignNumbers.length) params.set('campaignNumbers', appliedCampaignNumbers.join(','));
      params.set('sortOrder', 'desc');

      const queryString = params.toString();
      const url = queryString ? `/api/orderStudent?${queryString}` : '/api/orderStudent';

      setLoading(true);
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des commandes');
        }

        const data = await response.json();
        const normalizedOrders = Array.isArray(data.orders)
          ? data.orders.map((order) => {
            const computedStatus = order.status || deriveOrderStatus(order);
            const schoolName = order.school?.nomEcole || order.school?.name || order.schoolName || 'École inconnue';
            return {
              ...order,
              status: computedStatus,
              schoolName,
            };
          })
          : [];

        setOrders(normalizedOrders);
        setSummary(data.summary || null);
        setBreakdowns(data.breakdowns || { schools: [], campaigns: [] });
      } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        setOrders([]);
        setSummary(null);
        setBreakdowns({ schools: [], campaigns: [] });
        showNotification('Impossible de récupérer les commandes. Réessayez plus tard.', 'error');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [filters.startDate, filters.endDate, selectedSchoolIds, campaignNumberFilters]
  );

  const fetchOrdersRef = useRef(fetchOrders);
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrdersRef.current();
    }
  }, [status]);

  // Fetch store orders (Order model)
  const fetchStoreOrders = useCallback(
    async (override = {}) => {
      const appliedDates = {
        startDate: override.date?.startDate ?? storeOrdersFilters.startDate,
        endDate: override.date?.endDate ?? storeOrdersFilters.endDate,
      };
      const appliedSchoolIds = override.schoolIds ?? storeOrdersSelectedSchoolIds;
      const appliedCampaignIds = override.campaignIds ?? storeOrdersSelectedCampaignIds;

      const params = new URLSearchParams();
      // Add email search if search term looks like an email
      const isEmailSearch = storeOrdersSearchTerm && storeOrdersSearchTerm.includes('@');

      // Always apply date filters (user can extend range if needed)
      if (appliedDates.startDate) params.set('startDate', appliedDates.startDate);
      if (appliedDates.endDate) params.set('endDate', appliedDates.endDate);

      if (appliedSchoolIds.length) params.set('schoolIds', appliedSchoolIds.join(','));
      if (appliedCampaignIds.length) params.set('campaignIds', appliedCampaignIds.join(','));
      if (isEmailSearch) {
        params.set('customerEmail', storeOrdersSearchTerm);
      }

      const queryString = params.toString();
      const url = queryString ? `/api/massibec/student-orders?${queryString}` : '/api/massibec/student-orders';

      setStoreOrdersLoading(true);
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des commandes boutiques');
        }

        const data = await response.json();
        setStoreOrders(Array.isArray(data.orders) ? data.orders : []);
        setStoreOrdersSummary(data.summary || null);
        setStoreOrdersBreakdowns(data.breakdowns || { productsBySchool: [], topProducts: [], topStudents: [] });
      } catch (error) {
        console.error('Erreur lors de la récupération des commandes boutiques:', error);
        setStoreOrders([]);
        setStoreOrdersSummary(null);
        setStoreOrdersBreakdowns({ productsBySchool: [], topProducts: [], topStudents: [] });
        showNotification('Impossible de récupérer les commandes boutiques. Réessayez plus tard.', 'error');
        throw error;
      } finally {
        setStoreOrdersLoading(false);
      }
    },
    [storeOrdersFilters.startDate, storeOrdersFilters.endDate, storeOrdersSelectedSchoolIds, storeOrdersSelectedCampaignIds, storeOrdersSearchTerm]
  );

  const fetchStoreOrdersRef = useRef(fetchStoreOrders);
  useEffect(() => {
    fetchStoreOrdersRef.current = fetchStoreOrders;
  }, [fetchStoreOrders]);

  useEffect(() => {
    if (status === 'authenticated' && activeTab === 'store-orders') {
      fetchStoreOrdersRef.current();
    }
  }, [status, activeTab]);

  const handleApplyFilters = useCallback(async () => {
    setIsApplyingFilters(true);
    try {
      await fetchOrders();
    } finally {
      setIsApplyingFilters(false);
    }
  }, [fetchOrders]);

  const handleResetFilters = useCallback(async () => {
    const resetDates = { startDate: DEFAULT_START_DATE, endDate: DEFAULT_END_DATE };
    setFilters(resetDates);
    setSelectedSchoolIds([]);
    setSelectedCampaignFilters([]);
    setSearchTerm('');
    setStatusFilter('all');

    setIsApplyingFilters(true);
    try {
      await fetchOrders({
        date: resetDates,
        schoolIds: [],
        campaignNumbers: [],
      });
    } finally {
      setIsApplyingFilters(false);
    }
  }, [fetchOrders]);

  const handleDateChange = (field, value) => {
    setFilters((prev) => {
      if (!value) {
        return { ...prev, [field]: value };
      }
      const next = { ...prev, [field]: value };
      if (next.startDate && next.endDate && next.startDate > next.endDate) {
        showNotification('La date de début doit être antérieure à la date de fin.', 'error');
        return prev;
      }
      return next;
    });
  };

  const toggleSchoolSelection = (schoolId) => {
    setSelectedSchoolIds((prev) =>
      prev.includes(schoolId) ? prev.filter((id) => id !== schoolId) : [...prev, schoolId]
    );
  };

  const handleCampaignToggle = (option) => {
    setSelectedSchoolIds((prev) => {
      if (prev.includes(option.schoolId)) return prev;
      return [...prev, option.schoolId];
    });
    setSelectedCampaignFilters((prev) =>
      prev.includes(option.key) ? prev.filter((key) => key !== option.key) : [...prev, option.key]
    );
  };

  // Store orders handlers
  const handleStoreOrdersApplyFilters = useCallback(async () => {
    setIsApplyingStoreOrdersFilters(true);
    try {
      await fetchStoreOrders();
    } finally {
      setIsApplyingStoreOrdersFilters(false);
    }
  }, [fetchStoreOrders]);

  const handleStoreOrdersResetFilters = useCallback(async () => {
    const resetDates = { startDate: DEFAULT_START_DATE, endDate: DEFAULT_END_DATE };
    setStoreOrdersFilters(resetDates);
    setStoreOrdersSelectedSchoolIds([]);
    setStoreOrdersSelectedCampaignIds([]);
    setStoreOrdersSearchTerm('');
    setStoreOrdersStatusFilter('all');

    setIsApplyingStoreOrdersFilters(true);
    try {
      await fetchStoreOrders({
        date: resetDates,
        schoolIds: [],
        campaignIds: [],
      });
    } finally {
      setIsApplyingStoreOrdersFilters(false);
    }
  }, [fetchStoreOrders]);

  const handleStoreOrdersDateChange = (field, value) => {
    setStoreOrdersFilters((prev) => {
      if (!value) {
        return { ...prev, [field]: value };
      }
      const next = { ...prev, [field]: value };
      if (next.startDate && next.endDate && next.startDate > next.endDate) {
        showNotification('La date de début doit être antérieure à la date de fin.', 'error');
        return prev;
      }
      return next;
    });
  };

  const filteredStoreOrders = useMemo(() => {
    if (!Array.isArray(storeOrders)) return [];
    const normalizedSearch = storeOrdersSearchTerm.trim().toLowerCase();
    return storeOrders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeString(order.orderId).includes(normalizedSearch) ||
        normalizeString(order.customerName).includes(normalizedSearch) ||
        normalizeString(order.customerEmail).includes(normalizedSearch) ||
        normalizeString(order.phoneNumber).includes(normalizedSearch) ||
        normalizeString(order.school?.name).includes(normalizedSearch) ||
        normalizeString(order.store?.name).includes(normalizedSearch);
      const matchesStatus = storeOrdersStatusFilter === 'all' || order.status === storeOrdersStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [storeOrders, storeOrdersSearchTerm, storeOrdersStatusFilter]);

  const storeOrdersSafeSummary = useMemo(() => {
    if (storeOrdersSummary) return storeOrdersSummary;
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalUnits: 0,
      totalTips: 0,
      totalStudentDonations: 0,
      totalSchoolDonations: 0,
      totalDiscounts: 0,
      uniqueCustomers: 0,
      averageOrderValue: 0,
      firstOrderAt: null,
      lastOrderAt: null,
    };
  }, [storeOrdersSummary]);

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeString(order.orderNumber).includes(normalizedSearch) ||
        normalizeString(order.orderId).includes(normalizedSearch) ||
        normalizeString(order.studentName).includes(normalizedSearch) ||
        normalizeString(order.email).includes(normalizedSearch) ||
        normalizeString(order.phoneNumber).includes(normalizedSearch) ||
        normalizeString(order.schoolName).includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const statusCounts = useMemo(() => {
    return orders.reduce((acc, order) => {
      const key = order.status || 'pending';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const safeSummary = useMemo(() => {
    if (summary) return summary;
    return {
      totalSales: 0,
      totalUnits: 0,
      totalStudentBenefit: 0,
      totalStudentCashBenefit: 0,
      totalStudentSchoolAccountBenefit: 0,
      totalSchoolProjectBenefit: 0,
      totalRaffleBenefit: 0,
      totalBonusOrganization: 0,
      totalTips: 0,
      averageOrderValue: 0,
      orderCount: orders.length,
      firstOrderAt: null,
      lastOrderAt: null,
    };
  }, [summary, orders.length]);

  const studentBenefitTotal = useMemo(() => {
    if (!safeSummary) return 0;
    if (typeof safeSummary.totalStudentBenefit === 'number' && safeSummary.totalStudentBenefit > 0) {
      return safeSummary.totalStudentBenefit;
    }
    return (safeSummary.totalStudentCashBenefit || 0) + (safeSummary.totalStudentSchoolAccountBenefit || 0);
  }, [safeSummary]);

  const selectedOrderBenefit = useMemo(() => {
    if (!selectedOrder) return 0;
    if (selectedOrder.studentBenefit && selectedOrder.studentBenefit > 0) {
      return selectedOrder.studentBenefit;
    }
    return (
      (selectedOrder.studentCashBenefit || 0) + (selectedOrder.studentSchoolAccountBenefit || 0)
    );
  }, [selectedOrder]);

  const primaryStats = [
    {
      label: 'Commandes',
      value: formatNumber(safeSummary.orderCount || 0),
      description: 'Commandes transmises aux usines Massibec',
      icon: ShoppingCart,
    },
    {
      label: 'Montant total',
      value: formatCurrency(safeSummary.totalSales || 0),
      description: 'Volume cumulé sur la période',
      icon: DollarSign,
    },
    {
      label: 'Unités totales',
      value: formatNumber(safeSummary.totalUnits || 0),
      description: 'Produits expédiés aux écoles',
      icon: Package,
    },
    {
      label: 'Bénéfice élèves',
      value: formatCurrency(studentBenefitTotal),
      description: 'Cash + compte scolaire',
      icon: Users,
    },
    {
      label: 'Bénéfice organisations',
      value: formatCurrency(safeSummary.totalSchoolProjectBenefit || 0),
      description: 'Part réservée aux projets',
      icon: Building2,
    },
    {
      label: 'Bénéfice tirage',
      value: formatCurrency(safeSummary.totalRaffleBenefit || 0),
      description: 'Montants dédiés au tirage',
      icon: Sparkles,
    },
  ];

  const secondaryStats = [
    {
      label: 'Ticket moyen',
      value: formatCurrency(safeSummary.averageOrderValue || 0),
      description: 'Valeur moyenne par commande',
      icon: BarChart3,
    },
    {
      label: 'Pourboires',
      value: formatCurrency(safeSummary.totalTips || 0),
      description: 'Donations laissées par les clients',
      icon: Handshake,
    },
    {
      label: 'Bonus & cadeaux',
      value: formatCurrency(safeSummary.totalBonusOrganization || 0),
      description: 'Montants remis aux organisations',
      icon: Gift,
    },
  ];

  const statusCards = Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
    icon: config.icon,
    color: config.color,
    count: formatNumber(statusCounts[key] || 0),
  }));

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
            Chargement...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session || session.user.role !== 'fournisseur') {
    return null;
  }

  return (
    <DashboardLayout>
      {notification.show && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg border p-4 shadow-lg ${notification.type === 'success'
            ? 'border-green-200 bg-green-100 text-green-800'
            : 'border-red-200 bg-red-100 text-red-800'
            }`}
        >
          {notification.message}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Commandes</h1>
            <p className="text-gray-600">Analyse des commandes élèves et boutiques</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student-orders" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Commandes élèves
            </TabsTrigger>
            <TabsTrigger value="store-orders" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Commandes boutiques
            </TabsTrigger>
          </TabsList>

          <TabsContent value="student-orders" className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Commandes étudiantes</h2>
                <p className="text-gray-600">Analyse des commandes envoyées à Massibec par les élèves</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleApplyFilters} disabled={loading || isApplyingFilters}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Filtres avancés</CardTitle>
                <p className="text-sm text-gray-500">
                  Sélectionnez la période, les écoles et les campagnes à analyser
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Du</label>
                    <Input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      max={filters.endDate || undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Au</label>
                    <Input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                      min={filters.startDate || undefined}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[220px] justify-between">
                        <span>
                          {selectedSchoolIds.length
                            ? `${selectedSchoolIds.length} école(s) sélectionnée(s)`
                            : 'Toutes les écoles'}
                        </span>
                        <span className="text-xs text-gray-500">Modifier</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="border-b px-4 py-3">
                        <p className="text-sm font-medium">Écoles</p>
                        <p className="text-xs text-gray-500">Cochez une ou plusieurs écoles</p>
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Checkbox
                            id="all-schools"
                            checked={selectedSchoolIds.length === 0}
                            onCheckedChange={(checked) => checked && setSelectedSchoolIds([])}
                          />
                          <label htmlFor="all-schools" className="text-sm">
                            Toutes les écoles
                          </label>
                        </div>
                        <ScrollArea className="h-48 pr-2">
                          {schoolsLoading ? (
                            <p className="px-1 text-sm text-gray-500">Chargement des écoles...</p>
                          ) : schoolOptions.length === 0 ? (
                            <p className="px-1 text-sm text-gray-500">Aucune école disponible</p>
                          ) : (
                            schoolOptions.map((school) => (
                              <div key={school.id} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  id={`school-${school.id}`}
                                  checked={selectedSchoolIds.includes(school.id)}
                                  onCheckedChange={() => toggleSchoolSelection(school.id)}
                                />
                                <label htmlFor={`school-${school.id}`} className="text-sm leading-tight">
                                  {school.label}
                                </label>
                              </div>
                            ))
                          )}
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[240px] justify-between">
                        <span>
                          {selectedCampaignFilters.length
                            ? `${selectedCampaignFilters.length} campagne(s)`
                            : 'Toutes les campagnes'}
                        </span>
                        <span className="text-xs text-gray-500">Modifier</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <div className="border-b px-4 py-3">
                        <p className="text-sm font-medium">Campagnes</p>
                        <p className="text-xs text-gray-500">Sélectionnez les campagnes à inclure</p>
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Checkbox
                            id="all-campaigns"
                            checked={selectedCampaignFilters.length === 0}
                            onCheckedChange={(checked) => checked && setSelectedCampaignFilters([])}
                          />
                          <label htmlFor="all-campaigns" className="text-sm">
                            Toutes les campagnes
                          </label>
                        </div>
                        <ScrollArea className="h-48 pr-2">
                          {campaignOptions.length === 0 ? (
                            <p className="px-1 text-sm text-gray-500">Aucune campagne disponible</p>
                          ) : (
                            campaignOptions.map((option) => (
                              <div key={option.key} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  id={`campaign-${option.key}`}
                                  checked={selectedCampaignFilters.includes(option.key)}
                                  onCheckedChange={() => handleCampaignToggle(option)}
                                />
                                <label htmlFor={`campaign-${option.key}`} className="text-sm leading-tight">
                                  {option.label}
                                </label>
                              </div>
                            ))
                          )}
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Rechercher par #commande, élève, école..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-60">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleResetFilters} disabled={loading || isApplyingFilters}>
                      Réinitialiser
                    </Button>
                    <Button onClick={handleApplyFilters} disabled={loading || isApplyingFilters}>
                      <Filter className="mr-2 h-4 w-4" />
                      Appliquer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {primaryStats.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {secondaryStats.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">{stat.value}</div>
                    <p className="text-sm text-gray-500">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
              {statusCards.map((stat) => (
                <Card key={stat.key}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className="h-4 w-4 text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">{stat.count}</div>
                    <p className="text-sm text-gray-500">Commandes</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Top écoles
                  </CardTitle>
                  <p className="text-sm text-gray-500">Les 5 écoles les plus actives sur la période</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {breakdowns.schools && breakdowns.schools.length > 0 ? (
                    breakdowns.schools.map((school) => (
                      <div key={school.schoolId} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{school.schoolName}</p>
                          <p className="text-sm text-gray-500">
                            {formatNumber(school.orderCount)} commande(s) • {formatNumber(school.totalUnits)} unité(s)
                          </p>
                        </div>
                        <span className="font-semibold">{formatCurrency(school.totalSales)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucune donnée disponible pour cette période.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Top campagnes
                  </CardTitle>
                  <p className="text-sm text-gray-500">Performances par campagne d’école</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {breakdowns.campaigns && breakdowns.campaigns.length > 0 ? (
                    breakdowns.campaigns.map((campaign, index) => (
                      <div key={`${campaign.schoolId}-${campaign.campaignNumber}-${index}`} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{campaign.schoolName}</p>
                          <p className="text-sm text-gray-500">
                            Campagne #{campaign.campaignNumber ?? 'N/A'} • {formatNumber(campaign.orderCount)} commande(s)
                          </p>
                        </div>
                        <span className="font-semibold">{formatCurrency(campaign.totalSales)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucune campagne sélectionnée.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Résumé de la période
                  </CardTitle>
                  <p className="text-sm text-gray-500">Vue d’ensemble des dates clés</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Période sélectionnée</span>
                    <span className="font-medium">
                      {formatShortDate(filters.startDate)} → {formatShortDate(filters.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Première commande</span>
                    <span className="font-medium">{formatDateTime(safeSummary.firstOrderAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Dernière commande</span>
                    <span className="font-medium">{formatDateTime(safeSummary.lastOrderAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commandes ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                    <span className="ml-3 text-gray-600">Chargement des commandes...</span>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <h3 className="text-lg font-semibold">Aucune commande trouvée</h3>
                    <p className="text-gray-500">
                      Ajustez les filtres ou vérifiez les dates pour afficher des commandes.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Commande</TableHead>
                          <TableHead>Élève</TableHead>
                          <TableHead>École</TableHead>
                          <TableHead>Campagne</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Unités</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order._id || order.orderId}>
                            <TableCell className="font-medium">{getOrderIdentifier(order)}</TableCell>
                            <TableCell>
                              <div className="font-medium">{order.studentName || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{order.email || order.phoneNumber || 'N/A'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                {order.schoolName || 'École inconnue'}
                              </div>
                            </TableCell>
                            <TableCell>#{order.campaignNumber ?? 'N/A'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {formatDateTime(order.timestamp || order.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell>{formatNumber(order.totalUnits || 0)}</TableCell>
                            <TableCell>{formatCurrency(order.totalAmount || 0)}</TableCell>
                            <TableCell>
                              <StatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="store-orders" className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Commandes boutiques</h2>
                <p className="text-gray-600">Commandes reçues par les élèves via leurs boutiques</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleStoreOrdersApplyFilters} disabled={storeOrdersLoading || isApplyingStoreOrdersFilters}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Filtres avancés</CardTitle>
                <p className="text-sm text-gray-500">
                  Sélectionnez la période, les écoles et les campagnes à analyser
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Du</label>
                    <Input
                      type="date"
                      value={storeOrdersFilters.startDate}
                      onChange={(e) => handleStoreOrdersDateChange('startDate', e.target.value)}
                      max={storeOrdersFilters.endDate || undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Au</label>
                    <Input
                      type="date"
                      value={storeOrdersFilters.endDate}
                      onChange={(e) => handleStoreOrdersDateChange('endDate', e.target.value)}
                      min={storeOrdersFilters.startDate || undefined}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[220px] justify-between">
                        <span>
                          {storeOrdersSelectedSchoolIds.length
                            ? `${storeOrdersSelectedSchoolIds.length} école(s) sélectionnée(s)`
                            : 'Toutes les écoles'}
                        </span>
                        <span className="text-xs text-gray-500">Modifier</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="border-b px-4 py-3">
                        <p className="text-sm font-medium">Écoles</p>
                        <p className="text-xs text-gray-500">Cochez une ou plusieurs écoles</p>
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Checkbox
                            id="all-store-schools"
                            checked={storeOrdersSelectedSchoolIds.length === 0}
                            onCheckedChange={(checked) => checked && setStoreOrdersSelectedSchoolIds([])}
                          />
                          <label htmlFor="all-store-schools" className="text-sm">
                            Toutes les écoles
                          </label>
                        </div>
                        <ScrollArea className="h-48 pr-2">
                          {schoolsLoading ? (
                            <p className="px-1 text-sm text-gray-500">Chargement des écoles...</p>
                          ) : schoolOptions.length === 0 ? (
                            <p className="px-1 text-sm text-gray-500">Aucune école disponible</p>
                          ) : (
                            schoolOptions.map((school) => (
                              <div key={school.id} className="flex items-center gap-2 py-1">
                                <Checkbox
                                  id={`store-school-${school.id}`}
                                  checked={storeOrdersSelectedSchoolIds.includes(school.id)}
                                  onCheckedChange={() => {
                                    setStoreOrdersSelectedSchoolIds((prev) =>
                                      prev.includes(school.id) ? prev.filter((id) => id !== school.id) : [...prev, school.id]
                                    );
                                  }}
                                />
                                <label htmlFor={`store-school-${school.id}`} className="text-sm leading-tight">
                                  {school.label}
                                </label>
                              </div>
                            ))
                          )}
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Rechercher par #commande, client, email, école..."
                      value={storeOrdersSearchTerm}
                      onChange={(e) => setStoreOrdersSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleStoreOrdersApplyFilters();
                        }
                      }}
                      className="pl-9"
                    />
                  </div>
                  <Select value={storeOrdersStatusFilter} onValueChange={setStoreOrdersStatusFilter}>
                    <SelectTrigger className="w-full md:w-60">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleStoreOrdersResetFilters} disabled={storeOrdersLoading || isApplyingStoreOrdersFilters}>
                      Réinitialiser
                    </Button>
                    <Button onClick={handleStoreOrdersApplyFilters} disabled={storeOrdersLoading || isApplyingStoreOrdersFilters}>
                      <Filter className="mr-2 h-4 w-4" />
                      Appliquer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Commandes</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(storeOrdersSafeSummary.totalOrders || 0)}</div>
                  <p className="text-sm text-gray-500">Total des commandes</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenus</CardTitle>
                  <DollarSign className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(storeOrdersSafeSummary.totalRevenue || 0)}</div>
                  <p className="text-sm text-gray-500">Montant total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unités</CardTitle>
                  <Package className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(storeOrdersSafeSummary.totalUnits || 0)}</div>
                  <p className="text-sm text-gray-500">Produits vendus</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket moyen</CardTitle>
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(storeOrdersSafeSummary.averageOrderValue || 0)}</div>
                  <p className="text-sm text-gray-500">Par commande</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clients uniques</CardTitle>
                  <Users className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">{formatNumber(storeOrdersSafeSummary.uniqueCustomers || 0)}</div>
                  <p className="text-sm text-gray-500">Clients distincts</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pourboires</CardTitle>
                  <Handshake className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">{formatCurrency(storeOrdersSafeSummary.totalTips || 0)}</div>
                  <p className="text-sm text-gray-500">Total des pourboires</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Donations élèves</CardTitle>
                  <Gift className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">{formatCurrency(storeOrdersSafeSummary.totalStudentDonations || 0)}</div>
                  <p className="text-sm text-gray-500">Total donations</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Donations écoles</CardTitle>
                  <Building2 className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">{formatCurrency(storeOrdersSafeSummary.totalSchoolDonations || 0)}</div>
                  <p className="text-sm text-gray-500">Total donations</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Top produits
                  </CardTitle>
                  <p className="text-sm text-gray-500">Les produits les plus vendus</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {storeOrdersBreakdowns.topProducts && storeOrdersBreakdowns.topProducts.length > 0 ? (
                    storeOrdersBreakdowns.topProducts.slice(0, 5).map((product, index) => (
                      <div key={product.productName || index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{product.productName || 'Produit'}</p>
                          <p className="text-sm text-gray-500">
                            {formatNumber(product.totalQuantity || 0)} unité(s)
                          </p>
                        </div>
                        <span className="font-semibold">{formatCurrency(product.totalRevenue || 0)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucune donnée disponible.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Top élèves
                  </CardTitle>
                  <p className="text-sm text-gray-500">Les élèves les plus performants</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {storeOrdersBreakdowns.topStudents && storeOrdersBreakdowns.topStudents.length > 0 ? (
                    storeOrdersBreakdowns.topStudents.slice(0, 5).map((student, index) => (
                      <div key={student.studentId || index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{student.studentName || 'Étudiant'}</p>
                          <p className="text-sm text-gray-500">
                            {formatNumber(student.orderCount || 0)} commande(s) • {formatNumber(student.totalUnits || 0)} unité(s)
                          </p>
                        </div>
                        <span className="font-semibold">{formatCurrency(student.totalRevenue || 0)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Aucune donnée disponible.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Par école
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {storeOrdersBreakdowns.productsBySchool?.length || 0} école(s) • Répartition complète
                  </p>
                </CardHeader>
                <CardContent>
                  {storeOrdersBreakdowns.productsBySchool && storeOrdersBreakdowns.productsBySchool.length > 0 ? (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {storeOrdersBreakdowns.productsBySchool.map((school, index) => (
                          <div key={school.schoolId || index} className="flex items-center justify-between pb-2 border-b last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{school.schoolName || 'École'}</p>
                              <p className="text-sm text-gray-500">
                                {formatNumber(school.totalUnits || 0)} unité(s)
                              </p>
                            </div>
                            <span className="font-semibold ml-2 flex-shrink-0">{formatCurrency(school.totalRevenue || 0)}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-gray-500">Aucune donnée disponible.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commandes ({filteredStoreOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {storeOrdersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                    <span className="ml-3 text-gray-600">Chargement des commandes...</span>
                  </div>
                ) : filteredStoreOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <h3 className="text-lg font-semibold">Aucune commande trouvée</h3>
                    <p className="text-gray-500">
                      Ajustez les filtres ou vérifiez les dates pour afficher des commandes.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Commande</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Élève</TableHead>
                          <TableHead>École</TableHead>
                          <TableHead>Boutique</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Unités</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStoreOrders.map((order) => (
                          <TableRow key={order.id || order.orderId}>
                            <TableCell className="font-medium">{order.orderId || order.id?.slice(-8) || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="font-medium">{order.customerName || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{order.customerEmail || order.phoneNumber || 'N/A'}</div>
                            </TableCell>
                            <TableCell>
                              {order.student ? (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{order.student.name || 'N/A'}</span>
                                    {order.student.role === 'school_manager' && (
                                      <Badge className="bg-blue-100 text-blue-700 text-xs">Gestionnaire</Badge>
                                    )}
                                    {order.student.role === 'student' && (
                                      <Badge className="bg-green-100 text-green-700 text-xs">Élève</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">{order.student.email || 'N/A'}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                {order.school?.name || 'École inconnue'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.store ? (
                                <div>
                                  <div className="font-medium">{order.store.name || 'N/A'}</div>
                                  {order.store.slug && (
                                    <div className="text-xs text-gray-500">{order.store.slug}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {formatDateTime(order.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell>{formatNumber(order.totalUnits || 0)}</TableCell>
                            <TableCell>{formatCurrency(order.totalAmount || 0)}</TableCell>
                            <TableCell>
                              <StatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedStoreOrder(order)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>{getOrderIdentifier(selectedOrder)}</DialogTitle>
                <DialogDescription>
                  Commande transmise par {selectedOrder.studentName || 'Élève'} •{' '}
                  {selectedOrder.schoolName || 'École inconnue'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedOrder.status} />
                  {selectedOrder.isTest && <Badge className="bg-purple-100 text-purple-800">Mode test</Badge>}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Informations élèves</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Nom</span>
                        <p className="font-medium">{selectedOrder.studentName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Courriel</span>
                        <p className="font-medium break-words">{selectedOrder.email || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Téléphone</span>
                        <p className="font-medium">{selectedOrder.phoneNumber || 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Résumé financier</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Montant total</span>
                        <span className="font-semibold">{formatCurrency(selectedOrder.totalAmount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Transfert reçu</span>
                        <span className="font-semibold">{formatCurrency(selectedOrder.transferAmount || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Unités</span>
                        <span className="font-semibold">{formatNumber(selectedOrder.totalUnits || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Campagne</span>
                        <span className="font-semibold">#{selectedOrder.campaignNumber ?? 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Répartition des bénéfices</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-gray-500">Élève (cash + compte)</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedOrderBenefit)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Organisation</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(selectedOrder.schoolProjectBenefit || selectedOrder.organizationBenefit || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tirage</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedOrder.raffleBenefit || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Bonus & cadeaux</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedOrder.bonusOrganization || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pourboire</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedOrder.tip || 0)}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Produits commandés</h3>
                  {Array.isArray(selectedOrder.products) && selectedOrder.products.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix unitaire</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.products.map((product, index) => (
                            <TableRow key={`${product.productName}-${index}`}>
                              <TableCell>
                                <div className="font-medium">{product.productName}</div>
                                {product.isAdditional && (
                                  <Badge className="mt-1 bg-blue-100 text-blue-700">Ajout</Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatNumber(product.quantity || 0)}</TableCell>
                              <TableCell>{formatCurrency(product.price || 0)}</TableCell>
                              <TableCell>{formatCurrency((product.price || 0) * (product.quantity || 0))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucun produit enregistré pour cette commande.</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStoreOrder} onOpenChange={(open) => !open && setSelectedStoreOrder(null)}>
        <DialogContent className="max-w-3xl">
          {selectedStoreOrder && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedStoreOrder.orderId || selectedStoreOrder.id?.slice(-8) || 'Commande'}</DialogTitle>
                <DialogDescription>
                  Commande reçue via {selectedStoreOrder.store?.name || 'boutique'} •{' '}
                  {selectedStoreOrder.school?.name || 'École inconnue'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedStoreOrder.status} />
                  {selectedStoreOrder.isTest && <Badge className="bg-purple-100 text-purple-800">Mode test</Badge>}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Informations client</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Nom</span>
                        <p className="font-medium">{selectedStoreOrder.customerName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Courriel</span>
                        <p className="font-medium break-words">{selectedStoreOrder.customerEmail || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Téléphone</span>
                        <p className="font-medium">{selectedStoreOrder.phoneNumber || 'N/A'}</p>
                      </div>
                      {selectedStoreOrder.customerDeliveryAddress && (
                        <div>
                          <span className="text-gray-500">Adresse</span>
                          <p className="font-medium">{selectedStoreOrder.customerDeliveryAddress}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Informations élève</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {selectedStoreOrder.student ? (
                        <>
                          <div>
                            <span className="text-gray-500">Nom</span>
                            <p className="font-medium">{selectedStoreOrder.student.name || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Courriel</span>
                            <p className="font-medium break-words">{selectedStoreOrder.student.email || 'N/A'}</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">Aucune information élève disponible</p>
                      )}
                      {selectedStoreOrder.store && (
                        <>
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-gray-500">Boutique</span>
                            <p className="font-medium">{selectedStoreOrder.store.name || 'N/A'}</p>
                            {selectedStoreOrder.store.slug && (
                              <p className="text-xs text-gray-400">{selectedStoreOrder.store.slug}</p>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Résumé financier</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Montant total</span>
                      <span className="font-semibold">{formatCurrency(selectedStoreOrder.totalAmount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Unités</span>
                      <span className="font-semibold">{formatNumber(selectedStoreOrder.totalUnits || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Pourboire</span>
                      <span className="font-semibold">{formatCurrency(selectedStoreOrder.tip || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Donation élève</span>
                      <span className="font-semibold">{formatCurrency(selectedStoreOrder.studentDonation || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Donation école</span>
                      <span className="font-semibold">{formatCurrency(selectedStoreOrder.schoolDonation || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Remise</span>
                      <span className="font-semibold">{formatCurrency(selectedStoreOrder.discount || 0)}</span>
                    </div>
                    {selectedStoreOrder.campaign && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Campagne</span>
                        <span className="font-semibold">
                          #{selectedStoreOrder.campaign.campaignNumber ?? 'N/A'} • {selectedStoreOrder.campaign.name || ''}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Produits commandés</h3>
                  {Array.isArray(selectedStoreOrder.products) && selectedStoreOrder.products.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix unitaire</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedStoreOrder.products.map((product, index) => (
                            <TableRow key={`${product.productName}-${index}`}>
                              <TableCell>
                                <div className="font-medium">{product.productName}</div>
                              </TableCell>
                              <TableCell>{formatNumber(product.quantity || 0)}</TableCell>
                              <TableCell>{formatCurrency(product.productPrice || 0)}</TableCell>
                              <TableCell>{formatCurrency(product.lineTotal || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Aucun produit enregistré pour cette commande.</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedStoreOrder(null)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default OrdersPage;
