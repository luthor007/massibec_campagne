import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestInscription() {
  const [schoolCode, setSchoolCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testSchoolCode = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/school-from-code?code=${schoolCode}`);
      const data = await response.json();
      
      setResult({
        success: response.ok,
        status: response.status,
        data: data
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Inscription Étudiant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="schoolCode">Code de l'école (6 chiffres)</Label>
            <Input
              id="schoolCode"
              type="text"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              placeholder="Ex: 123456"
              maxLength={6}
            />
          </div>
          
          <Button 
            onClick={testSchoolCode} 
            disabled={loading || !schoolCode}
            className="w-full"
          >
            {loading ? 'Test en cours...' : 'Tester le code'}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold mb-2">
                {result.success ? '✅ Code valide' : '❌ Code invalide'}
              </h3>
              
              {result.success ? (
                <div className="space-y-2 text-sm">
                  <p><strong>École:</strong> {result.data.name}</p>
                  <p><strong>Code:</strong> {result.data.code}</p>
                  <p><strong>Statut:</strong> {result.data.status}</p>
                  <p><strong>Peut inscrire des étudiants:</strong> {result.data.status === 'approved' ? 'Oui' : 'Non'}</p>
                </div>
              ) : (
                <div className="text-sm">
                  <p><strong>Erreur:</strong> {result.data?.message || result.error}</p>
                  <p><strong>Status HTTP:</strong> {result.status}</p>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4">
            <p><strong>Instructions:</strong></p>
            <p>1. Cliquez sur "Vérifier Test Massibec" dans la page de gestion des écoles pour obtenir le code</p>
            <p>2. Entrez le code ici pour tester si l'inscription fonctionne</p>
            <p>3. Si le code est valide, l'école peut accepter de nouveaux étudiants</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
