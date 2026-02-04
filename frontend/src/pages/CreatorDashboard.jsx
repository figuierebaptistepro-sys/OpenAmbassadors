import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video, MapPin, Edit, Plus, CheckCircle, Star, Trophy, TrendingUp, 
  BookOpen, Briefcase, ChevronRight, Award, Crown, Check, Globe, Camera, Wallet, ShieldCheck,
  Upload, Link as LinkIcon, X, Play, Trash2, Loader2
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
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
const VISIBILITY_OPTIONS = [
  { value: "1K", label: "1K+" },
  { value: "5K", label: "5K+" },
  { value: "10K", label: "10K+" },
  { value: "35K", label: "35K+" },
  { value: "50K", label: "50K+" },
  { value: "100K", label: "100K+" },
  { value: "250K", label: "250K+" },
  { value: "1M", label: "1M+" },
];

const getChecklistItems = (profile, user) => [
  { id: "picture", label: "Ajouter une photo de profil", points: 15, done: !!user?.picture },
  { id: "bio", label: "Ajouter une bio", points: 5, done: !!profile?.bio },
  { id: "city", label: "Renseigner votre ville", points: 10, done: !!profile?.city },
  { id: "content_types", label: "Sélectionner vos spécialités", points: 10, done: profile?.content_types?.length > 0 },
  { id: "equipment", label: "Lister votre matériel", points: 10, done: profile?.equipment?.length > 0 },
  { id: "portfolio", label: "Ajouter 3 vidéos", points: 20, done: profile?.portfolio_videos?.length >= 3 },
  { id: "rates", label: "Définir vos tarifs", points: 10, done: !!profile?.min_rate },
  { id: "social", label: "Lier vos réseaux sociaux", points: 15, done: !!(profile?.social_instagram || profile?.social_tiktok || profile?.social_youtube) },
  { id: "visibility", label: "Indiquer votre audience", points: 10, done: !!profile?.visibility },
];

const CreatorDashboard = ({ user, onUserUpdate }) => {
  const navigate = useNavigate();
  const videoInputRef = useRef(null);
  const pictureInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(""); // "compressing", "uploading"
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const ffmpegRef = useRef(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  const [editForm, setEditForm] = useState({
    bio: "", city: "", phone: "", content_types: [], equipment: [], min_rate: "", max_rate: "",
    works_remote: false, can_travel: false, available: true,
    social_instagram: "", social_tiktok: "", social_youtube: "", social_twitter: "", social_linkedin: "",
    visibility: "",
  });
  const [newVideoUrl, setNewVideoUrl] = useState("");

  useEffect(() => { fetchData(); }, []);

  // Upload photo de profil
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
        toast.success("Photo mise à jour !");
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
      const [profileRes, statsRes, walletRes] = await Promise.all([
        fetch(`${API_URL}/api/creators/me/profile`, { credentials: "include" }),
        fetch(`${API_URL}/api/stats/creator`, { credentials: "include" }),
        fetch(`${API_URL}/api/wallet`, { credentials: "include" }),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setEditForm({
          bio: data.bio || "", city: data.city || "", phone: data.phone || "",
          content_types: data.content_types || [], equipment: data.equipment || [],
          min_rate: data.min_rate || "", max_rate: data.max_rate || "",
          works_remote: data.works_remote || false, can_travel: data.can_travel || false,
          available: data.available ?? true,
          social_instagram: data.social_instagram || "",
          social_tiktok: data.social_tiktok || "",
          social_youtube: data.social_youtube || "",
          social_twitter: data.social_twitter || "",
          social_linkedin: data.social_linkedin || "",
          visibility: data.visibility || "",
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

  const handleVideoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    const allowedTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/mpeg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez MP4, MOV, WebM ou AVI");
      return;
    }

    // Vérifier la taille (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Fichier trop volumineux (max 500MB)");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simuler la progression (car fetch ne supporte pas le suivi natif)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch(`${API_URL}/api/upload/portfolio`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const data = await response.json();
        
        // Ajouter la vidéo au portfolio - utiliser data.url (pas media_url)
        const portfolioResponse = await fetch(`${API_URL}/api/creators/me/portfolio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ 
            url: data.url,
            title: file.name.replace(/\.[^/.]+$/, ""),
            type: "uploaded"
          }),
        });

        if (portfolioResponse.ok) {
          toast.success("Vidéo uploadée avec succès !");
          setVideoDialogOpen(false);
          fetchData();
        } else {
          toast.error("Erreur lors de l'ajout au portfolio");
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur lors de l'upload");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleDeleteVideo = async (videoIndex) => {
    try {
      const response = await fetch(`${API_URL}/api/creators/me/portfolio/${videoIndex}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        toast.success("Vidéo supprimée");
        fetchData();
      } else {
        toast.error("Erreur lors de la suppression");
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

  const [selectedVideo, setSelectedVideo] = useState(null);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const checklistItems = getChecklistItems(profile, user);
  const completedItems = checklistItems.filter(i => i.done).length;
  const totalPoints = checklistItems.reduce((sum, i) => sum + (i.done ? i.points : 0), 0);
  const maxPoints = checklistItems.reduce((sum, i) => sum + i.points, 0);

  // Gestion des actions de la checklist
  const handleChecklistAction = (itemId) => {
    if (itemId === "picture") {
      pictureInputRef.current?.click();
    } else if (itemId === "portfolio") {
      setVideoDialogOpen(true);
    } else {
      setEditSheetOpen(true);
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
                        {user?.is_premium ? (
                          <Badge className="bg-gradient-to-r from-primary to-pink-500 text-white text-xs shadow-sm shadow-primary/30">
                            <Crown className="w-3 h-3 mr-1" />Premium
                          </Badge>
                        ) : completedItems === checklistItems.length && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs"><ShieldCheck className="w-3 h-3 mr-1" />Vérifié</Badge>
                        )}
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
                
                {/* Input caché pour l'upload de photo */}
                <input
                  ref={pictureInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePictureUpload}
                  className="hidden"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {checklistItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => !item.done && handleChecklistAction(item.id)}
                      disabled={uploadingPicture && item.id === "picture"}
                      className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                        item.done ? "bg-green-50" : "bg-gray-50 hover:bg-gray-100"
                      } ${uploadingPicture && item.id === "picture" ? "opacity-50" : ""}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        item.done ? "bg-green-500" : "bg-gray-200"
                      }`}>
                        {item.done ? <Check className="w-3 h-3 text-white" /> : 
                         (uploadingPicture && item.id === "picture") ? 
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> : null}
                      </div>
                      <span className={`text-xs flex-1 ${item.done ? "text-green-700" : "text-gray-700"}`}>
                        {uploadingPicture && item.id === "picture" ? "Upload..." : item.label}
                      </span>
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {profile.portfolio_videos.map((video, i) => (
                      <div 
                        key={i} 
                        className="relative group aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden cursor-pointer"
                        onClick={() => setSelectedVideo(video)}
                      >
                        {video.url?.includes('.mp4') || video.url?.includes('.mov') || video.url?.includes('.webm') || video.type === 'uploaded' ? (
                          <video 
                            src={`${getImageUrl(video.url)}#t=0.5`}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                            onLoadedData={(e) => {
                              // Seek to 0.5s to show preview frame
                              e.target.currentTime = 0.5;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                            <Play className="w-8 h-8 text-white/60" />
                          </div>
                        )}
                        {/* Overlay play */}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        </div>
                        {/* Delete button */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteVideo(i); }} 
                          className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
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
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">Ma Cagnotte</span>
                  </div>
                  {user?.is_premium && (
                    <Badge className="bg-primary/10 text-primary text-xs">0% frais</Badge>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-gray-500 text-xs mb-1">Solde disponible</p>
                  <p className="font-heading text-xl font-bold text-gray-900">
                    {((wallet?.balance || 0) - (wallet?.pending_amount || 0)).toFixed(2)}€
                  </p>
                  {wallet?.pending_amount > 0 && (
                    <p className="text-yellow-600 text-xs mt-1">{wallet.pending_amount.toFixed(2)}€ en attente</p>
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
                    19.99€/mois
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Ville</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="bg-gray-50 border-gray-200 mt-1" placeholder="Paris" />
              </div>
              <div>
                <Label className="text-sm">Téléphone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="bg-gray-50 border-gray-200 mt-1" placeholder="06 12 34 56 78" />
              </div>
            </div>
            
            {/* Visibility */}
            <div>
              <Label className="text-sm">Audience globale (abonnés)</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, visibility: opt.value })}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${
                      editForm.visibility === opt.value
                        ? "bg-primary text-white"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-2">
              <Label className="text-sm">Réseaux sociaux</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">Instagram</span>
                  <Input value={editForm.social_instagram} onChange={(e) => setEditForm({ ...editForm, social_instagram: e.target.value })}
                    className="bg-gray-50 border-gray-200 flex-1" placeholder="@votre_compte" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">TikTok</span>
                  <Input value={editForm.social_tiktok} onChange={(e) => setEditForm({ ...editForm, social_tiktok: e.target.value })}
                    className="bg-gray-50 border-gray-200 flex-1" placeholder="@votre_compte" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">YouTube</span>
                  <Input value={editForm.social_youtube} onChange={(e) => setEditForm({ ...editForm, social_youtube: e.target.value })}
                    className="bg-gray-50 border-gray-200 flex-1" placeholder="URL de la chaîne" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">Twitter/X</span>
                  <Input value={editForm.social_twitter} onChange={(e) => setEditForm({ ...editForm, social_twitter: e.target.value })}
                    className="bg-gray-50 border-gray-200 flex-1" placeholder="@votre_compte" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">LinkedIn</span>
                  <Input value={editForm.social_linkedin} onChange={(e) => setEditForm({ ...editForm, social_linkedin: e.target.value })}
                    className="bg-gray-50 border-gray-200 flex-1" placeholder="URL du profil" />
                </div>
              </div>
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

      {/* Add Video Sheet (better for mobile) */}
      <Sheet open={videoDialogOpen} onOpenChange={(open) => { 
        setVideoDialogOpen(open); 
        if (!open) { 
          setNewVideoUrl(""); 
          setUploadMode("file");
        } 
      }}>
        <SheetContent side="bottom" className="bg-white rounded-t-2xl h-auto max-h-[85vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-gray-900 text-center">Ajouter une vidéo</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-6">
            {/* Input file visible avec label - meilleure compatibilité mobile */}
            <input
              ref={videoInputRef}
              id="video-upload-input"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/mpeg,.mp4,.mov,.webm,.avi"
              onChange={handleVideoFileUpload}
              className="hidden"
            />
            
            {uploading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-gray-600 text-sm">Upload en cours...</p>
                    <p className="text-primary font-semibold">{uploadProgress}%</p>
                  </div>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            ) : (
              <>
                {/* Bouton principal pour upload fichier */}
                <label 
                  htmlFor="video-upload-input"
                  className="block w-full border-2 border-dashed border-primary/50 bg-primary/5 rounded-xl p-6 text-center cursor-pointer active:bg-primary/10 transition-all touch-manipulation"
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-gray-900 font-semibold text-base mb-2">
                    📱 Choisir une vidéo
                  </p>
                  <p className="text-gray-500 text-sm">Appuyez pour ouvrir votre galerie</p>
                  <p className="text-gray-400 text-xs mt-2">MP4, MOV, WebM • Max 500MB</p>
                </label>
                
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                  <p className="text-green-700 text-xs text-center">
                    ✅ Stockage Cloudflare R2 inclus
                  </p>
                </div>

                {/* Séparateur */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-gray-400">ou ajouter un lien</span>
                  </div>
                </div>

                {/* Option lien URL - toujours visible mais secondaire */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input 
                      value={newVideoUrl} 
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="bg-gray-50 border-gray-200 h-11 flex-1" 
                      placeholder="https://tiktok.com/..." 
                    />
                    <Button 
                      onClick={handleAddVideo} 
                      disabled={!newVideoUrl}
                      variant="outline"
                      className="h-11 px-4 border-gray-200"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-gray-400 text-xs text-center">TikTok, Instagram, YouTube...</p>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
              <p className="font-heading text-3xl font-bold text-gray-900">19.99€<span className="text-sm font-normal text-gray-500">/mois</span></p>
            </div>
            <ul className="space-y-2 mb-4">
              {["Visibilité boostée", "Missions exclusives", "Formations premium", "Badge vérifié"].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-primary hover:bg-primary-hover">S&apos;abonner</Button>
            <p className="text-gray-400 text-xs text-center mt-2">Annulable à tout moment</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setSelectedVideo(null)}
        >
          {/* Close button */}
          <button 
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          {/* Video container - 9/16 ratio */}
          <div 
            className="relative w-full max-w-[400px] aspect-[9/16] bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedVideo.url?.includes('.mp4') || selectedVideo.url?.includes('.mov') || selectedVideo.url?.includes('.webm') || selectedVideo.type === 'uploaded' ? (
              <video 
                src={getImageUrl(selectedVideo.url)} 
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <Globe className="w-12 h-12 mb-4 opacity-60" />
                <p className="text-sm mb-4 opacity-80">Lien externe</p>
                <a 
                  href={selectedVideo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Ouvrir le lien
                </a>
              </div>
            )}
          </div>
          
          {/* Video title */}
          {selectedVideo.title && (
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-white text-sm font-medium truncate bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full inline-block">
                {selectedVideo.title}
              </p>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default CreatorDashboard;
