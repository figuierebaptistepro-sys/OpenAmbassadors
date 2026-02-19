import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, Users, Clock, Euro, ChevronRight, 
  Play, Target, Eye, Award, Search, Filter, Briefcase
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Platform icons
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const YoutubeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const getPlatformIcon = (platform) => {
  switch (platform) {
    case "TIKTOK":
      return <TikTokIcon className="w-3.5 h-3.5" />;
    case "INSTAGRAM_REELS":
      return <InstagramIcon className="w-3.5 h-3.5" />;
    case "YOUTUBE_SHORTS":
      return <YoutubeIcon className="w-3.5 h-3.5" />;
    default:
      return <Play className="w-3.5 h-3.5" />;
  }
};

const getPlatformName = (platform) => {
  switch (platform) {
    case "TIKTOK": return "TikTok";
    case "INSTAGRAM_REELS": return "Reels";
    case "YOUTUBE_SHORTS": return "Shorts";
    default: return platform;
  }
};

const ArenaPage = ({ user }) => {
  const navigate = useNavigate();
  const [pools, setPools] = useState([]);
  const [myParticipations, setMyParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");

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
        toast.success("Tu as rejoint le pool !");
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
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Arena</h1>
        <p className="text-gray-500 text-xs sm:text-sm">{filteredPools.length} pools disponibles</p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{pools.length}</div>
              <div className="text-xs text-gray-500">Pools actifs</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{myParticipations.length}</div>
              <div className="text-xs text-gray-500">Participations</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-primary">
                {myParticipations.reduce((sum, p) => sum + (p.estimated_earnings || 0), 0).toFixed(0)}€
              </div>
              <div className="text-xs text-gray-500">Gains estimés</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "discover" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("discover")}
              className={activeTab === "discover" ? "bg-primary hover:bg-primary-hover" : "border-gray-200"}
            >
              Découvrir
            </Button>
            <Button
              variant={activeTab === "my-pools" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("my-pools")}
              className={activeTab === "my-pools" ? "bg-primary hover:bg-primary-hover" : "border-gray-200"}
            >
              Mes Pools ({myParticipations.length})
            </Button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Content */}
        {activeTab === "discover" ? (
          <>
            {filteredPools.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-heading font-bold text-gray-900 mb-2">Aucun pool disponible</h3>
                <p className="text-gray-500 text-sm">Reviens bientôt pour découvrir de nouvelles campagnes</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPools.map((pool, index) => (
                  <motion.div
                    key={pool.pool_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all h-full overflow-hidden">
                      {/* Pool Banner */}
                      <div className="relative h-32 bg-gray-100">
                        {pool.brief?.banner_url ? (
                          <img 
                            src={pool.brief.banner_url} 
                            alt={pool.brand?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : pool.brand?.logo_url ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                            <img 
                              src={pool.brand.logo_url} 
                              alt={pool.brand?.name}
                              className="max-h-20 max-w-[80%] object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-16 h-16 rounded-xl bg-white shadow-sm flex items-center justify-center">
                              <span className="text-2xl font-bold text-gray-400">
                                {(pool.brand?.name || "P")[0].toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        {isJoined(pool.pool_id) && (
                          <Badge className="absolute top-2 right-2 bg-green-500 text-white text-xs">
                            Inscrit
                          </Badge>
                        )}
                        <Badge className="absolute top-2 left-2 bg-white/90 text-gray-700 text-xs border-0">
                          {pool.mode === "CPM" ? `CPM ${pool.cpm_rate}€` : "Pool"}
                        </Badge>
                      </div>

                      <CardContent className="p-4">
                        {/* Brand Info */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {pool.brand?.logo_url ? (
                              <img 
                                src={pool.brand.logo_url} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <span className="text-xs font-bold text-gray-400">
                                {(pool.brand?.name || "P")[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-semibold text-gray-900 text-sm truncate">
                              {pool.brand?.name}
                            </h3>
                            <span className="text-gray-500 text-xs">{pool.brand?.industry}</span>
                          </div>
                        </div>

                        {/* Key Message */}
                        <p className="text-gray-500 text-xs line-clamp-2 mb-3">
                          {pool.brief?.key_message}
                        </p>

                        {/* Stats */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Euro className="w-3 h-3" />
                              {pool.budget_remaining}€
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {pool.total_participants} participant{pool.total_participants !== 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getTimeRemaining(pool.end_date)}j
                            </span>
                          </div>
                          
                          {/* Platforms */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {pool.platforms?.map((platform) => (
                              <Badge key={platform} variant="outline" className="text-xs border-gray-200 gap-1">
                                {getPlatformIcon(platform)}
                                {getPlatformName(platform)}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Max Gain */}
                        {pool.has_max_payout && pool.max_payout_per_creator && (
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg mb-3">
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Award className="w-3 h-3 text-green-600" />
                              Gain max
                            </span>
                            <span className="text-sm font-semibold text-green-600">
                              {pool.max_payout_per_creator}€
                            </span>
                          </div>
                        )}

                        <Button
                          onClick={() => {
                            if (isJoined(pool.pool_id)) {
                              navigate(`/arena/${pool.pool_id}`);
                            } else {
                              handleJoinPool(pool.pool_id);
                            }
                          }}
                          size="sm"
                          className="w-full bg-primary hover:bg-primary-hover text-xs"
                        >
                          {isJoined(pool.pool_id) ? (
                            <>Voir le pool <ChevronRight className="w-3 h-3 ml-1" /></>
                          ) : (
                            "Participer"
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
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-heading font-bold text-gray-900 mb-2">Aucune participation</h3>
                <p className="text-gray-500 text-sm mb-4">Tu n'as pas encore rejoint de pool</p>
                <Button onClick={() => setActiveTab("discover")} size="sm" className="bg-primary hover:bg-primary-hover">
                  Découvrir les pools
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myParticipations.map((participation) => (
                  <Card key={participation.participation_id} className="border-0 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Logo */}
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {participation.pool?.brand?.logo_url ? (
                            <img 
                              src={participation.pool.brand.logo_url} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span className="text-lg font-bold text-gray-400">
                              {(participation.pool?.brand?.name || "P")[0].toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-heading font-semibold text-gray-900 text-sm truncate">
                              {participation.pool?.brand?.name || "Pool"}
                            </h3>
                            <Badge className={`text-xs ${
                              participation.pool?.status === "active" 
                                ? "bg-green-100 text-green-700" 
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {participation.pool?.status === "active" ? "Actif" : "Terminé"}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-500 text-xs line-clamp-1 mb-3">
                            {participation.pool?.brief?.key_message}
                          </p>

                          {/* Stats */}
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-sm font-semibold text-gray-900">{participation.total_submissions}</div>
                              <div className="text-[10px] text-gray-500">Posts</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-sm font-semibold text-gray-900">{participation.total_views}</div>
                              <div className="text-[10px] text-gray-500">Vues</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                              <div className="text-sm font-semibold text-green-600">{participation.estimated_earnings?.toFixed(0) || "0"}€</div>
                              <div className="text-[10px] text-gray-500">Gains</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <div className="text-sm font-semibold text-gray-900">
                                {participation.pool?.end_date ? getTimeRemaining(participation.pool.end_date) : "-"}j
                              </div>
                              <div className="text-[10px] text-gray-500">Restants</div>
                            </div>
                          </div>
                        </div>

                        {/* Action */}
                        <Button 
                          variant="outline"
                          size="sm"
                          className="border-gray-200"
                          onClick={() => navigate(`/arena/${participation.pool_id}`)}
                        >
                          Voir <ChevronRight className="w-3 h-3 ml-1" />
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
