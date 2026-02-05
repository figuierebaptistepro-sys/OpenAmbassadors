import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Link2, Copy, Check, Users, TrendingUp, DollarSign, 
  MousePointer, UserPlus, Percent, Crown, Building2, 
  Palette, Clock, CheckCircle, XCircle, Gift,
  ChevronRight, ExternalLink, RefreshCw
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import AppLayout from "../components/AppLayout";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AffiliatePage = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [affiliateLink, setAffiliateLink] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // all, creators, businesses

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch affiliate link
      const linkRes = await fetch(`${API_URL}/api/affiliate/link`, {
        credentials: "include"
      });
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        setAffiliateLink(linkData);
      }

      // Fetch dashboard data
      const dashRes = await fetch(`${API_URL}/api/affiliate/dashboard`, {
        credentials: "include"
      });
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setDashboardData(dashData);
      }
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const copyLink = () => {
    if (affiliateLink?.full_url) {
      navigator.clipboard.writeText(affiliateLink.full_url);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      free: { bg: "bg-gray-100", text: "text-gray-600", label: "Gratuit" },
      trial: { bg: "bg-blue-100", text: "text-blue-600", label: "En essai" },
      paying: { bg: "bg-green-100", text: "text-green-600", label: "Abonné" },
      cancelled: { bg: "bg-red-100", text: "text-red-600", label: "Résilié" }
    };
    const style = styles[status] || styles.free;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const getUserTypeBadge = (userType) => {
    if (userType === "business") {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
          <Building2 className="w-3 h-3" />
          Entreprise
        </span>
      );
    }
    if (userType === "creator") {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-600">
          <Palette className="w-3 h-3" />
          Créateur
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <Clock className="w-3 h-3" />
        En attente
      </span>
    );
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"
    }).format(amount);
  };

  // Get filtered users based on active tab
  const getFilteredUsers = () => {
    if (!dashboardData) return [];
    switch (activeTab) {
      case "creators":
        return dashboardData.creators_invited || [];
      case "businesses":
        return dashboardData.businesses_invited || [];
      default:
        return dashboardData.referred_users || [];
    }
  };

  if (loading) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const performance = dashboardData?.performance || {};
  const revenue = dashboardData?.revenue || {};
  const summary = dashboardData?.summary || {};
  const filteredUsers = getFilteredUsers();

  return (
    <AppLayout user={user}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="w-7 h-7 text-pink-500" />
              Programme d'Affiliation
            </h1>
            <p className="text-gray-500 mt-1">
              Invitez des utilisateurs et gagnez des commissions
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Affiliate Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl p-6 mb-8 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Votre lien d'affiliation</h2>
              <p className="text-white/80 text-sm">Partagez ce lien pour inviter des utilisateurs</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-4 py-3 font-mono text-sm truncate">
              {affiliateLink?.full_url || "Chargement..."}
            </div>
            <Button
              onClick={copyLink}
              className="bg-white text-pink-600 hover:bg-white/90 flex items-center gap-2 shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copié !" : "Copier"}
            </Button>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-white/70 text-sm">
            <span className="bg-white/20 px-2 py-1 rounded font-mono">
              Code: {affiliateLink?.code || "..."}
            </span>
            <span>•</span>
            <span>Commission: {revenue.commission_rate || 20}% récurrent</span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Performance Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MousePointer className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-gray-500 text-sm">Clics</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{performance.total_clicks || 0}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-gray-500 text-sm">Inscriptions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{performance.total_signups || 0}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Percent className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-gray-500 text-sm">Conversion</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{performance.conversion_rate || 0}%</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-gray-500 text-sm">Abonnés actifs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{performance.active_subscribers || 0}</p>
          </motion.div>
        </div>

        {/* Revenue Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Revenus
          </h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">En attente</p>
              <p className="text-xl font-bold text-amber-600">
                {formatCurrency(revenue.pending_earnings || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Validées</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(revenue.validated_earnings || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total cumulé</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(revenue.total_earnings || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Estimation mensuelle</p>
              <p className="text-xl font-bold text-pink-600">
                {formatCurrency(revenue.monthly_estimate || 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>MRR généré: <strong className="text-gray-900">{formatCurrency(performance.mrr_generated || 0)}</strong></span>
            </div>
          </div>
        </motion.div>

        {/* Referred Users Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-500" />
                Utilisateurs invités
              </h2>
              
              {/* Tab Filters */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "all"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Tous ({summary.total_users || 0})
                </button>
                <button
                  onClick={() => setActiveTab("creators")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    activeTab === "creators"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  Créateurs ({summary.total_creators || 0})
                </button>
                <button
                  onClick={() => setActiveTab("businesses")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    activeTab === "businesses"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Entreprises ({summary.total_businesses || 0})
                </button>
              </div>
            </div>
          </div>

          {/* Users List */}
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Aucun utilisateur invité</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Partagez votre lien d'affiliation pour commencer à inviter des utilisateurs et gagner des commissions.
              </p>
              <Button
                onClick={copyLink}
                className="mt-4 bg-gradient-to-r from-pink-500 to-orange-500"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copier mon lien
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((referredUser, index) => (
                <motion.div
                  key={referredUser.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center overflow-hidden">
                        {referredUser.picture ? (
                          <img
                            src={referredUser.picture}
                            alt={referredUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-pink-600">
                            {(referredUser.name || referredUser.email)?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      
                      {/* User Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {referredUser.name || "Utilisateur"}
                          </h3>
                          {getUserTypeBadge(referredUser.user_type)}
                        </div>
                        <p className="text-sm text-gray-500">{referredUser.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Inscrit le {formatDate(referredUser.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status & Revenue */}
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-2">
                        {getStatusBadge(referredUser.status)}
                      </div>
                      <p className="text-sm text-gray-500">{referredUser.plan || "—"}</p>
                      {referredUser.mrr_generated > 0 && (
                        <p className="text-sm font-medium text-green-600 mt-1">
                          +{formatCurrency(referredUser.mrr_generated)}/mois
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100"
        >
          <h3 className="font-semibold text-blue-900 mb-3">💡 Comment ça marche ?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <span>Partagez votre lien d'affiliation avec votre réseau</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <span>Les utilisateurs qui s'inscrivent via votre lien apparaissent dans votre tableau de bord</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <span>Quand ils passent à un abonnement payant, vous gagnez <strong>{revenue.commission_rate || 20}% de commission</strong> chaque mois</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <span>Les commissions sont versées mensuellement après validation</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default AffiliatePage;
