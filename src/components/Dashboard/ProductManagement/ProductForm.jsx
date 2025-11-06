'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Upload, DollarSign, ShoppingCart, School, Info } from 'lucide-react'
import ImageUpload from '@/components/ImageUpload'

const ProductForm = ({ product = {}, onSave }) => {
  const [formData, setFormData] = useState({
    name: product.name || '',
    description: product.description || '',
    cost: product.cost || 0,
    price: product.price || 0,
    type: product.type || '',
    image: product.image || '',
    school: product.school || '',
    isDefault: product.isDefault || false,
    productId: product.productId || '',
    ingredientsImage: product.ingredientsImage || '',
    nutritionImage: product.nutritionImage || '',
  })

  const [imagePreview, setImagePreview] = useState(product.image || '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [approvedSchools, setApprovedSchools] = useState([])
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [errorSchools, setErrorSchools] = useState(null)

  useEffect(() => {
    const fetchApprovedSchools = async () => {
      try {
        const response = await fetch('/api/schools')
        if (response.ok) {
          const data = await response.json()
          setApprovedSchools(data)
        } else {
          throw new Error('Erreur lors de la récupération des écoles approuvées')
        }
      } catch (error) {
        setErrorSchools(error.message)
      } finally {
        setLoadingSchools(false)
      }
    }

    fetchApprovedSchools()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleDefaultChange = (checked) => {
    setFormData({ ...formData, isDefault: checked })
  }

  const handleSchoolChange = (value) => {
    setFormData({ ...formData, school: value })
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploading(true)
      setUploadError('')

      const uploadData = new FormData()
      uploadData.append('image', file)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Image upload failed.')
        }

        const data = await response.json()
        setFormData((prevFormData) => ({ ...prevFormData, image: data.url }))
        setImagePreview(data.url)
      } catch (error) {
        console.error('Error uploading image:', error)
        setUploadError(error.message)
      } finally {
        setUploading(false)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.description || !formData.image) {
      toast.error('Please fill in all required fields.')
      return
    }

    try {
      const method = product.id ? 'PUT' : 'POST'
      const url = product.id ? `/api/products/${product.id}` : '/api/products'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Something went wrong!')
      }

      const savedProduct = await response.json()
      toast.success('Product saved successfully!')
      if (onSave) {
        onSave(savedProduct)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-bold text-3xl">{product.id ? 'Modifier le produit' : 'Créer un nouveau produit'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-bold">
                Nom du produit
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Entrez le nom du produit"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Entrez la description du produit"
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost" className="text-sm font-medium">
                  Prix coûtant ($)
                </Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    value={formData.cost}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="price" className="text-sm font-medium">
                  Prix de vente ($)
                </Label>
                <div className="relative mt-1">
                  <ShoppingCart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="image" className="text-sm font-medium">
                Image du produit
              </Label>
              <div className="mt-1 flex items-center space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image').click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  required={!product.image}
                />
                {imagePreview && (
                  <div className="relative h-20 w-20 rounded-md overflow-hidden">
                    <Image src={imagePreview} alt="Product Image" layout="fill" objectFit="cover" />
                  </div>
                )}
              </div>
              {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Informations pour la boutique
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                Ajoutez des images claires de l&apos;étiquette d&apos;ingrédients et du tableau de valeur nutritive. Elles seront visibles par les clients.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Liste d&apos;ingrédients</Label>
                  <ImageUpload
                    value={formData.ingredientsImage}
                    onChange={(url) => setFormData((prev) => ({ ...prev, ingredientsImage: url }))}
                    className="mt-2"
                    previewClassName="max-h-64 overflow-hidden"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Optionnel, mais recommandé pour aider les clients ayant des restrictions alimentaires.
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Tableau de valeur nutritive</Label>
                  <ImageUpload
                    value={formData.nutritionImage}
                    onChange={(url) => setFormData((prev) => ({ ...prev, nutritionImage: url }))}
                    className="mt-2"
                    previewClassName="max-h-64 overflow-hidden"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Téléversez le tableau nutritionnel officiel lorsque disponible.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="school" className="text-sm font-medium">
                École
              </Label>
              {loadingSchools ? (
                <p className="mt-1 text-sm text-gray-500">Chargement des écoles...</p>
              ) : errorSchools ? (
                <p className="mt-1 text-sm text-red-500">Erreur: {errorSchools}</p>
              ) : (
                <Select value={formData.school} onValueChange={handleSchoolChange} className="mt-1">
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une école" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedSchools.map((school) => (
                      <SelectItem key={school._id} value={school._id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={handleDefaultChange}
              />
              <Label
                htmlFor="isDefault"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Produit par défaut
              </Label>
            </div>

            <div>
              <Label htmlFor="productId" className="text-sm font-bold">
                Product ID
              </Label>
              <Input
                id="productId"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                required
                placeholder="Enter product ID"
                className="mt-1"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={uploading}>
            {product.id ? 'Mettre à jour le produit' : 'Créer le produit'}
          </Button>
        </Form>
      </CardContent>
    </Card>
  )
}

export default ProductForm
