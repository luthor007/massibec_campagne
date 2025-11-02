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
    <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <CardTitle className="text-lg font-semibold">Informations sur la boutique</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <InfoItem icon={<CalendarDays className="h-5 w-5 text-blue-500" />} label="Date limite de commande">
          {formatDate(orderDeadline)}
        </InfoItem>
        <InfoItem icon={<CalendarDays className="h-5 w-5 text-green-500" />} label="Date de livraison">
          {formatDate(deliveryDate)}
        </InfoItem>
        <InfoItem icon={<User className="h-5 w-5 text-purple-500" />} label="Vendeur">
          {ownerName}
        </InfoItem>
        <InfoItem icon={<Mail className="h-5 w-5 text-red-500" />} label="Email">
          {ownerEmail ? (
            <a href={`mailto:${ownerEmail}`} className="text-blue-600 hover:text-blue-800 underline">
              {ownerEmail}
            </a>
          ) : (
            <span className="text-gray-500">N/A</span>
          )}
        </InfoItem>
        <InfoItem icon={<Phone className="h-5 w-5 text-yellow-500" />} label="Téléphone">
          {ownerPhone ? (
            <a href={`tel:${ownerPhone.replace(/\D/g, '')}`} className="text-blue-600 hover:text-blue-800 underline">
              {formatPhoneNumber(ownerPhone)}
            </a>
          ) : (
            <span className="text-gray-500">N/A</span>
          )}
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