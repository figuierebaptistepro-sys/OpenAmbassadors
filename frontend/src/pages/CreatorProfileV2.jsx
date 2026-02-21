import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Star, Clock, Briefcase, Heart, Share2, 
  Play, X, CheckCircle, Send, Video, Image as ImageIcon, 
  Building2, Quote, ChevronRight, Sparkles, Calendar, Euro,
  Instagram, Youtube, ExternalLink, Eye, Award, TrendingUp,
  MessageCircle, Globe, Zap, Shield, Users
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
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

// TikTok icon
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const CONTENT_TYPES = ["UGC", "Ads", "Micro-trottoir", "Face cam", "Interview", "Montage"];
const PLATFORMS = [
  { value: "tiktok", label: "TikTok", icon: TikTokIcon },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "youtube", label: "YouTube", icon: Youtube },
];
const BUDGET_RANGES = [
  { value: "< 500", label: "Moins de 500€" },
  { value: "500-1000", label: "500€ - 1 000€" },
  { value: "1000-2500", label: "1 000€ - 2 500€" },
  { value: "2500-5000", label: "2 500€ - 5 000€" },
  { value: "> 5000", label: "Plus de 5 000€" },
];

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
  
  const [collabForm, setCollabForm] = useState({
    content_types: [],
    platforms: [],
    budget_range: "",
    deadline: "",
    brief: "",
    deliverables: "",
    additional_info: ""
  });

  useEffect(() => { 
    fetchCreator(); 
    fetchReviews();
  }, [userId]);

  const fetchCreator = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/${userId}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setCreator(data);
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
      if (response.ok) {
        setReviews(await response.json());
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const toggleContentType = (type) => {
    setCollabForm(prev => ({
      ...prev,
      content_types: prev.content_types.includes(type)
        ? prev.content_types.filter(t => t !== type)
        : [...prev.content_types, type]
    }));
  };

  const togglePlatform = (platform) => {
    setCollabForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
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
        body: JSON.stringify({ creator_id: userId, ...collabForm })
      });
      if (response.ok) {
        toast.success("Demande envoyée avec succès !");
        setCollaborationDialogOpen(false);
        setCollabForm({ content_types: [], platforms: [], budget_range: "", deadline: "", brief: "", deliverables: "", additional_info: "" });
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

  const isNewCreator = !creator?.completed_projects && !creator?.reviews_count && !creator?.rating;

  const getDynamicBadge = () => {
    if (creator?.is_premium) return { label: "Premium", color: "bg-gradient-to-r from-amber-500 to-orange-500 text-white", icon: Award };
    if (creator?.rating >= 4.8 && creator?.reviews_count >= 5) return { label: "Top Rated", color: "bg-emerald-500 text-white", icon: TrendingUp };
    if (creator?.completed_projects >= 10) return { label: "Expérimenté", color: "bg-indigo-500 text-white", icon: Briefcase };
    if (isNewCreator) return { label: "Nouveau", color: "bg-sky-500 text-white", icon: Sparkles };
    return null;
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

  const badge = getDynamicBadge();
  const hasVideos = creator.portfolio_videos?.length > 0;
  const hasPhotos = creator.portfolio_photos?.length > 0;
  const hasBrands = creator.brands_worked?.length > 0;
  const hasReviews = reviews?.length > 0;
  const avgRating = creator.rating || 5;
  const reviewCount = creator.reviews_count || 0;

  return (
    <AppLayout user={currentUser}>
      {/* Minimal Back Header */}
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            
            {/* HERO SECTION - Bento Style */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100"
            >
              {/* Cover Image */}
              <div className="h-32 sm:h-40 lg:h-48 bg-gradient-to-br from-primary/10 via-pink-50 to-orange-50 relative overflow-hidden">
                {creator.banner ? (
                  <img src={getImageUrl(creator.banner)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-4 left-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl" />
                    <div className="absolute bottom-4 right-4 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl" />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>

              {/* Profile Info */}
              <div className="px-6 sm:px-8 pb-6 sm:pb-8 -mt-12 sm:-mt-16 relative">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                  
                  {/* Avatar */}
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative flex-shrink-0"
                  >
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white shadow-xl border-4 border-white overflow-hidden ring-4 ring-gray-50">
                      {creator.picture ? (
                        <img src={getImageUrl(creator.picture)} alt={creator.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center">
                          <span className="text-4xl font-bold text-white">{(creator.name || "C")[0].toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    {/* Online indicator */}
                    {creator.available && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white" />
                    )}
                  </motion.div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pt-2 sm:pt-4">
                    {/* Name + Badge */}
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                        {creator.name || "Créateur"}
                      </h1>
                      {badge && (
                        <Badge className={`${badge.color} gap-1.5 px-3 py-1 text-xs font-semibold shadow-sm`}>
                          <badge.icon className="w-3.5 h-3.5" />
                          {badge.label}
                        </Badge>
                      )}
                    </div>

                    {/* Tagline */}
                    {creator.tagline ? (
                      <p className="text-gray-600 mb-4 text-base">{creator.tagline}</p>
                    ) : creator.bio ? (
                      <p className="text-gray-600 mb-4 text-base line-clamp-2">{creator.bio}</p>
                    ) : null}

                    {/* Stats Pills */}
                    <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
                      {creator.city && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-sm text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {creator.city}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-sm text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Répond {creator.response_time || "< 24h"}
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-sm text-gray-600">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        {creator.completed_projects || 0} projet{(creator.completed_projects || 0) !== 1 ? "s" : ""}
                      </div>
                      {reviewCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full text-sm text-amber-700">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {avgRating.toFixed(1)} ({reviewCount} avis)
                        </div>
                      )}
                    </div>

                    {/* CTA Buttons - Mobile */}
                    <div className="flex gap-3 sm:hidden">
                      <Button 
                        onClick={() => setCollaborationDialogOpen(true)} 
                        className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25"
                        data-testid="request-collaboration-btn-mobile"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Collaborer
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setIsFavorite(!isFavorite)}
                        className={`h-12 w-12 rounded-xl border-2 ${isFavorite ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200"}`}
                      >
                        <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* New Creator Banner */}
                {isNewCreator && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 p-4 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-2xl border border-sky-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-0.5">Nouveau sur OpenAmbassadors</p>
                        <p className="text-sm text-gray-600">Soyez parmi les premières marques à collaborer avec ce créateur.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* VIDEOS SECTION */}
            {hasVideos && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.15 }}
                className="mt-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Video className="w-4 h-4 text-primary" />
                    </div>
                    Réalisations vidéo
                  </h2>
                  <span className="text-sm text-gray-400">{creator.portfolio_videos.length} vidéo{creator.portfolio_videos.length > 1 ? "s" : ""}</span>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {creator.portfolio_videos.slice(0, 6).map((video, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="group relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      onClick={() => setSelectedVideo(video)}
                      data-testid={`video-thumb-${i}`}
                    >
                      {video.thumbnail ? (
                        <img src={getImageUrl(video.thumbnail)} alt="" className="w-full h-full object-cover" />
                      ) : (video.url?.includes('.mp4') || video.url?.includes('.mov') || video.type === 'uploaded') ? (
                        <video 
                          src={`${getImageUrl(video.url)}#t=0.5`}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white/40" />
                        </div>
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Play button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Views badge */}
                      {video.views && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
                          <Eye className="w-3 h-3" />
                          {video.views > 1000 ? `${(video.views/1000).toFixed(1)}K` : video.views}
                        </div>
                      )}

                      {/* Content type badge */}
                      {video.content_type && (
                        <Badge className="absolute top-2 left-2 bg-white/90 text-gray-900 text-[10px] font-medium shadow-sm">
                          {video.content_type}
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* PHOTOS SECTION */}
            {hasPhotos && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                className="mt-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                    </div>
                    Portfolio
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {creator.portfolio_photos.slice(0, 8).map((photo, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img 
                        src={getImageUrl(photo.url)} 
                        alt={photo.caption || ''} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {photo.type && (
                        <Badge className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px]">
                          {photo.type}
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* BRANDS SECTION */}
            {hasBrands && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.25 }}
                className="mt-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    Marques partenaires
                  </h2>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {creator.brands_worked.map((brand, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className="px-5 py-2.5 bg-white rounded-xl border border-gray-100 text-sm font-medium text-gray-700 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
                    >
                      {brand}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* REVIEWS SECTION */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-amber-600 fill-amber-600" />
                  </div>
                  Avis des marques
                </h2>
                {hasReviews && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`w-4 h-4 ${star <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-400">({reviewCount})</span>
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
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{review.business_name || "Entreprise"}</p>
                              {review.project_title && <p className="text-xs text-gray-400">{review.project_title}</p>}
                            </div>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(star => (
                                <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {reviews.length > 3 && (
                    <Button variant="ghost" className="w-full text-primary hover:text-primary/80 hover:bg-primary/5">
                      Voir les {reviews.length} avis
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium mb-1">Aucun avis pour le moment</p>
                  <p className="text-sm text-gray-400">Ce créateur est nouveau sur la plateforme</p>
                </div>
              )}
            </motion.section>

            {/* SERVICES SECTION */}
            {creator.content_types?.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.35 }}
                className="mt-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-emerald-600" />
                    </div>
                    Types de collaborations
                  </h2>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {creator.content_types.map((type, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                    >
                      <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-2 border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary transition-colors">
                        {type}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* BLOC DÉCISION - Premium Sidebar */}
          <div className="hidden lg:block w-[400px] xl:w-[420px] flex-shrink-0">
            <div className="sticky top-20">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-[28px] border border-gray-200/80 shadow-2xl shadow-gray-200/50 overflow-hidden"
              >
                {/* PRIX - Section dominante */}
                <div className="p-8 pb-6 bg-gradient-to-br from-slate-50 via-white to-gray-50/50">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl xl:text-6xl font-extrabold text-gray-900 tracking-tight">
                          {creator.min_rate || "—"}
                        </span>
                        {creator.min_rate && <span className="text-2xl font-semibold text-gray-400">€</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 font-medium">À partir de</p>
                    </div>
                    {/* Badge disponibilité en haut à droite */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      creator.available 
                        ? 'bg-emerald-50 border border-emerald-200' 
                        : 'bg-orange-50 border border-orange-200'
                    }`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${creator.available ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`} />
                      <span className={`text-sm font-semibold ${creator.available ? 'text-emerald-700' : 'text-orange-700'}`}>
                        {creator.available ? "Disponible" : "Occupé"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Séparateur stylé */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                {/* INDICATEURS CLÉS */}
                <div className="p-8 space-y-5">
                  {/* Temps de réponse */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Temps de réponse</p>
                        <p className="font-bold text-gray-900">Répond en moins de 24h</p>
                      </div>
                    </div>
                  </div>

                  {/* Indicateurs de performance OU badge nouveau créateur */}
                  {isNewCreator ? (
                    /* Nouveau créateur */
                    <div className="p-5 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl border border-sky-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Sparkles className="w-6 h-6 text-sky-500" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Nouveau créateur</p>
                          <p className="text-sm text-gray-500">Lancez la première collaboration !</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Stats de performance */
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-2xl font-bold text-gray-900">{creator.completed_projects || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">Projets</p>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Note</p>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-2xl font-bold text-gray-900">{creator.completion_score || 100}%</p>
                        <p className="text-xs text-gray-500 mt-1">Complétion</p>
                      </div>
                    </div>
                  )}

                  {/* Badge Premium si applicable */}
                  {creator.is_premium && (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
                      <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-900">Créateur Premium</p>
                        <p className="text-sm text-amber-700">Profil vérifié et prioritaire</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Séparateur */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-8" />

                {/* CTA PRINCIPAL */}
                <div className="p-8 pt-6 space-y-4">
                  <Button 
                    onClick={() => setCollaborationDialogOpen(true)}
                    className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/40"
                    data-testid="sidebar-request-btn"
                  >
                    <Send className="w-5 h-5 mr-3" />
                    Demander une collaboration
                  </Button>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className={`flex-1 h-14 rounded-xl border-2 font-semibold transition-all duration-200 ${
                        isFavorite 
                          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsFavorite(!isFavorite)}
                    >
                      <Heart className={`w-5 h-5 mr-2 ${isFavorite ? "fill-red-500" : ""}`} />
                      Favoris
                    </Button>
                    <Button variant="outline" className="flex-1 h-14 rounded-xl border-2 border-gray-200 font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all duration-200">
                      <Share2 className="w-5 h-5 mr-2" />
                      Partager
                    </Button>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="px-8 pb-8">
                  <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span>Transaction sécurisée</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Paiement protégé</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration Modal */}
      <Dialog open={collaborationDialogOpen} onOpenChange={setCollaborationDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Demander une collaboration</DialogTitle>
            <DialogDescription>
              Envoyez une demande personnalisée à {creator?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Content Types */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Type de contenu</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={collabForm.content_types.includes(type) ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 transition-all ${
                      collabForm.content_types.includes(type) 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white border-2 border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                    }`}
                    onClick={() => toggleContentType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700">Plateforme(s)</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(platform => {
                  const Icon = platform.icon;
                  const isSelected = collabForm.platforms.includes(platform.value);
                  return (
                    <div
                      key={platform.value}
                      onClick={() => togglePlatform(platform.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {typeof Icon === 'function' ? <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-gray-400"}`} /> : <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-gray-400"}`} />}
                      <span className={`text-xs font-medium ${isSelected ? "text-primary" : "text-gray-500"}`}>{platform.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Budget & Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Budget</Label>
                <Select value={collabForm.budget_range} onValueChange={(v) => setCollabForm(p => ({ ...p, budget_range: v }))}>
                  <SelectTrigger className="h-12 rounded-xl border-2">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Deadline</Label>
                <Input type="date" value={collabForm.deadline} onChange={(e) => setCollabForm(p => ({ ...p, deadline: e.target.value }))} className="h-12 rounded-xl border-2" />
              </div>
            </div>

            {/* Brief */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Description du projet *</Label>
              <Textarea
                placeholder="Décrivez votre projet, vos objectifs, le message à transmettre..."
                value={collabForm.brief}
                onChange={(e) => setCollabForm(p => ({ ...p, brief: e.target.value }))}
                rows={4}
                className="rounded-xl border-2 resize-none"
              />
            </div>

            {/* Deliverables */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Livrables attendus</Label>
              <Textarea
                placeholder="Ex: 1 vidéo TikTok 30-60s, 2 stories Instagram..."
                value={collabForm.deliverables}
                onChange={(e) => setCollabForm(p => ({ ...p, deliverables: e.target.value }))}
                rows={2}
                className="rounded-xl border-2 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setCollaborationDialogOpen(false)} className="flex-1 h-12 rounded-xl border-2">
              Annuler
            </Button>
            <Button 
              onClick={handleCollaborationRequest}
              disabled={!collabForm.brief.trim() || submitting}
              className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
            >
              {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Envoyer</>}
            </Button>
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
            <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 z-10 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="relative w-full max-w-[400px] aspect-[9/16]" onClick={(e) => e.stopPropagation()}>
              {(selectedVideo.url?.includes('.mp4') || selectedVideo.url?.includes('.mov') || selectedVideo.type === 'uploaded') ? (
                <video src={getImageUrl(selectedVideo.url)} className="w-full h-full object-contain rounded-2xl" controls autoPlay playsInline />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                  <Globe className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-sm mb-4 opacity-70">Lien externe</p>
                  <a href={selectedVideo.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-black rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> Ouvrir
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-4 right-4 z-10 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
            <img src={getImageUrl(selectedPhoto.url)} alt={selectedPhoto.caption || ''} className="max-w-full max-h-full object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default CreatorProfileV2;
