import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Star, Clock, Briefcase, Heart, Share2, 
  Play, X, CheckCircle, Send, Video, Image as ImageIcon, 
  Building2, Quote, ChevronRight, Sparkles, Calendar, Euro,
  Instagram, Youtube, ExternalLink, Eye, Award, TrendingUp,
  MessageCircle, Globe, Zap, Shield, Users, Package, FileText,
  Target, Megaphone, Camera, Mic, Scissors, CheckCircle2
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const BUDGET_RANGES = [
  { value: "< 300", label: "Moins de 300€" },
  { value: "300-500", label: "300€ - 500€" },
  { value: "500-1000", label: "500€ - 1 000€" },
  { value: "1000-2500", label: "1 000€ - 2 500€" },
  { value: "2500-5000", label: "2 500€ - 5 000€" },
  { value: "> 5000", label: "Plus de 5 000€" },
];

const OBJECTIVES = [
  { value: "notoriete", label: "Notoriété", icon: Megaphone },
  { value: "ads", label: "Ads / Publicité", icon: Target },
  { value: "ugc", label: "UGC", icon: Camera },
  { value: "micro-trottoir", label: "Micro-trottoir", icon: Mic },
  { value: "autre", label: "Autre", icon: FileText },
];

const DIFFUSION_TYPES = [
  { value: "organique", label: "Organique (compte créateur)" },
  { value: "ads-3mois", label: "Ads - 3 mois" },
  { value: "ads-6mois", label: "Ads - 6 mois" },
  { value: "ads-illimite", label: "Ads - Illimité" },
];

const SERVICE_ICONS = {
  "UGC": Camera,
  "Face cam": Video,
  "Ads": Target,
  "Micro-trottoir": Mic,
  "Interview": MessageCircle,
  "Montage": Scissors,
};

const CreatorProfileV2 = ({ currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [collaborationDialogOpen, setCollaborationDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const decisionBlockRef = useRef(null);
  
  const [collabForm, setCollabForm] = useState({
    budget_range: "",
    objective: "",
    diffusion_type: "",
    deadline: "",
    brief: "",
    product_sent: "",
    shipping_address: "",
  });

  useEffect(() => { 
    fetchCreator(); 
    fetchReviews();
  }, [userId]);

  // Sticky bar visibility
  useEffect(() => {
    const handleScroll = () => {
      if (decisionBlockRef.current) {
        const rect = decisionBlockRef.current.getBoundingClientRect();
        setShowStickyBar(rect.bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchCreator = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/${userId}`, { credentials: "include" });
      if (response.ok) {
        setCreator(await response.json());
      } else {
        toast.error("Créateur non trouvé");
        navigate(-1);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/${userId}/reviews`, { credentials: "include" });
      if (response.ok) setReviews(await response.json());
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const handleCollaborationRequest = async () => {
    if (!collabForm.brief.trim()) {
      toast.error("Veuillez décrire votre projet");
      return;
    }
    if (currentUser?.user_type !== "business") {
      toast.error("Seules les entreprises peuvent envoyer des demandes");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/collaboration-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          creator_id: userId, 
          content_types: [collabForm.objective],
          platforms: [],
          budget_range: collabForm.budget_range,
          deadline: collabForm.deadline,
          brief: collabForm.brief,
          deliverables: `Type: ${collabForm.diffusion_type}`,
          additional_info: collabForm.product_sent === "yes" 
            ? `Produit envoyé: Oui - Adresse: ${collabForm.shipping_address}` 
            : "Produit envoyé: Non"
        })
      });
      if (response.ok) {
        toast.success("Demande envoyée avec succès !");
        setCollaborationDialogOpen(false);
        setCollabForm({ budget_range: "", objective: "", diffusion_type: "", deadline: "", brief: "", product_sent: "", shipping_address: "" });
      } else {
        const error = await response.json();
        if (error.detail?.includes("Abonnement")) {
          navigate("/billing", { state: { reason: "contact_creator", creatorName: creator?.name } });
        } else {
          toast.error(error.detail || "Erreur lors de l'envoi");
        }
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout user={currentUser}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Chargement du profil...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!creator) return null;

  const isNewCreator = !creator?.completed_projects && !creator?.reviews_count && !creator?.rating;
  const hasVideos = creator.portfolio_videos?.length > 0;
  const hasPhotos = creator.portfolio_photos?.length > 0;
  const hasBrands = creator.brands_worked?.length > 0;
  const hasReviews = reviews?.length > 0;
  const avgRating = creator.rating || 5;
  const reviewCount = creator.reviews_count || 0;

  // Dynamic badges
  const badges = [];
  if (creator.is_premium) badges.push({ label: "Premium", color: "bg-gradient-to-r from-amber-500 to-orange-500 text-white", icon: Award });
  if (creator.is_verified) badges.push({ label: "Vérifié", color: "bg-blue-500 text-white", icon: CheckCircle2 });
  if (isNewCreator) badges.push({ label: "Nouveau", color: "bg-sky-500 text-white", icon: Sparkles });
  if (creator.last_active_recent) badges.push({ label: "Actif", color: "bg-emerald-500 text-white", icon: Zap });

  return (
    <AppLayout user={currentUser}>
      {/* Back Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER - Centré */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ══════════════════════════════════════════════════════════════
            1) HERO SECTION
        ══════════════════════════════════════════════════════════════ */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100"
        >
          {/* Cover */}
          <div className="h-36 sm:h-44 lg:h-52 bg-gradient-to-br from-primary/10 via-pink-50 to-orange-50 relative overflow-hidden">
            {creator.banner ? (
              <img src={getImageUrl(creator.banner)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 opacity-40">
                <div className="absolute top-8 left-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-4 right-12 w-48 h-48 bg-orange-200/30 rounded-full blur-3xl" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
          </div>

          {/* Profile Info - Centré */}
          <div className="px-6 sm:px-10 lg:px-16 pb-8 -mt-16 relative">
            <div className="flex flex-col items-center text-center">
              
              {/* Avatar */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative mb-4"
              >
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white shadow-2xl border-4 border-white overflow-hidden ring-4 ring-white">
                  {creator.picture ? (
                    <img src={getImageUrl(creator.picture)} alt={creator.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">{(creator.name || "C")[0].toUpperCase()}</span>
                    </div>
                  )}
                </div>
                {creator.available && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-white" />
                )}
              </motion.div>

              {/* Name + Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
                  {creator.name || "Créateur"}
                </h1>
                {badges.map((badge, i) => (
                  <Badge key={i} className={`${badge.color} gap-1.5 px-3 py-1 text-xs font-semibold shadow-sm`}>
                    <badge.icon className="w-3.5 h-3.5" />
                    {badge.label}
                  </Badge>
                ))}
              </div>

              {/* Tagline */}
              {(creator.tagline || creator.bio) && (
                <p className="text-gray-600 text-base sm:text-lg max-w-2xl mb-5 line-clamp-2">
                  {creator.tagline || creator.bio}
                </p>
              )}

              {/* Stats Pills */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
                {creator.city && (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {creator.city}
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Répond {creator.response_time || "< 24h"}
                </div>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  {creator.completed_projects || 0} projet{(creator.completed_projects || 0) !== 1 ? "s" : ""}
                </div>
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 rounded-full text-sm text-amber-700 font-medium">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)} ({reviewCount} avis)
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════
            2) BLOC DÉCISION CENTRAL
        ══════════════════════════════════════════════════════════════ */}
        <motion.section 
          ref={decisionBlockRef}
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden"
        >
          <div className="p-6 sm:p-8 lg:p-10">
            {/* Top row: Price + Info */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
              
              {/* Prix */}
              <div className="flex items-baseline gap-3">
                <span className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
                  {creator.min_rate || "—"}
                </span>
                {creator.min_rate && <span className="text-2xl font-semibold text-gray-400">€</span>}
                <span className="text-gray-500 text-sm ml-1">À partir de</span>
              </div>

              {/* Info Pills */}
              <div className="flex flex-wrap items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium ${
                  creator.available 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${creator.available ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`} />
                  {creator.available ? "Disponible" : "Indisponible"}
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 rounded-full text-blue-700 border border-blue-200">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Répond en moins de 24h</span>
                </div>

                {reviewCount > 0 ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 rounded-full text-amber-700 border border-amber-200">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span className="font-medium">{avgRating.toFixed(1)} ({reviewCount} avis)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-sky-50 rounded-full text-sky-700 border border-sky-200">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">Nouveau créateur</span>
                  </div>
                )}

                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-full text-gray-600 border border-gray-200">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">Paiement sécurisé</span>
                </div>
              </div>
            </div>

            {/* CTA Principal */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button 
                onClick={() => setCollaborationDialogOpen(true)}
                className="w-full sm:flex-1 h-16 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                data-testid="main-cta-btn"
              >
                <Send className="w-5 h-5 mr-3" />
                Demander une collaboration
              </Button>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  size="lg"
                  className={`h-16 px-6 rounded-2xl border-2 font-semibold transition-all ${
                    isFavorite ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500" : ""}`} />
                </Button>
                <Button variant="outline" size="lg" className="h-16 px-6 rounded-2xl border-2 border-gray-200 hover:border-gray-300 font-semibold">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Sous-texte */}
            <p className="text-center text-sm text-gray-500 mt-4">
              Réponse sous 24h • Sans engagement
            </p>
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════
            3) SECTION VIDÉOS
        ══════════════════════════════════════════════════════════════ */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Réalisations vidéo</h2>
            {hasVideos && <span className="text-sm text-gray-400 ml-auto">{creator.portfolio_videos.length} vidéo{creator.portfolio_videos.length > 1 ? "s" : ""}</span>}
          </div>
          
          {hasVideos ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {creator.portfolio_videos.slice(0, 6).map((video, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className="group relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                  onClick={() => setSelectedVideo(video)}
                  data-testid={`video-thumb-${i}`}
                >
                  {video.thumbnail ? (
                    <img src={getImageUrl(video.thumbnail)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={`${getImageUrl(video.url)}#t=0.5`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                      <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  {video.content_type && (
                    <Badge className="absolute top-2 left-2 bg-white/90 text-gray-900 text-[10px] font-medium shadow-sm">
                      {video.content_type}
                    </Badge>
                  )}

                  {video.views && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                      <Eye className="w-3 h-3" />
                      {video.views > 1000 ? `${(video.views/1000).toFixed(1)}K` : video.views}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-10 text-center">
              <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune vidéo ajoutée</p>
            </div>
          )}
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════
            4) SECTION PHOTOS
        ══════════════════════════════════════════════════════════════ */}
        {hasPhotos && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Portfolio photo</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {creator.portfolio_photos.slice(0, 8).map((photo, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img src={getImageUrl(photo.url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            5) SECTION MARQUES
        ══════════════════════════════════════════════════════════════ */}
        {hasBrands && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Marques</h2>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {creator.brands_worked.map((brand, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="px-6 py-3 bg-white rounded-xl border border-gray-200 text-sm font-medium text-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                >
                  {brand}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            6) SECTION AVIS
        ══════════════════════════════════════════════════════════════ */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Avis des marques</h2>
            </div>
            {hasReviews && (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <span className="text-gray-400">({reviewCount})</span>
              </div>
            )}
          </div>
          
          {hasReviews ? (
            <div className="space-y-4">
              {reviews.slice(0, 3).map((review, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{review.business_name || "Entreprise"}</p>
                          {review.project_title && <p className="text-sm text-gray-400">{review.project_title}</p>}
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {reviews.length > 3 && (
                <Button variant="ghost" className="w-full text-primary hover:bg-primary/5 font-semibold">
                  Voir les {reviews.length} avis
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-10 text-center border border-sky-100">
              <Sparkles className="w-12 h-12 text-sky-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-1">Ce créateur est nouveau sur OpenAmbassadors</p>
              <p className="text-gray-500 text-sm">Soyez parmi les premières marques à collaborer.</p>
            </div>
          )}
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════
            7) SECTION SERVICES
        ══════════════════════════════════════════════════════════════ */}
        {creator.content_types?.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Types de collaborations</h2>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {creator.content_types.map((type, i) => {
                const IconComponent = SERVICE_ICONS[type] || Zap;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-primary hover:text-primary transition-colors"
                  >
                    <IconComponent className="w-4 h-4" />
                    {type}
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════════
            8) SECTION TRUST / GARANTIES
        ══════════════════════════════════════════════════════════════ */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-10 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Garantie OpenAmbassadors</h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: "Paiement sécurisé", color: "emerald" },
              { icon: CheckCircle, label: "Transaction protégée", color: "blue" },
              { icon: Users, label: "Support disponible", color: "purple" },
              { icon: FileText, label: "Gestion des droits", color: "amber" },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 p-4 bg-${item.color}-50 rounded-xl border border-${item.color}-100`}>
                <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STICKY CTA BAR (bas de page)
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-2xl shadow-gray-300/50"
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    {creator.picture ? (
                      <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{(creator.name || "C")[0]}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{creator.name}</p>
                    <p className="text-sm text-gray-500">
                      À partir de <span className="font-bold text-gray-900">{creator.min_rate || "—"}€</span>
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setCollaborationDialogOpen(true)}
                  className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25"
                >
                  Demander une collaboration
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          MODAL COLLABORATION
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={collaborationDialogOpen} onOpenChange={setCollaborationDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-0">
          <div className="sticky top-0 bg-white z-10 px-8 pt-8 pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold">Demander une collaboration</DialogTitle>
            <DialogDescription className="text-gray-500 mt-1">
              Envoyez une demande structurée à {creator?.name}
            </DialogDescription>
          </div>

          <div className="px-8 py-6 space-y-6">
            
            {/* Budget */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Budget estimé</Label>
              <Select value={collabForm.budget_range} onValueChange={(v) => setCollabForm(p => ({ ...p, budget_range: v }))}>
                <SelectTrigger className="h-14 rounded-xl border-2 text-base">
                  <SelectValue placeholder="Sélectionner un budget" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Objectif */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Objectif</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {OBJECTIVES.map(obj => (
                  <div
                    key={obj.value}
                    onClick={() => setCollabForm(p => ({ ...p, objective: obj.value }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      collabForm.objective === obj.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <obj.icon className={`w-6 h-6 ${collabForm.objective === obj.value ? "text-primary" : "text-gray-400"}`} />
                    <span className="text-sm font-medium text-center">{obj.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Type de diffusion */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Type de diffusion</Label>
              <Select value={collabForm.diffusion_type} onValueChange={(v) => setCollabForm(p => ({ ...p, diffusion_type: v }))}>
                <SelectTrigger className="h-14 rounded-xl border-2 text-base">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFUSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Deadline souhaitée</Label>
              <Input 
                type="date" 
                value={collabForm.deadline} 
                onChange={(e) => setCollabForm(p => ({ ...p, deadline: e.target.value }))} 
                className="h-14 rounded-xl border-2 text-base"
              />
            </div>

            {/* Brief */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Brief du projet *</Label>
              <Textarea
                placeholder="Décrivez votre projet, vos objectifs, le message à transmettre, le contexte..."
                value={collabForm.brief}
                onChange={(e) => setCollabForm(p => ({ ...p, brief: e.target.value }))}
                rows={4}
                className="rounded-xl border-2 resize-none text-base"
              />
            </div>

            {/* Produit envoyé */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Envoi d'un produit ?</Label>
              <RadioGroup value={collabForm.product_sent} onValueChange={(v) => setCollabForm(p => ({ ...p, product_sent: v }))}>
                <div className="flex gap-4">
                  <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    collabForm.product_sent === "yes" ? "border-primary bg-primary/5" : "border-gray-200"
                  }`} onClick={() => setCollabForm(p => ({ ...p, product_sent: "yes" }))}>
                    <RadioGroupItem value="yes" id="product-yes" />
                    <Label htmlFor="product-yes" className="cursor-pointer font-medium">Oui</Label>
                  </div>
                  <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    collabForm.product_sent === "no" ? "border-primary bg-primary/5" : "border-gray-200"
                  }`} onClick={() => setCollabForm(p => ({ ...p, product_sent: "no" }))}>
                    <RadioGroupItem value="no" id="product-no" />
                    <Label htmlFor="product-no" className="cursor-pointer font-medium">Non</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Adresse si produit */}
            {collabForm.product_sent === "yes" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3"
              >
                <Label className="text-sm font-semibold text-gray-700">Adresse de livraison du produit</Label>
                <Textarea
                  placeholder="Adresse complète pour l'envoi du produit..."
                  value={collabForm.shipping_address}
                  onChange={(e) => setCollabForm(p => ({ ...p, shipping_address: e.target.value }))}
                  rows={2}
                  className="rounded-xl border-2 resize-none text-base"
                />
              </motion.div>
            )}
          </div>

          {/* Footer sticky */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-8 py-6">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCollaborationDialogOpen(false)} className="flex-1 h-14 rounded-xl border-2 font-semibold">
                Annuler
              </Button>
              <Button 
                onClick={handleCollaborationRequest}
                disabled={!collabForm.brief.trim() || submitting}
                className="flex-1 h-14 bg-primary hover:bg-primary/90 rounded-xl font-bold text-base"
              >
                {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-5 h-5 mr-2" />Envoyer la demande</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setSelectedVideo(null)}
          >
            <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 z-10 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20">
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="relative w-full max-w-[400px] aspect-[9/16]" onClick={(e) => e.stopPropagation()}>
              <video src={getImageUrl(selectedVideo.url)} className="w-full h-full object-contain rounded-2xl" controls autoPlay playsInline />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-4 right-4 z-10 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20">
              <X className="w-6 h-6 text-white" />
            </button>
            <img src={getImageUrl(selectedPhoto.url)} alt="" className="max-w-full max-h-full object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default CreatorProfileV2;
