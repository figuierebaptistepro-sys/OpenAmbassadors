import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Video, MapPin, Edit, Plus, ExternalLink, CheckCircle,
  Star, Trophy, TrendingUp, BookOpen, Briefcase, ChevronRight,
  Settings, Award, Shield, Zap, Bell, Search, Crown, Check
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const CONTENT_TYPES = ["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview", "Montage"];
const EQUIPMENT_OPTIONS = ["Smartphone", "Caméra", "Micro", "Éclairage", "Trépied", "Stabilisateur"];
const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Débutant", desc: "< 5 projets" },
  { id: "intermediate", label: "Intermédiaire", desc: "5-20 projets" },
  { id: "expert", label: "Expert", desc: "> 20 projets" }
];

// Checklist items for gamification
const getChecklistItems = (profile) => [
  { id: "bio", label: "Ajouter une bio", points: 5, done: !!profile?.bio },
  { id: "city", label: "Renseigner votre ville", points: 10, done: !!profile?.city },
  { id: "content_types", label: "Sélectionner vos spécialités", points: 10, done: profile?.content_types?.length > 0 },
  { id: "equipment", label: "Lister votre matériel", points: 10, done: profile?.equipment?.length > 0 },
  { id: "portfolio", label: "Ajouter 3 vidéos au portfolio", points: 20, done: profile?.portfolio_videos?.length >= 3 },
  { id: "rates", label: "Définir vos tarifs", points: 10, done: !!profile?.min_rate && !!profile?.max_rate },
];

const CreatorDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [incubatorDialogOpen, setIncubatorDialogOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    bio: "", city: "", can_travel: false, works_remote: true,
    content_types: [], equipment: [], experience_level: "",
    brands_worked: [], results: "", min_rate: "", max_rate: "", available: true,
  });

  const [newVideo, setNewVideo] = useState({ url: "", title: "", platform: "youtube", views: "" });
  const [newBrand, setNewBrand] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/creators/me/profile`, { credentials: "include" }),
        fetch(`${API_URL}/api/stats/creator`, { credentials: "include" })
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setEditForm({
          bio: data.bio || "", city: data.city || "",
          can_travel: data.can_travel || false, works_remote: data.works_remote ?? true,
          content_types: data.content_types || [], equipment: data.equipment || [],
          experience_level: data.experience_level || "", brands_worked: data.brands_worked || [],
          results: data.results || "", min_rate: data.min_rate || "",
          max_rate: data.max_rate || "", available: data.available ?? true,
        });
      }
      if (statsRes.ok) setStats(await statsRes.json());
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
      const response = await fetch(`${API_URL}/api/creators/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...editForm,
          min_rate: editForm.min_rate ? parseInt(editForm.min_rate) : null,
          max_rate: editForm.max_rate ? parseInt(editForm.max_rate) : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Profil mis à jour ! Score: ${data.completion_score}%`);
        setEditSheetOpen(false);
        fetchData();
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAddVideo = async () => {
    if (!newVideo.url || !newVideo.title) {
      toast.error("URL et titre requis");
      return;
    }

    const updatedVideos = [
      ...(profile.portfolio_videos || []),
      { ...newVideo, views: newVideo.views ? parseInt(newVideo.views) : 0 },
    ];

    try {
      await fetch(`${API_URL}/api/creators/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ portfolio_videos: updatedVideos }),
      });

      toast.success("Vidéo ajoutée !");
      setVideoDialogOpen(false);
      setNewVideo({ url: "", title: "", platform: "youtube", views: "" });
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleJoinIncubator = async () => {
    try {
      await fetch(`${API_URL}/api/incubator/join`, { method: "POST", credentials: "include" });
      toast.success("Bienvenue dans l'Incubateur Premium !");
      setIncubatorDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const toggleContentType = (type) => {
    setEditForm(prev => ({
      ...prev,
      content_types: prev.content_types.includes(type)
        ? prev.content_types.filter(t => t !== type) : [...prev.content_types, type],
    }));
  };

  const toggleEquipment = (item) => {
    setEditForm(prev => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter(e => e !== item) : [...prev.equipment, item],
    }));
  };

  const addBrand = () => {
    if (newBrand && !editForm.brands_worked.includes(newBrand)) {
      setEditForm(prev => ({ ...prev, brands_worked: [...prev.brands_worked, newBrand] }));
      setNewBrand("");
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
  const checklist = getChecklistItems(profile);
  const nextLevel = completionScore < 50 ? "Vérifié" : completionScore < 80 ? "Validé" : "Certifié";
  const pointsToNext = completionScore < 50 ? 50 - completionScore : completionScore < 80 ? 80 - completionScore : 100 - completionScore;

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType="creator" onLogout={handleLogout} />

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">Créateur</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold text-gray-900">
              Bonjour, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-gray-500">Voici votre progression aujourd'hui</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Card */}
              <Card className="border-0 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-heading text-lg font-semibold text-gray-900">
                        Progression vers {nextLevel}
                      </h2>
                      <p className="text-gray-500 text-sm">
                        Encore {pointsToNext} points pour passer au niveau suivant
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-heading font-bold text-gray-900">{completionScore}</p>
                      <p className="text-gray-500 text-sm">/ 100</p>
                    </div>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 gradient-progress rounded-full transition-all duration-500"
                      style={{ width: `${completionScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Non vérifié</span>
                    <span>Vérifié (50)</span>
                    <span>Validé (80)</span>
                    <span>Certifié (100)</span>
                  </div>
                </CardContent>
              </Card>

              {/* Checklist Gamification */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Actions pour progresser
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        item.done
                          ? "bg-primary-soft border-primary/20"
                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          item.done ? "bg-primary" : "bg-gray-200"
                        }`}>
                          {item.done ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <span className="w-2 h-2 bg-gray-400 rounded-full" />
                          )}
                        </div>
                        <span className={item.done ? "text-gray-600 line-through" : "text-gray-900"}>
                          {item.label}
                        </span>
                      </div>
                      <Badge variant={item.done ? "secondary" : "outline"} className={item.done ? "bg-primary text-white" : ""}>
                        +{item.points} pts
                      </Badge>
                    </div>
                  ))}
                  <Button
                    onClick={() => setEditSheetOpen(true)}
                    className="w-full mt-4 bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                    data-testid="complete-profile-btn"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Compléter mon profil
                  </Button>
                </CardContent>
              </Card>

              {/* Portfolio */}
              <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Portfolio</CardTitle>
                    {profile?.portfolio_videos?.length < 3 && (
                      <p className="text-amber-600 text-sm mt-1">
                        ⚠️ Minimum 3 vidéos recommandé ({profile?.portfolio_videos?.length || 0}/3)
                      </p>
                    )}
                  </div>
                  <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-primary hover:bg-primary-hover shadow-sm shadow-primary/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border-0 shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-gray-900">Ajouter une vidéo</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Titre</Label>
                          <Input
                            value={newVideo.title}
                            onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                            placeholder="UGC Beauté - Marque X"
                            className="bg-gray-50 border-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>URL</Label>
                          <Input
                            value={newVideo.url}
                            onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                            placeholder="https://..."
                            className="bg-gray-50 border-gray-200"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Plateforme</Label>
                            <select
                              value={newVideo.platform}
                              onChange={(e) => setNewVideo({ ...newVideo, platform: e.target.value })}
                              className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200"
                            >
                              <option value="youtube">YouTube</option>
                              <option value="tiktok">TikTok</option>
                              <option value="instagram">Instagram</option>
                              <option value="drive">Drive</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Vues</Label>
                            <Input
                              type="number"
                              value={newVideo.views}
                              onChange={(e) => setNewVideo({ ...newVideo, views: e.target.value })}
                              placeholder="10000"
                              className="bg-gray-50 border-gray-200"
                            />
                          </div>
                        </div>
                        <Button onClick={handleAddVideo} className="w-full bg-primary hover:bg-primary-hover">
                          Ajouter au portfolio
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {profile?.portfolio_videos?.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      {profile.portfolio_videos.map((video, index) => (
                        <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Video className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 font-medium truncate">{video.title}</p>
                              <p className="text-gray-500 text-sm capitalize">{video.platform}</p>
                              {video.views > 0 && (
                                <p className="text-gray-400 text-sm">{video.views.toLocaleString()} vues</p>
                              )}
                            </div>
                            <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Ajoutez vos meilleures créations</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Scores */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-900">Mes Scores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="text-gray-600">Complétion</span>
                    </div>
                    <span className="font-heading font-bold text-gray-900">{completionScore}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-500" />
                      <span className="text-gray-600">Fiabilité</span>
                    </div>
                    <span className="font-heading font-bold text-gray-900">{stats?.reliability_score || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <span className="text-gray-600">Performance</span>
                    </div>
                    <span className="font-heading font-bold text-gray-900">{stats?.performance_score || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Premium CTA */}
              {!user?.is_premium && (
                <Card className="border-0 shadow-md premium-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-gray-900">Incubateur Premium</h3>
                        <p className="text-primary font-semibold">49€/mois</p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      Augmente ta visibilité et accède aux missions prioritaires.
                    </p>
                    <ul className="space-y-2 mb-4">
                      {["Priorité dans l'algorithme", "Badge Premium visible", "Briefs exclusifs"].map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => setIncubatorDialogOpen(true)}
                      className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                      data-testid="join-incubator-btn"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Rejoindre
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Quick Links */}
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 space-y-2">
                  <Link to="/trainings" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      <span className="text-gray-700">Formations</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                  <Link to="/projects" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">Missions</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Profile Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="bg-white border-l-0 shadow-2xl w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-gray-900">Modifier mon profil</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-6">
            {/* Bio */}
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Parlez de vous..."
                className="bg-gray-50 border-gray-200"
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                placeholder="Paris"
                className="bg-gray-50 border-gray-200"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Peut se déplacer</Label>
              <Switch
                checked={editForm.can_travel}
                onCheckedChange={(c) => setEditForm({ ...editForm, can_travel: c })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Travaille à distance</Label>
              <Switch
                checked={editForm.works_remote}
                onCheckedChange={(c) => setEditForm({ ...editForm, works_remote: c })}
              />
            </div>

            {/* Content Types */}
            <div className="space-y-2">
              <Label>Spécialités</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant={editForm.content_types.includes(type) ? "default" : "outline"}
                    className={`cursor-pointer ${editForm.content_types.includes(type) ? "bg-primary" : "border-gray-300 text-gray-600"}`}
                    onClick={() => toggleContentType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label>Matériel</Label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((item) => (
                  <Badge
                    key={item}
                    variant={editForm.equipment.includes(item) ? "default" : "outline"}
                    className={`cursor-pointer ${editForm.equipment.includes(item) ? "bg-gray-800" : "border-gray-300 text-gray-600"}`}
                    onClick={() => toggleEquipment(item)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div className="space-y-2">
              <Label>Niveau d'expérience</Label>
              <div className="grid gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setEditForm({ ...editForm, experience_level: level.id })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      editForm.experience_level === level.id
                        ? "border-primary bg-primary-soft"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="text-gray-900 font-medium">{level.label}</p>
                    <p className="text-gray-500 text-sm">{level.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Rates */}
            <div className="space-y-2">
              <Label>Tarifs (€/vidéo)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  value={editForm.min_rate}
                  onChange={(e) => setEditForm({ ...editForm, min_rate: e.target.value })}
                  placeholder="Min"
                  className="bg-gray-50 border-gray-200"
                />
                <Input
                  type="number"
                  value={editForm.max_rate}
                  onChange={(e) => setEditForm({ ...editForm, max_rate: e.target.value })}
                  placeholder="Max"
                  className="bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Disponible</Label>
                <p className="text-gray-500 text-sm">Accepte de nouveaux projets</p>
              </div>
              <Switch
                checked={editForm.available}
                onCheckedChange={(c) => setEditForm({ ...editForm, available: c })}
              />
            </div>

            <Button onClick={handleUpdateProfile} className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20">
              Enregistrer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Incubator Dialog */}
      <Dialog open={incubatorDialogOpen} onOpenChange={setIncubatorDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Rejoindre l'Incubateur Premium
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-6">
              En rejoignant l'Incubateur, vous bénéficiez de nombreux avantages pour booster votre carrière de créateur.
            </p>
            <ul className="space-y-3 mb-6">
              {[
                "Priorité dans l'algorithme de recherche",
                "Badge Premium visible sur votre profil",
                "Accès aux formations avancées",
                "Briefs exclusifs réservés aux membres",
                "Support prioritaire"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="text-center mb-6">
              <p className="text-3xl font-heading font-bold text-gray-900">49€<span className="text-lg text-gray-500">/mois</span></p>
            </div>
            <Button
              onClick={handleJoinIncubator}
              className="w-full bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20"
            >
              Confirmer l'inscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorDashboard;
