import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, CheckCircle, Loader2, Sparkles, PartyPopper, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Head from 'next/head';

/**
 * Page plein écran ultra-simple pour rejoindre une campagne
 * Affichée après l'inscription d'un nouvel utilisateur
 */
export default function RejoindreCamera() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState('search'); // 'search' | 'groups' | 'joining' | 'success'
  const [searchTerm, setSearchTerm] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/connexion');
    }
  }, [status, router]);

  // Fetch campaigns
  const fetchCampaigns = async (search = '') => {
    setLoading(true);
    try {
      const url = search
        ? `/api/campaigns/available?search=${encodeURIComponent(search)}`
        : '/api/campaigns/available';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle campaign selection
  const handleSelectCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setError('');

    if (campaign.groups?.enabled && campaign.groups?.list?.length > 0) {
      setStep('groups');
    } else {
      joinCampaign(campaign, null);
    }
  };

  // Handle group selection
  const handleSelectGroup = (group) => {
    joinCampaign(selectedCampaign, group.name || group);
  };

  // Join campaign
  const joinCampaign = async (campaign, groupId) => {
    setJoining(true);
    setStep('joining');

    try {
      const response = await fetch('/api/campaigns/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignCode: campaign.campaignCode,
          groupId
        })
      });

      if (response.ok) {
        setStep('success');
        // Redirect to dashboard after success animation
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.message || 'Erreur');
        setStep('search');
      }
    } catch (error) {
      setError('Erreur de connexion');
      setStep('search');
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <>
        <Head>
          <title>Bienvenue! | Jappuie</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="text-center text-white"
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <PartyPopper className="h-24 w-24 mx-auto mb-6" />
            </motion.div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">C'est parti! 🎉</h1>
            <p className="text-xl sm:text-2xl opacity-90">Tu as rejoint la campagne!</p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8"
            >
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm mt-2 opacity-75">Redirection vers ton tableau de bord...</p>
            </motion.div>
          </motion.div>
        </div>
      </>
    );
  }

  // Joining screen
  if (step === 'joining') {
    return (
      <>
        <Head>
          <title>Connexion... | Jappuie</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-white"
          >
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold">Un instant...</h2>
            <p className="opacity-75 mt-2">On te connecte à la campagne!</p>
          </motion.div>
        </div>
      </>
    );
  }

  // Group selection screen
  if (step === 'groups' && selectedCampaign) {
    return (
      <>
        <Head>
          <title>Choisis ton groupe | Jappuie</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4 sm:p-8">
          <div className="max-w-lg mx-auto pt-8 sm:pt-16">
            {/* Back button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setStep('search')}
              className="text-white/80 hover:text-white mb-8 flex items-center gap-2 text-sm"
            >
              ← Retour
            </motion.button>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Choisis ton groupe! 🎯
              </h1>
              <p className="text-white/80 text-lg">
                {selectedCampaign.school?.name}
              </p>
            </motion.div>

            {/* Groups list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3 max-h-[60vh] overflow-y-auto"
            >
              {selectedCampaign.groups.list.map((group, index) => (
                <motion.button
                  key={group.name || group}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectGroup(group)}
                  className="w-full p-4 bg-white/95 hover:bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800 text-lg">
                      {group.name || group}
                    </span>
                  </div>
                  <CheckCircle className="h-6 w-6 text-gray-300 group-hover:text-green-500 transition-colors" />
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  // Main search screen
  return (
    <>
      <Head>
        <title>Rejoins ta campagne! | Jappuie</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4 sm:p-8">
        <div className="max-w-lg mx-auto pt-8 sm:pt-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
            >
              <Sparkles className="h-16 w-16 text-yellow-300 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Rejoins ta campagne! 🚀
            </h1>
            <p className="text-white/80 text-lg">
              Trouve ton école et c'est parti!
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cherche ton école..."
                className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-0 shadow-xl focus:ring-4 focus:ring-white/30"
                autoFocus
              />
            </div>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 bg-red-100 text-red-700 rounded-xl text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Campaigns list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 max-h-[55vh] overflow-y-auto rounded-2xl"
          >
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
                <p className="text-white/70 mt-2">Chargement...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 bg-white/10 rounded-2xl">
                <p className="text-white/80 text-lg">
                  {searchTerm ? 'Aucune école trouvée 🔍' : 'Aucune campagne disponible'}
                </p>
              </div>
            ) : (
              campaigns.map((campaign, index) => (
                <motion.button
                  key={campaign._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectCampaign(campaign)}
                  className="w-full p-4 bg-white/95 hover:bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-left group hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg truncate">
                        {campaign.school?.name || 'École'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </span>
                      </div>
                      {campaign.groups?.enabled && campaign.groups?.list?.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-purple-600 font-medium">
                          <Users className="h-3.5 w-3.5" />
                          <span>{campaign.groups.list.length} groupes</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </motion.div>

          {/* Skip link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/60 hover:text-white/90 text-sm underline underline-offset-4 transition-colors"
            >
              Je ferai ça plus tard →
            </button>
          </motion.div>
        </div>
      </div>
    </>
  );
}
