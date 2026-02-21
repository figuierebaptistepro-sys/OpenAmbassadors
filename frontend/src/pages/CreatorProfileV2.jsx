import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Star, Clock, Briefcase, Heart, Share2, 
  Play, X, CheckCircle, Send, Video, Image as ImageIcon, 
  Building2, ChevronRight, Sparkles, Calendar,
  Eye, Award, MessageCircle, Globe, Zap, Shield, Users, 
  Package, FileText, Target, Megaphone, Camera, Mic, Scissors
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
  { value: "ads", label: "Ads", icon: Target },
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
  const heroRef = useRef(null);
  
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

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 400);
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
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!creator) return null;

  const isNewCreator = !creator?.completed_projects && !creator?.reviews_count;
  const hasVideos = creator.portfolio_videos?.length > 0;
  const hasPhotos = creator.portfolio_photos?.length > 0;
  const hasBrands = creator.brands_worked?.length > 0;
  const hasReviews = reviews?.length > 0;
  const avgRating = creator.rating || 0;
  const reviewCount = creator.reviews_count || 0;

  return (
    <AppLayout user={currentUser}>
      {/* Back button */}
      <div className="absolute top-20 left-4 z-20">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Retour</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BANNIÈRE + HERO
      ═══════════════════════════════════════════════════════════ */}
      <div ref={heroRef} className="relative">
        {/* Bannière */}
        <div className="h-48 sm:h-56 lg:h-64 bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 relative overflow-hidden">
          {creator.banner ? (
            <img 
              src={getImageUrl(creator.banner)} 
              alt="" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0">
              <div className="absolute top-10 left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-10 right-20 w-60 h-60 bg-pink-200/20 rounded-full blur-3xl" />
              <div className="absolute top-20 right-40 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl" />
            </div>
          )}
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>

        {/* Profil Card */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-gray-100 shadow-lg border-4 border-white">
                    {creator.picture ? (
                      <img src={getImageUrl(creator.picture)} alt={creator.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center">
                        <span className="text-5xl font-bold text-white">{(creator.name || "C")[0].toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  {/* Online indicator */}
                  {creator.available && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white" />
                  )}
                </div>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                {/* Nom + Badges */}
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{creator.name || "Créateur"}</h1>
                  {creator.is_premium && (
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shadow-sm">
                      <Award className="w-3.5 h-3.5 mr-1" /> Premium
                    </Badge>
                  )}
                  {isNewCreator && (
                    <Badge className="bg-sky-100 text-sky-700 border-sky-200">
                      <Sparkles className="w-3.5 h-3.5 mr-1" /> Nouveau
                    </Badge>
                  )}
                  {creator.available ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse" /> Disponible
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">Indisponible</Badge>
                  )}
                </div>

                {/* Tagline / Bio */}
                {(creator.tagline || creator.bio) && (
                  <p className="text-gray-600 mb-4 max-w-2xl line-clamp-2">
                    {creator.tagline || creator.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-5">
                  {creator.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" /> {creator.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-400" /> Répond en {creator.response_time || "< 24h"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-gray-400" /> {creator.completed_projects || 0} projets
                  </span>
                  {reviewCount > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {avgRating.toFixed(1)} ({reviewCount} avis)
                    </span>
                  )}
                </div>

                {/* Prix + CTA */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-gray-50 px-4 py-2 rounded-xl">
                    <span className="text-sm text-gray-500">À partir de </span>
                    <span className="text-2xl font-bold text-gray-900">{creator.min_rate || "—"}€</span>
                  </div>
                  
                  <Button 
                    onClick={() => setCollaborationDialogOpen(true)}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 h-12 rounded-xl shadow-lg shadow-primary/20"
                    data-testid="main-cta-btn"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Demander une collaboration
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="icon"
                    className={`h-12 w-12 rounded-xl border-2 ${isFavorite ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-200'}`}
                    onClick={() => setIsFavorite(!isFavorite)}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                  </Button>
                  
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2 border-gray-200">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CONTENU PRINCIPAL
      ═══════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* VIDÉOS */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Video className="w-5 h-5 text-primary" />
              </div>
              Réalisations vidéo
            </h2>
            {hasVideos && (
              <span className="text-sm text-gray-400">{creator.portfolio_videos.length} vidéo{creator.portfolio_videos.length > 1 ? 's' : ''}</span>
            )}
          </div>
          
          {hasVideos ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {creator.portfolio_videos.map((video, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="group relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  onClick={() => setSelectedVideo(video)}
                  data-testid={`video-${i}`}
                >
                  {video.thumbnail ? (
                    <img src={getImageUrl(video.thumbnail)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video 
                      src={`${getImageUrl(video.url)}#t=0.5`} 
                      className="w-full h-full object-cover" 
                      muted 
                      playsInline 
                      preload="metadata"
                      onMouseEnter={(e) => e.target.play().catch(() => {})}
                      onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0.5; }}
                    />
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                      <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                  </div>

                  {/* Badge type */}
                  {video.content_type && (
                    <span className="absolute top-3 left-3 text-xs font-semibold bg-white text-gray-800 px-2.5 py-1 rounded-lg shadow-sm">
                      {video.content_type}
                    </span>
                  )}

                  {/* Vues */}
                  {video.views && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-xs font-medium">
                      <Eye className="w-3.5 h-3.5" />
                      {video.views > 1000 ? `${(video.views/1000).toFixed(1)}K` : video.views}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-16 text-center border-2 border-dashed border-gray-200">
              <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucune vidéo ajoutée</p>
              <p className="text-gray-400 text-sm mt-1">Le créateur n'a pas encore uploadé de vidéos</p>
            </div>
          )}
        </section>

        {/* PHOTOS */}
        {hasPhotos && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                </div>
                Portfolio photos
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {creator.portfolio_photos.map((photo, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img 
                    src={getImageUrl(photo.url)} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* MARQUES */}
        {hasBrands && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              Marques partenaires
            </h2>
            
            <div className="flex flex-wrap gap-3">
              {creator.brands_worked.map((brand, i) => (
                <span 
                  key={i}
                  className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium text-gray-700 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                >
                  {brand}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* AVIS */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
              </div>
              Avis des marques
            </h2>
            {hasReviews && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}</div>
                <span className="text-gray-400 text-sm">({reviewCount})</span>
              </div>
            )}
          </div>
          
          {hasReviews ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {reviews.slice(0, 4).map((review, i) => (
                <div key={i} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{review.business_name || "Entreprise"}</span>
                        <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}</div>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl p-10 text-center border border-sky-100">
              <Sparkles className="w-10 h-10 text-sky-400 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold mb-1">Ce créateur est nouveau sur OpenAmbassadors</p>
              <p className="text-gray-500 text-sm">Soyez parmi les premières marques à collaborer avec lui !</p>
            </div>
          )}
        </section>

        {/* SERVICES */}
        {creator.content_types?.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-emerald-600" />
              </div>
              Types de collaborations
            </h2>
            
            <div className="flex flex-wrap gap-3">
              {creator.content_types.map((type, i) => (
                <span key={i} className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold border border-emerald-200">
                  {type}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* GARANTIES */}
        <section className="pt-8 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" />
            Garanties OpenAmbassadors
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Transaction protégée</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Support dédié</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <FileText className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-gray-700">Gestion des droits</span>
            </div>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          STICKY BAR
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl"
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                  {creator.picture ? (
                    <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{(creator.name || "C")[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{creator.name}</p>
                  <p className="text-sm text-gray-500">À partir de <span className="font-bold text-gray-900">{creator.min_rate || "—"}€</span></p>
                </div>
                <Button 
                  onClick={() => setCollaborationDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 h-12 rounded-xl shadow-lg shadow-primary/20"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Collaborer
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          MODAL COLLABORATION
      ═══════════════════════════════════════════════════════════ */}
      <Dialog open={collaborationDialogOpen} onOpenChange={setCollaborationDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-0">
          <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-bold">Demander une collaboration</DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
              Envoyez votre brief à {creator?.name}
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Budget estimé</Label>
              <Select value={collabForm.budget_range} onValueChange={(v) => setCollabForm(p => ({ ...p, budget_range: v }))}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{BUDGET_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Objectif</Label>
              <div className="grid grid-cols-3 gap-2">
                {OBJECTIVES.map(obj => (
                  <div
                    key={obj.value}
                    onClick={() => setCollabForm(p => ({ ...p, objective: obj.value }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      collabForm.objective === obj.value ? "border-primary bg-primary/5 text-primary" : "border-gray-200 hover:border-gray-300 text-gray-500"
                    }`}
                  >
                    <obj.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{obj.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Type de diffusion</Label>
              <Select value={collabForm.diffusion_type} onValueChange={(v) => setCollabForm(p => ({ ...p, diffusion_type: v }))}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{DIFFUSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Deadline</Label>
              <Input type="date" value={collabForm.deadline} onChange={(e) => setCollabForm(p => ({ ...p, deadline: e.target.value }))} className="h-12 rounded-xl border-gray-200" />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Brief du projet *</Label>
              <Textarea placeholder="Décrivez votre projet..." value={collabForm.brief} onChange={(e) => setCollabForm(p => ({ ...p, brief: e.target.value }))} rows={3} className="rounded-xl border-gray-200 resize-none" />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Envoi d'un produit ?</Label>
              <div className="flex gap-3">
                {["yes", "no"].map(val => (
                  <div key={val} onClick={() => setCollabForm(p => ({ ...p, product_sent: val }))} className={`flex-1 flex items-center justify-center py-3 rounded-xl border-2 cursor-pointer transition-all ${collabForm.product_sent === val ? "border-primary bg-primary/5" : "border-gray-200"}`}>
                    <span className="text-sm font-medium">{val === "yes" ? "Oui" : "Non"}</span>
                  </div>
                ))}
              </div>
            </div>

            {collabForm.product_sent === "yes" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Adresse de livraison</Label>
                <Textarea placeholder="Adresse complète..." value={collabForm.shipping_address} onChange={(e) => setCollabForm(p => ({ ...p, shipping_address: e.target.value }))} rows={2} className="rounded-xl border-gray-200 resize-none" />
              </motion.div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
            <Button variant="outline" onClick={() => setCollaborationDialogOpen(false)} className="flex-1 h-12 rounded-xl">Annuler</Button>
            <Button onClick={handleCollaborationRequest} disabled={!collabForm.brief.trim() || submitting} className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold">
              {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Envoyer la demande"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
            <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><X className="w-6 h-6 text-white" /></button>
            <div className="w-full max-w-sm aspect-[9/16]" onClick={(e) => e.stopPropagation()}>
              <video src={getImageUrl(selectedVideo.url)} className="w-full h-full object-contain rounded-xl" controls autoPlay playsInline />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><X className="w-6 h-6 text-white" /></button>
            <img src={getImageUrl(selectedPhoto.url)} alt="" className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default CreatorProfileV2;
