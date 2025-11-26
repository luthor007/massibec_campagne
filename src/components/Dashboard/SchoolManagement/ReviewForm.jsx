import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

const ReviewForm = ({ supplierId, campaignId, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [categories, setCategories] = useState({
        productQuality: 0,
        deliveryTime: 0,
        communication: 0,
        pricing: 0,
        support: 0
    });
    const [submitting, setSubmitting] = useState(false);
    const [existingReview, setExistingReview] = useState(null);

    useEffect(() => {
        // Check if review already exists
        const fetchExistingReview = async () => {
            try {
                const response = await fetch(`/api/reviews?supplierId=${supplierId}&campaignId=${campaignId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.reviews && data.reviews.length > 0) {
                        const review = data.reviews[0];
                        setExistingReview(review);
                        setRating(review.rating);
                        setComment(review.comment || '');
                        setCategories(review.categories || categories);
                    }
                }
            } catch (error) {
                console.error('Error fetching existing review:', error);
            }
        };

        if (supplierId && campaignId) {
            fetchExistingReview();
        }
    }, [supplierId, campaignId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error('Veuillez sélectionner une note');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId,
                    campaignId,
                    rating,
                    comment: comment.trim(),
                    categories: Object.values(categories).some(v => v > 0) ? categories : undefined
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(existingReview ? 'Révision mise à jour' : 'Révision soumise avec succès');
                setExistingReview(data.review);
                if (onReviewSubmitted) {
                    onReviewSubmitted(data.review);
                }
            } else {
                const error = await response.json();
                toast.error(error.message || 'Erreur lors de la soumission de la révision');
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Erreur lors de la soumission de la révision');
        } finally {
            setSubmitting(false);
        }
    };

    const categoryLabels = {
        productQuality: 'Qualité des produits',
        deliveryTime: 'Délai de livraison',
        communication: 'Communication',
        pricing: 'Prix',
        support: 'Support'
    };

    return (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-900">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span>{existingReview ? 'Modifier votre révision' : 'Laisser une révision'}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Overall Rating */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Note globale *
                        </label>
                        <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`h-8 w-8 ${star <= (hoveredRating || rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                            }`}
                                    />
                                </button>
                            ))}
                            {rating > 0 && (
                                <span className="ml-2 text-sm text-gray-600">
                                    {rating}/5
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Detailed Categories (Optional) */}
                    <div className="space-y-3 pt-2 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Détails (optionnel)
                        </label>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                            <div key={key} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">{label}</span>
                                <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setCategories(prev => ({
                                                ...prev,
                                                [key]: star
                                            }))}
                                            className="focus:outline-none"
                                        >
                                            <Star
                                                className={`h-5 w-5 ${star <= categories[key]
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-gray-300'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Commentaire (optionnel)
                        </label>
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Partagez votre expérience avec ce fournisseur..."
                            rows={4}
                            maxLength={1000}
                            className="resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {comment.length}/1000 caractères
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={submitting || rating === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Envoi en cours...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                {existingReview ? 'Mettre à jour la révision' : 'Soumettre la révision'}
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default ReviewForm;


