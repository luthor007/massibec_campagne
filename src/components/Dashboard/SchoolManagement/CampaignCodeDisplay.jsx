import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Hash, CheckCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { getTerminology } from '@/utils/organizationHelpers';

const CampaignCodeDisplay = ({ campaign, school }) => {
  // Get terminology based on organization type
  const organizationType = school?.organizationType || campaign?.organizationType || 'school';
  const terminology = getTerminology(organizationType);
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

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
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <Hash className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Code de Campagne</h3>
            <p className="text-xs text-gray-500 truncate">
              Code que les {terminology.participants} doivent utiliser pour rejoindre cette campagne
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-gray-50 rounded-md border border-gray-200 px-3 py-2">
            <div className="text-lg font-bold text-blue-600 font-mono">
              {campaign.campaignCode}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={copyCampaignCode}
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 transition-all duration-200 ${copied
                      ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? 'Copié!' : 'Copier le code'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            onClick={() => setShowInstructions(!showInstructions)}
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            title={showInstructions ? 'Masquer les instructions' : 'Afficher les instructions'}
          >
            {showInstructions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {showInstructions && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-start space-x-2 mb-3">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-600 break-words">
                <strong>Instructions pour les {terminology.participants} :</strong> Les {terminology.participants} doivent utiliser ce code de campagne lors de leur inscription
                ou dans leur tableau de bord pour rejoindre cette campagne spécifique. Partagez ce code avec les parents et les {terminology.participants}.
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 break-words pl-6">
            <strong>Campagne :</strong> #{campaign.campaignNumber} •
            <strong> {terminology.organizationLabel} :</strong> {school?.name} •
            <strong> Mode :</strong> {campaign?.mode === 'production' ? 'Production' : 'Test'}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignCodeDisplay;
