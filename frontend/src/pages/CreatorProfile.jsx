import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, MapPin, Star, CheckCircle, Clock, Globe, Video, Camera, Smartphone, 
  Lightbulb, Mic, Play, Award, Shield, Briefcase, Heart, MessageCircle, Share2, Crown, Car, X, Send
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import ReviewsSection from "../components/ReviewsSection";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Niches / Secteurs d'activité
const NICHE_LABELS = {
  beaute: { label: "Beauté & Cosmétique", icon: "💄" },
  igaming: { label: "iGaming & Paris", icon: "🎰" },
  gaming: { label: "Gaming & Esport", icon: "🎮" },
  mode: { label: "Mode & Fashion", icon: "👗" },
  tech: { label: "Tech & Gadgets", icon: "📱" },
  food: { label: "Food & Gastronomie", icon: "🍕" },
  fitness: { label: "Fitness & Sport", icon: "💪" },
  voyage: { label: "Voyage & Lifestyle", icon: "✈️" },
  finance: { label: "Finance & Crypto", icon: "💰" },
  immobilier: { label: "Immobilier", icon: "🏠" },
  auto: { label: "Auto & Moto", icon: "🚗" },
  education: { label: "Éducation & Formation", icon: "📚" },
  sante: { label: "Santé & Bien-être", icon: "🧘" },
  enfants: { label: "Famille & Enfants", icon: "👶" },
  animaux: { label: "Animaux", icon: "🐾" },
  musique: { label: "Musique & Art", icon: "🎵" },
  b2b: { label: "B2B & SaaS", icon: "💼" },
  ecommerce: { label: "E-commerce", icon: "🛒" },
};

const CreatorProfile = ({ currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBio, setShowBio] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [startingConversation, setStartingConversation] = useState(false);

  useEffect(() => { fetchCreator(); }, [userId]);

  const fetchCreator = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/${userId}`, { credentials: "include" });
      if (response.ok) setCreator(await response.json());
      else { toast.error("Créateur non trouvé"); navigate(-1); }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async () => {
    if (currentUser?.user_type !== "business") {
      toast.error("Seules les entreprises peuvent contacter les créateurs");
      return;
    }
    
    // Check if user is subscribed before even trying
    if (!currentUser?.is_subscribed && !currentUser?.is_premium) {
      setContactDialogOpen(false);
      navigate("/billing", { state: { reason: "contact_creator", creatorName: creator?.name } });
      return;
    }
    
    setStartingConversation(true);
    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ creator_id: userId }),
      });
      
      if (response.ok) {
        const conv = await response.json();
        navigate(`/messages/${conv.conversation_id}`);
      } else {
        const error = await response.json();
        if (error.detail?.includes("Abonnement")) {
          // Redirect to billing page
          setContactDialogOpen(false);
          navigate("/billing", { state: { reason: "contact_creator", creatorName: creator?.name } });
        } else {
          toast.error(error.detail || "Erreur");
        }
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setStartingConversation(false);
      setContactDialogOpen(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const getVerificationBadge = (status, isPremium) => {
    if (isPremium) return { label: "Premium", icon: Award, color: "bg-primary text-white" };
    if (status === "incubator_certified") return { label: "Certifié", icon: Shield, color: "bg-primary text-white" };
    if (status === "portfolio_validated") return { label: "Validé", icon: CheckCircle, color: "bg-blue-500 text-white" };
    return { label: "Non vérifié", icon: null, color: "bg-gray-200 text-gray-600" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!creator) return null;

  const verification = getVerificationBadge(creator.verification_status, creator.is_premium);
  const mockPackages = [
    { name: "UGC Classic", price: creator.min_rate || 200, includes: ["1 vidéo UGC", "2 révisions", "7 jours"] },
    { name: "Pack 2 vidéos", price: (creator.min_rate || 200) * 1.8, includes: ["2 vidéos UGC", "3 révisions", "10 jours"] },
  ];

  return (
    <AppLayout user={currentUser}>
      {/* Back Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Retour</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Banner */}
            <div className="h-32 sm:h-40 lg:h-48 rounded-t-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 overflow-hidden relative">
              {creator.banner && <img src={getImageUrl(creator.banner)} alt="" className="w-full h-full object-cover" />}
            </div>

            {/* Profile Card */}
            <Card className="relative -mt-16 sm:-mt-20 mx-2 sm:mx-4 border-0 shadow-lg rounded-2xl overflow-visible">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Avatar */}
                  <div className="-mt-12 sm:-mt-14 flex-shrink-0">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-white shadow-lg border-4 border-white overflow-hidden">
                      {creator.picture ? (
                        <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl font-heading font-bold text-primary">
                            {(creator.name || "C")[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-900">{creator.name || "Créateur"}</h1>
                      {verification.icon ? (
                        <Badge className={`${verification.color} gap-1 text-xs`}>
                          <verification.icon className="w-3 h-3" />
                          {verification.label}
                        </Badge>
                      ) : (
                        <Badge className={`${verification.color} text-xs`}>{verification.label}</Badge>
                      )}
                      {creator.available && <Badge className="bg-green-100 text-green-700 text-xs">Dispo</Badge>}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">{creator.rating?.toFixed(1) || "5.0"}</span>
                      <span className="text-gray-400">({creator.reviews_count || 0} avis)</span>
                    </div>

                    {/* Quick Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-gray-600">
                      {creator.city && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{creator.city}</span>
                      )}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Répond ~24h</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{creator.completed_projects || 0} projets</span>
                      {creator.works_remote && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />À distance</span>}
                      {creator.can_travel && <span className="flex items-center gap-1"><Car className="w-3 h-3" />Se déplace</span>}
                    </div>

                    {/* Bio */}
                    {creator.bio && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className={`text-gray-600 text-sm ${!showBio && creator.bio.length > 100 ? "line-clamp-2" : ""}`}>{creator.bio}</p>
                        {creator.bio.length > 100 && (
                          <button onClick={() => setShowBio(!showBio)} className="text-primary font-medium text-xs mt-1">
                            {showBio ? "Moins" : "Plus"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button onClick={() => setContactDialogOpen(true)} size="sm" className="bg-primary hover:bg-primary-hover text-xs">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Contacter
                      </Button>
                      <Button variant="outline" size="sm" className="border-gray-200 text-xs">
                        <Heart className="w-4 h-4 mr-1" />
                        Favoris
                      </Button>
                      <Button variant="outline" size="sm" className="border-gray-200 text-xs p-2">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
            {/* Main */}
            <div className="lg:col-span-2 space-y-4">
              {/* Scores */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-heading font-semibold text-gray-900 mb-3 text-sm">Performance</h3>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {[
                      { label: "Complétion", value: creator.completion_score || 0, suffix: "%" },
                      { label: "Fiabilité", value: creator.reliability_score || 0, suffix: "" },
                      { label: "Performance", value: creator.performance_score || 0, suffix: "" },
                    ].map((item, i) => (
                      <div key={i} className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-heading font-bold text-primary">{item.value}{item.suffix}</p>
                        <p className="text-gray-500 text-xs">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <Tabs defaultValue="video">
                    <TabsList className="grid w-full max-w-[200px] grid-cols-2 mb-4">
                      <TabsTrigger value="video" className="text-xs">Vidéo</TabsTrigger>
                      <TabsTrigger value="info" className="text-xs">Infos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="video">
                      {creator.portfolio_videos?.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {creator.portfolio_videos.map((video, i) => (
                            <div 
                              key={i} 
                              className="group relative aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden cursor-pointer"
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
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Video className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Aucune vidéo</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="info" className="space-y-4">
                      {creator.content_types?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-sm">Types de contenu</h4>
                          <div className="flex flex-wrap gap-1">
                            {creator.content_types.map((type) => (
                              <Badge key={type} className="bg-primary/10 text-primary text-xs">{type}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {creator.equipment?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 text-sm">Équipement</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {creator.equipment.map((item) => (
                              <div key={item} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                                <Camera className="w-4 h-4 text-gray-400" />
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Pricing */}
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  {mockPackages.map((pkg, i) => (
                    <div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-gray-100" : ""}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-heading font-semibold text-gray-900 text-sm">{pkg.name}</h3>
                        <p className="font-heading text-xl font-bold text-primary">€{pkg.price}</p>
                      </div>
                      <ul className="space-y-1 mb-3">
                        {pkg.includes.map((item, j) => (
                          <li key={j} className="flex items-center gap-2 text-xs text-gray-600">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      {i === 0 && (
                        <Button onClick={() => setContactDialogOpen(true)} size="sm" className="w-full bg-primary hover:bg-primary-hover text-xs">
                          Choisir
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Projets</span><span className="font-medium">{creator.completed_projects || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Réponse</span><span className="font-medium">~24h</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Membre</span><span className="font-medium">2024</span></div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <ReviewsSection userId={userId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Contacter {creator.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {/* Direct message option */}
            <Button 
              onClick={startConversation} 
              disabled={startingConversation}
              className="w-full bg-primary hover:bg-primary-hover"
            >
              {startingConversation ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer un message
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">ou</span>
              </div>
            </div>
            
            {/* Create project option */}
            <Button 
              variant="outline" 
              onClick={() => { setContactDialogOpen(false); navigate("/business/projects/new"); }} 
              className="w-full border-gray-200"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Créer un projet
            </Button>
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

export default CreatorProfile;
