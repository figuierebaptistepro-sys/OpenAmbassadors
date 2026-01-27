import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, LogOut, User, MessageSquare, Users, TrendingUp,
  Search, Filter, Package, Plus, Eye, DollarSign, Clock,
  Building2, ChevronRight, Star, MapPin
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BusinessDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [creators, setCreators] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, profileRes, creatorsRes, packsRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/business`, { credentials: "include" }),
        fetch(`${API_URL}/api/business/me/profile`, { credentials: "include" }),
        fetch(`${API_URL}/api/creators?limit=6`, { credentials: "include" }),
        fetch(`${API_URL}/api/packs`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (profileRes.ok) setProfile(await profileRes.json());
      if (creatorsRes.ok) setCreators(await creatorsRes.json());
      if (packsRes.ok) setPacks(await packsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-heading font-bold text-xl text-slate-900">UGC Machine</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/messages" className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <MessageSquare className="w-5 h-5 text-slate-600" />
                {stats?.unread_messages > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.unread_messages}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <span className="hidden md:block font-medium text-slate-700">{user?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-500 hover:text-slate-700"
                data-testid="logout-btn"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">
              Bienvenue, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-slate-600">Trouvez les meilleurs créateurs pour votre marque</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/creators")}
              data-testid="browse-creators-btn"
            >
              <Users className="w-4 h-4 mr-2" />
              Parcourir les créateurs
            </Button>
            <Button
              onClick={() => navigate("/packs")}
              className="bg-primary hover:bg-primary-hover"
              data-testid="view-packs-btn"
            >
              <Package className="w-4 h-4 mr-2" />
              Voir les packs
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">
                    {stats?.total_campaigns || 0}
                  </p>
                  <p className="text-sm text-slate-500">Campagnes totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">
                    {stats?.active_campaigns || 0}
                  </p>
                  <p className="text-sm text-slate-500">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">
                    {stats?.completed_campaigns || 0}
                  </p>
                  <p className="text-sm text-slate-500">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">
                    {stats?.total_spent?.toLocaleString() || 0}€
                  </p>
                  <p className="text-sm text-slate-500">Budget total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Recherche rapide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      placeholder="Rechercher par ville, type de contenu..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="search-input"
                    />
                  </div>
                  <Button
                    onClick={() => navigate(`/creators?q=${searchQuery}`)}
                    className="bg-primary hover:bg-primary-hover"
                    data-testid="search-btn"
                  >
                    Rechercher
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Featured Creators */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Créateurs recommandés</CardTitle>
                <Link
                  to="/creators"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Voir tout <ChevronRight className="w-4 h-4" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {creators.slice(0, 4).map((creator) => (
                    <Card
                      key={creator.profile_id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/creators/${creator.user_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {creator.picture ? (
                              <img src={creator.picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-heading font-semibold text-slate-900 truncate">
                              {creator.name || "Créateur"}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span>{creator.city || "Non renseigné"}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center text-yellow-500">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="ml-1 text-sm font-medium">
                                  {creator.rating?.toFixed(1) || "0.0"}
                                </span>
                              </div>
                              {creator.available && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  Disponible
                                </Badge>
                              )}
                            </div>
                            {creator.content_types?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {creator.content_types.slice(0, 2).map((type) => (
                                  <Badge key={type} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {creators.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500">Aucun créateur disponible pour le moment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Packs */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Nos Packs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {packs.map((pack) => (
                  <div
                    key={pack.pack_id}
                    className="p-4 border border-slate-200 rounded-xl hover:border-primary/50 hover:bg-slate-50 cursor-pointer transition-all"
                    onClick={() => navigate("/packs")}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{pack.icon}</span>
                        <div>
                          <h4 className="font-heading font-semibold text-slate-900">{pack.name}</h4>
                          <p className="text-xs text-slate-500">{pack.description}</p>
                        </div>
                      </div>
                      {pack.popular && (
                        <Badge className="bg-primary text-xs">Top</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-primary">
                        {pack.price_min.toLocaleString()}€ - {pack.price_max.toLocaleString()}€
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/packs")}
                  data-testid="all-packs-btn"
                >
                  Voir tous les packs
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/creators")}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher des créateurs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/messages")}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Mes messages
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BusinessDashboard;
