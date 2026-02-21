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
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setShowStickyBar(rect.bottom < -100);
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
      {/* Back */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        
        {/* ═══════════════════════════════════════════════════
            HERO COMPACT - Profil + Prix discret + CTA
        ═══════════════════════════════════════════════════ */}
        <motion.section 
          ref={heroRef}
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gray-100 shadow-lg">
                {creator.picture ? (
                  <img src={getImageUrl(creator.picture)} alt={creator.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-pink-400 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">{(creator.name || "C")[0].toUpperCase()}</span>
                  </div>
                )}
              </div>
              {creator.available && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-3 border-white" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Row 1: Nom + Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{creator.name || "Créateur"}</h1>
                {creator.is_premium && (
                  <Badge className="bg-amber-100 text-amber-700 text-xs">
                    <Award className="w-3 h-3 mr-1" /> Premium
                  </Badge>
                )}
                {isNewCreator && (
                  <Badge className="bg-sky-100 text-sky-700 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" /> Nouveau
                  </Badge>
                )}
              </div>

              {/* Row 2: Tagline */}
              {(creator.tagline || creator.bio) && (
                <p className="text-gray-500 text-sm mb-3 line-clamp-2 max-w-xl">
                  {creator.tagline || creator.bio}
                </p>
              )}

              {/* Row 3: Stats discrets */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mb-4">
                {creator.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {creator.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {creator.response_time || "< 24h"}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> {creator.completed_projects || 0} projet{(creator.completed_projects || 0) !== 1 ? "s" : ""}
                </span>
                {reviewCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500" /> {avgRating.toFixed(1)} ({reviewCount})
                  </span>
                )}
              </div>

              {/* Row 4: Prix + CTA */}
              <div className="flex flex-wrap items-center gap-3">
                {creator.min_rate && (
                  <div className="text-sm text-gray-500">
                    À partir de <span className="text-lg font-bold text-gray-900">{creator.min_rate}€</span>
                  </div>
                )}
                <div className="flex-1" />
                <Button 
                  onClick={() => setCollaborationDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 h-11 rounded-xl shadow-md shadow-primary/20"
                  data-testid="main-cta-btn"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Collaborer
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  className={`h-11 w-11 rounded-xl border-2 ${isFavorite ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200'}`}
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-2 border-gray-200">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════
            VIDÉOS - Section principale et imposante
        ═══════════════════════════════════════════════════ */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Réalisations vidéo
            {hasVideos && <span className="text-sm font-normal text-gray-400 ml-auto">{creator.portfolio_videos.length}</span>}
          </h2>
          
          {hasVideos ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {creator.portfolio_videos.slice(0, 10).map((video, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * i }}
                  className="group relative aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
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
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0.5; }}
                    />
                  )}
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Play icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badge type */}
                  {video.content_type && (
                    <span className="absolute top-2 left-2 text-[10px] font-medium bg-white/90 text-gray-800 px-2 py-0.5 rounded-full">
                      {video.content_type}
                    </span>
                  )}

                  {/* Vues */}
                  {video.views && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                      <Eye className="w-3 h-3" />
                      {video.views > 1000 ? `${(video.views/1000).toFixed(0)}K` : video.views}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-12 text-center">
              <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucune vidéo pour le moment</p>
            </div>
          )}
        </motion.section>

        {/* ═══════════════════════════════════════════════════
            PHOTOS - Grille visuelle
        ═══════════════════════════════════════════════════ */}
        {hasPhotos && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-10"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-500" />
              Portfolio
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {creator.portfolio_photos.slice(0, 8).map((photo, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * i }}
                  className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-400/50 transition-all"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img 
                    src={getImageUrl(photo.url)} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ═══════════════════════════════════════════════════
            MARQUES
        ═══════════════════════════════════════════════════ */}
        {hasBrands && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Marques partenaires
            </h2>
            
            <div className="flex flex-wrap gap-2">
              {creator.brands_worked.map((brand, i) => (
                <span 
                  key={i}
                  className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 border border-gray-100"
                >
                  {brand}
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* ═══════════════════════════════════════════════════
            AVIS
        ═══════════════════════════════════════════════════ */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Avis
            </h2>
            {hasReviews && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}</div>
                <span className="text-gray-400">({reviewCount})</span>
              </div>
            )}
          </div>
          
          {hasReviews ? (
            <div className="space-y-3">
              {reviews.slice(0, 3).map((review, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{review.business_name || "Entreprise"}</span>
                        <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}</div>
                      </div>
                      <p className="text-gray-600 text-sm">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
              {reviews.length > 3 && (
                <button className="text-primary text-sm font-medium hover:underline">
                  Voir tous les avis ({reviews.length})
                </button>
              )}
            </div>
          ) : (
            <div className="bg-sky-50 rounded-xl p-6 text-center border border-sky-100">
              <Sparkles className="w-8 h-8 text-sky-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Nouveau créateur — soyez le premier à collaborer !</p>
            </div>
          )}
        </motion.section>

        {/* ═══════════════════════════════════════════════════
            SERVICES (Tags simples)
        ═══════════════════════════════════════════════════ */}
        {creator.content_types?.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-500" />
              Types de collaborations
            </h2>
            
            <div className="flex flex-wrap gap-2">
              {creator.content_types.map((type, i) => (
                <span key={i} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100">
                  {type}
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* ═══════════════════════════════════════════════════
            GARANTIES (Discret)
        ═══════════════════════════════════════════════════ */}
        <motion.section 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mb-8 pt-6 border-t border-gray-100"
        >
          <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-500" /> Paiement sécurisé</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Transaction protégée</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-500" /> Support disponible</span>
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-purple-500" /> Gestion des droits</span>
          </div>
        </motion.section>

      </div>

      {/* ═══════════════════════════════════════════════════
          STICKY BAR (très discret, en bas)
      ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  {creator.picture ? (
                    <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{(creator.name || "C")[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{creator.name}</p>
                  {creator.min_rate && <p className="text-xs text-gray-400">À partir de {creator.min_rate}€</p>}
                </div>
                <Button 
                  onClick={() => setCollaborationDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold px-5 h-10 rounded-lg"
                >
                  Collaborer
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════
          MODAL COLLABORATION
      ═══════════════════════════════════════════════════ */}
      <Dialog open={collaborationDialogOpen} onOpenChange={setCollaborationDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-0">
          <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-bold">Demander une collaboration</DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
              Envoyez votre brief à {creator?.name}
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-5">
            
            {/* Budget */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Budget estimé</Label>
              <Select value={collabForm.budget_range} onValueChange={(v) => setCollabForm(p => ({ ...p, budget_range: v }))}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Objectif */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Objectif</Label>
              <div className="grid grid-cols-3 gap-2">
                {OBJECTIVES.map(obj => (
                  <div
                    key={obj.value}
                    onClick={() => setCollabForm(p => ({ ...p, objective: obj.value }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                      collabForm.objective === obj.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 hover:border-gray-300 text-gray-500"
                    }`}
                  >
                    <obj.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{obj.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Diffusion */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Type de diffusion</Label>
              <Select value={collabForm.diffusion_type} onValueChange={(v) => setCollabForm(p => ({ ...p, diffusion_type: v }))}>
                <SelectTrigger className="h-12 rounded-xl border-gray-200">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFUSION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Deadline */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Deadline</Label>
              <Input type="date" value={collabForm.deadline} onChange={(e) => setCollabForm(p => ({ ...p, deadline: e.target.value }))} className="h-12 rounded-xl border-gray-200" />
            </div>

            {/* Brief */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Brief *</Label>
              <Textarea
                placeholder="Décrivez votre projet..."
                value={collabForm.brief}
                onChange={(e) => setCollabForm(p => ({ ...p, brief: e.target.value }))}
                rows={3}
                className="rounded-xl border-gray-200 resize-none"
              />
            </div>

            {/* Produit */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Envoi d'un produit ?</Label>
              <div className="flex gap-3">
                {["yes", "no"].map(val => (
                  <div
                    key={val}
                    onClick={() => setCollabForm(p => ({ ...p, product_sent: val }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                      collabForm.product_sent === val ? "border-primary bg-primary/5" : "border-gray-200"
                    }`}
                  >
                    <span className="text-sm font-medium">{val === "yes" ? "Oui" : "Non"}</span>
                  </div>
                ))}
              </div>
            </div>

            {collabForm.product_sent === "yes" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Adresse de livraison</Label>
                <Textarea
                  placeholder="Adresse complète..."
                  value={collabForm.shipping_address}
                  onChange={(e) => setCollabForm(p => ({ ...p, shipping_address: e.target.value }))}
                  rows={2}
                  className="rounded-xl border-gray-200 resize-none"
                />
              </motion.div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
            <Button variant="outline" onClick={() => setCollaborationDialogOpen(false)} className="flex-1 h-12 rounded-xl">
              Annuler
            </Button>
            <Button 
              onClick={handleCollaborationRequest}
              disabled={!collabForm.brief.trim() || submitting}
              className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-xl font-semibold"
            >
              {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Envoyer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20">
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="w-full max-w-sm aspect-[9/16]" onClick={(e) => e.stopPropagation()}>
              <video src={getImageUrl(selectedVideo.url)} className="w-full h-full object-contain rounded-xl" controls autoPlay playsInline />
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
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20">
              <X className="w-6 h-6 text-white" />
            </button>
            <img src={getImageUrl(selectedPhoto.url)} alt="" className="max-w-full max-h-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default CreatorProfileV2;
