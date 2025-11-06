import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CalendarDays, User, Mail, Phone, School } from 'lucide-react'

// Helper function to format dates consistently and avoid timezone issues
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';

  // Use UTC methods to avoid timezone issues
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  return `${day} ${months[month]} ${year}`;
};

// Helper function to format phone number as 1-222-333-4444
const formatPhoneNumber = (phone) => {
  if (!phone) return 'N/A';
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format as 1-222-333-4444 if it starts with 1 and has 11 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // Format as 222-333-4444 if it has 10 digits
  else if (digits.length === 10) {
    return `1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Return original if doesn't match expected format
  return phone;
};

export default function StoreInfoCard({
  orderDeadline,
  deliveryDate,
  ownerName,
  ownerEmail,
  ownerPhone,
  schoolName,
}) {
  return (
    <Card className="bg-white shadow-lg rounded-xl overflow-hidden border-0">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-5">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          Informations sur la boutique
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        <InfoItem icon={<CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />} label="Date limite de commande">
          {formatDate(orderDeadline)}
        </InfoItem>
        <InfoItem icon={<CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />} label="Date de livraison">
          {formatDate(deliveryDate)}
        </InfoItem>
        <InfoItem icon={<User className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />} label="Vendeur">
          {ownerName}
        </InfoItem>
        <InfoItem icon={<Mail className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />} label="Email">
          {ownerEmail ? (
            <a href={`mailto:${ownerEmail}`} className="text-blue-600 hover:text-blue-800 underline break-all">
              {ownerEmail}
            </a>
          ) : (
            <span className="text-gray-500">N/A</span>
          )}
        </InfoItem>
        <InfoItem icon={<Phone className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />} label="Téléphone">
          {ownerPhone ? (
            <a href={`tel:${ownerPhone.replace(/\D/g, '')}`} className="text-blue-600 hover:text-blue-800 underline">
              {formatPhoneNumber(ownerPhone)}
            </a>
          ) : (
            <span className="text-gray-500">N/A</span>
          )}
        </InfoItem>
        <InfoItem icon={<School className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />} label="École">
          {schoolName}
        </InfoItem>
      </CardContent>
    </Card>
  )
}

function InfoItem({ icon, label, children }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm sm:text-base text-gray-800 break-words">{children}</p>
      </div>
    </div>
  )
}