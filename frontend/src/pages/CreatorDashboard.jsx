import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, LogOut, User, MessageSquare, Star, TrendingUp,
  MapPin, Video, Edit, Plus, ExternalLink, CheckCircle,
  Clock, DollarSign, Eye, Settings, Bell
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CONTENT_TYPES = [
  { id: "ugc", label: "UGC" },
  { id: "micro-trottoir", label: "Micro-trottoir" },
  { id: "face-cam", label: "Face cam" },
  { id: "ads", label: "Ads" },
  { id: "interview", label: "Interview" },
  { id: "montage", label: "Montage only" },
];

const SECTORS = [
  "Beauté", "Mode", "Tech", "Food", "Sport", "Lifestyle",
  "Finance", "Immobilier", "Santé", "Éducation", "Voyage", "Gaming"
];

const CreatorDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    bio: "",
    city: "",
    can_travel: false,
    works_remote: true,
    content_types: [],
    sectors: [],
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

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/me/profile`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditForm({
          bio: data.bio || "",
          city: data.city || "",
          can_travel: data.can_travel || false,
          works_remote: data.works_remote ?? true,
          content_types: data.content_types || [],
          sectors: data.sectors || [],
          min_rate: data.min_rate || "",
          max_rate: data.max_rate || "",
          available: data.available ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats/creator`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
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
        toast.success("Profil mis à jour !");
        setEditDialogOpen(false);
        fetchProfile();
      } else {
        throw new Error("Update failed");
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
      {
        ...newVideo,
        views: newVideo.views ? parseInt(newVideo.views) : 0,
      },
    ];

    try {
      const response = await fetch(`${API_URL}/api/creators/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ portfolio_videos: updatedVideos }),
      });

      if (response.ok) {
        toast.success("Vidéo ajoutée !");
        setVideoDialogOpen(false);
        setNewVideo({ url: "", title: "", platform: "youtube", views: "" });
        fetchProfile();
      }
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
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

  const toggleSector = (sector) => {
    setEditForm((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(sector)
        ? prev.sectors.filter((s) => s !== sector)
        : [...prev.sectors, sector],
    }));
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
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
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
              Bonjour, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-slate-600">Gérez votre profil et suivez vos performances</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={profile?.available ? "default" : "secondary"}
              className={profile?.available ? "bg-green-500" : ""}
            >
              {profile?.available ? "Disponible" : "Indisponible"}
            </Badge>
            <Link
              to={`/creators/${user?.user_id}`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Voir mon profil public <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">
                    {profile?.rating?.toFixed(1) || "0.0"}
                  </p>
                  <p className="text-sm text-slate-500">Note moyenne</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-slate-900">
                    {stats?.completed_projects || 0}
                  </p>
                  <p className="text-sm text-slate-500">Projets terminés</p>
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
                    {profile?.reviews_count || 0}
                  </p>
                  <p className="text-sm text-slate-500">Avis reçus</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="profile" data-testid="tab-profile">Mon Profil</TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campagnes</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Informations du profil</CardTitle>
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="edit-profile-btn">
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Modifier mon profil</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          placeholder="Parlez de vous et de votre expérience..."
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ville</Label>
                          <Input
                            value={editForm.city}
                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                            placeholder="Paris"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tarifs (€/vidéo)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editForm.min_rate}
                              onChange={(e) => setEditForm({ ...editForm, min_rate: e.target.value })}
                              placeholder="Min"
                            />
                            <Input
                              type="number"
                              value={editForm.max_rate}
                              onChange={(e) => setEditForm({ ...editForm, max_rate: e.target.value })}
                              placeholder="Max"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Peut se déplacer</Label>
                          <p className="text-sm text-slate-500">Tournages en extérieur</p>
                        </div>
                        <Switch
                          checked={editForm.can_travel}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, can_travel: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Travaille à distance</Label>
                          <p className="text-sm text-slate-500">Création depuis chez vous</p>
                        </div>
                        <Switch
                          checked={editForm.works_remote}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, works_remote: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Disponible</Label>
                          <p className="text-sm text-slate-500">Accepte de nouveaux projets</p>
                        </div>
                        <Switch
                          checked={editForm.available}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, available: checked })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Types de contenu</Label>
                        <div className="flex flex-wrap gap-2">
                          {CONTENT_TYPES.map((type) => (
                            <Badge
                              key={type.id}
                              variant={editForm.content_types.includes(type.id) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleContentType(type.id)}
                            >
                              {type.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Secteurs préférés</Label>
                        <div className="flex flex-wrap gap-2">
                          {SECTORS.map((sector) => (
                            <Badge
                              key={sector}
                              variant={editForm.sectors.includes(sector) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleSector(sector)}
                            >
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button onClick={handleUpdateProfile} className="w-full" data-testid="save-profile-btn">
                        Enregistrer les modifications
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Bio</h3>
                      <p className="text-slate-700">
                        {profile?.bio || "Aucune bio. Cliquez sur Modifier pour en ajouter une."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-700">{profile?.city || "Non renseigné"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile?.can_travel && (
                        <Badge variant="secondary">
                          <CheckCircle className="w-3 h-3 mr-1" /> Se déplace
                        </Badge>
                      )}
                      {profile?.works_remote && (
                        <Badge variant="secondary">
                          <CheckCircle className="w-3 h-3 mr-1" /> Remote
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Tarifs</h3>
                      <p className="text-2xl font-heading font-bold text-slate-900">
                        {profile?.min_rate && profile?.max_rate
                          ? `${profile.min_rate}€ - ${profile.max_rate}€`
                          : "Non renseigné"}
                      </p>
                      <p className="text-sm text-slate-500">par vidéo</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Types de contenu</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile?.content_types?.length > 0 ? (
                          profile.content_types.map((type) => (
                            <Badge key={type} variant="outline">{type}</Badge>
                          ))
                        ) : (
                          <span className="text-slate-500 text-sm">Aucun type sélectionné</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2">Secteurs</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile?.sectors?.length > 0 ? (
                          profile.sectors.map((sector) => (
                            <Badge key={sector} className="bg-secondary text-secondary-foreground">
                              {sector}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-500 text-sm">Aucun secteur sélectionné</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mon Portfolio</CardTitle>
                <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-video-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une vidéo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une vidéo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Titre</Label>
                        <Input
                          value={newVideo.title}
                          onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                          placeholder="UGC Beauté - Marque X"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL (YouTube, Drive, etc.)</Label>
                        <Input
                          value={newVideo.url}
                          onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Plateforme</Label>
                          <select
                            value={newVideo.platform}
                            onChange={(e) => setNewVideo({ ...newVideo, platform: e.target.value })}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          >
                            <option value="youtube">YouTube</option>
                            <option value="tiktok">TikTok</option>
                            <option value="instagram">Instagram</option>
                            <option value="drive">Google Drive</option>
                            <option value="other">Autre</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Vues (optionnel)</Label>
                          <Input
                            type="number"
                            value={newVideo.views}
                            onChange={(e) => setNewVideo({ ...newVideo, views: e.target.value })}
                            placeholder="10000"
                          />
                        </div>
                      </div>
                      <Button onClick={handleAddVideo} className="w-full" data-testid="save-video-btn">
                        Ajouter au portfolio
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {profile?.portfolio_videos?.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {profile.portfolio_videos.map((video, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="aspect-video bg-slate-100 flex items-center justify-center">
                          <Video className="w-12 h-12 text-slate-300" />
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-medium text-slate-900 mb-1">{video.title}</h4>
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <span className="capitalize">{video.platform}</span>
                            {video.views > 0 && (
                              <span>{video.views.toLocaleString()} vues</span>
                            )}
                          </div>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Voir la vidéo <ExternalLink className="w-3 h-3" />
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="font-heading font-semibold text-slate-900 mb-2">
                      Aucune vidéo dans votre portfolio
                    </h3>
                    <p className="text-slate-500 mb-4">
                      Ajoutez vos meilleures créations pour attirer les entreprises
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Mes Campagnes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <h3 className="font-heading font-semibold text-slate-900 mb-2">
                    Aucune campagne en cours
                  </h3>
                  <p className="text-slate-500">
                    Les entreprises vous contacteront directement pour des projets
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CreatorDashboard;
