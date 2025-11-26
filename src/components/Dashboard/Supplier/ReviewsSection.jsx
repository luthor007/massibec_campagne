import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ReviewsSection = ({ supplierId }) => {
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (supplierId) {
            fetchReviews();
        }
    }, [supplierId]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/reviews?supplierId=${supplierId}`);
            if (response.ok) {
                const data = await response.json();
                setReviews(data.reviews || []);
                setStats(data.stats || null);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-4 w-4 ${star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                            }`}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span>Révisions</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span>Révisions</span>
                    </CardTitle>
                    {stats && (
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                    {stats.averageRating.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500">Note moyenne</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                    {stats.reviewCount}
                                </div>
                                <div className="text-xs text-gray-500">Révisions</div>
                            </div>
                        </div>
                    )}
                </div>
                {stats && (
                    <div className="mt-4">
                        {renderStars(Math.round(stats.averageRating))}
                        <div className="mt-2 space-y-1">
                            {[5, 4, 3, 2, 1].map((rating) => {
                                const count = stats.ratingDistribution[rating] || 0;
                                const percentage = stats.reviewCount > 0
                                    ? (count / stats.reviewCount) * 100
                                    : 0;
                                return (
                                    <div key={rating} className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-600 w-8">{rating}</span>
                                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-yellow-400 h-2 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 w-8 text-right">
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {reviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune révision pour le moment</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <div
                                key={review._id}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start space-x-3">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={review.school?.logo} />
                                        <AvatarFallback>
                                            {review.school?.name?.[0]?.toUpperCase() || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-semibold text-gray-900">
                                                    {review.school?.name || 'École inconnue'}
                                                </span>
                                                {review.isVerified && (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                                        Vérifiée
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {format(new Date(review.createdAt), 'd MMM yyyy', { locale: fr })}
                                            </span>
                                        </div>
                                        <div className="mb-2">
                                            {renderStars(review.rating)}
                                        </div>
                                        {review.comment && (
                                            <p className="text-sm text-gray-700 mt-2">
                                                {review.comment}
                                            </p>
                                        )}
                                        {review.campaign && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Campagne: {review.campaign.name || review.campaign.campaignCode}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ReviewsSection;


