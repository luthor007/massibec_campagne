import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { School, User, Shield, Crown, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import { toast } from 'react-toastify';

const AcceptInvitationPage = () => {
  const router = useRouter();
  const { token } = router.query;
  const { data: session } = useSession();
  
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  
  // Form states
  const [acceptWithExisting, setAcceptWithExisting] = useState(true);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/managers/invitations/${token}`);
      if (response.ok) {
        const data = await response.json();
        setInvitation(data.invitation);
        setAcceptWithExisting(data.userExists);
      } else {
        const error = await response.json();
        setError(error.message || 'Invitation non trouvée ou expirée');
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Erreur lors du chargement de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e) => {
    e.preventDefault();
    
    if (!acceptWithExisting && (!name || !password)) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    if (acceptWithExisting && !password) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    setAccepting(true);

    try {
      const response = await fetch(`/api/managers/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: acceptWithExisting ? undefined : name,
          password,
          acceptWithExistingAccount: acceptWithExisting
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Auto-login with the temporary token
        const result = await signIn('credentials', {
          redirect: false,
          email: data.user.email,
          password: 'MAGIC_LOGIN_TOKEN',
          loginToken: data.loginToken,
        });

        if (result?.ok) {
          toast.success('Invitation acceptée avec succès !');
          router.push('/dashboard-manager');
        } else {
          toast.error('Erreur lors de la connexion automatique');
          router.push('/connexion');
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erreur lors de l\'acceptation de l\'invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Erreur lors de l\'acceptation de l\'invitation');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5" />;
      case 'member':
        return <User className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'member':
        return 'Membre';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Layout>
        <Head>
          <title>Chargement de l'invitation - Massibec</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Chargement de l'invitation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Head>
          <title>Invitation invalide - Massibec</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                Invitation invalide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="mt-4 text-center">
                <Button onClick={() => router.push('/')}>
                  Retour à l'accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Accepter l'invitation - {invitation?.schoolName} - Massibec</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <School className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Invitation à gérer {invitation?.schoolName}
              </CardTitle>
              <p className="text-gray-600 mt-2">
                {invitation?.inviterName} vous invite à rejoindre l'équipe de gestion
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Invitation Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-blue-900">Rôle proposé :</span>
                  <Badge variant={getRoleBadgeVariant(invitation?.role)} className="flex items-center">
                    {getRoleIcon(invitation?.role)}
                    <span className="ml-1">{getRoleLabel(invitation?.role)}</span>
                  </Badge>
                </div>
                <div className="text-sm text-blue-800">
                  <p><strong>École :</strong> {invitation?.schoolName}</p>
                  <p><strong>Invitation de :</strong> {invitation?.inviterName}</p>
                  <p><strong>Email :</strong> {invitation?.email}</p>
                </div>
              </div>

              {/* Expiry Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Cette invitation expire le {new Date(invitation?.expiresAt).toLocaleDateString('fr-FR')} à {new Date(invitation?.expiresAt).toLocaleTimeString('fr-FR')}
                </AlertDescription>
              </Alert>

              {/* Acceptance Form */}
              <form onSubmit={handleAcceptInvitation} className="space-y-4">
                <Tabs value={acceptWithExisting ? 'existing' : 'new'} onValueChange={(value) => setAcceptWithExisting(value === 'existing')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing">Compte existant</TabsTrigger>
                    <TabsTrigger value="new">Nouveau compte</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="existing" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Votre mot de passe"
                        required
                        disabled={accepting}
                      />
                      <p className="text-sm text-gray-600">
                        Entrez le mot de passe de votre compte existant avec l'email {invitation?.email}
                      </p>
                      <Alert className="mt-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          Si vous avez déjà un compte étudiant, celui-ci sera converti en compte gestionnaire. 
                          Vous pourrez toujours accéder à vos données d'étudiant depuis le portail gestionnaire.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="new" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Votre nom complet"
                        required
                        disabled={accepting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Mot de passe</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choisissez un mot de passe"
                        required
                        disabled={accepting}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/')}
                    disabled={accepting}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={accepting}
                    className="flex-1"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Acceptation...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accepter l'invitation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AcceptInvitationPage;

