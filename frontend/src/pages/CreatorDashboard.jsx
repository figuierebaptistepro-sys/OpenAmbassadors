import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, LogOut, User, Video, MapPin, Edit, Plus, ExternalLink,
  CheckCircle, Star, Trophy, TrendingUp, BookOpen, Briefcase,
  ChevronRight, Settings, Award, Shield, Zap
} from "lucide-react";
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

const CONTENT_TYPES = [
  "UGC", "Micro-trottoir", "Face cam", "Ads", "Interview", "Montage"
];

const EQUIPMENT_OPTIONS = [
  "Smartphone", "Caméra", "Micro", "Éclairage", "Trépied", "Stabilisateur"
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Débutant", desc: "< 5 projets" },
  { id: "intermediate", label: "Intermédiaire", desc: "5-20 projets" },
  { id: "expert", label: "Expert", desc: "> 20 projets" }
];

const CreatorDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [incubatorDialogOpen, setIncubatorDialogOpen] = useState(false);
  
  // Edit form
  const [editForm, setEditForm] = useState({
    bio: "",
    city: "",
    can_travel: false,
    works_remote: true,
    content_types: [],
    equipment: [],
    experience_level: "",
    brands_worked: [],
    results: "",
    min_rate: "",
    max_rate: "",
    available: true,
  });

  // New video form
  const [newVideo, setNewVideo] = useState({
    url: "",
    title: "",
    platform: "youtube",
    views: "",
  });

  // New brand input
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
          bio: data.bio || "",
          city: data.city || "",
          can_travel: data.can_travel || false,
          works_remote: data.works_remote ?? true,
          content_types: data.content_types || [],
          equipment: data.equipment || [],
          experience_level: data.experience_level || "",
          brands_worked: data.brands_worked || [],
          results: data.results || "",
          min_rate: data.min_rate || "",
          max_rate: data.max_rate || "",
          available: data.available ?? true,
        });
      }
      
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
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
      await fetch(`${API_URL}/api/incubator/join`, {
        method: "POST",
        credentials: "include",
      });
      toast.success("Bienvenue dans l'Incubateur Premium !");
      setIncubatorDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const toggleContentType = (type) => {
    setEditForm((prev) => ({
      ...prev,
      content_types: prev.content_types.includes(type)
        ? prev.content_types.filter((t) => t !== type)
        : [...prev.content_types, type],
    }));
  };

  const toggleEquipment = (item) => {
    setEditForm((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter((e) => e !== item)
        : [...prev.equipment, item],
    }));
  };

  const addBrand = () => {
    if (newBrand && !editForm.brands_worked.includes(newBrand)) {
      setEditForm((prev) => ({
        ...prev,
        brands_worked: [...prev.brands_worked, newBrand],
      }));
      setNewBrand("");
    }
  };

  const getVerificationBadge = () => {
    switch (stats?.verification_status) {
      case "incubator_certified":
        return { label: "Certifié Incubateur", color: "bg-secondary text-secondary-foreground" };
      case "portfolio_validated":
        return { label: "Portfolio Validé", color: "bg-blue-500 text-white" };
      case "identity_verified":
        return { label: "Identité Vérifiée", color: "bg-green-500 text-white" };
      default:
        return { label: "Non vérifié", color: "bg-slate-500 text-white" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const verificationBadge = getVerificationBadge();
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
              <Link to="/trainings" className="text-slate-400 hover:text-white transition-colors hidden md:flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Formations
              </Link>
              <Link to="/projects" className="text-slate-400 hover:text-white transition-colors hidden md:flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Missions
              </Link>
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
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
        {/* Header with Completion */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">
                Bonjour, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-slate-400">Votre tableau de bord créateur</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={verificationBadge.color}>
                {verificationBadge.label}
              </Badge>
              {user?.is_premium && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Award className="w-3 h-3 mr-1" /> Premium
                </Badge>
              )}
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
                      {completionScore < 50 ? "Complétez votre profil pour plus de visibilité" : 
                       completionScore < 80 ? "Bonne progression !" : "Excellent profil !"}
                    </p>
                  </div>
                </div>
                <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
                  <SheetTrigger asChild>
                    <Button className="bg-primary hover:bg-primary-hover" data-testid="complete-profile-btn">
                      <Edit className="w-4 h-4 mr-2" />
                      Compléter
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="bg-slate-900 border-slate-800 w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="text-white">Modifier mon profil</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 py-6">
                      {/* Identity */}
                      <div className="space-y-4">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          <User className="w-4 h-4" /> Identité
                        </h3>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Bio</Label>
                          <Textarea
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            placeholder="Parlez de vous..."
                            className="bg-slate-800 border-slate-700 text-white"
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-slate-300">Ville</Label>
                            <Input
                              value={editForm.city}
                              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                              placeholder="Paris"
                              className="bg-slate-800 border-slate-700 text-white"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-slate-300">Peut se déplacer</Label>
                          <Switch
                            checked={editForm.can_travel}
                            onCheckedChange={(c) => setEditForm({ ...editForm, can_travel: c })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-slate-300">Travaille à distance</Label>
                          <Switch
                            checked={editForm.works_remote}
                            onCheckedChange={(c) => setEditForm({ ...editForm, works_remote: c })}
                          />
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="space-y-4">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          <Video className="w-4 h-4" /> Spécialités
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {CONTENT_TYPES.map((type) => (
                            <Badge
                              key={type}
                              variant={editForm.content_types.includes(type) ? "default" : "outline"}
                              className={`cursor-pointer ${editForm.content_types.includes(type) ? "bg-primary" : "border-slate-600 text-slate-300"}`}
                              onClick={() => toggleContentType(type)}
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Equipment */}
                      <div className="space-y-4">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          <Settings className="w-4 h-4" /> Matériel
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {EQUIPMENT_OPTIONS.map((item) => (
                            <Badge
                              key={item}
                              variant={editForm.equipment.includes(item) ? "default" : "outline"}
                              className={`cursor-pointer ${editForm.equipment.includes(item) ? "bg-secondary text-secondary-foreground" : "border-slate-600 text-slate-300"}`}
                              onClick={() => toggleEquipment(item)}
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Experience */}
                      <div className="space-y-4">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          <Trophy className="w-4 h-4" /> Expérience
                        </h3>
                        <div className="grid gap-2">
                          {EXPERIENCE_LEVELS.map((level) => (
                            <button
                              key={level.id}
                              onClick={() => setEditForm({ ...editForm, experience_level: level.id })}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                editForm.experience_level === level.id
                                  ? "border-primary bg-primary/10"
                                  : "border-slate-700 hover:border-slate-600"
                              }`}
                            >
                              <p className="text-white font-medium">{level.label}</p>
                              <p className="text-slate-400 text-sm">{level.desc}</p>
                            </button>
                          ))}
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-slate-300">Marques déjà travaillées</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newBrand}
                              onChange={(e) => setNewBrand(e.target.value)}
                              placeholder="Nom de marque"
                              className="bg-slate-800 border-slate-700 text-white"
                              onKeyDown={(e) => e.key === "Enter" && addBrand()}
                            />
                            <Button onClick={addBrand} size="sm" variant="outline" className="border-slate-700">
                              +
                            </Button>
                          </div>
                          {editForm.brands_worked.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {editForm.brands_worked.map((brand, i) => (
                                <Badge key={i} variant="secondary" className="bg-slate-700">
                                  {brand}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-300">Résultats obtenus</Label>
                          <Textarea
                            value={editForm.results}
                            onChange={(e) => setEditForm({ ...editForm, results: e.target.value })}
                            placeholder="Ex: 1M+ vues cumulées, ROAS 3x..."
                            className="bg-slate-800 border-slate-700 text-white"
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Rates */}
                      <div className="space-y-4">
                        <h3 className="text-white font-semibold">Tarifs (€/vidéo)</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-slate-300">Minimum</Label>
                            <Input
                              type="number"
                              value={editForm.min_rate}
                              onChange={(e) => setEditForm({ ...editForm, min_rate: e.target.value })}
                              placeholder="100"
                              className="bg-slate-800 border-slate-700 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300">Maximum</Label>
                            <Input
                              type="number"
                              value={editForm.max_rate}
                              onChange={(e) => setEditForm({ ...editForm, max_rate: e.target.value })}
                              placeholder="500"
                              className="bg-slate-800 border-slate-700 text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Availability */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-white">Disponible</Label>
                          <p className="text-slate-400 text-sm">Accepte de nouveaux projets</p>
                        </div>
                        <Switch
                          checked={editForm.available}
                          onCheckedChange={(c) => setEditForm({ ...editForm, available: c })}
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

        {/* Scores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-heading font-bold text-white">{completionScore}%</p>
                  <p className="text-slate-400 text-sm">Complétion</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-3xl font-heading font-bold text-white">{stats?.reliability_score || 0}</p>
                  <p className="text-slate-400 text-sm">Fiabilité</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-3xl font-heading font-bold text-white">{stats?.performance_score || 0}</p>
                  <p className="text-slate-400 text-sm">Performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Section */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Portfolio</CardTitle>
                  {profile?.portfolio_status === "incomplete" && (
                    <p className="text-amber-400 text-sm mt-1">
                      ⚠️ Minimum 3 vidéos recommandé
                    </p>
                  )}
                </div>
                <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-secondary hover:bg-secondary-hover text-secondary-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Ajouter une vidéo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Titre</Label>
                        <Input
                          value={newVideo.title}
                          onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                          placeholder="UGC Beauté - Marque X"
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">URL</Label>
                        <Input
                          value={newVideo.url}
                          onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                          placeholder="https://..."
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Plateforme</Label>
                          <select
                            value={newVideo.platform}
                            onChange={(e) => setNewVideo({ ...newVideo, platform: e.target.value })}
                            className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-white"
                          >
                            <option value="youtube">YouTube</option>
                            <option value="tiktok">TikTok</option>
                            <option value="instagram">Instagram</option>
                            <option value="drive">Drive</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Vues</Label>
                          <Input
                            type="number"
                            value={newVideo.views}
                            onChange={(e) => setNewVideo({ ...newVideo, views: e.target.value })}
                            placeholder="10000"
                            className="bg-slate-900 border-slate-700 text-white"
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
                      <div key={index} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Video className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{video.title}</p>
                            <p className="text-slate-400 text-sm capitalize">{video.platform}</p>
                            {video.views > 0 && (
                              <p className="text-slate-500 text-sm">{video.views.toLocaleString()} vues</p>
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
                    <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Ajoutez vos meilleures créations</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-4">
              <Link to="/trainings">
                <Card className="bg-slate-800 border-slate-700 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Formations</p>
                      <p className="text-slate-400 text-sm">Boost ta visibilité</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 ml-auto" />
                  </CardContent>
                </Card>
              </Link>
              <Link to="/projects">
                <Card className="bg-slate-800 border-slate-700 hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Missions</p>
                      <p className="text-slate-400 text-sm">Voir les offres</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 ml-auto" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Incubator Premium CTA */}
            {!user?.is_premium && (
              <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-heading font-semibold">Incubateur Premium</h3>
                      <p className="text-amber-300 text-sm">49€/mois</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mb-4">
                    Augmente ta visibilité et accède aux missions prioritaires.
                  </p>
                  <ul className="space-y-2 mb-4">
                    {["Priorité dans l'algorithme", "Badge Premium visible", "Briefs exclusifs"].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                        <CheckCircle className="w-4 h-4 text-amber-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => setIncubatorDialogOpen(true)}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    data-testid="join-incubator-btn"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Rejoindre
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Projets terminés</span>
                  <span className="text-white font-medium">{stats?.completed_projects || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Note moyenne</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-white font-medium">{stats?.rating?.toFixed(1) || "0.0"}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Candidatures actives</span>
                  <span className="text-white font-medium">{stats?.active_applications || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Incubator Dialog */}
      <Dialog open={incubatorDialogOpen} onOpenChange={setIncubatorDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Rejoindre l'Incubateur Premium
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-300 mb-6">
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
                <li key={i} className="flex items-center gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="text-center mb-6">
              <p className="text-3xl font-heading font-bold text-white">49€<span className="text-lg text-slate-400">/mois</span></p>
            </div>
            <Button
              onClick={handleJoinIncubator}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
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
