import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { ExternalLink, QrCode, Facebook, Instagram, Mail, Link as LinkIcon, Globe, Twitter } from 'lucide-react'

const SOURCE_LABELS = {
    qr: 'QR Code',
    facebook: 'Facebook',
    instagram: 'Instagram',
    twitter: 'Twitter',
    email: 'Email de relance',
    direct: 'Lien direct',
    link: 'Lien copié',
    other: 'Autre',
    unknown: 'Inconnu'
}

const SOURCE_ICONS = {
    qr: QrCode,
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    email: Mail,
    direct: Globe,
    link: LinkIcon,
    other: Globe,
    unknown: Globe
}

const COLORS = {
    qr: '#8b5cf6',
    facebook: '#1877f2',
    instagram: '#e4405f',
    twitter: '#1da1f2',
    email: '#10b981',
    direct: '#3b82f6',
    link: '#f59e0b',
    other: '#6b7280',
    unknown: '#9ca3af'
}

function VisitSourceCard({ sourceData }) {
    const {
        qr = 0,
        facebook = 0,
        instagram = 0,
        twitter = 0,
        email = 0,
        direct = 0,
        link = 0,
        other = 0,
        unknown = 0
    } = sourceData || {}

    const total = qr + facebook + instagram + twitter + email + direct + link + other + unknown

    const chartData = [
        { name: SOURCE_LABELS.qr, value: qr, color: COLORS.qr, key: 'qr' },
        { name: SOURCE_LABELS.facebook, value: facebook, color: COLORS.facebook, key: 'facebook' },
        { name: SOURCE_LABELS.instagram, value: instagram, color: COLORS.instagram, key: 'instagram' },
        { name: SOURCE_LABELS.twitter, value: twitter, color: COLORS.twitter, key: 'twitter' },
        { name: SOURCE_LABELS.email, value: email, color: COLORS.email, key: 'email' },
        { name: SOURCE_LABELS.direct, value: direct, color: COLORS.direct, key: 'direct' },
        { name: SOURCE_LABELS.link, value: link, color: COLORS.link, key: 'link' },
        { name: SOURCE_LABELS.other, value: other, color: COLORS.other, key: 'other' },
        { name: SOURCE_LABELS.unknown, value: unknown, color: COLORS.unknown, key: 'unknown' }
    ].filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)

    if (!sourceData || total === 0) {
        return (
            <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-gray-600">Origine des visites</CardTitle>
                        <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-sm text-gray-500">Aucune donnée disponible</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">Origine des visites</CardTitle>
                    <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                {/* Total */}
                <div className="mb-4">
                    <div className="text-2xl font-bold text-gray-900">{total}</div>
                    <p className="text-xs text-gray-500 mt-1">Total des visites</p>
                </div>

                {/* Top Sources List */}
                <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
                    {chartData.slice(0, 6).map((item) => {
                        const Icon = SOURCE_ICONS[item.key] || Globe
                        return (
                            <div key={item.key} className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                    <Icon className="h-3 w-3" style={{ color: item.color }} />
                                    <span className="text-gray-600">{item.name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">{item.value}</span>
                                    <span className="text-gray-500">({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Pie Chart */}
                {chartData.length > 0 && (
                    <div className="mt-4">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value, name, props) => {
                                        const sourceKey = props.payload?.key || name;
                                        return [value, SOURCE_LABELS[sourceKey] || name];
                                    }}
                                />
                                <Legend
                                    formatter={(value) => SOURCE_LABELS[value] || value}
                                    wrapperStyle={{ fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default VisitSourceCard

