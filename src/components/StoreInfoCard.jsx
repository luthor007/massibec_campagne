import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CalendarDays, User, Mail, Phone, School } from 'lucide-react'

export default function StoreInfoCard({
  orderDeadline,
  deliveryDate,
  ownerName,
  ownerEmail,
  ownerPhone,
  schoolName,
}) {
  return (
    <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <CardTitle className="text-lg font-semibold">Informations sur la boutique</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <InfoItem icon={<CalendarDays className="h-5 w-5 text-blue-500" />} label="Date limite de commande">
          {orderDeadline ? new Date(orderDeadline).toLocaleDateString('fr-FR') : 'N/A'}
        </InfoItem>
        <InfoItem icon={<CalendarDays className="h-5 w-5 text-green-500" />} label="Date de livraison">
          {deliveryDate ? new Date(deliveryDate).toLocaleDateString('fr-FR') : 'N/A'}
        </InfoItem>
        <InfoItem icon={<User className="h-5 w-5 text-purple-500" />} label="Vendeur">
          {ownerName}
        </InfoItem>
        <InfoItem icon={<Mail className="h-5 w-5 text-red-500" />} label="Email">
          {ownerEmail}
        </InfoItem>
        <InfoItem icon={<Phone className="h-5 w-5 text-yellow-500" />} label="Téléphone">
          {ownerPhone}
        </InfoItem>
        <InfoItem icon={<School className="h-5 w-5 text-indigo-500" />} label="École">
          {schoolName}
        </InfoItem>
      </CardContent>
    </Card>
  )
}

function InfoItem({ icon, label, children }) {
  return (
    <div className="flex items-center space-x-3">
      {icon}
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-sm text-gray-800">{children}</p>
      </div>
    </div>
  )
}