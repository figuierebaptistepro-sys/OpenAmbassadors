import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Users, Clock, Euro, ChevronRight, 
  Play, Target, Eye, Award, Search, Briefcase, Pause, CheckCircle
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BusinessPoolsPage = ({ user }) => {
  const navigate = useNavigate();
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pools`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setPools(data);
      }
    } catch (error) {
      console.error("Error fetching pools:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return days;
  };

  const filteredPools = pools.filter(pool => {
    const matchesSearch = pool.brand?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pool.brief?.key_message?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "active") {
      return matchesSearch && pool.status === "active";
    } else if (activeTab === "paused") {
      return matchesSearch && pool.status === "paused";
    } else if (activeTab === "completed") {
      return matchesSearch && (pool.status === "completed" || pool.status === "cancelled");
    }
    return matchesSearch;
  });

  const activePools = pools.filter(p => p.status === "active");
  const pausedPools = pools.filter(p => p.status === "paused");
  const completedPools = pools.filter(p => p.status === "completed" || p.status === "cancelled");

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Pool</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Gérez vos campagnes d'influence</p>
          </div>
          <Button 
            onClick={() => navigate("/business/pools/new")}
            className="bg-primary hover:bg-primary-hover"
            data-testid="create-pool-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer une pool
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-600">{activePools.length}</div>
              <div className="text-xs text-gray-500">Actives</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">{pausedPools.length}</div>
              <div className="text-xs text-gray-500">En pause</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-gray-600">{completedPools.length}</div>
              <div className="text-xs text-gray-500">Terminées</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("active")}
              className={activeTab === "active" ? "bg-primary hover:bg-primary-hover" : "border-gray-200"}
            >
              Actives ({activePools.length})
            </Button>
            <Button
              variant={activeTab === "paused" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("paused")}
              className={activeTab === "paused" ? "bg-primary hover:bg-primary-hover" : "border-gray-200"}
            >
              En pause ({pausedPools.length})
            </Button>
            <Button
              variant={activeTab === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("completed")}
              className={activeTab === "completed" ? "bg-primary hover:bg-primary-hover" : "border-gray-200"}
            >
              Terminées ({completedPools.length})
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
        {pools.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-heading font-bold text-gray-900 mb-2">Aucune pool créée</h3>
            <p className="text-gray-500 text-sm mb-4">Créez votre première campagne d'influence pool</p>
            <Button onClick={() => navigate("/business/pools/new")} className="bg-primary hover:bg-primary-hover">
              <Plus className="w-4 h-4 mr-2" />
              Créer une pool
            </Button>
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-heading font-bold text-gray-900 mb-2">Aucun résultat</h3>
            <p className="text-gray-500 text-sm">Aucune pool ne correspond à votre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPools.map((pool, index) => (
              <motion.div
                key={pool.pool_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="h-full"
              >
                <Card 
                  className="border-0 shadow-sm hover:shadow-md transition-all h-full overflow-hidden flex flex-col cursor-pointer"
                  onClick={() => navigate(`/business/pools/${pool.pool_id}`)}
                  data-testid={`pool-card-${pool.pool_id}`}
                >
                  {/* Pool Banner */}
                  <div className="relative h-32 bg-gray-100 flex-shrink-0">
                    {pool.brief?.banner_url ? (
                      <img 
                        src={pool.brief.banner_url} 
                        alt={pool.brand?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <Briefcase className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    <Badge className={`absolute top-2 right-2 text-xs ${
                      pool.status === "active" ? "bg-green-500 text-white" :
                      pool.status === "paused" ? "bg-yellow-500 text-white" :
                      "bg-gray-500 text-white"
                    }`}>
                      {pool.status === "active" ? "Active" :
                       pool.status === "paused" ? "En pause" : "Terminée"}
                    </Badge>
                    <Badge className="absolute top-2 left-2 bg-white/90 text-gray-700 text-xs border-0">
                      {pool.mode === "CPM" ? `CPM ${pool.cpm_rate}€` : "Pool"}
                    </Badge>
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1">
                    {/* Brand Info */}
                    <div className="mb-3">
                      <h3 className="font-heading font-semibold text-gray-900 text-sm truncate">
                        {pool.brand?.name}
                      </h3>
                      <p className="text-gray-500 text-xs line-clamp-1">
                        {pool.brief?.key_message}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-center">
                        <div className="text-sm font-semibold text-gray-900">{pool.total_participants || 0}</div>
                        <div className="text-[10px] text-gray-500">Participants</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg text-center">
                        <div className="text-sm font-semibold text-gray-900">{pool.total_submissions || 0}</div>
                        <div className="text-[10px] text-gray-500">Vidéos</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg text-center">
                        <div className="text-sm font-semibold text-gray-900">{(pool.total_views || 0).toLocaleString()}</div>
                        <div className="text-[10px] text-gray-500">Vues</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg text-center">
                        <div className="text-sm font-semibold text-gray-900">{pool.budget_remaining || 0}€</div>
                        <div className="text-[10px] text-gray-500">Budget</div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(pool.end_date)}j restants
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BusinessPoolsPage;
