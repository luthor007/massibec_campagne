'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Toast } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertCircle, ArrowUpRight, ArrowDownRight, DollarSign, ShoppingBag, TrendingUp, Users, Truck, FileText, Search, Calendar as CalendarIcon, ChevronDown, Check, X } from 'lucide-react'

// Import API functions
import {
  fetchKPIs,
  fetchPendingSchools,
  fetchSalesData,
  fetchDeliveries,
  fetchObjectives,
  approveSchool,
  rejectSchool,
  generateDeliveryReport,
} from '@/utils/api'

// Composant KPI Avancé
const KPIAvance = ({ donnees, periode, onChangePeriode }) => {
  const [recherche, setRecherche] = useState('')
  const [produitsFiltres, setProduitsFiltres] = useState([])

  useEffect(() => {
    // Filtrer les produits en fonction de la recherche
    if (recherche.trim() === '') {
      // Utiliser des données mock ou réelles selon votre logique
      setProduitsFiltres([]);
    } else {
      // Filtrer les produits (à adapter selon vos données)
      const filtres = donnees.produits.filter(produit => produit.nom.toLowerCase().includes(recherche.toLowerCase()));
      setProduitsFiltres(filtres);
    }
  }, [recherche, donnees.produits]);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Aperçu des KPI</CardTitle>
          <Select value={periode} onValueChange={onChangePeriode}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sélectionner la période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jour">Aujourd'hui</SelectItem>
              <SelectItem value="semaine">Cette semaine</SelectItem>
              <SelectItem value="mois">Ce mois</SelectItem>
              <SelectItem value="annee">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div 
            className="bg-gradient-to-br from-green-400 to-green-600 p-4 rounded-lg shadow-lg"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3 className="text-lg font-semibold text-white">Ventes Totales</h3>
            <p className="text-3xl font-bold text-white">{donnees.totalVentes.toLocaleString()}$</p>
            <span className="text-sm text-green-100 flex items-center">
              <ArrowUpRight className="mr-1" /> +{donnees.croissanceVentes}% depuis la dernière {periode}
            </span>
          </motion.div>
          <motion.div 
            className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-lg shadow-lg"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3 className="text-lg font-semibold text-white">Bénéfices Estimés</h3>
            <p className="text-3xl font-bold text-white">{donnees.beneficesEstimes.toLocaleString()}$</p>
            <span className="text-sm text-blue-100 flex items-center">
              <ArrowUpRight className="mr-1" /> +{donnees.croissanceBenefices}% depuis la dernière {periode}
            </span>
          </motion.div>
        </div>
        <h3 className="text-xl font-semibold mb-4">Aperçu des Produits</h3>
        <div className="mb-4 relative">
          <Input
            placeholder="Rechercher un produit..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Valeur Estimée</TableHead>
                <TableHead>Tendance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produitsFiltres.map((produit) => (
                <TableRow key={produit.nom}>
                  <TableCell className="font-medium">{produit.nom}</TableCell>
                  <TableCell>{produit.total.toLocaleString()}</TableCell>
                  <TableCell>{produit.valeurEstimee.toLocaleString()}$</TableCell>
                  <TableCell>
                    <span className={`flex items-center ${produit.tendance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {produit.tendance > 0 ? <ArrowUpRight className="mr-1" /> : <ArrowDownRight className="mr-1" />}
                      {Math.abs(produit.tendance)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">Détails</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant Approbation en Attente Avancé
const ApprobationEnAttenteAvancee = ({ ecoles, onApprouver, onRejeter }) => {
  const { toast } = useToast()

  const handleApprouver = (ecole) => {
    onApprouver(ecole.id)
    toast({
      title: "École approuvée",
      description: `${ecole.nom} a été approuvée avec succès.`,
      duration: 3000,
    })
  }

  const handleRejeter = (ecole) => {
    onRejeter(ecole.id)
    toast({
      title: "École rejetée",
      description: `${ecole.nom} a été rejetée.`,
      duration: 3000,
      variant: "destructive",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Approbations d'Écoles en Attente</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {ecoles.map((ecole) => (
            <motion.div 
              key={ecole.id} 
              className="mb-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-semibold">{ecole.nom}</h3>
              <p>Téléphone: {ecole.telephone}</p>
              <p>Email: {ecole.email}</p>
              <p>Responsable: {ecole.responsable}</p>
              <div className="mt-2 flex justify-between items-center">
                <Badge variant="outline" className="text-yellow-600 bg-yellow-100">En attente</Badge>
                <div className="space-x-2">
                  <Button onClick={() => handleApprouver(ecole)} variant="outline" size="sm">
                    <Check className="mr-2 h-4 w-4" /> Approuver
                  </Button>
                  <Button onClick={() => handleRejeter(ecole)} variant="outline" size="sm" className="text-red-500 hover:text-red-700">
                    <X className="mr-2 h-4 w-4" /> Rejeter
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

// Composant Aperçu des Prochaines Livraisons Avancé
const ApercuProchainesLivraisonsAvance = ({ livraisons, onGenererRapport }) => {
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [triPar, setTriPar] = useState('date')

  const livraisonsFiltrees = useMemo(() => {
    let resultat = livraisons
    if (filtreStatut !== 'tous') {
      resultat = resultat.filter(l => l.statut === filtreStatut)
    }
    resultat.sort((a, b) => {
      if (triPar === 'date') {
        return new Date(a.dateEstimee) - new Date(b.dateEstimee)
      } else if (triPar === 'ecole') {
        return a.ecole.localeCompare(b.ecole)
      }
      return 0
    })
    return resultat
  }, [livraisons, filtreStatut, triPar])

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Aperçu des Prochaines Livraisons</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <Select value={filtreStatut} onValueChange={setFiltreStatut}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="En Cours">En Cours</SelectItem>
              <SelectItem value="Planifié">Planifié</SelectItem>
              <SelectItem value="Terminé">Terminé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={triPar} onValueChange={setTriPar}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="ecole">École</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>École</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date Estimée</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {livraisonsFiltrees.map((livraison, index) => (
                <TableRow key={index}>
                  <TableCell>{livraison.ecole}</TableCell>
                  <TableCell>{livraison.produit}</TableCell>
                  <TableCell>{livraison.quantite}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        livraison.statut === 'En Cours' ? 'default' :
                        livraison.statut === 'Planifié' ? 'secondary' :
                        'outline'
                      }
                    >
                      {livraison.statut}
                    </Badge>
                  </TableCell>
                  <TableCell>{livraison.dateEstimee}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">Détails</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button onClick={onGenererRapport} className="mt-4">
          <FileText className="mr-2 h-4 w-4" /> Générer le Rapport des Livraisons
        </Button>
      </CardContent>
    </Card>
  )
}

// Composant Graphique des Ventes Avancé
const GraphiqueVentesAvance = ({ donnees, periode }) => {
  const [typeGraphique, setTypeGraphique] = useState('bar')

  const renderChart = () => {
    const commonProps = {
      data: donnees,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    }

    switch (typeGraphique) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nom" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ventes" fill="#8884d8" />
          </BarChart>
        )
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nom" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ventes" stroke="#8884d8" />
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nom" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="ventes" stroke="#8884d8"   fill="#8884d8" />
          </AreaChart>
        )
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Aperçu des Ventes</CardTitle>
          <Select value={typeGraphique} onValueChange={setTypeGraphique}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type de graphique" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Barres</SelectItem>
              <SelectItem value="line">Ligne</SelectItem>
              <SelectItem value="area">Aire</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
        <p className="text-center mt-4 text-sm text-gray-500">
          Ventes pour la {periode} en cours
        </p>
      </CardContent>
    </Card>
  )
}

// Composant Répartition des Produits Avancé
const RepartitionProduitsAvance = ({ produits }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
  const [selectedSlice, setSelectedSlice] = useState(null)

  const onPieEnter = (_, index) => {
    setSelectedSlice(index)
  }

  const onPieLeave = () => {
    setSelectedSlice(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Répartition des Produits</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={produits}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="total"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {produits.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  opacity={selectedSlice === null || selectedSlice === index ? 1 : 0.5}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {produits.map((produit, index) => (
            <div key={produit.nom} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm">{produit.nom}: {produit.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const KpiParEcole = ({ ecole, periode }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ecole.schoolName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Ventes Totales */}
          <motion.div 
            className="bg-gradient-to-br from-green-400 to-green-600 p-4 rounded-lg shadow-lg"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3 className="text-lg font-semibold text-white">Ventes Totales</h3>
            <p className="text-3xl font-bold text-white">{ecole.totalVentes.toLocaleString()}$</p>
            <span className="text-sm text-green-100 flex items-center">
              <ArrowUpRight className="mr-1" /> +{ecole.croissanceVentes}% depuis la dernière {periode}
            </span>
          </motion.div>

          {/* Bénéfices Estimés */}
          <motion.div 
            className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-lg shadow-lg"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3 className="text-lg font-semibold text-white">Bénéfices Estimés</h3>
            <p className="text-3xl font-bold text-white">{ecole.beneficesEstimes.toLocaleString()}$</p>
          </motion.div>
        </div>

        {/* Détails des Produits Vendus */}
        <h3 className="text-xl font-semibold mb-4">Produits Vendus</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Quantité Vendue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ecole.productsVendues.map((produit, index) => (
                <TableRow key={index}>
                  <TableCell>{produit.productName}</TableCell>
                  <TableCell>{produit.quantity.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant Objectifs et Prévisions
const ObjectifsPrevisions = ({ objectifs, previsions }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Objectifs et Prévisions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(objectifs).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{key}</span>
                <span className="text-sm font-medium">{value.actuel}/{value.cible}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${(value.actuel / value.cible) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Prévisions pour le prochain trimestre</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={previsions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ventes" stroke="#8884d8" />
              <Line type="monotone" dataKey="objectif" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant Principal Tableau de Bord Avancé
export default function Overview() {
  const [periode, setPeriode] = useState('mois')
  const [kpis, setKpis] = useState([])
  const [pendingSchools, setPendingSchools] = useState([])
  const [livraisons, setLivraisons] = useState([])
  const [objectifs, setObjectifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [kpiData, pendingSchoolsData, deliveriesData, objectifsData] = await Promise.all([
          fetchKPIs({ periode }),
          fetchPendingSchools(),
          fetchDeliveries(),
          fetchObjectives(),
        ])
        setKpis(kpiData)
        setPendingSchools(pendingSchoolsData)
        setLivraisons(deliveriesData)
        setObjectifs(objectifsData.objectifs)
      } catch (err) {
        console.error(err)
        setError('Erreur lors de la récupération des données.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [periode])

  const handleApprouver = async (ecoleId) => {
    try {
      await approveSchool(ecoleId)
      setPendingSchools(prev => prev.filter(ecole => ecole._id !== ecoleId))
      toast({
        title: "École approuvée",
        description: `L'école a été approuvée avec succès.`,
        duration: 3000,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Erreur",
        description: `Impossible d'approuver l'école.`,
        duration: 3000,
        variant: "destructive",
      })
    }
  }

  const handleRejeter = async (ecoleId) => {
    try {
      await rejectSchool(ecoleId)
      setPendingSchools(prev => prev.filter(ecole => ecole._id !== ecoleId))
      toast({
        title: "École rejetée",
        description: `L'école a été rejetée.`,
        duration: 3000,
        variant: "destructive",
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Erreur",
        description: `Impossible de rejeter l'école.`,
        duration: 3000,
        variant: "destructive",
      })
    }
  }

  const handleGenererRapport = async () => {
    try {
      await generateDeliveryReport()
      toast({
        title: "Rapport généré",
        description: "Le rapport des livraisons a été généré avec succès.",
        duration: 3000,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Erreur",
        description: "Impossible de générer le rapport.",
        duration: 3000,
        variant: "destructive",
      })
    }
  }

  const handleChangePeriode = (nouvellePeriode) => {
    setPeriode(nouvellePeriode)
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tableau de Bord Fournisseur</h1>
        <div className="flex items-center space-x-4">
          <Select value={periode} onValueChange={handleChangePeriode}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sélectionnez une période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semaine">Semaine</SelectItem>
              <SelectItem value="mois">Mois</SelectItem>
              <SelectItem value="annee">Année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Aide
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {kpis.map(ecole => (
          <KpiParEcole key={ecole.schoolId} ecole={ecole} periode={ecole.periode} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Écoles en Attente d'Approbation</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingSchools.length === 0 ? (
            <p>Aucune école en attente.</p>
          ) : (
            <ul>
              {pendingSchools.map(ecole => (
                <li key={ecole._id} className="flex justify-between items-center mb-2">
                  <span>{ecole.name}</span>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleApprouver(ecole._id)}>Approuver</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleRejeter(ecole._id)}>Rejeter</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aperçu des Livraisons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>École</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date Estimée</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {livraisons.map((livraison, index) => (
                  <TableRow key={index}>
                    <TableCell>{livraison.ecole}</TableCell>
                    <TableCell>{livraison.produit}</TableCell>
                    <TableCell>{livraison.quantite}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          livraison.statut === 'En Cours' ? 'default' :
                          livraison.statut === 'Planifié' ? 'secondary' :
                          'outline'
                        }
                      >
                        {livraison.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>{livraison.dateEstimee}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">Détails</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleGenererRapport} className="mt-4">
            <FileText className="mr-2 h-4 w-4" /> Générer le Rapport des Livraisons
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}