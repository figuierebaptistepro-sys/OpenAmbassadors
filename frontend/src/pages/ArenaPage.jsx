import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, Users, Clock, Euro, Zap, ChevronRight, 
  Play, TrendingUp, Target, Sparkles, Eye, Award,
  Instagram, Youtube, Filter, Search
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
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
    case "TIKTOK":
      return <TikTokIcon className="w-4 h-4" />;
    case "INSTAGRAM_REELS":
      return <Instagram className="w-4 h-4" />;
    case "YOUTUBE_SHORTS":
      return <Youtube className="w-4 h-4" />;
    default:
      return <Play className="w-4 h-4" />;
  }
};

const getPlatformName = (platform) => {
  switch (platform) {
    case "TIKTOK": return "TikTok";
    case "INSTAGRAM_REELS": return "Instagram Reels";
    case "YOUTUBE_SHORTS": return "YouTube Shorts";
    default: return platform;
  }
};

const ArenaPage = ({ user }) => {
  const navigate = useNavigate();
  const [pools, setPools] = useState([]);
  const [myParticipations, setMyParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover"); // discover | my-pools

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [poolsRes, participationsRes] = await Promise.all([
        fetch(`${API_URL}/api/pools/active`, { credentials: "include" }),
        fetch(`${API_URL}/api/pools/my/participations`, { credentials: "include" })
      ]);

      if (poolsRes.ok) {
        const data = await poolsRes.json();
        setPools(data);
      }
      if (participationsRes.ok) {
        const data = await participationsRes.json();
        setMyParticipations(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPool = async (poolId) => {
    try {
      const response = await fetch(`${API_URL}/api/pools/${poolId}/join`, {
        method: "POST",
        credentials: "include"
      });

      if (response.ok) {
        toast.success("🎉 Tu as rejoint le pool ! Publie du contenu pour gagner.");
        fetchData();
        navigate(`/arena/${poolId}`);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur lors de l'inscription");
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

  const isJoined = (poolId) => {
    return myParticipations.some(p => p.pool_id === poolId);
  };

  const filteredPools = pools.filter(pool => 
    pool.brand?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.brief?.key_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Arena</h1>
              <p className="text-gray-400 text-sm">Participe aux campagnes et gagne de l'argent</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{pools.length}</div>
              <div className="text-xs text-gray-400">Pools actifs</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{myParticipations.length}</div>
              <div className="text-xs text-gray-400">Mes participations</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">
                {myParticipations.reduce((sum, p) => sum + (p.estimated_earnings || 0), 0).toFixed(0)}€
              </div>
              <div className="text-xs text-gray-400">Gains estimés</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 bg-white border-b sticky top-14 lg:top-0 z-30">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "discover" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("discover")}
              className={activeTab === "discover" ? "bg-primary" : ""}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Découvrir
            </Button>
            <Button
              variant={activeTab === "my-pools" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("my-pools")}
              className={activeTab === "my-pools" ? "bg-primary" : ""}
            >
              <Target className="w-4 h-4 mr-2" />
              Mes Pools ({myParticipations.length})
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64 bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "discover" ? (
          <>
            {filteredPools.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun pool disponible</h3>
                <p className="text-gray-500">Reviens bientôt pour découvrir de nouvelles campagnes !</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPools.map((pool) => (
                  <motion.div
                    key={pool.pool_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                          onClick={() => navigate(`/arena/${pool.pool_id}`)}>
                      {/* Header gradient */}
                      <div className="h-24 bg-gradient-to-r from-primary via-pink-500 to-orange-500 relative">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="font-bold text-white text-lg truncate">{pool.brand?.name}</h3>
                          <p className="text-white/80 text-xs">{pool.brand?.industry}</p>
                        </div>
                        {isJoined(pool.pool_id) && (
                          <Badge className="absolute top-3 right-3 bg-green-500 text-white">
                            Inscrit
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-4">
                        {/* Key message */}
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                          {pool.brief?.key_message}
                        </p>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <Euro className="w-4 h-4 text-primary mx-auto mb-1" />
                            <div className="text-xs font-semibold">{pool.budget_remaining}€</div>
                            <div className="text-[10px] text-gray-500">Restant</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <Users className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                            <div className="text-xs font-semibold">{pool.total_participants}</div>
                            <div className="text-[10px] text-gray-500">Participants</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <Clock className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                            <div className="text-xs font-semibold">{getTimeRemaining(pool.end_date)}j</div>
                            <div className="text-[10px] text-gray-500">Restants</div>
                          </div>
                        </div>

                        {/* Platforms */}
                        <div className="flex items-center gap-2 mb-4">
                          {pool.platforms?.map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs gap-1">
                              {getPlatformIcon(platform)}
                              {getPlatformName(platform)}
                            </Badge>
                          ))}
                        </div>

                        {/* Max gain */}
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-gray-700">Gain max</span>
                          </div>
                          <span className="font-bold text-green-600">{pool.max_payout_per_creator}€</span>
                        </div>

                        {/* CTA */}
                        <Button 
                          className="w-full mt-4 bg-primary hover:bg-primary-hover group-hover:shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isJoined(pool.pool_id)) {
                              navigate(`/arena/${pool.pool_id}`);
                            } else {
                              handleJoinPool(pool.pool_id);
                            }
                          }}
                        >
                          {isJoined(pool.pool_id) ? (
                            <>Voir le pool <ChevronRight className="w-4 h-4 ml-2" /></>
                          ) : (
                            <>Participer <Zap className="w-4 h-4 ml-2" /></>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* My Pools Tab */
          <>
            {myParticipations.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune participation</h3>
                <p className="text-gray-500 mb-4">Tu n'as pas encore rejoint de pool</p>
                <Button onClick={() => setActiveTab("discover")}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Découvrir les pools
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myParticipations.map((participation) => (
                  <Card key={participation.participation_id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Pool info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {participation.pool?.brand?.name || "Pool"}
                            </h3>
                            <Badge className={
                              participation.pool?.status === "active" 
                                ? "bg-green-100 text-green-700" 
                                : "bg-gray-100 text-gray-700"
                            }>
                              {participation.pool?.status === "active" ? "Actif" : "Terminé"}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-500 mb-4">
                            {participation.pool?.brief?.key_message}
                          </p>

                          {/* Stats */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-gray-900">{participation.total_submissions}</div>
                              <div className="text-xs text-gray-500">Publications</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-gray-900">{participation.total_views}</div>
                              <div className="text-xs text-gray-500">Vues</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-600">{participation.estimated_earnings?.toFixed(2) || "0.00"}€</div>
                              <div className="text-xs text-gray-500">Gains estimés</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-lg font-bold text-gray-900">
                                {participation.pool?.end_date ? getTimeRemaining(participation.pool.end_date) : "-"}j
                              </div>
                              <div className="text-xs text-gray-500">Restants</div>
                            </div>
                          </div>
                        </div>

                        {/* Action */}
                        <Button 
                          variant="outline"
                          onClick={() => navigate(`/arena/${participation.pool_id}`)}
                        >
                          Voir <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ArenaPage;
