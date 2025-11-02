// components/SalesTools/EmailCampaign.jsx
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Sparkles } from 'lucide-react';

export default function EmailCampaign({ selectedClients, storeId, onSuccess }) {
  const [subject, setSubject] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);

  const templates = [
    {
      name: 'Relance Clients',
      subject: 'Soutenez notre école - Nouvelles tartes disponibles!',
      body: `Bonjour {nom},\n\nJ'espère que vous allez bien! Je voulais vous rappeler que notre campagne de financement scolaire est toujours en cours.\n\nNous avons de délicieuses tartes Massibec disponibles et chaque commande nous aide à atteindre notre objectif.\n\nVous pouvez commander directement sur ma boutique: {lien}\n\nMerci infiniment pour votre soutien!\n\nCordialement,\n{boutique}`
    },
    {
      name: 'Nouveaux Produits',
      subject: 'Nouveaux produits dans ma boutique {boutique}!',
      body: `Bonjour {nom},\n\nJ'ai le plaisir de vous annoncer que de nouveaux produits sont disponibles dans ma boutique de financement scolaire!\n\nDécouvrez notre nouvelle sélection de tartes et pâtés Massibec.\n\nCommandez maintenant: {lien}\n\nMerci de votre soutien continu!\n\nÀ bientôt,\n{boutique}`
    },
    {
      name: 'Dernière Chance',
      subject: 'Dernière chance - La campagne se termine bientôt!',
      body: `Bonjour {nom},\n\nNotre campagne de financement touche à sa fin et nous sommes si proches de notre objectif!\n\nC'est votre dernière chance de commander vos tartes préférées tout en soutenant notre école.\n\nCommandez avant qu'il ne soit trop tard: {lien}\n\nMerci pour votre générosité!\n\n{boutique}`
    }
  ];

  const loadTemplate = (template) => {
    setSubject(template.subject);
    setEmailTemplate(template.body);
  };

  const sendEmailCampaign = async () => {
    if (selectedClients.length === 0) {
      toast.error('Veuillez sélectionner au moins un client');
      return;
    }

    if (!subject || !emailTemplate) {
      toast.error('Le sujet et le message sont requis');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/send-email-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: selectedClients,
          template: emailTemplate,
          subject: subject,
          storeId
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        setSubject('');
        setEmailTemplate('');
        if (onSuccess) onSuccess();
      } else {
        toast.error(`Erreur: ${data.message}`);
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Erreur lors de l\'envoi des emails');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-base sm:text-lg">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Campagne Email
        </CardTitle>
        <CardDescription className="text-sm">
          Envoyez des emails personnalisés à vos clients sélectionnés
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-center mb-2 sm:mb-3">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 mr-2" />
            <h4 className="font-semibold text-purple-900 text-sm sm:text-base">Templates Prêts</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {templates.map((template, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => loadTemplate(template)}
                className="justify-start"
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="emailSubject">Sujet de l'email *</Label>
          <Input
            id="emailSubject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex: Soutenez notre école!"
          />
        </div>

        <div>
          <Label htmlFor="emailTemplate">Message *</Label>
          <Textarea
            id="emailTemplate"
            value={emailTemplate}
            onChange={(e) => setEmailTemplate(e.target.value)}
            placeholder="Bonjour {nom}, découvrez nos nouvelles tartes..."
            rows={6}
          />
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">Variables disponibles :</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li><code className="bg-blue-100 px-2 py-1 rounded">{'{nom}'}</code> - Nom du client</li>
            <li><code className="bg-blue-100 px-2 py-1 rounded">{'{boutique}'}</code> - Nom de votre boutique</li>
            <li><code className="bg-blue-100 px-2 py-1 rounded">{'{lien}'}</code> - Lien vers votre boutique</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg space-y-2 sm:space-y-0">
          <span className="text-sm font-medium">
            {selectedClients.length} client{selectedClients.length > 1 ? 's' : ''} sélectionné{selectedClients.length > 1 ? 's' : ''}
          </span>
          <Button 
            onClick={sendEmailCampaign} 
            disabled={selectedClients.length === 0 || isSending}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full sm:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>

        {selectedClients.length === 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Sélectionnez des clients dans la liste pour envoyer des emails
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



