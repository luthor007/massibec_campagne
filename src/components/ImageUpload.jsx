import React, { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

const ImageUpload = ({
  value,
  onChange,
  className = '',
  previewClassName = '',
  showPreview = true,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  inputId,
  uploadType = 'product' // 'product' or 'student-photo'
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const internalId = useId();
  const fileInputRef = useRef(null);
  const resolvedInputId = inputId || `image-upload-${internalId}`;

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Type de fichier non supporté. Utilisez JPG, PNG ou WebP.');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`Fichier trop volumineux. Taille maximale: ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);

    try {
      // Upload via server-side API
      const formData = new FormData();
      formData.append('image', file);
      // Add upload type if provided via props
      if (uploadType) {
        formData.append('type', uploadType);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'upload');
      }

      const data = await response.json();
      onChange(data.url);
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'upload de l\'image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {value ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-green-600 font-medium">Image uploadée avec succès</p>
            <Button
              variant="outline"
              size="sm"
              onClick={removeImage}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className={`h-8 w-8 mx-auto ${uploading ? 'animate-pulse' : 'text-gray-400'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {uploading ? 'Upload en cours...' : 'Glissez-déposez une image ici'}
              </p>
              <p className="text-xs text-gray-500">
                ou cliquez pour sélectionner un fichier
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
              id={resolvedInputId}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              className="cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Upload...' : 'Sélectionner'}
            </Button>
          </div>
        )}
      </div>

      {/* Preview */}
      {showPreview && value && (
        <div className={`space-y-2 ${previewClassName}`}>
          <p className="text-sm font-medium text-gray-700">Aperçu:</p>
          <Card className="p-4">
            <img
              src={value}
              alt="Preview"
              className="w-full h-32 object-cover rounded-lg"
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
