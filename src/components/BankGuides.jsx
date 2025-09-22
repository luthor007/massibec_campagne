import React from 'react';
import { Button } from '../components/ui/button';

const BankGuides = () => {
  const guides = [
    {
      name: 'Banque Nationale',
      url: 'https://www.bnc.ca/particuliers/centre-aide/compte-bancaire/depot-virement/comment-activer-depot-automatique-interac.html',
      nickname: 'BNC',
    },
    {
      name: 'Desjardins',
      url: 'https://www.desjardins.com/fr/comptes-services/virement-interac.html',
      nickname: 'Desjardins',
    },
    {
      name: 'Banque Royale du Canada (RBC)',
      url: 'https://www.rbcbanqueroyale.com/dms/payments/autodeposit/',
      nickname: 'RBC',
    },
    {
      name: 'Banque de Montréal (BMO)',
      url: 'https://bmodemos.com/fr/course/start/public-autodeposit-mobile/emulator-autodeposit-mobile/emulator',
      nickname: 'BMO',
    },
    {
      name: 'Banque Canadienne Impériale de Commerce (CIBC)',
      url: 'https://www.cibc.com/fr/personal-banking/ways-to-bank/how-to/register-interac-autodeposit.html',
      nickname: 'CIBC',
    },
    {
      name: 'TD Canada Trust',
      url: 'https://www.td.com/ca/fr/services-bancaires-personnels/comment-faire/appli-td/etablir-auto-depot-virements-interac',
      nickname: 'TD',
    },
  ];

  return (
    <div>
      <h2>Guides pour l'inscription au dépôt automatique de Virement Interac</h2>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between'}}>
        {guides.map((guide, index) => (
          <div key={index} style={{width: 'calc(33% - 20px)', padding: '10px', margin: '10px 0'}}>
            <Button
              onClick={() => window.open(guide.url, '_blank')}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '10px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              {guide.nickname}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BankGuides;