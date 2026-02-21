import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Star, Clock, Briefcase, Heart, Share2, 
  Play, X, CheckCircle, MessageCircle, Globe, Car, Send,
  Video, Image, Building2, Quote, ChevronRight, Sparkles,
  Calendar, Euro, FileText, Instagram, Youtube, ExternalLink
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
import ReviewsSection from "../components/ReviewsSection";

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
  
  // Collaboration form
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
        body: JSON.stringify({
          creator_id: userId,
          ...collabForm
        })
      });

      if (response.ok) {
        toast.success("Demande envoyée avec succès !");
        setCollaborationDialogOpen(false);
        setCollabForm({
          content_types: [],
          platforms: [],
          budget_range: "",
          deadline: "",
          brief: "",
          deliverables: "",
          additional_info: ""
        });
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

  // Check if creator is new (no stats)
  const isNewCreator = !creator?.completed_projects && !creator?.reviews_count && !creator?.rating;

  // Get dynamic badge
  const getDynamicBadge = () => {
    if (isNewCreator) {
      return { label: "Nouveau créateur", color: "bg-blue-100 text-blue-700", icon: Sparkles };
    }
    if (creator?.is_premium) {
      return { label: "Premium", color: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white", icon: Star };
    }
    if (creator?.rating >= 4.8 && creator?.reviews_count >= 5) {
      return { label: "Top Rated", color: "bg-green-100 text-green-700", icon: Star };
    }
    if (creator?.completed_projects >= 10) {
      return { label: "Expérimenté", color: "bg-purple-100 text-purple-700", icon: Briefcase };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!creator) return null;

  const badge = getDynamicBadge();
  const hasVideos = creator.portfolio_videos?.length > 0;
  const hasPhotos = creator.portfolio_photos?.length > 0;
  const hasBrands = creator.brands_worked?.length > 0;
  const hasReviews = reviews?.length > 0;

  return (
    <AppLayout user={currentUser}>
      {/* Back Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Retour</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 lg:pr-4">
          <div className="max-w-3xl">
            {/* 1️⃣ HERO SECTION */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Cover - Reduced */}
              <div className="h-24 sm:h-32 rounded-t-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-pink-100 overflow-hidden relative">
                {creator.banner && (
                  <img src={getImageUrl(creator.banner)} alt="" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Profile Card */}
              <Card className="relative -mt-12 mx-2 border-0 shadow-lg rounded-2xl overflow-visible">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Avatar */}
                    <div className="-mt-10 sm:-mt-12 flex-shrink-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white shadow-lg border-4 border-white overflow-hidden">
                        {creator.picture ? (
                          <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="text-3xl font-bold text-primary">
                              {(creator.name || "C")[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-900">
                          {creator.name || "Créateur"}
                        </h1>
                        {badge && (
                          <Badge className={`${badge.color} gap-1 text-xs`}>
                            {badge.icon && <badge.icon className="w-3 h-3" />}
                            {badge.label}
                          </Badge>
                        )}
                      </div>

                      {/* Tagline */}
                      {creator.tagline && (
                        <p className="text-gray-600 text-sm mb-2">{creator.tagline}</p>
                      )}

                      {/* Quick Stats Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-500 mb-3">
                        {creator.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {creator.city}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {creator.response_time || "Répond ~24h"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {creator.completed_projects || 0} projet{(creator.completed_projects || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          onClick={() => setCollaborationDialogOpen(true)} 
                          className="bg-primary hover:bg-primary-hover"
                          data-testid="request-collaboration-btn"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Demander une collaboration
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setIsFavorite(!isFavorite)}
                          className={isFavorite ? "text-red-500 border-red-200 bg-red-50" : ""}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500" : ""}`} />
                        </Button>
                        <Button variant="outline" size="icon">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* New Creator Message */}
                  {isNewCreator && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm text-blue-700">
                        <Sparkles className="w-4 h-4 inline mr-1" />
                        Soyez parmi les premières marques à collaborer avec ce créateur.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* 2️⃣ SECTION VIDÉOS */}
            {hasVideos && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }}
                className="mt-6"
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      Réalisations vidéo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {creator.portfolio_videos.slice(0, 6).map((video, i) => (
                        <div 
                          key={i} 
                          className="group relative aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden cursor-pointer"
                          onClick={() => setSelectedVideo(video)}
                          data-testid={`video-thumb-${i}`}
                        >
                          {(video.url?.includes('.mp4') || video.url?.includes('.mov') || video.type === 'uploaded') ? (
                            <video 
                              src={`${getImageUrl(video.url)}#t=0.5`}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                              <Play className="w-6 h-6 text-white/60" />
                            </div>
                          )}
                          
                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <Play className="w-5 h-5 text-white fill-white" />
                            </div>
                          </div>

                          {/* Views badge */}
                          {video.views && (
                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                              {video.views > 1000 ? `${(video.views/1000).toFixed(1)}K` : video.views} vues
                            </div>
                          )}

                          {/* Content type badge */}
                          {video.content_type && (
                            <Badge className="absolute top-1 left-1 bg-primary/80 text-white text-[10px] px-1.5 py-0.5">
                              {video.content_type}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* 3️⃣ SECTION PHOTOS / PORTFOLIO */}
            {hasPhotos && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                className="mt-6"
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Image className="w-5 h-5 text-primary" />
                      Portfolio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {creator.portfolio_photos.slice(0, 8).map((photo, i) => (
                        <div 
                          key={i}
                          className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <img 
                            src={getImageUrl(photo.url)} 
                            alt={photo.caption || ''} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {photo.type && (
                            <Badge className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px]">
                              {photo.type}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* 4️⃣ SECTION MARQUES */}
            {hasBrands && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Marques ayant collaboré
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {creator.brands_worked.map((brand, i) => (
                        <div 
                          key={i} 
                          className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium text-gray-700 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                        >
                          {brand}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* 5️⃣ SECTION AVIS */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }}
              className="mt-6"
            >
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      Avis des marques
                    </CardTitle>
                    {hasReviews && (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {(creator.rating || 5).toFixed(1)}
                        </span>
                        <div className="flex">
                          {[1,2,3,4,5].map(star => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${star <= Math.round(creator.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">({creator.reviews_count || 0})</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {hasReviews ? (
                    <div className="space-y-4">
                      {reviews.slice(0, 3).map((review, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-start gap-3">
                            <Quote className="w-5 h-5 text-primary/30 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">
                                    {review.business_name || "Entreprise"}
                                  </span>
                                  {review.project_title && (
                                    <span className="text-xs text-gray-400">• {review.project_title}</span>
                                  )}
                                </div>
                                <div className="flex">
                                  {[1,2,3,4,5].map(star => (
                                    <Star 
                                      key={star} 
                                      className={`w-3 h-3 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {reviews.length > 3 && (
                        <Button variant="ghost" className="w-full text-primary">
                          Voir tous les avis ({reviews.length})
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Star className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        Ce créateur est nouveau sur la plateforme.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.section>

            {/* 6️⃣ SECTION SERVICES */}
            {creator.content_types?.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.5 }}
                className="mt-6"
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      Types de collaborations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {creator.content_types.map((type, i) => (
                        <Badge 
                          key={i} 
                          variant="outline" 
                          className="px-3 py-1.5 text-sm border-primary/20 bg-primary/5 text-primary"
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* 8️⃣ SECTION PERFORMANCE (si données) */}
            {!isNewCreator && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.6 }}
                className="mt-6"
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-primary">{creator.completion_score || 0}%</p>
                        <p className="text-xs text-gray-500">Complétion</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-primary">{creator.response_time || "< 24h"}</p>
                        <p className="text-xs text-gray-500">Temps de réponse</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-primary">{creator.completed_projects || 0}</p>
                        <p className="text-xs text-gray-500">Projets réalisés</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <p className="text-2xl font-bold text-primary">
                          {creator.reviews_count > 0 ? `${Math.round((creator.rating / 5) * 100)}%` : "N/A"}
                        </p>
                        <p className="text-xs text-gray-500">Satisfaction</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </div>
        </div>

        {/* 9️⃣ SIDEBAR STICKY */}
        <div className="hidden lg:block w-80 xl:w-96 p-6 pl-2">
          <div className="sticky top-20">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                {/* Price */}
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-500 mb-1">À partir de</p>
                  <p className="text-3xl font-bold text-primary">
                    {creator.min_rate ? `${creator.min_rate}€` : "Sur devis"}
                  </p>
                </div>

                {/* Quick info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Disponibilité
                    </span>
                    <span className={`font-medium ${creator.available ? 'text-green-600' : 'text-orange-600'}`}>
                      {creator.available ? "Disponible" : "Occupé"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Temps de réponse
                    </span>
                    <span className="font-medium">{creator.response_time || "< 24h"}</span>
                  </div>
                  {badge && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Statut</span>
                      <Badge className={`${badge.color} gap-1 text-xs`}>
                        {badge.icon && <badge.icon className="w-3 h-3" />}
                        {badge.label}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Button 
                  onClick={() => setCollaborationDialogOpen(true)}
                  className="w-full bg-primary hover:bg-primary-hover h-12 text-base"
                  data-testid="sidebar-request-btn"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Demander collaboration
                </Button>

                {/* Additional actions */}
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                    Favoris
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Partager
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Collaboration Request Dialog */}
      <Dialog open={collaborationDialogOpen} onOpenChange={setCollaborationDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Demander une collaboration
            </DialogTitle>
            <DialogDescription>
              Envoyez une demande personnalisée à {creator?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Content Types */}
            <div className="space-y-2">
              <Label>Type de contenu souhaité</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map(type => (
                  <Badge
                    key={type}
                    variant={collabForm.content_types.includes(type) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      collabForm.content_types.includes(type) 
                        ? "bg-primary text-white" 
                        : "hover:border-primary"
                    }`}
                    onClick={() => toggleContentType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Platforms */}
            <div className="space-y-2">
              <Label>Plateforme(s)</Label>
              <div className="flex gap-2">
                {PLATFORMS.map(platform => {
                  const Icon = platform.icon;
                  return (
                    <div
                      key={platform.value}
                      onClick={() => togglePlatform(platform.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                        collabForm.platforms.includes(platform.value)
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Checkbox checked={collabForm.platforms.includes(platform.value)} />
                      {typeof Icon === 'function' ? <Icon className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      <span className="text-sm">{platform.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label>Budget estimé</Label>
              <Select
                value={collabForm.budget_range}
                onValueChange={(value) => setCollabForm(prev => ({ ...prev, budget_range: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un budget" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label>Date souhaitée</Label>
              <Input
                type="date"
                value={collabForm.deadline}
                onChange={(e) => setCollabForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            {/* Brief */}
            <div className="space-y-2">
              <Label>Description du projet *</Label>
              <Textarea
                placeholder="Décrivez votre projet, vos objectifs, le message à transmettre..."
                value={collabForm.brief}
                onChange={(e) => setCollabForm(prev => ({ ...prev, brief: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Deliverables */}
            <div className="space-y-2">
              <Label>Livrables attendus</Label>
              <Textarea
                placeholder="Ex: 1 vidéo TikTok 30-60s, 2 stories Instagram..."
                value={collabForm.deliverables}
                onChange={(e) => setCollabForm(prev => ({ ...prev, deliverables: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Additional Info */}
            <div className="space-y-2">
              <Label>Informations complémentaires</Label>
              <Textarea
                placeholder="Contraintes, directives de marque, liens utiles..."
                value={collabForm.additional_info}
                onChange={(e) => setCollabForm(prev => ({ ...prev, additional_info: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCollaborationDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCollaborationRequest}
              disabled={!collabForm.brief.trim() || submitting}
              className="bg-primary hover:bg-primary-hover"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer la demande
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setSelectedVideo(null)}
          >
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black" onClick={(e) => e.stopPropagation()}>
              {(selectedVideo.url?.includes('.mp4') || selectedVideo.url?.includes('.mov') || selectedVideo.type === 'uploaded') ? (
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
                    className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium"
                  >
                    Ouvrir le lien
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <img 
              src={getImageUrl(selectedPhoto.url)} 
              alt={selectedPhoto.caption || ''} 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {selectedPhoto.caption && (
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-white bg-black/50 px-4 py-2 rounded-full inline-block">
                  {selectedPhoto.caption}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default CreatorProfileV2;
