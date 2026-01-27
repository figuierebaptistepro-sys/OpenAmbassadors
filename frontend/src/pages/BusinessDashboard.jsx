import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Building2, Search, Users, TrendingUp, ChevronRight,
  Star, MapPin, Edit, CheckCircle, Briefcase, Plus, Bell, Filter,
  ArrowRight, Sparkles, Target, Rocket, Image, Globe, FileText,
  Clock, Zap, Crown
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import UserMenu from "../components/UserMenu";
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
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
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
      const [profileRes, statsRes, creatorsRes, packsRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/api/business/me/profile`, { credentials: "include" }),
        fetch(`${API_URL}/api/stats/business`, { credentials: "include" }),
        fetch(`${API_URL}/api/creators?limit=4`, { credentials: "include" }),
        fetch(`${API_URL}/api/packs`),
        fetch(`${API_URL}/api/projects/business`, { credentials: "include" })
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
      if (projectsRes.ok) setProjects(await projectsRes.json());
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

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/business/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        toast.success("Profil mis à jour !");
        setEditSheetOpen(false);
        fetchData();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCreateProject = async () => {
    if (!stats?.selected_pack) {
      toast.error("Vous devez d'abord choisir un pack");
      navigate("/billing");
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
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const currentPack = packs.find(p => p.pack_id === stats?.selected_pack);
  const hasProjects = projects.length > 0;
  const hasProfile = profile?.company_name && profile?.description;
  const completionSteps = [
    { done: !!profile?.company_name, label: "Ajouter le nom de l'entreprise", icon: Building2 },
    { done: !!profile?.description, label: "Ajouter une description", icon: FileText },
    { done: !!user?.picture, label: "Ajouter un logo", icon: Image },
    { done: !!profile?.website, label: "Ajouter le site web", icon: Globe },
  ];
  const completedSteps = completionSteps.filter(s => s.done).length;
  const completionPercent = Math.round((completedSteps / completionSteps.length) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType={user?.user_type} isPremium={user?.is_premium} onLogout={handleLogout} />

      {/* Main content with responsive margin */}
      <div className="lg:ml-64 pt-16 lg:pt-0">
        {/* Header */}
        <header className="sticky top-16 lg:top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-lg lg:text-xl font-bold text-gray-900">
                Bienvenue{profile?.company_name ? `, ${profile.company_name}` : ""} 👋
              </h1>
              <p className="text-gray-500 text-sm hidden sm:block">Trouvez des créateurs et lancez vos campagnes</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search - Hidden on very small screens */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48 lg:w-64 bg-gray-50 border-gray-200"
                />
              </div>
              <UserMenu user={user} currentPlan={currentPack?.name} />
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 lg:mb-8">
            <Button 
              onClick={() => navigate("/creators")}
              variant="outline" 
              className="border-gray-200 bg-white hover:bg-gray-50 text-sm"
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Trouver un </span>créateur
            </Button>
            <Button 
              onClick={() => setProjectDialogOpen(true)}
              className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 text-sm"
              size="sm"
              data-testid="new-project-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau projet
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              {/* Smart Action Block */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 lg:p-6">
                    <div className="flex items-start gap-3 lg:gap-4">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        {!hasProjects ? (
                          <Rocket className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                        ) : completionPercent < 100 ? (
                          <Target className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                        ) : (
                          <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-gray-900 mb-1 text-sm lg:text-base">
                          {!hasProjects 
                            ? "Publiez votre premier projet"
                            : completionPercent < 100 
                              ? "Complétez votre profil entreprise"
                              : "Votre profil est complet !"
                          }
                        </h3>
                        <p className="text-gray-600 text-xs lg:text-sm mb-3 lg:mb-4">
                          {!hasProjects 
                            ? "Créez un projet pour recevoir des candidatures de créateurs qualifiés."
                            : completionPercent < 100 
                              ? "Un profil complet améliore vos recommandations."
                              : "Vous êtes prêt à collaborer avec les meilleurs créateurs."
                          }
                        </p>
                        
                        {completionPercent < 100 && (
                          <div className="space-y-2 lg:space-y-3">
                            {completionSteps.filter(s => !s.done).slice(0, 2).map((step, i) => (
                              <button
                                key={i}
                                onClick={() => setEditSheetOpen(true)}
                                className="flex items-center gap-2 lg:gap-3 w-full p-2 lg:p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors text-left"
                              >
                                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <step.icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-500" />
                                </div>
                                <span className="text-gray-700 text-xs lg:text-sm flex-1 truncate">{step.label}</span>
                                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {!hasProjects && (
                          <Button 
                            onClick={() => setProjectDialogOpen(true)}
                            className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 mt-2 text-sm"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Créer mon premier projet
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  {completionPercent < 100 && (
                    <div className="px-4 lg:px-6 py-3 lg:py-4 bg-white border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs lg:text-sm text-gray-600">Profil entreprise</span>
                        <span className="text-xs lg:text-sm font-medium text-primary">{completionPercent}%</span>
                      </div>
                      <Progress value={completionPercent} className="h-1.5 lg:h-2" />
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Activity Section */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2 px-4 lg:px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-900 text-sm lg:text-base">Activité récente</CardTitle>
                    {hasProjects && (
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover text-xs lg:text-sm">
                        Voir tout
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 lg:px-6">
                  {hasProjects ? (
                    <div className="space-y-3 lg:space-y-4">
                      {projects.slice(0, 3).map((project, i) => (
                        <div key={i} className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 bg-gray-50 rounded-xl">
                          <div className="w-9 h-9 lg:w-10 lg:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                            <Briefcase className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate text-sm lg:text-base">{project.title}</p>
                            <p className="text-gray-500 text-xs lg:text-sm">{project.applications?.length || 0} candidatures</p>
                          </div>
                          <Badge className={`text-xs ${
                            project.status === "open" ? "bg-green-100 text-green-700" :
                            project.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {project.status === "open" ? "Ouvert" : 
                             project.status === "in_progress" ? "En cours" : "Terminé"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 lg:py-8">
                      <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                        <Briefcase className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium mb-1 text-sm lg:text-base">Aucun projet pour le moment</p>
                      <p className="text-gray-500 text-xs lg:text-sm mb-3 lg:mb-4">Créez votre premier projet pour commencer</p>
                      <Button 
                        variant="outline" 
                        onClick={() => setProjectDialogOpen(true)}
                        className="border-gray-200 text-sm"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nouveau projet
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommended Creators */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2 px-4 lg:px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-900 text-sm lg:text-base">Créateurs recommandés</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary hover:text-primary-hover text-xs lg:text-sm"
                      onClick={() => navigate("/creators")}
                    >
                      Voir tous
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 lg:px-6">
                  {creators.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                      {creators.map((creator) => (
                        <Link
                          key={creator.user_id}
                          to={`/creators/${creator.user_id}`}
                          className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0">
                            {creator.picture ? (
                              <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-base lg:text-lg font-bold text-primary">
                                {(creator.name || "C")[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate text-sm lg:text-base">{creator.name || "Créateur"}</p>
                              {creator.is_premium && (
                                <Crown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-500">
                              {creator.city && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  {creator.city}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                {creator.rating?.toFixed(1) || "5.0"}
                              </span>
                            </div>
                          </div>
                          {creator.available && (
                            <Badge className="bg-green-100 text-green-700 text-xs hidden sm:inline-flex">Dispo</Badge>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 lg:py-8">
                      <Users className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 mx-auto mb-3 lg:mb-4" />
                      <p className="text-gray-500 text-sm">Aucun créateur disponible</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-4 lg:space-y-6">
              {/* Quick Stats */}
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 lg:p-6">
                  <h3 className="font-heading font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">Vue d'ensemble</h3>
                  <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:gap-4">
                    <div className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                      <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                        </div>
                        <span className="text-gray-600 text-xs lg:text-sm">Projets</span>
                      </div>
                      <span className="font-heading font-bold text-gray-900 text-sm lg:text-base">
                        {stats?.total_projects || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                      <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                        </div>
                        <span className="text-gray-600 text-xs lg:text-sm">En cours</span>
                      </div>
                      <span className="font-heading font-bold text-gray-900 text-sm lg:text-base">
                        {stats?.active_projects || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                      <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                        </div>
                        <span className="text-gray-600 text-xs lg:text-sm">Terminés</span>
                      </div>
                      <span className="font-heading font-bold text-gray-900 text-sm lg:text-base">
                        {stats?.completed_projects || "—"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Plan */}
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary-hover p-3 lg:p-4 text-white">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 lg:w-6 lg:h-6" />
                    <div>
                      <p className="text-white/80 text-xs">Plan actif</p>
                      <p className="font-heading font-bold text-sm lg:text-base">{currentPack?.name || "Aucun plan"}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-3 lg:p-4">
                  {currentPack ? (
                    <>
                      <div className="flex items-center justify-between text-xs lg:text-sm mb-2 lg:mb-3">
                        <span className="text-gray-500">Créateurs</span>
                        <span className="font-medium text-gray-900">{currentPack.creators_count}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs lg:text-sm mb-3 lg:mb-4">
                        <span className="text-gray-500">Vidéos</span>
                        <span className="font-medium text-gray-900">{currentPack.videos_count}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500 text-xs lg:text-sm mb-3 lg:mb-4">Choisissez un plan pour commencer</p>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-200 text-xs lg:text-sm"
                    size="sm"
                    onClick={() => navigate("/billing")}
                  >
                    {currentPack ? "Gérer le plan" : "Choisir un plan"}
                  </Button>
                </CardContent>
              </Card>

              {/* Help Card - Hidden on small mobile */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-gray-900 to-gray-800 text-white hidden sm:block">
                <CardContent className="p-4 lg:p-6">
                  <Zap className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-400 mb-2 lg:mb-3" />
                  <h4 className="font-heading font-bold mb-1 lg:mb-2 text-sm lg:text-base">Besoin d'aide ?</h4>
                  <p className="text-gray-300 text-xs lg:text-sm mb-3 lg:mb-4">
                    Notre équipe est là pour vous accompagner.
                  </p>
                  <Button 
                    variant="secondary" 
                    className="w-full bg-white text-gray-900 hover:bg-gray-100 text-xs lg:text-sm"
                    size="sm"
                    onClick={() => navigate("/support")}
                  >
                    Contacter le support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Profile Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="bg-white overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-gray-900">Modifier le profil</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label className="text-sm">Nom de l'entreprise</Label>
              <Input
                value={editForm.company_name}
                onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                className="bg-gray-50 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full h-24 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none text-sm"
                placeholder="Décrivez votre entreprise..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Secteur d'activité</Label>
              <select
                value={editForm.industry}
                onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm"
              >
                <option value="">Sélectionner</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Ville</Label>
              <Input
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="bg-gray-50 border-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Site web</Label>
              <Input
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                className="bg-gray-50 border-gray-200"
                placeholder="https://"
              />
            </div>
            <Button 
              onClick={handleSaveProfile}
              className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
            >
              Enregistrer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-2xl max-w-lg mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Titre du projet</Label>
              <Input
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                className="bg-gray-50 border-gray-200"
                placeholder="Ex: Vidéos TikTok produit beauté"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                className="w-full h-24 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none text-sm"
                placeholder="Décrivez votre besoin en détail..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Type de contenu</Label>
                <select
                  value={projectForm.content_type}
                  onChange={(e) => setProjectForm({ ...projectForm, content_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                >
                  <option value="UGC">UGC</option>
                  <option value="Face cam">Face cam</option>
                  <option value="Ads">Ads</option>
                  <option value="Interview">Interview</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Budget (€)</Label>
                <Input
                  type="number"
                  value={projectForm.budget}
                  onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                  className="bg-gray-50 border-gray-200"
                  placeholder="500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Nombre de créateurs recherchés</Label>
              <Input
                type="number"
                min="1"
                value={projectForm.target_creators}
                onChange={(e) => setProjectForm({ ...projectForm, target_creators: parseInt(e.target.value) || 1 })}
                className="bg-gray-50 border-gray-200"
              />
            </div>
            <Button 
              onClick={handleCreateProject}
              className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
              data-testid="submit-project-btn"
            >
              Publier le projet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDashboard;
