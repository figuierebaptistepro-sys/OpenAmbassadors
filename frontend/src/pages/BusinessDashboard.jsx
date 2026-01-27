import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, LogOut, User, Building2, Search, Users, Package,
  TrendingUp, ChevronRight, Star, MapPin, Edit, CheckCircle,
  Briefcase, Filter, Plus
} from "lucide-react";
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

  // Edit form
  const [editForm, setEditForm] = useState({
    company_name: "",
    description: "",
    business_type: "",
    city: "",
    industry: "",
    website: "",
  });

  // Project form
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    content_type: "UGC",
    budget: "",
    target_creators: 1,
    incubator_only: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, statsRes, creatorsRes, packsRes] = await Promise.all([
        fetch(`${API_URL}/api/business/me/profile`, { credentials: "include" }),
        fetch(`${API_URL}/api/stats/business`, { credentials: "include" }),
        fetch(`${API_URL}/api/creators?limit=4`, { credentials: "include" }),
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
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
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
          title: "",
          description: "",
          content_type: "UGC",
          budget: "",
          target_creators: 1,
          incubator_only: false,
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const completionScore = profile?.completion_score || 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-secondary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl text-white">Incubateur</span>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/creators" className="text-slate-400 hover:text-white transition-colors hidden md:flex items-center gap-2">
                <Users className="w-4 h-4" />
                Créateurs
              </Link>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-slate-400" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-400 hover:text-white"
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
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">
                Bienvenue {profile?.company_name || user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-slate-400">Trouvez les meilleurs créateurs pour vos projets</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/creators")}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Users className="w-4 h-4 mr-2" />
                Explorer
              </Button>
              <Button
                onClick={() => stats?.selected_pack ? setProjectDialogOpen(true) : setPackDialogOpen(true)}
                className="bg-primary hover:bg-primary-hover"
                data-testid="create-project-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                {stats?.selected_pack ? "Nouveau projet" : "Choisir un pack"}
              </Button>
            </div>
          </div>

          {/* Completion Progress */}
          <Card className="mt-6 bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Profil complété à {completionScore}%</p>
                    <p className="text-slate-400 text-sm">
                      {completionScore < 50 ? "Complétez pour de meilleures recommandations" : "Bon profil !"}
                    </p>
                  </div>
                </div>
                <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="bg-slate-900 border-slate-800 w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="text-white">Modifier mon profil</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 py-6">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Nom de l'entreprise</Label>
                        <Input
                          value={editForm.company_name}
                          onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                          placeholder="Ma Société"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Description</Label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Décrivez votre activité..."
                          className="w-full h-24 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Type d'activité</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {["physical", "online", "both"].map((type) => (
                            <button
                              key={type}
                              onClick={() => setEditForm({ ...editForm, business_type: type })}
                              className={`p-3 rounded-lg border text-center transition-all ${
                                editForm.business_type === type
                                  ? "border-primary bg-primary/10 text-white"
                                  : "border-slate-700 text-slate-400 hover:border-slate-600"
                              }`}
                            >
                              {type === "physical" ? "Physique" : type === "online" ? "En ligne" : "Les deux"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Ville</Label>
                        <Input
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          placeholder="Paris"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Secteur</Label>
                        <select
                          value={editForm.industry}
                          onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                          className="w-full h-10 px-3 rounded-md bg-slate-800 border border-slate-700 text-white"
                        >
                          <option value="">Sélectionnez</option>
                          {INDUSTRIES.map((ind) => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Site web</Label>
                        <Input
                          value={editForm.website}
                          onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                          placeholder="https://..."
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <Button onClick={handleUpdateProfile} className="w-full bg-primary hover:bg-primary-hover">
                        Enregistrer
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <Progress value={completionScore} className="h-2 bg-slate-700" />
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-2xl font-heading font-bold text-white">{stats?.total_projects || 0}</p>
              <p className="text-slate-400 text-sm">Projets totaux</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-2xl font-heading font-bold text-white">{stats?.active_projects || 0}</p>
              <p className="text-slate-400 text-sm">En cours</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-2xl font-heading font-bold text-white">{stats?.completed_projects || 0}</p>
              <p className="text-slate-400 text-sm">Terminés</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className="text-2xl font-heading font-bold text-white">
                {stats?.selected_pack ? "✓" : "—"}
              </p>
              <p className="text-slate-400 text-sm">Pack actif</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      placeholder="Rechercher des créateurs..."
                      className="pl-10 bg-slate-900 border-slate-700 text-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => navigate(`/creators?q=${searchQuery}`)}
                    className="bg-primary hover:bg-primary-hover"
                  >
                    Rechercher
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recommended Creators */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Créateurs recommandés</CardTitle>
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
                      className="bg-slate-900 rounded-lg p-4 border border-slate-700 hover:border-primary/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {creator.picture ? (
                            <img src={creator.picture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium truncate">{creator.name || "Créateur"}</p>
                            {creator.is_premium && (
                              <Badge className="bg-amber-500/20 text-amber-400 text-xs">Premium</Badge>
                            )}
                          </div>
                          {creator.city && (
                            <p className="text-slate-400 text-sm flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {creator.city}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-slate-400 text-sm">{creator.rating?.toFixed(1) || "0.0"}</span>
                            {creator.portfolio_status === "incomplete" && (
                              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                                Portfolio incomplet
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Packs */}
          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {stats?.selected_pack ? "Pack actif" : "Choisir un pack"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats?.selected_pack ? (
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <span className="text-white font-medium">
                        {packs.find(p => p.pack_id === stats.selected_pack)?.name || "Pack sélectionné"}
                      </span>
                    </div>
                    <Button
                      variant="link"
                      onClick={() => setPackDialogOpen(true)}
                      className="text-primary p-0 h-auto mt-2"
                    >
                      Changer de pack
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 text-sm">
                      Sélectionnez un pack pour déposer des projets
                    </p>
                    {packs.slice(0, 3).map((pack) => (
                      <div
                        key={pack.pack_id}
                        onClick={() => handleSelectPack(pack.pack_id)}
                        className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-primary/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{pack.icon}</span>
                            <span className="text-white font-medium">{pack.name}</span>
                          </div>
                          <span className="text-primary font-semibold">{pack.price}€</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => setPackDialogOpen(true)}
                  className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Voir tous les packs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Pack Selection Dialog */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Choisir un pack</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 py-4">
            {packs.map((pack) => (
              <div
                key={pack.pack_id}
                onClick={() => handleSelectPack(pack.pack_id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  stats?.selected_pack === pack.pack_id
                    ? "border-primary bg-primary/10"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{pack.icon}</span>
                  <span className="text-white font-semibold">{pack.name}</span>
                  {pack.popular && <Badge className="bg-primary text-xs">Populaire</Badge>}
                </div>
                <p className="text-slate-400 text-sm mb-3">{pack.description}</p>
                <p className="text-2xl font-heading font-bold text-primary">{pack.price}€</p>
                <div className="mt-3 text-slate-400 text-xs space-y-1">
                  <p>{pack.creators_count} créateurs • {pack.videos_count} vidéos</p>
                  <p>Livraison: {pack.delivery_days} jours</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Titre du projet</Label>
              <Input
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                placeholder="Campagne UGC Été 2025"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Description</Label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Décrivez votre projet, vos attentes..."
                className="w-full h-24 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-300">Type de contenu</Label>
                <select
                  value={projectForm.content_type}
                  onChange={(e) => setProjectForm({ ...projectForm, content_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-white"
                >
                  {["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview"].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Budget (€)</Label>
                <Input
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                  placeholder="1500"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Réservé aux membres Incubateur</Label>
                <p className="text-slate-400 text-sm">Accès aux créateurs Premium uniquement</p>
              </div>
              <input
                type="checkbox"
                checked={projectForm.incubator_only}
                onChange={(e) => setProjectForm({ ...projectForm, incubator_only: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700"
              />
            </div>
            <Button onClick={handleCreateProject} className="w-full bg-primary hover:bg-primary-hover">
              Créer le projet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDashboard;
