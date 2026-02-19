import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, Users, Clock, Euro, ChevronLeft, Play, TrendingUp, 
  Eye, Award, Instagram, Youtube, ExternalLink, Pause, CheckCircle,
  BarChart3, Download, RefreshCw
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// TikTok icon component
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const getPlatformIcon = (platform) => {
  switch (platform) {
    case "TIKTOK": return <TikTokIcon className="w-4 h-4" />;
    case "INSTAGRAM_REELS": return <Instagram className="w-4 h-4" />;
    case "YOUTUBE_SHORTS": return <Youtube className="w-4 h-4" />;
    default: return <Play className="w-4 h-4" />;
  }
};

const getPlatformName = (platform) => {
  switch (platform) {
    case "TIKTOK": return "TikTok";
    case "INSTAGRAM_REELS": return "Instagram";
    case "YOUTUBE_SHORTS": return "YouTube";
    default: return platform;
  }
};

const BusinessPoolDetailPage = ({ user }) => {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const [pool, setPool] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview | submissions | payouts

  useEffect(() => {
    fetchData();
  }, [poolId]);

  const fetchData = async () => {
    try {
      const [poolRes, submissionsRes, payoutsRes] = await Promise.all([
        fetch(`${API_URL}/api/pools/${poolId}`, { credentials: "include" }),
        fetch(`${API_URL}/api/pools/${poolId}/submissions`, { credentials: "include" }),
        fetch(`${API_URL}/api/pools/${poolId}/payouts`, { credentials: "include" })
      ]);

      if (poolRes.ok) {
        const data = await poolRes.json();
        setPool(data);
      }
      if (submissionsRes.ok) {
        const data = await submissionsRes.json();
        setSubmissions(data);
      }
      if (payoutsRes.ok) {
        const data = await payoutsRes.json();
        setPayouts(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/pools/${poolId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success("Statut mis à jour");
        fetchData();
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  };

  const getTimeRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return days;
  };

  if (loading) {
    return (
      <AppLayout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  if (!pool) {
    return (
      <AppLayout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Pool non trouvé</h2>
            <Button className="mt-4" onClick={() => navigate("/business")}>
              Retour au dashboard
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const ui = pool.ui_summary || {};

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <button 
            onClick={() => navigate("/business")}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour au dashboard
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className={
                  pool.status === "active" ? "bg-green-500" :
                  pool.status === "paused" ? "bg-yellow-500" :
                  pool.status === "completed" ? "bg-blue-500" :
                  "bg-gray-500"
                }>
                  {pool.status === "active" ? "Actif" :
                   pool.status === "paused" ? "En pause" :
                   pool.status === "completed" ? "Terminé" : pool.status}
                </Badge>
                <Badge variant="outline" className="text-white border-white/30">
                  {pool.mode}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{pool.brand?.name}</h1>
              <p className="text-gray-400 mt-1">{pool.brief?.key_message}</p>
            </div>

            <div className="flex gap-2">
              {pool.status === "active" && (
                <Button 
                  variant="outline" 
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => handleStatusChange("paused")}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Mettre en pause
                </Button>
              )}
              {pool.status === "paused" && (
                <Button 
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => handleStatusChange("active")}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Reprendre
                </Button>
              )}
              <Button 
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={fetchData}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Euro className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <div className="text-lg font-bold">{pool.budget_total}€</div>
              <div className="text-xs text-gray-400">Budget total</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-lg font-bold">{pool.budget_spent || 0}€</div>
              <div className="text-xs text-gray-400">Dépensé</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Users className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <div className="text-lg font-bold">{pool.total_participants}</div>
              <div className="text-xs text-gray-400">Participants</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Play className="w-5 h-5 text-pink-400 mx-auto mb-2" />
              <div className="text-lg font-bold">{pool.total_submissions}</div>
              <div className="text-xs text-gray-400">Publications</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Eye className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <div className="text-lg font-bold">{(pool.total_views || 0).toLocaleString()}</div>
              <div className="text-xs text-gray-400">Vues totales</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <div className="text-lg font-bold">{getTimeRemaining(pool.end_date)}j</div>
              <div className="text-xs text-gray-400">Restants</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 bg-white border-b sticky top-14 lg:top-0 z-30">
        <div className="flex gap-2">
          {["overview", "submissions", "payouts"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "bg-primary" : ""}
            >
              {tab === "overview" && "Vue d'ensemble"}
              {tab === "submissions" && `Publications (${submissions.length})`}
              {tab === "payouts" && "Paiements"}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Brief summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Brief de la campagne</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-gray-700">{pool.brief?.offer_description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Call to Action</p>
                    <p className="text-gray-700 font-medium">{pool.brief?.cta}</p>
                  </div>
                  {pool.brief?.landing_url && (
                    <a 
                      href={pool.brief.landing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Page de destination
                    </a>
                  )}
                </CardContent>
              </Card>

              {/* Top performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top Créateurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payouts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucun participant pour le moment</p>
                  ) : (
                    <div className="space-y-3">
                      {payouts.slice(0, 5).map((p, i) => (
                        <div key={p.creator_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            i === 0 ? "bg-yellow-100 text-yellow-600" :
                            i === 1 ? "bg-gray-200 text-gray-600" :
                            i === 2 ? "bg-orange-100 text-orange-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{p.creator_name}</p>
                            <p className="text-sm text-gray-500">{p.total_submissions} publications</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{p.total_views.toLocaleString()} vues</p>
                            <p className="text-sm text-green-600">{p.estimated_payout}€</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Campaign info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Détails</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mode</span>
                    <span className="font-medium">{pool.mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Durée</span>
                    <span className="font-medium">{pool.duration_days} jours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gain max/créateur</span>
                    <span className="font-medium">{pool.max_payout_per_creator}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pays</span>
                    <span className="font-medium">{pool.country}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-gray-500 text-sm mb-2">Plateformes</p>
                    <div className="flex flex-wrap gap-2">
                      {pool.platforms?.map((platform) => (
                        <Badge key={platform} variant="outline" className="gap-1">
                          {getPlatformIcon(platform)}
                          {getPlatformName(platform)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exigences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pool.brief?.mandatory_hashtags?.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Hashtags</p>
                      <div className="flex flex-wrap gap-1">
                        {pool.brief.mandatory_hashtags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {pool.brief?.mandatory_mentions?.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Mentions</p>
                      <div className="flex flex-wrap gap-1">
                        {pool.brief.mandatory_mentions.map((mention, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{mention}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <div className="text-center py-16">
                <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune publication</h3>
                <p className="text-gray-500">Les créateurs n'ont pas encore soumis de contenu</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {submissions.map((sub) => (
                  <Card key={sub.submission_id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(sub.platform)}
                          <span className="font-medium">{getPlatformName(sub.platform)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(sub.submitted_at).toLocaleDateString("fr-FR")}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{sub.creator_name}</p>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold">{sub.views || 0}</span>
                          <span className="text-sm text-gray-500">vues</span>
                        </div>
                        <a 
                          href={sub.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          Voir <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Paiements estimés</h3>
              <p className="text-sm text-gray-500">
                Total: {payouts.reduce((sum, p) => sum + p.estimated_payout, 0).toFixed(2)}€
              </p>
            </div>
            
            {payouts.length === 0 ? (
              <div className="text-center py-16">
                <Euro className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun paiement</h3>
                <p className="text-gray-500">Les paiements seront calculés une fois que les créateurs auront soumis du contenu</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Créateur</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Publications</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Vues</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Gains estimés</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payouts.map((p, i) => (
                      <tr key={p.creator_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0 ? "bg-yellow-100 text-yellow-600" :
                              i === 1 ? "bg-gray-200 text-gray-600" :
                              i === 2 ? "bg-orange-100 text-orange-600" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                              {i + 1}
                            </div>
                            <span className="font-medium">{p.creator_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{p.total_submissions}</td>
                        <td className="px-4 py-3 text-center">{p.total_views.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">{p.estimated_payout}€</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BusinessPoolDetailPage;
