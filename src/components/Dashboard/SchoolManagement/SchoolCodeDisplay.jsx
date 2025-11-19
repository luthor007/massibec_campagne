import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Hash, CheckCircle } from 'lucide-react';
import { getTerminology } from '@/utils/organizationHelpers';

const SchoolCodeDisplay = ({ school, compact = false }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [copied, setCopied] = useState(false);

  const copySchoolCode = async () => {
    const schoolCode = school?.code || 'N/A';
    try {
      await navigator.clipboard.writeText(schoolCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="text-lg font-bold text-blue-600 font-mono">
            {school?.code || 'N/A'}
          </div>
        </div>
        <Button
          onClick={copySchoolCode}
          variant="outline"
          size="sm"
          className={`transition-all duration-200 ${copied
              ? 'border-green-300 text-green-600 bg-green-50'
              : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400'
            }`}
        >
          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Hash className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Code de {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organizationLabel}</h3>
            <p className="text-gray-600 text-sm">
              Code que les {terminology.participants} doivent utiliser pour s'inscrire à {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-lg border border-blue-200 px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600 font-mono">
              {school?.code || 'N/A'}
            </div>
          </div>
          <Button
            onClick={copySchoolCode}
            variant="outline"
            className={`flex items-center space-x-2 transition-all duration-200 ${copied
                ? 'border-green-300 text-green-600 bg-green-50 hover:bg-green-100'
                : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400'
              }`}
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copié!' : 'Copier'}</span>
          </Button>
        </div>
      </div>
      <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
        <p className="text-sm text-gray-600">
          <strong>Instructions pour les {terminology.participants} :</strong> Les {terminology.participants} doivent utiliser ce code de 6 chiffres lors de leur inscription
          pour rejoindre {terminology.organization === 'école' ? "l'" : "l'"}{terminology.organization} et participer aux campagnes de financement. Partagez ce code avec les parents et les {terminology.participants}.
        </p>
      </div>
    </div>
  );
};

export default SchoolCodeDisplay;
