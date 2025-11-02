import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Calendar, Target, DollarSign, Users, Sparkles } from 'lucide-react';

export default function WelcomeModal({ isOpen, onClose, onCreateCampaign }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl mx-auto bg-white shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Bienvenue dans votre espace de gestion !
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            Vous êtes maintenant prêt à créer votre première campagne de financement
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Pour commencer votre campagne, vous devez configurer :
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                Les dates de votre campagne (début, fin, livraison)
              </li>
              <li className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-blue-600" />
                Votre objectif financier
              </li>
              <li className="flex items-center">
                <Target className="w-4 h-4 mr-2 text-blue-600" />
                Les prix de vente de vos produits
              </li>
              <li className="flex items-center">
                <Users className="w-4 h-4 mr-2 text-blue-600" />
                La répartition des profits (participant/organisation/tirage)
              </li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">
              💡 Conseil
            </h4>
            <p className="text-green-800 text-sm">
              Ne vous inquiétez pas ! Vous pourrez modifier ces paramètres plus tard si nécessaire. 
              Commencez par créer votre campagne avec des valeurs approximatives.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6"
            >
              Plus tard
            </Button>
            <Button
              onClick={onCreateCampaign}
              className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Créer ma première campagne
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
