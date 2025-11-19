// components/SalesTools/EmailCampaign.jsx
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Sparkles } from 'lucide-react';

export default function EmailCampaign({ selectedClients, storeId, onSuccess, studentName }) {
  const [subject, setSubject] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Templates organisés par ordre logique pour une campagne de relance efficace
  const templates = [
    {
      name: '1️⃣ Relance Initiale',
      category: 'Début de campagne',
      description: 'Parfait pour contacter vos anciens clients au début',
      subject: 'Notre nouvelle campagne de financement a commencé! 🎉',
      body: `Bonjour {nom},\n\nJ'espère que vous allez bien!\n\nJe suis ravi(e) de vous annoncer que notre nouvelle campagne de financement scolaire vient de commencer! Comme l'année dernière, nous vendons de délicieuses tartes et pâtés Massibec pour soutenir notre école.\n\nVous avez été si généreux(se) l'année dernière et j'aimerais beaucoup compter sur votre soutien encore cette fois-ci! 🍰\n\nVous pouvez commander directement sur ma boutique en ligne:\n{lien}\n\nMerci infiniment pour votre soutien continu!\n\nCordialement,`
    },
    {
      name: '2️⃣ Rappel Amical',
      category: 'Suivi',
      description: 'Si pas de réponse après 3-5 jours',
      subject: 'Un petit rappel amical 😊',
      body: `Bonjour {nom},\n\nJ'espère que mon dernier message vous est bien parvenu!\n\nJe voulais juste vous rappeler que notre campagne de financement est en cours et que vos tartes Massibec préférées sont disponibles sur ma boutique.\n\nSi vous avez des questions ou souhaitez passer une commande, n'hésitez pas! Chaque commande nous aide énormément à atteindre notre objectif. 🙏\n\nMa boutique: {lien}\n\nMerci pour votre temps et votre soutien!`
    },
    {
      name: '3️⃣ Nouveaux Produits',
      category: 'Milieu de campagne',
      description: 'Pour annoncer de nouveaux produits',
      subject: 'Nouveaux produits disponibles! 🆕',
      body: `Bonjour {nom},\n\nExcellente nouvelle! J'ai ajouté de nouveaux produits à ma boutique de financement!\n\nDécouvrez notre nouvelle sélection de tartes et pâtés Massibec. Il y en a pour tous les goûts! 🍰\n\nCommandez maintenant et profitez de ces délicieuses nouveautés tout en soutenant notre école:\n{lien}\n\nMerci de votre soutien continu!\n\nÀ bientôt,`
    },
    {
      name: '4️⃣ Créer l\'Urgence',
      category: 'Milieu de campagne',
      description: 'Pour créer un sentiment d\'urgence',
      subject: 'Les commandes se multiplient! ⚡',
      body: `Bonjour {nom},\n\nNotre campagne prend de l'ampleur! Les commandes arrivent de partout et nous sommes sur la bonne voie pour atteindre notre objectif! 🎯\n\nJe voulais m'assurer que vous n'ayez pas manqué l'occasion de commander vos tartes Massibec préférées. Les stocks sont limités et la date limite approche!\n\nCommandez maintenant avant qu'il ne soit trop tard:\n{lien}\n\nMerci pour votre soutien!`
    },
    {
      name: '5️⃣ Dernière Chance',
      category: 'Fin de campagne',
      description: 'Pour la fin de campagne',
      subject: 'Dernière chance - La campagne se termine bientôt! ⏰',
      body: `Bonjour {nom},\n\nNotre campagne de financement touche à sa fin et nous sommes si proches de notre objectif! 🎯\n\nC'est votre dernière chance de commander vos tartes Massibec préférées tout en soutenant notre école. La date limite approche rapidement!\n\nCommandez avant qu'il ne soit trop tard:\n{lien}\n\nMerci infiniment pour votre générosité et votre soutien!`
    },
    {
      name: '6️⃣ Remerciement',
      category: 'Post-campagne',
      description: 'Pour remercier après la campagne',
      subject: 'Merci pour votre soutien! 🙏',
      body: `Bonjour {nom},\n\nNotre campagne de financement est maintenant terminée et je tenais à vous remercier chaleureusement pour votre soutien! Grâce à des personnes généreuses comme vous, nous avons pu atteindre nos objectifs. 🎉\n\nSi vous avez commandé, vous recevrez vos produits très bientôt. Si vous n'avez pas eu l'occasion de commander cette fois-ci, j'espère vous compter parmi mes clients lors de notre prochaine campagne!\n\nMerci encore pour tout!`
    }
  ];

  const loadTemplate = (template) => {
    // Add student name at the end of the template body
    const studentNameToUse = studentName || '';
    let loadedSubject = template.subject;
    let loadedBody = template.body;

    // Add student name at the end if it exists
    if (studentNameToUse && loadedBody.trim()) {
      loadedBody = loadedBody.trim() + '\n\n' + studentNameToUse;
    }

    setSubject(loadedSubject);
    setEmailTemplate(loadedBody);
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
          <div className="flex items-center mb-3">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 mr-2" />
            <h4 className="font-semibold text-purple-900 text-sm sm:text-base">Templates Prêts à l'Emploi</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((template, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => loadTemplate(template)}
                className="text-xs sm:text-sm border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400"
                title={template.description}
              >
                {template.name}
              </Button>
            ))}
          </div>
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>💡 Astuce:</strong> Utilisez-les dans l'ordre (1→6) pour une campagne efficace. Commencez par "Relance Initiale" pour vos anciens clients.
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



