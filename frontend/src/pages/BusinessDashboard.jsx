import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Users, ChevronRight, Star, MapPin, CheckCircle, 
  Briefcase, Plus, ArrowRight, Sparkles, Target, Rocket, 
  Image, Globe, FileText, Clock, Zap, Crown, Building2, Check, Upload, Camera
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

const getBusinessChecklistItems = (profile, user) => [
  { id: "picture", label: "Ajouter un logo/photo", points: 15, done: !!user?.picture },
  { id: "company_name", label: "Nom de l'entreprise", points: 10, done: !!profile?.company_name },
  { id: "description", label: "Description de l'entreprise", points: 10, done: !!profile?.description },
  { id: "industry", label: "Secteur d'activité", points: 10, done: !!profile?.industry },
  { id: "city", label: "Localisation", points: 10, done: !!profile?.city },
  { id: "website", label: "Site web", points: 10, done: !!profile?.website },
  { id: "project", label: "Créer un projet", points: 25, done: false }, // Will be updated with projects count
];

const BusinessDashboard = ({ user, onUserUpdate }) => {
  const navigate = useNavigate();
  const pictureInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [creators, setCreators] = useState([]);
  const [packs, setPacks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [editForm, setEditForm] = useState({
    company_name: "", description: "", business_type: "",
    city: "", industry: "", website: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Upload photo de profil/logo
  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Sélectionnez une image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/api/upload/profile-picture`, { 
        method: "POST", 
        credentials: "include", 
        body: formData 
      });
      if (response.ok) {
        const data = await response.json();
        toast.success("Logo mis à jour !");
        onUserUpdate?.({ ...user, picture: data.picture_url });
      } else {
        toast.error("Erreur lors de l'upload");
      }
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setUploadingPicture(false);
    }
  };

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
  
  // Champs obligatoires pour créer un projet
  const requiredFields = [
    { id: "company_name", label: "Nom de l'entreprise", done: !!profile?.company_name },
    { id: "picture", label: "Logo", done: !!user?.picture },
    { id: "industry", label: "Secteur d'activité", done: !!profile?.industry },
    { id: "description", label: "Description", done: !!profile?.description },
  ];
  const missingRequired = requiredFields.filter(f => !f.done);
  const canCreateProject = missingRequired.length === 0;
  
  // Checklist avec points
  const checklistItems = getBusinessChecklistItems(profile, user).map(item => 
    item.id === "project" ? { ...item, done: hasProjects } : item
  );
  const completedItems = checklistItems.filter(i => i.done).length;
  const totalPoints = checklistItems.reduce((sum, i) => sum + (i.done ? i.points : 0), 0);
  const maxPoints = checklistItems.reduce((sum, i) => sum + i.points, 0);

  // Gestion des actions de la checklist
  const handleChecklistAction = (itemId) => {
    if (itemId === "picture") {
      pictureInputRef.current?.click();
    } else if (itemId === "project") {
      navigate("/projects/new");
    } else {
      setEditSheetOpen(true);
    }
  };

  // Essayer de créer un projet
  const handleCreateProject = () => {
    if (canCreateProject) {
      navigate("/business/projects/new");
    } else {
      toast.error("Complétez d'abord votre profil entreprise");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppLayout user={user} currentPlan={currentPack?.name}>
      {/* Input caché pour l'upload de logo */}
      <input
        ref={pictureInputRef}
        type="file"
        accept="image/*"
        onChange={handlePictureUpload}
        className="hidden"
      />
      
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
            onClick={handleCreateProject}
            size="sm"
            className={`shadow-sm text-xs sm:text-sm ${canCreateProject ? "bg-primary hover:bg-primary-hover" : "bg-gray-300 cursor-not-allowed"}`}
            data-testid="new-project-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouveau projet
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Section 1: Créer un projet */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm overflow-hidden">
                {canCreateProject ? (
                  // Profil complet - peut créer un projet
                  <div className="bg-gradient-to-r from-primary to-primary/80 p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Rocket className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading font-bold text-white text-base sm:text-lg mb-1">
                          Lancer une campagne
                        </h3>
                        <p className="text-white/80 text-xs sm:text-sm">
                          Trouvez des créateurs et lancez votre projet UGC
                        </p>
                      </div>
                      <Button 
                        onClick={() => navigate("/business/projects/new")} 
                        className="bg-white text-primary hover:bg-gray-100 shadow-lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer un projet
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Profil incomplet - doit d'abord compléter
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-7 h-7 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading font-bold text-gray-900 text-base sm:text-lg mb-1">
                          Complétez votre profil
                        </h3>
                        <p className="text-gray-500 text-xs sm:text-sm mb-4">
                          Pour créer un projet, remplissez ces informations obligatoires :
                        </p>
                        
                        <div className="space-y-2 mb-4">
                          {requiredFields.map((field) => (
                            <button
                              key={field.id}
                              onClick={() => handleChecklistAction(field.id)}
                              disabled={field.done}
                              className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left ${
                                field.done 
                                  ? "bg-green-50 cursor-default" 
                                  : "bg-orange-50 hover:bg-orange-100 cursor-pointer"
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                field.done ? "bg-green-500" : "bg-orange-400"
                              }`}>
                                {field.done ? (
                                  <Check className="w-4 h-4 text-white" />
                                ) : (
                                  <span className="text-white text-xs font-bold">!</span>
                                )}
                              </div>
                              <span className={`text-sm flex-1 ${field.done ? "text-green-700" : "text-orange-700 font-medium"}`}>
                                {field.label}
                              </span>
                              {!field.done && <ArrowRight className="w-4 h-4 text-orange-400" />}
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>2 minutes pour compléter</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Section 2: Compléter le profil (bonus) - Visible seulement si profil OK mais pas 100% */}
            {canCreateProject && completedItems < checklistItems.length && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Target className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-sm text-gray-900">Bonus : Améliorez votre profil</CardTitle>
                          <p className="text-xs text-gray-500">Gagnez des points et attirez plus de créateurs</p>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-600 text-xs">
                        {totalPoints}/{maxPoints} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <Progress value={(totalPoints / maxPoints) * 100} className="h-2 mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {checklistItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => !item.done && handleChecklistAction(item.id)}
                          disabled={item.done || (uploadingPicture && item.id === "picture")}
                          className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-colors ${
                            item.done ? "bg-green-50" : "bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            item.done ? "bg-green-500" : "bg-gray-200"
                          }`}>
                            {item.done ? (
                              <Check className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <span className="text-xs font-bold text-gray-500">{item.points}</span>
                            )}
                          </div>
                          <span className={`text-xs flex-1 ${item.done ? "text-green-700" : "text-gray-700"}`}>
                            {uploadingPicture && item.id === "picture" ? "Upload..." : item.label}
                          </span>
                          {!item.done && <ArrowRight className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

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
                            <span>{project.budget ? `${project.budget}` : "Budget à définir"}</span>
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

      {/* Hidden file input for picture upload */}
      <input
        ref={pictureInputRef}
        type="file"
        accept="image/*"
        onChange={handlePictureUpload}
        className="hidden"
      />

    </AppLayout>
  );
};

export default BusinessDashboard;
