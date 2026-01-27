import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Building2, Search, Users, Package, TrendingUp, ChevronRight,
  Star, MapPin, Edit, CheckCircle, Briefcase, Plus, Bell, Filter
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const INDUSTRIES = [
  "Beauté", "Mode", "Tech", "Food", "Sport", "Lifestyle",
  "Finance", "Immobilier", "Santé", "E-commerce", "Autre"
];

const BusinessDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [creators, setCreators] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [editForm, setEditForm] = useState({
    company_name: "", description: "", business_type: "",
    city: "", industry: "", website: "",
  });

  const [projectForm, setProjectForm] = useState({
    title: "", description: "", content_type: "UGC",
    budget: "", target_creators: 1, incubator_only: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, statsRes, creatorsRes, packsRes] = await Promise.all([
        fetch(`${API_URL}/api/business/me/profile`, { credentials: "include" }),
        fetch(`${API_URL}/api/stats/business`, { credentials: "include" }),
        fetch(`${API_URL}/api/creators?limit=6`, { credentials: "include" }),
        fetch(`${API_URL}/api/packs`)
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setEditForm({
          company_name: data.company_name || "",
          description: data.description || "",
          business_type: data.business_type || "",
          city: data.city || "",
          industry: data.industry || "",
          website: data.website || "",
        });
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (creatorsRes.ok) setCreators(await creatorsRes.json());
      if (packsRes.ok) setPacks(await packsRes.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await fetch(`${API_URL}/api/business/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });
      toast.success("Profil mis à jour !");
      setEditSheetOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleSelectPack = async (packId) => {
    try {
      await fetch(`${API_URL}/api/business/select-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pack_id: packId }),
      });
      toast.success("Pack sélectionné !");
      setPackDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCreateProject = async () => {
    if (!stats?.selected_pack) {
      toast.error("Sélectionnez un pack d'abord");
      setPackDialogOpen(true);
      return;
    }

    if (!projectForm.title || !projectForm.description) {
      toast.error("Titre et description requis");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...projectForm,
          pack_id: stats.selected_pack,
          budget: parseInt(projectForm.budget) || 0,
        }),
      });

      if (response.ok) {
        toast.success("Projet créé !");
        setProjectDialogOpen(false);
        setProjectForm({
          title: "", description: "", content_type: "UGC",
          budget: "", target_creators: 1, incubator_only: false,
        });
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Erreur");
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const completionScore = profile?.completion_score || 0;

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType="business" onLogout={handleLogout} />

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher des créateurs..."
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/creators?q=${searchQuery}`)}
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-gray-500" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{profile?.company_name || user?.name}</p>
                  <p className="text-xs text-gray-500">Entreprise</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          {/* Welcome */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-2xl font-bold text-gray-900">
                Bienvenue {profile?.company_name || user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-gray-500">Trouvez les meilleurs créateurs pour vos projets</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/creators")}
                className="border-gray-200"
              >
                <Users className="w-4 h-4 mr-2" />
                Find Creator
              </Button>
              <Button
                onClick={() => stats?.selected_pack ? setProjectDialogOpen(true) : setPackDialogOpen(true)}
                className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                data-testid="create-project-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                {stats?.selected_pack ? "Nouveau projet" : "Choisir un pack"}
              </Button>
            </div>
          </div>

          {/* Profile Completion */}
          <Card className="border-0 shadow-md mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-soft rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">Profil complété à {completionScore}%</p>
                    <p className="text-gray-500 text-sm">Complétez pour de meilleures recommandations</p>
                  </div>
                </div>
                <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="border-gray-200">
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="bg-white border-l-0 shadow-2xl w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="text-gray-900">Modifier mon profil</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 py-6">
                      <div className="space-y-2">
                        <Label>Nom de l'entreprise</Label>
                        <Input
                          value={editForm.company_name}
                          onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                          placeholder="Ma Société"
                          className="bg-gray-50 border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Décrivez votre activité..."
                          className="w-full h-24 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type d'activité</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "physical", label: "Local" },
                            { id: "online", label: "En ligne" },
                            { id: "both", label: "Les deux" }
                          ].map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setEditForm({ ...editForm, business_type: type.id })}
                              className={`p-3 rounded-lg border text-center transition-all ${
                                editForm.business_type === type.id
                                  ? "border-primary bg-primary-soft text-primary"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Ville</Label>
                        <Input
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          placeholder="Paris"
                          className="bg-gray-50 border-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secteur</Label>
                        <select
                          value={editForm.industry}
                          onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200"
                        >
                          <option value="">Sélectionnez</option>
                          {INDUSTRIES.map((ind) => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Site web</Label>
                        <Input
                          value={editForm.website}
                          onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                          placeholder="https://..."
                          className="bg-gray-50 border-gray-200"
                        />
                      </div>
                      <Button onClick={handleUpdateProfile} className="w-full bg-primary hover:bg-primary-hover">
                        Enregistrer
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 gradient-progress rounded-full transition-all duration-500"
                  style={{ width: `${completionScore}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <p className="text-3xl font-heading font-bold text-gray-900">{stats?.total_projects || 0}</p>
                <p className="text-gray-500 text-sm">Projets totaux</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <p className="text-3xl font-heading font-bold text-gray-900">{stats?.active_projects || 0}</p>
                <p className="text-gray-500 text-sm">En cours</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <p className="text-3xl font-heading font-bold text-gray-900">{stats?.completed_projects || 0}</p>
                <p className="text-gray-500 text-sm">Terminés</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {stats?.selected_pack ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <Package className="w-6 h-6 text-gray-400" />
                  )}
                  <p className="text-gray-900 font-medium">
                    {stats?.selected_pack ? "Pack actif" : "Aucun pack"}
                  </p>
                </div>
                <button
                  onClick={() => setPackDialogOpen(true)}
                  className="text-primary text-sm hover:underline mt-1"
                >
                  {stats?.selected_pack ? "Changer" : "Sélectionner"}
                </button>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Creators */}
              <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-gray-900">Créateurs recommandés</CardTitle>
                  <Link to="/creators" className="text-sm text-primary hover:underline flex items-center gap-1">
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {creators.slice(0, 4).map((creator) => (
                      <div
                        key={creator.profile_id}
                        onClick={() => navigate(`/creators/${creator.user_id}`)}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-primary/30 cursor-pointer transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                            {creator.picture ? (
                              <img src={creator.picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-900 font-medium truncate">{creator.name || "Créateur"}</p>
                              {creator.is_premium && (
                                <Badge className="bg-primary text-white text-xs">Premium</Badge>
                              )}
                            </div>
                            {creator.city && (
                              <p className="text-gray-500 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {creator.city}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-gray-600 text-sm">{creator.rating?.toFixed(1) || "0.0"}</span>
                            </div>
                          </div>
                        </div>
                        {creator.content_types?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {creator.content_types.slice(0, 2).map((type) => (
                              <Badge key={type} variant="outline" className="text-xs border-gray-200">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Packs */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Packs disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {packs.slice(0, 3).map((pack) => (
                    <div
                      key={pack.pack_id}
                      onClick={() => handleSelectPack(pack.pack_id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        stats?.selected_pack === pack.pack_id
                          ? "border-primary bg-primary-soft"
                          : "border-gray-200 hover:border-gray-300 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{pack.icon}</span>
                          <span className="text-gray-900 font-medium">{pack.name}</span>
                        </div>
                        <span className="text-primary font-semibold">{pack.price}€</span>
                      </div>
                      {stats?.selected_pack === pack.pack_id && (
                        <div className="flex items-center gap-1 mt-2 text-primary text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Sélectionné
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setPackDialogOpen(true)}
                    className="w-full border-gray-200"
                  >
                    Voir tous les packs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Pack Selection Dialog */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Choisir un pack</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 py-4">
            {packs.map((pack) => (
              <div
                key={pack.pack_id}
                onClick={() => handleSelectPack(pack.pack_id)}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  stats?.selected_pack === pack.pack_id
                    ? "border-primary bg-primary-soft"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{pack.icon}</span>
                  <span className="text-gray-900 font-semibold">{pack.name}</span>
                  {pack.popular && <Badge className="bg-primary text-xs">Populaire</Badge>}
                </div>
                <p className="text-gray-500 text-sm mb-3">{pack.description}</p>
                <p className="text-2xl font-heading font-bold text-primary">{pack.price}€</p>
                <p className="text-gray-400 text-xs mt-2">
                  {pack.creators_count} créateurs • {pack.videos_count} vidéos • {pack.delivery_days}j
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre du projet</Label>
              <Input
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                placeholder="Campagne UGC Été 2025"
                className="bg-gray-50 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Décrivez votre projet..."
                className="w-full h-24 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type de contenu</Label>
                <select
                  value={projectForm.content_type}
                  onChange={(e) => setProjectForm({ ...projectForm, content_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200"
                >
                  {["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview"].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Budget (€)</Label>
                <Input
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                  placeholder="1500"
                  className="bg-gray-50 border-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-gray-900 font-medium">Réservé aux membres Incubateur</p>
                <p className="text-gray-500 text-sm">Accès aux créateurs Premium uniquement</p>
              </div>
              <input
                type="checkbox"
                checked={projectForm.incubator_only}
                onChange={(e) => setProjectForm({ ...projectForm, incubator_only: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
            <Button onClick={handleCreateProject} className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20">
              Créer le projet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDashboard;
