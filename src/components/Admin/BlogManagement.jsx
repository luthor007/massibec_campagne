import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-toastify';

export default function BlogManagement() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featuredImage: '',
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        categories: '',
        tags: '',
        published: false
    });

    useEffect(() => {
        fetchBlogs();
    }, [searchQuery]);

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '50' });
            if (searchQuery) params.append('search', searchQuery);

            const response = await fetch(`/api/admin/blog?${params}`);
            if (response.ok) {
                const data = await response.json();
                setBlogs(data.blogs);
            }
        } catch (error) {
            console.error('Error fetching blogs:', error);
            toast.error('Erreur lors du chargement des articles');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingBlog(null);
        setFormData({
            title: '',
            slug: '',
            excerpt: '',
            content: '',
            featuredImage: '',
            metaTitle: '',
            metaDescription: '',
            metaKeywords: '',
            categories: '',
            tags: '',
            published: false
        });
        setShowDialog(true);
    };

    const handleEdit = (blog) => {
        setEditingBlog(blog);
        setFormData({
            title: blog.title || '',
            slug: blog.slug || '',
            excerpt: blog.excerpt || '',
            content: blog.content || '',
            featuredImage: blog.featuredImage || '',
            metaTitle: blog.metaTitle || '',
            metaDescription: blog.metaDescription || '',
            metaKeywords: (blog.metaKeywords || []).join(', '),
            categories: (blog.categories || []).join(', '),
            tags: (blog.tags || []).join(', '),
            published: blog.published || false
        });
        setShowDialog(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                metaKeywords: formData.metaKeywords.split(',').map(k => k.trim()).filter(k => k),
                categories: formData.categories.split(',').map(c => c.trim()).filter(c => c),
                tags: formData.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t)
            };

            const url = editingBlog
                ? `/api/admin/blog/${editingBlog._id}`
                : '/api/admin/blog';
            const method = editingBlog ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(editingBlog ? 'Article mis à jour' : 'Article créé');
                setShowDialog(false);
                fetchBlogs();
            } else {
                const errorData = await response.json();
                // Extract validation error messages if available
                let errorMessage = errorData.message || 'Erreur lors de la sauvegarde';
                if (errorData.error && typeof errorData.error === 'object') {
                    const validationErrors = Object.values(errorData.error.errors || {})
                        .map((err) => err.message)
                        .join(', ');
                    if (validationErrors) {
                        errorMessage = validationErrors;
                    }
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error saving blog:', error);
            toast.error(error.message || 'Erreur lors de la sauvegarde');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

        try {
            const response = await fetch(`/api/admin/blog/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Article supprimé');
                fetchBlogs();
            } else {
                throw new Error('Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Error deleting blog:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const generateSlug = (title) => {
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Gestion du Blog</h2>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvel article
                </Button>
            </div>

            {/* Search */}
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Rechercher des articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {/* Blog List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Chargement...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {blogs.map((blog) => (
                        <Card key={blog._id}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold">{blog.title}</h3>
                                            {blog.published ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                    Publié
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                                    Brouillon
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 text-sm mb-2">{blog.excerpt}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>Slug: {blog.slug}</span>
                                            {blog.publishedAt && (
                                                <span>Publié: {new Date(blog.publishedAt).toLocaleDateString('fr-CA')}</span>
                                            )}
                                            <span>Vues: {blog.views || 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        {blog.published && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(blog)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(blog._id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingBlog ? 'Modifier l\'article' : 'Nouvel article'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingBlog ? 'Modifiez les informations de l\'article' : 'Créez un nouvel article de blog'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Titre *</label>
                            <Input
                                value={formData.title}
                                onChange={(e) => {
                                    setFormData({
                                        ...formData,
                                        title: e.target.value,
                                        slug: formData.slug || generateSlug(e.target.value)
                                    });
                                }}
                                placeholder="Titre de l'article"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Slug *</label>
                            <Input
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                placeholder="url-de-l-article"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Extrait *
                                <span className="text-xs text-gray-500 ml-2">
                                    ({formData.excerpt?.length || 0}/500)
                                </span>
                            </label>
                            <Textarea
                                value={formData.excerpt}
                                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                                placeholder="Court résumé de l'article"
                                rows={3}
                                maxLength={500}
                            />
                            {formData.excerpt && formData.excerpt.length > 500 && (
                                <p className="text-xs text-red-600 mt-1">
                                    L'extrait sera tronqué à 500 caractères
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Contenu *</label>
                            <Textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Contenu HTML de l'article"
                                rows={15}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Image mise en avant (URL)</label>
                            <Input
                                value={formData.featuredImage}
                                onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Meta Title
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({formData.metaTitle?.length || 0}/100)
                                    </span>
                                </label>
                                <Input
                                    value={formData.metaTitle}
                                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                                    placeholder="Titre SEO"
                                    maxLength={100}
                                />
                                {formData.metaTitle && formData.metaTitle.length > 100 && (
                                    <p className="text-xs text-red-600 mt-1">
                                        Le titre sera tronqué à 100 caractères
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Meta Description
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({formData.metaDescription?.length || 0}/160)
                                    </span>
                                </label>
                                <Input
                                    value={formData.metaDescription}
                                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                                    placeholder="Description SEO"
                                    maxLength={160}
                                />
                                {formData.metaDescription && formData.metaDescription.length > 160 && (
                                    <p className="text-xs text-red-600 mt-1">
                                        La description sera tronquée à 160 caractères
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Meta Keywords (séparés par des virgules)</label>
                            <Input
                                value={formData.metaKeywords}
                                onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                                placeholder="mot-clé1, mot-clé2, mot-clé3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Catégories (séparées par des virgules)</label>
                            <Input
                                value={formData.categories}
                                onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                                placeholder="Catégorie1, Catégorie2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tags (séparés par des virgules)</label>
                            <Input
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                placeholder="tag1, tag2, tag3"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="published"
                                checked={formData.published}
                                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                                className="rounded"
                            />
                            <label htmlFor="published" className="text-sm font-medium">
                                Publié
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSave}>
                            {editingBlog ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

