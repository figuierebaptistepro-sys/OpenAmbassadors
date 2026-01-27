import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Users, ChevronRight, Star, MapPin, CheckCircle, 
  Briefcase, Plus, ArrowRight, Sparkles, Target, Rocket, 
  Image, Globe, FileText, Clock, Zap, Crown, Building2
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
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
  const [searchQuery, setSearchQuery] = useState("");

  const [editForm, setEditForm] = useState({
    company_name: "", description: "", business_type: "",
    city: "", industry: "", website: "",
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

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const currentPack = packs.find(p => p.pack_id === stats?.selected_pack);
  const hasProjects = projects.length > 0;
  const completionSteps = [
    { done: !!profile?.company_name, label: "Nom de l'entreprise", icon: Building2 },
    { done: !!profile?.description, label: "Description", icon: FileText },
    { done: !!user?.picture, label: "Logo", icon: Image },
    { done: !!profile?.website, label: "Site web", icon: Globe },
  ];
  const completedSteps = completionSteps.filter(s => s.done).length;
  const completionPercent = Math.round((completedSteps / completionSteps.length) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppLayout user={user} currentPlan={currentPack?.name}>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">
              Bienvenue{profile?.company_name ? `, ${profile.company_name}` : ""} 👋
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">Trouvez des créateurs et lancez vos campagnes</p>
          </div>
          <div className="hidden sm:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48 lg:w-64 bg-gray-50 border-gray-200 h-9"
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Quick Actions */}
        <div className="flex gap-2 mb-4 sm:mb-6">
          <Button 
            onClick={() => navigate("/creators")}
            variant="outline" 
            size="sm"
            className="border-gray-200 bg-white text-xs sm:text-sm"
          >
            <Users className="w-4 h-4 mr-1.5" />
            <span className="hidden xs:inline">Trouver </span>créateur
          </Button>
          <Button 
            onClick={() => navigate("/business/projects/new")}
            size="sm"
            className="bg-primary hover:bg-primary-hover shadow-sm text-xs sm:text-sm"
            data-testid="new-project-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouveau projet
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Smart Action Block */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      {!hasProjects ? <Rocket className="w-5 h-5 text-primary" /> : 
                       completionPercent < 100 ? <Target className="w-5 h-5 text-primary" /> : 
                       <Sparkles className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-gray-900 text-sm sm:text-base mb-1">
                        {!hasProjects ? "Publiez votre premier projet" : 
                         completionPercent < 100 ? "Complétez votre profil" : "Profil complet !"}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm mb-3">
                        {!hasProjects ? "Recevez des candidatures de créateurs qualifiés." : 
                         completionPercent < 100 ? "Améliorez vos recommandations." : "Prêt à collaborer."}
                      </p>
                      
                      {completionPercent < 100 && (
                        <div className="space-y-2">
                          {completionSteps.filter(s => !s.done).slice(0, 2).map((step, i) => (
                            <button
                              key={i}
                              onClick={() => setEditSheetOpen(true)}
                              className="flex items-center gap-2 w-full p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <step.icon className="w-3.5 h-3.5 text-gray-500" />
                              </div>
                              <span className="text-gray-700 text-xs sm:text-sm flex-1">Ajouter {step.label.toLowerCase()}</span>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {!hasProjects && (
                        <Button onClick={() => navigate("/business/projects/new")} size="sm" className="bg-primary hover:bg-primary-hover mt-2 text-xs">
                          <Plus className="w-4 h-4 mr-1.5" />
                          Créer mon premier projet
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {completionPercent < 100 && (
                  <div className="px-4 py-3 bg-white border-t border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-600">Profil entreprise</span>
                      <span className="text-xs font-medium text-primary">{completionPercent}%</span>
                    </div>
                    <Progress value={completionPercent} className="h-1.5" />
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Activity */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 text-sm sm:text-base">Activité récente</CardTitle>
                  {hasProjects && (
                    <Button variant="ghost" size="sm" className="text-primary text-xs">
                      Voir tout <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4">
                {hasProjects ? (
                  <div className="space-y-3">
                    {projects.slice(0, 3).map((project, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl overflow-hidden">
                        {/* Project Banner Thumbnail */}
                        <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                          {project.banner_url ? (
                            <img src={getImageUrl(project.banner_url)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Briefcase className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">{project.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{project.budget ? `${project.budget}€` : "Budget à définir"}</span>
                            <span>•</span>
                            <span>{project.applications?.length || 0} candidatures</span>
                          </div>
                        </div>
                        <Badge className={`text-xs flex-shrink-0 ${
                          project.status === "open" ? "bg-green-100 text-green-700" :
                          project.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {project.status === "open" ? "Ouvert" : project.status === "in_progress" ? "En cours" : "Terminé"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium text-sm mb-1">Aucun projet</p>
                    <p className="text-gray-500 text-xs mb-3">Créez votre premier projet</p>
                    <Button variant="outline" size="sm" onClick={() => navigate("/business/projects/new")} className="border-gray-200 text-xs">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Nouveau projet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Creators */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 text-sm sm:text-base">Créateurs recommandés</CardTitle>
                  <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/creators")}>
                    Voir tous <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4">
                {creators.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {creators.slice(0, 4).map((creator) => (
                      <Link
                        key={creator.user_id}
                        to={`/creators/${creator.user_id}`}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0">
                          {creator.picture ? (
                            <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-base font-bold text-primary">{(creator.name || "C")[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-900 truncate text-sm">{creator.name || "Créateur"}</p>
                            {creator.is_premium && <Crown className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {creator.city && <span className="truncate">{creator.city}</span>}
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              {creator.rating?.toFixed(1) || "5.0"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Aucun créateur disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-heading font-semibold text-gray-900 mb-3 text-sm">Vue d&apos;ensemble</h3>
                <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
                  {[
                    { icon: Briefcase, label: "Projets", value: stats?.total_projects, color: "bg-primary/10 text-primary" },
                    { icon: Clock, label: "En cours", value: stats?.active_projects, color: "bg-blue-100 text-blue-600" },
                    { icon: CheckCircle, label: "Terminés", value: stats?.completed_projects, color: "bg-green-100 text-green-600" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                      <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="text-gray-600 text-xs">{item.label}</span>
                      </div>
                      <span className="font-heading font-bold text-gray-900 text-sm">{item.value || "—"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Plan */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary-hover p-3 text-white">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  <div>
                    <p className="text-white/80 text-xs">Plan actif</p>
                    <p className="font-heading font-bold text-sm">{currentPack?.name || "Aucun"}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-3">
                {currentPack ? (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Créateurs</span>
                      <span className="font-medium">{currentPack.creators_count}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Vidéos</span>
                      <span className="font-medium">{currentPack.videos_count}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs mb-3">Choisissez un plan</p>
                )}
                <Button variant="outline" size="sm" className="w-full border-gray-200 text-xs" onClick={() => navigate("/billing")}>
                  {currentPack ? "Gérer" : "Choisir un plan"}
                </Button>
              </CardContent>
            </Card>

            {/* Help */}
            <Card className="border-0 shadow-sm bg-gray-900 text-white hidden sm:block">
              <CardContent className="p-4">
                <Zap className="w-6 h-6 text-yellow-400 mb-2" />
                <h4 className="font-heading font-bold text-sm mb-1">Besoin d&apos;aide ?</h4>
                <p className="text-gray-400 text-xs mb-3">Notre équipe vous accompagne.</p>
                <Button size="sm" className="w-full bg-white text-gray-900 hover:bg-gray-100 text-xs" onClick={() => navigate("/support")}>
                  Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="bg-white overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-gray-900">Modifier le profil</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            {[
              { key: "company_name", label: "Nom de l'entreprise", type: "input" },
              { key: "description", label: "Description", type: "textarea" },
              { key: "industry", label: "Secteur", type: "select", options: INDUSTRIES },
              { key: "city", label: "Ville", type: "input" },
              { key: "website", label: "Site web", type: "input", placeholder: "https://" },
            ].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm">{field.label}</Label>
                {field.type === "input" && (
                  <Input
                    value={editForm[field.key]}
                    onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                    className="bg-gray-50 border-gray-200"
                    placeholder={field.placeholder}
                  />
                )}
                {field.type === "textarea" && (
                  <textarea
                    value={editForm[field.key]}
                    onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                    className="w-full h-20 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none text-sm"
                  />
                )}
                {field.type === "select" && (
                  <select
                    value={editForm[field.key]}
                    onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                  >
                    <option value="">Sélectionner</option>
                    {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
              </div>
            ))}
            <Button onClick={handleSaveProfile} className="w-full bg-primary hover:bg-primary-hover">
              Enregistrer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </AppLayout>
  );
};

export default BusinessDashboard;
