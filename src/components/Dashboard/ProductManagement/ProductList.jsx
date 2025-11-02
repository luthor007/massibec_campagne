'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from "@/hooks/use-toast"
import { Edit, Trash2, Plus, Search, DollarSign, ShoppingCart, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'




const updateProductListWithSchool = async (productList) => {
  const updatedProducts = await Promise.all(productList.map(async (product) => {
    try {
      // Skip if product.school is missing, invalid, or already a string (name)
      if (!product.school || typeof product.school === 'string') {
        return {
          ...product,
          school: product.school || 'Universel',
          isEditing: false
        }
      }
      
      const response = await fetch(`/api/schools/${product.school}`)
      if (!response.ok) {
        console.warn(`Échec de la récupération des données de l'école pour le produit ${product.id}`)
        return {
          ...product,
          school: 'Inconnu',
          isEditing: false
        }
      }
      const schoolData = await response.json()
      return {
        ...product,
        school: schoolData.name || 'Inconnu',
        isEditing: false
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error)
      return {
        ...product,
        school: product.school || 'Erreur',
        isEditing: false
      }
    }
  }))
  return updatedProducts
}

const ProductList = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const { toast } = useToast()


  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products')
        if (!res.ok) {
          throw new Error(`Échec de la récupération des produits: ${res.status} ${res.statusText}`)
        }
        const data = await res.json()
        if (data && Array.isArray(data.products)) {
          const updatedProductList = await updateProductListWithSchool(data.products)
          setProducts(updatedProductList)
        } else {
          setProducts([])
          console.warn('Structure de réponse API inattendue:', data)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des produits:', error)
        setError(error.message || 'Échec du chargement des produits. Veuillez réessayer plus tard.')
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const deleteProduct = async (id) => {

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error(`Échec de la suppression du produit: ${res.status} ${res.statusText}`)
      }
      const result = await res.json()
      toast({
        title: "Produit supprimé",
        description: result.message || 'Le produit a été supprimé avec succès.',
      })
      setProducts(products.filter((product) => product.id !== id))
    } catch (err) {
      console.error('Erreur lors de la suppression du produit:', err)
      toast({
        title: "Erreur",
        description: err.message || 'Échec de la suppression du produit. Veuillez réessayer.',
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const toggleEdit = (id) => {
    setProducts(products.map(product => 
      product.id === id ? {...product, isEditing: !product.isEditing} : product
    ))
  }

  const handleChange = (id, field, value) => {
    setProducts(products.map(product =>
      product.id === id ? {...product, [field]: value} : product
    ))
  }

  const saveChanges = async (product) => {
    // Preserve the original product for recovery in case of error
    const originalProduct = products.find(p => p.id === product.id);
    
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: product.name,
          description: product.description,
          cost: parseFloat(product.cost),
          price: parseFloat(product.price),
          image: product.image,
          isDefault: product.isDefault,
          productId: product.productId,
          // Don't send school field - it's not handled by the API
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Échec de la mise à jour du produit');
      }

      const updatedProduct = await res.json();
      
      // Only update state if we got a valid response
      if (updatedProduct && updatedProduct.id) {
        setProducts(products.map(p => 
          p.id === product.id 
            ? { ...p, ...updatedProduct, isEditing: false, school: p.school } 
            : p
        ));

        toast({
          title: "Produit mis à jour",
          description: "Le produit a été mis à jour avec succès.",
        });
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du produit:', err);
      
      // Restore original product state to prevent blank display
      if (originalProduct) {
        setProducts(products.map(p => 
          p.id === product.id 
            ? { ...originalProduct, isEditing: false } 
            : p
        ));
      }
      
      toast({
        title: "Erreur",
        description: err.message || 'Échec de la mise à jour du produit. Veuillez réessayer.',
        variant: "destructive",
      });
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const sortedProducts = React.useMemo(() => {
    let sortableProducts = [...products]
    // Always sort by order first
    sortableProducts.sort((a, b) => {
      const orderA = a.order || 0
      const orderB = b.order || 0
      return orderA - orderB
    })
    
    if (sortConfig.key !== null) {
      sortableProducts.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return sortableProducts
  }, [products, sortConfig])

  const handleReorder = async (newOrder) => {
    // Save new order to server first
    try {
      const response = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: newOrder.map((product, index) => ({
            id: product.id || product._id,
            order: index
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save order')
      }

      // Update local state with new order values
      const updatedProducts = newOrder.map((product, index) => ({
        ...product,
        order: index
      }))
      
      setProducts(updatedProducts)

      toast({
        title: "Ordre mis à jour",
        description: "L'ordre des produits a été sauvegardé.",
      })
    } catch (error) {
      console.error('Error saving order:', error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'ordre des produits.",
        variant: "destructive",
      })
      // Reload products to reset to original order
      window.location.reload()
    }
  }

  const moveProduct = async (productId, direction) => {
    const currentIndex = products.findIndex(p => p.id === productId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= products.length) return

    // Swap products
    const newProducts = [...products]
    ;[newProducts[currentIndex], newProducts[newIndex]] = [newProducts[newIndex], newProducts[currentIndex]]

    // Save to server
    try {
      const response = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: newProducts.map((product, index) => ({
            id: product.id || product._id,
            order: index
          }))
        }),
      })

      if (response.ok) {
        setProducts(newProducts)
        toast({
          title: "Ordre mis à jour",
          description: "L'ordre des produits a été sauvegardé.",
        })
      }
    } catch (error) {
      console.error('Error saving order:', error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'ordre des produits.",
        variant: "destructive",
      })
    }
  }

  const filteredProducts = sortedProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.productId && product.productId.toString().includes(searchTerm))
  )

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-[250px]" />
      <Skeleton className="h-4 w-[300px]" />
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
  )

  if (error) return (
    <Card className="bg-red-50 border-red-200">
      <CardHeader>
        <CardTitle className="text-red-800">Erreur</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-red-600">{error}</p>
      </CardContent>
    </Card>
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Catalogue de Produits</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="search" className="sr-only">Rechercher des produits</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              id="search"
              type="text"
              placeholder="Rechercher des produits ou des écoles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {filteredProducts.length === 0 ? (
          <p className="text-center text-gray-500 my-8">Aucun produit disponible.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <TableHead className="w-[80px] font-semibold text-gray-700">Ordre</TableHead>
                  <TableHead className="w-[250px] font-semibold text-gray-700">
                    <button className="font-bold hover:text-blue-600 transition-colors" onClick={() => handleSort('name')}>
                      Nom du Produit {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <button className="font-bold hover:text-blue-600 transition-colors" onClick={() => handleSort('productId')}>
                      ID Produit {sortConfig.key === 'productId' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <button className="font-bold hover:text-blue-600 transition-colors" onClick={() => handleSort('cost')}>
                      Coût {sortConfig.key === 'cost' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <button className="font-bold hover:text-blue-600 transition-colors" onClick={() => handleSort('price')}>
                      Prix de Vente {sortConfig.key === 'price' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <button className="font-bold hover:text-blue-600 transition-colors" onClick={() => handleSort('profit')}>
                      Profit {sortConfig.key === 'profit' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <button className="font-bold hover:text-blue-600 transition-colors" onClick={() => handleSort('school')}>
                      École {sortConfig.key === 'school' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">Produit par Défaut</TableHead>
                  <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product, index) => {
                  const profitPerUnit = product.price - product.cost
                  const displayOrder = index + 1
                    return (
                      <TableRow key={product.id} className="hover:bg-blue-50 transition-colors duration-150 border-b border-gray-100">
                      <TableCell className="w-[80px]">
                        <div className="flex flex-col items-center gap-1 min-h-[80px] justify-center">
                          <button
                            onClick={() => moveProduct(product.id, 'up')}
                            disabled={index === 0}
                            className="p-1.5 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-md transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed group"
                            title="Déplacer vers le haut"
                          >
                            <ChevronUp className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                          </button>
                          <span className="font-mono text-sm font-bold px-3 py-1 bg-gradient-to-br from-blue-50 to-purple-50 text-gray-700 rounded-md shadow-sm min-w-[30px] text-center">{displayOrder}</span>
                          <button
                            onClick={() => moveProduct(product.id, 'down')}
                            disabled={index === filteredProducts.length - 1}
                            className="p-1.5 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-md transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed group"
                            title="Déplacer vers le bas"
                          >
                            <ChevronDown className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
                          </button>
                        </div>
                      </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden">
                              <Image src={product.image || '/placeholder.png'} alt={product.name} width={40} height={40} />
                            </div>
                            {product.isEditing ? (
                              <Input
                                value={product.name}
                                onChange={(e) => handleChange(product.id, 'name', e.target.value)}
                                className="max-w-[200px]"
                              />
                            ) : (
                              <span className="font-medium">{product.name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.isEditing ? (
                            <Input
                              value={product.productId || ''}
                              onChange={(e) => handleChange(product.id, 'productId', e.target.value)}
                              className="max-w-[100px]"
                              placeholder="ID Produit"
                            />
                          ) : (
                            <span className="font-mono">{product.productId || 'N/A'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.isEditing ? (
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              <Input
                                type="number"
                                value={product.cost}
                                onChange={(e) => handleChange(product.id, 'cost', e.target.value)}
                                className="pl-8"
                              />
                            </div>
                          ) : (
                            <span className="font-mono">{product.cost.toFixed(2)} $</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.isEditing ? (
                            <div className="relative">
                              <ShoppingCart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              <Input
                                type="number"
                                value={product.price}
                                onChange={(e) => handleChange(product.id, 'price', e.target.value)}
                                className="pl-8"
                              />
                            </div>
                          ) : (
                            <span className="font-mono">{product.price} $</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`font-mono ${profitPerUnit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profitPerUnit.toFixed(2)} $
                          </span>
                        </TableCell>
                        <TableCell>{product.school}</TableCell>
                        <TableCell>
                          {product.isEditing ? (
                            <Checkbox
                              checked={product.isDefault}
                              onCheckedChange={(checked) => handleChange(product.id, 'isDefault', checked)}
                            />
                          ) : (
                            <span>{product.isDefault ? 'Oui' : 'Non'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.isEditing ? (
                            <Button variant="default" onClick={() => saveChanges(product)}>Enregistrer</Button>
                          ) : (
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => toggleEdit(product.id)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => setProductToDelete(product)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                      Confirmer la Suppression
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
                                      Êtes-vous sûr de vouloir supprimer ce produit ? Cette action ne peut pas être annulée.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter className="mt-4 space-x-2">
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setDeleteDialogOpen(false)}
                                      className="bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      Annuler
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      onClick={() => deleteProduct(productToDelete.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      Supprimer
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProductList