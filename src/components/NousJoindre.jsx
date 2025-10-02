import { Mail, Phone, MapPin } from "lucide-react";

export default function NousJoindre() {
  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Nous Joindre</h2>
      
      {/* Adresse */}
      <div className="flex items-center mb-4">
        <MapPin className="mr-2 h-5 w-5 text-primary" />
        <div>
          <p className="font-semibold">Adresse:</p>
          <p>767 Rue Notre-Dame, Champlain, Québec G0X 1C0</p>
        </div>
      </div>

      {/* Téléphone */}
      <div className="flex items-center mb-4">
        <Phone className="mr-2 h-5 w-5 text-primary" />
        <div>
          <p className="font-semibold">Téléphone:</p>
          <p>(819) 295-3325</p>
        </div>
      </div>

      {/* Courriel */}
      <div className="flex items-center mb-4">
        <Mail className="mr-2 h-5 w-5 text-primary" />
        <div>
          <p className="font-semibold">Courriel:</p>
          <p>
            <a href="mailto:louis@massibec.com" className="text-blue-600 hover:underline">
              louis@massibec.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}