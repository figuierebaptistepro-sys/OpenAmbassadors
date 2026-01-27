import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video, MapPin, Edit, Plus, CheckCircle, Star, Trophy, TrendingUp, 
  BookOpen, Briefcase, ChevronRight, Award, Crown, Check, Globe, Camera, Wallet, ShieldCheck
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Progress } from "../components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CONTENT_TYPES = ["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview", "Montage"];
const EQUIPMENT_OPTIONS = ["Smartphone", "Caméra", "Micro", "Éclairage", "Trépied", "Stabilisateur"];

const getChecklistItems = (profile) => [
  { id: "bio", label: "Ajouter une bio", points: 5, done: !!profile?.bio },
  { id: "city", label: "Renseigner votre ville", points: 10, done: !!profile?.city },
  { id: "content_types", label: "Sélectionner vos spécialités", points: 10, done: profile?.content_types?.length > 0 },
  { id: "equipment", label: "Lister votre matériel", points: 10, done: profile?.equipment?.length > 0 },
  { id: "portfolio", label: "Ajouter 3 vidéos", points: 20, done: profile?.portfolio_videos?.length >= 3 },
  { id: "rates", label: "Définir vos tarifs", points: 10, done: !!profile?.min_rate },
];

const CreatorDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    bio: "", city: "", content_types: [], equipment: [], min_rate: "", max_rate: "",
    works_remote: false, can_travel: false, available: true,
  });
  const [newVideoUrl, setNewVideoUrl] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [profileRes, statsRes, walletRes] = await Promise.all([
        fetch(`${API_URL}/api/creators/me/profile`, { credentials: "include" }),
        fetch(`${API_URL}/api/stats/creator`, { credentials: "include" }),
        fetch(`${API_URL}/api/wallet`, { credentials: "include" }),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setEditForm({
          bio: data.bio || "", city: data.city || "", 
          content_types: data.content_types || [], equipment: data.equipment || [],
          min_rate: data.min_rate || "", max_rate: data.max_rate || "",
          works_remote: data.works_remote || false, can_travel: data.can_travel || false,
          available: data.available ?? true,
        });
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (walletRes.ok) setWallet(await walletRes.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...editForm,
          min_rate: parseInt(editForm.min_rate) || null,
          max_rate: parseInt(editForm.max_rate) || null,
        }),
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

  const handleAddVideo = async () => {
    if (!newVideoUrl) return;
    try {
      const response = await fetch(`${API_URL}/api/creators/me/portfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: newVideoUrl }),
      });
      if (response.ok) {
        toast.success("Vidéo ajoutée !");
        setVideoDialogOpen(false);
        setNewVideoUrl("");
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

  const checklistItems = getChecklistItems(profile);
  const completedItems = checklistItems.filter(i => i.done).length;
  const totalPoints = checklistItems.reduce((sum, i) => sum + (i.done ? i.points : 0), 0);
  const maxPoints = checklistItems.reduce((sum, i) => sum + i.points, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">
              Bienvenue{profile?.name ? `, ${profile.name}` : ""} 👋
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">Gérez votre profil et trouvez des missions</p>
          </div>
          <Button onClick={() => setEditSheetOpen(true)} variant="outline" size="sm" className="border-gray-200 text-xs">
            <Edit className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Modifier</span>
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Profile Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="h-20 sm:h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5">
                  {user?.banner && <img src={getImageUrl(user.banner)} alt="" className="w-full h-full object-cover" />}
                </div>
                <CardContent className="p-4 -mt-10 sm:-mt-12">
                  <div className="flex items-end gap-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white shadow-lg border-2 border-white overflow-hidden flex-shrink-0">
                      {user?.picture ? (
                        <img src={getImageUrl(user.picture)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary">{(profile?.name || "C")[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="pb-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-heading font-bold text-gray-900 text-sm sm:text-base">{profile?.name || "Créateur"}</h2>
                        {user?.is_premium && <Badge className="bg-primary text-xs"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
                        {profile?.available && <Badge className="bg-green-100 text-green-700 text-xs">Dispo</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        {profile?.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.city}</span>}
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />{profile?.rating?.toFixed(1) || "5.0"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Progress */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-semibold text-gray-900 text-sm">Compléter mon profil</h3>
                  <Badge className="bg-primary/10 text-primary text-xs">{totalPoints}/{maxPoints} pts</Badge>
                </div>
                <Progress value={(completedItems / checklistItems.length) * 100} className="h-2 mb-4" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {checklistItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => !item.done && setEditSheetOpen(true)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                        item.done ? "bg-green-50" : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        item.done ? "bg-green-500" : "bg-gray-200"
                      }`}>
                        {item.done && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs flex-1 ${item.done ? "text-green-700" : "text-gray-700"}`}>{item.label}</span>
                      <span className={`text-xs ${item.done ? "text-green-600" : "text-gray-400"}`}>+{item.points}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 text-sm">Portfolio</CardTitle>
                  <Button onClick={() => setVideoDialogOpen(true)} size="sm" variant="outline" className="border-gray-200 text-xs">
                    <Plus className="w-4 h-4 mr-1" />
                    Vidéo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4">
                {profile?.portfolio_videos?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {profile.portfolio_videos.map((video, i) => (
                      <a key={i} href={video.url} target="_blank" rel="noopener noreferrer"
                         className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <Video className="w-6 h-6 text-gray-400" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs mb-2">Ajoutez vos meilleures vidéos</p>
                    <Button onClick={() => setVideoDialogOpen(true)} size="sm" variant="outline" className="border-gray-200 text-xs">
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                )}
                {profile?.portfolio_videos?.length > 0 && profile.portfolio_videos.length < 3 && (
                  <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-700 text-xs">⚠️ Ajoutez au moins 3 vidéos pour un portfolio complet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Wallet Widget */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    <span className="font-semibold text-sm">Ma Cagnotte</span>
                  </div>
                  {user?.is_premium && (
                    <Badge className="bg-white/20 text-white text-xs">0% frais</Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-3">
                <div className="text-center mb-3">
                  <p className="text-gray-500 text-xs">Solde disponible</p>
                  <p className="font-heading text-2xl font-bold text-gray-900">
                    {((wallet?.balance || 0) - (wallet?.pending_amount || 0)).toFixed(2)}€
                  </p>
                  {wallet?.pending_amount > 0 && (
                    <p className="text-yellow-600 text-xs">{wallet.pending_amount.toFixed(2)}€ en attente</p>
                  )}
                </div>
                <Button 
                  onClick={() => navigate("/wallet")} 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-gray-200 text-xs"
                  data-testid="wallet-link"
                >
                  Gérer ma cagnotte
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-heading font-semibold text-gray-900 mb-3 text-sm">Statistiques</h3>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {[
                    { icon: Trophy, label: "Score", value: `${profile?.completion_score || 0}%`, color: "bg-primary/10 text-primary" },
                    { icon: Briefcase, label: "Missions", value: stats?.total_missions || "—", color: "bg-blue-100 text-blue-600" },
                    { icon: TrendingUp, label: "Vues profil", value: stats?.profile_views || "—", color: "bg-green-100 text-green-600" },
                    { icon: Star, label: "Note", value: profile?.rating?.toFixed(1) || "5.0", color: "bg-yellow-100 text-yellow-600" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="font-heading font-bold text-sm">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Premium CTA */}
            {!user?.is_premium && (
              <Card className="border-0 shadow-sm bg-gradient-to-br from-primary to-primary-hover text-white">
                <CardContent className="p-4">
                  <Crown className="w-6 h-6 mb-2" />
                  <h4 className="font-heading font-bold text-sm mb-1">Passer Premium</h4>
                  <p className="text-white/80 text-xs mb-3">Boostez votre visibilité et accédez aux missions exclusives</p>
                  <Button onClick={() => setPremiumDialogOpen(true)} size="sm" className="w-full bg-white text-primary hover:bg-gray-100 text-xs">
                    49€/mois
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                {[
                  { icon: Briefcase, label: "Voir les missions", path: "/projects" },
                  { icon: BookOpen, label: "Formations", path: "/learn" },
                  { icon: Award, label: "Mon profil public", path: `/creators/${user?.user_id}` },
                ].map((item, i) => (
                  <Link key={i} to={item.path} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
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
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm">Bio</Label>
              <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full h-20 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none text-sm mt-1" placeholder="Présentez-vous..." />
            </div>
            <div>
              <Label className="text-sm">Ville</Label>
              <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="bg-gray-50 border-gray-200 mt-1" placeholder="Paris" />
            </div>
            <div>
              <Label className="text-sm">Spécialités</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {CONTENT_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={editForm.content_types.includes(type)}
                      onChange={(e) => setEditForm({ ...editForm, content_types: e.target.checked 
                        ? [...editForm.content_types, type] 
                        : editForm.content_types.filter(t => t !== type) })}
                      className="rounded border-gray-300" />
                    <span className="text-xs">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm">Équipement</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <label key={eq} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={editForm.equipment.includes(eq)}
                      onChange={(e) => setEditForm({ ...editForm, equipment: e.target.checked 
                        ? [...editForm.equipment, eq] 
                        : editForm.equipment.filter(t => t !== eq) })}
                      className="rounded border-gray-300" />
                    <span className="text-xs">{eq}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Tarif min (€)</Label>
                <Input type="number" value={editForm.min_rate} onChange={(e) => setEditForm({ ...editForm, min_rate: e.target.value })}
                  className="bg-gray-50 border-gray-200 mt-1" placeholder="100" />
              </div>
              <div>
                <Label className="text-sm">Tarif max (€)</Label>
                <Input type="number" value={editForm.max_rate} onChange={(e) => setEditForm({ ...editForm, max_rate: e.target.value })}
                  className="bg-gray-50 border-gray-200 mt-1" placeholder="500" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm">Disponible</span>
                <Switch checked={editForm.available} onCheckedChange={(c) => setEditForm({ ...editForm, available: c })} />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm">Travaille à distance</span>
                <Switch checked={editForm.works_remote} onCheckedChange={(c) => setEditForm({ ...editForm, works_remote: c })} />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm">Se déplace</span>
                <Switch checked={editForm.can_travel} onCheckedChange={(c) => setEditForm({ ...editForm, can_travel: c })} />
              </div>
            </div>
            <Button onClick={handleSaveProfile} className="w-full bg-primary hover:bg-primary-hover">Enregistrer</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Video Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Ajouter une vidéo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">URL de la vidéo</Label>
              <Input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)}
                className="bg-gray-50 border-gray-200 mt-1" placeholder="https://tiktok.com/..." />
              <p className="text-gray-400 text-xs mt-1">TikTok, Instagram, YouTube</p>
            </div>
            <Button onClick={handleAddVideo} className="w-full bg-primary hover:bg-primary-hover">Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Dialog */}
      <Dialog open={premiumDialogOpen} onOpenChange={setPremiumDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Passer Premium
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center mb-4">
              <p className="font-heading text-3xl font-bold text-gray-900">49€<span className="text-sm font-normal text-gray-500">/mois</span></p>
            </div>
            <ul className="space-y-2 mb-4">
              {["Visibilité boostée", "Missions exclusives", "Formations premium", "Badge vérifié"].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-primary hover:bg-primary-hover">S'abonner</Button>
            <p className="text-gray-400 text-xs text-center mt-2">Annulable à tout moment</p>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default CreatorDashboard;
