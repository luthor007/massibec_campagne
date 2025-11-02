import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Hash, CheckCircle } from 'lucide-react';
import { getTerminology } from '@/utils/organizationHelpers';

const CampaignCodeDisplay = ({ campaign, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || campaign?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [copied, setCopied] = useState(false);

  const copyCampaignCode = async () => {
    const campaignCode = campaign?.campaignCode || 'N/A';
    try {
      await navigator.clipboard.writeText(campaignCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  if (!campaign || !campaign.campaignCode) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Hash className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Code de Campagne</h3>
            <p className="text-gray-600 text-sm">
              Code que les {terminology.participants} doivent utiliser pour rejoindre cette campagne
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-lg border border-blue-200 px-4 py-3 shadow-sm">
            <div className="text-2xl font-bold text-blue-600 font-mono">
              {campaign.campaignCode}
            </div>
          </div>
          <Button
            onClick={copyCampaignCode}
            variant="outline"
            className={`flex items-center space-x-2 transition-all duration-200 ${
              copied 
                ? 'border-green-300 text-green-600 bg-green-50' 
                : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400'
            }`}
          >
            <Copy className="h-4 w-4" />
            <span>{copied ? 'Copié!' : 'Copier'}</span>
          </Button>
        </div>
      </div>
      <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
        <p className="text-sm text-gray-600">
          <strong>Instructions pour les {terminology.participants} :</strong> Les {terminology.participants} doivent utiliser ce code de campagne lors de leur inscription 
          ou dans leur tableau de bord pour rejoindre cette campagne spécifique. Partagez ce code avec les parents et les {terminology.participants}.
        </p>
        <div className="mt-2 text-xs text-gray-500">
          <strong>Campagne :</strong> #{campaign.campaignNumber} • 
          <strong> {terminology.organizationLabel} :</strong> {school?.name} • 
          <strong> Statut :</strong> {campaign.status === 'active' ? 'Active' :
                                   campaign.status === 'approved' ? 'Approuvée' :
                                   campaign.status === 'pending_approval' ? 'En attente' :
                                   campaign.status === 'rejected' ? 'Rejetée' :
                                   campaign.status === 'completed' ? 'Terminée' : campaign.status}
        </div>
      </div>
    </div>
  );
};

export default CampaignCodeDisplay;
