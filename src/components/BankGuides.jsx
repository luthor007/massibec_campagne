import React from 'react';
import { Button } from '../components/ui/button';
import { ExternalLink } from 'lucide-react';

const BankGuides = () => {
  const guides = [
    {
      name: 'Banque Nationale',
      url: 'https://www.bnc.ca/particuliers/centre-aide/compte-bancaire/depot-virement/comment-activer-depot-automatique-interac.html',
      nickname: 'BNC',
      logo: '/images/bnc.svg',
      color: '#003478',
      hoverColor: '#004A9F',
    },
    {
      name: 'Desjardins',
      url: 'https://www.desjardins.com/fr/comptes-services/virement-interac.html',
      nickname: 'Desjardins',
      logo: '/images/desjardins.svg',
      color: '#00B04F',
      hoverColor: '#00C85F',
    },
    {
      name: 'Banque Royale du Canada (RBC)',
      url: 'https://www.rbcbanqueroyale.com/dms/payments/autodeposit/',
      nickname: 'RBC',
      logo: '/images/rbc.svg',
      color: '#0051A5',
      hoverColor: '#0066CC',
    },
    {
      name: 'Banque de Montréal (BMO)',
      url: 'https://bmodemos.com/fr/course/start/public-autodeposit-mobile/emulator-autodeposit-mobile/emulator',
      nickname: 'BMO',
      logo: '/images/bmo.svg',
      color: '#00AEEF',
      hoverColor: '#00C5FF',
    },
    {
      name: 'Banque Canadienne Impériale de Commerce (CIBC)',
      url: 'https://www.cibc.com/fr/personal-banking/ways-to-bank/how-to/register-interac-autodeposit.html',
      nickname: 'CIBC',
      logo: '/images/cibc.svg',
      color: '#BA0C2F',
      hoverColor: '#D91D3F',
    },
    {
      name: 'TD Canada Trust',
      url: 'https://www.td.com/ca/fr/services-bancaires-personnels/comment-faire/appli-td/etablir-auto-depot-virements-interac',
      nickname: 'TD',
      logo: '/images/TD.svg',
      color: '#4C9F47',
      hoverColor: '#5BB855',
    },
  ];

  const handleBankClick = (e, url) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Guides pour l'inscription au dépôt automatique de Virement Interac
      </h2>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {guides.map((guide, index) => (
          <Button
            key={index}
            type="button"
            onClick={(e) => handleBankClick(e, guide.url)}
            className="h-auto py-3 px-2 flex flex-col items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 border border-gray-200 bg-white hover:bg-gray-50 group"
            title={guide.name}
          >
            <div className="flex items-center justify-center w-12 h-12">
              <img 
                src={guide.logo} 
                alt={guide.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target;
                  if (target) {
                    target.style.display = 'none';
                  }
                }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
              {guide.nickname}
            </span>
            <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        ))}
      </div>
    </div>
  );
};

export default BankGuides;
