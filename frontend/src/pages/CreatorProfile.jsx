import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, MapPin, Star, CheckCircle, Clock, Globe,
  Video, Camera, Smartphone, Lightbulb, Mic, Play, ExternalLink,
  Award, Shield, Briefcase, Heart, MessageCircle, Share2,
  Languages, Home, Car, Users, Dog, Package, ChevronDown
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CreatorProfile = ({ currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("video");
  const [showBio, setShowBio] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  useEffect(() => {
    fetchCreator();
  }, [userId]);

  const fetchCreator = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/${userId}`, {
        credentials: "include",
      });
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

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getVerificationBadge = (status, isPremium) => {
    if (isPremium) {
      return { label: "Premium", icon: Award, color: "bg-primary text-white" };
    }
    switch (status) {
      case "incubator_certified": return { label: "Certifié", icon: Shield, color: "bg-primary text-white" };
      case "portfolio_validated": return { label: "Validé", icon: CheckCircle, color: "bg-blue-500 text-white" };
      case "identity_verified": return { label: "Vérifié", icon: CheckCircle, color: "bg-green-500 text-white" };
      default: return { label: "Non vérifié", icon: null, color: "bg-gray-200 text-gray-600" };
    }
  };

  const getEquipmentIcon = (item) => {
    const lower = item.toLowerCase();
    if (lower.includes("smartphone") || lower.includes("iphone")) return Smartphone;
    if (lower.includes("camera") || lower.includes("caméra")) return Camera;
    if (lower.includes("micro") || lower.includes("mic")) return Mic;
    if (lower.includes("lumière") || lower.includes("light") || lower.includes("éclairage")) return Lightbulb;
    return Camera;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!creator) return null;

  const verification = getVerificationBadge(creator.verification_status, creator.is_premium);
  const hasRates = creator.min_rate || creator.max_rate;

  // Mock data for richer display (would come from backend in production)
  const mockPackages = [
    {
      name: "UGC Classic",
      price: creator.min_rate || 200,
      includes: ["1 vidéo UGC", "2 révisions incluses", "Livraison 7 jours", "Droits 6 mois"],
      format: "Vertical (TikTok, Instagram...)"
    },
    {
      name: "Pack 2 vidéos",
      price: (creator.min_rate || 200) * 1.8,
      includes: ["2 vidéos UGC", "3 révisions incluses", "Livraison 10 jours", "Droits 12 mois"],
      format: "Vertical + Horizontal"
    }
  ];

  const additionalOptions = [
    { name: "Hook supplémentaire", price: 20 },
    { name: "Montage avancé", price: 50 },
    { name: "Livraison express (48h)", price: 40 },
    { name: "Révision supplémentaire", price: 30 },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType={currentUser?.user_type} isPremium={currentUser?.is_premium} onLogout={handleLogout} />

      <div className="ml-64">
        {/* Back Button Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-heading text-xl font-bold text-gray-900">Profil Créateur</h1>
          </div>
        </header>

        <main className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Hero Section with Cover */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mb-8"
            >
              {/* Cover Image */}
              <div className="h-48 md:h-64 rounded-t-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGRjJFNjMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              </div>

              {/* Profile Card overlapping cover */}
              <Card className="relative -mt-24 mx-4 md:mx-8 border-0 shadow-xl bg-white rounded-2xl overflow-visible">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0 -mt-20 md:-mt-16">
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-white shadow-lg border-4 border-white overflow-hidden">
                        {creator.picture ? (
                          <img src={creator.picture} alt={creator.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="text-5xl font-heading font-bold text-primary">
                              {(creator.name || "C")[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 pt-2">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h1 className="font-heading text-2xl md:text-3xl font-bold text-gray-900">
                          {creator.name || "Créateur"}
                        </h1>
                        {verification.icon && (
                          <Badge className={`${verification.color} gap-1`}>
                            <verification.icon className="w-3 h-3" />
                            {verification.label}
                          </Badge>
                        )}
                        {!verification.icon && (
                          <Badge className={verification.color}>{verification.label}</Badge>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          <span className="font-semibold text-gray-900">{creator.rating?.toFixed(1) || "5.0"}</span>
                        </div>
                        <span className="text-gray-400">({creator.reviews_count || 0} avis)</span>
                        {creator.available && (
                          <Badge className="bg-green-100 text-green-700 ml-2">Disponible</Badge>
                        )}
                      </div>

                      {/* Quick Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {creator.city && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{creator.city}, France</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <Languages className="w-4 h-4 text-gray-400" />
                          <span>Français</span>
                        </div>
                        {creator.equipment?.length > 0 && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Camera className="w-4 h-4 text-gray-400" />
                            <span>{creator.equipment[0]}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>Répond en ~24h</span>
                        </div>
                        {creator.can_travel && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Car className="w-4 h-4 text-gray-400" />
                            <span>Se déplace</span>
                          </div>
                        )}
                        {creator.works_remote && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span>Travaille à distance</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span>{creator.completed_projects || 0} projets réalisés</span>
                        </div>
                      </div>

                      {/* Bio */}
                      {creator.bio && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className={`text-gray-600 ${!showBio && creator.bio.length > 150 ? "line-clamp-2" : ""}`}>
                            {creator.bio}
                          </p>
                          {creator.bio.length > 150 && (
                            <button 
                              onClick={() => setShowBio(!showBio)}
                              className="text-primary font-medium text-sm mt-1 hover:underline"
                            >
                              {showBio ? "Voir moins" : "Voir plus"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 mt-6">
                        <Button 
                          onClick={() => setContactDialogOpen(true)}
                          className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                          data-testid="contact-btn"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contacter
                        </Button>
                        <Button variant="outline" className="border-gray-200">
                          <Heart className="w-4 h-4 mr-2" />
                          Favoris
                        </Button>
                        <Button variant="outline" className="border-gray-200">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column - Portfolio & Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Scores */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <h3 className="font-heading font-semibold text-gray-900 mb-4">Performance</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-3xl font-heading font-bold text-primary">{creator.completion_score || 0}%</p>
                        <p className="text-gray-500 text-sm">Complétion</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-3xl font-heading font-bold text-gray-900">{creator.reliability_score || 0}</p>
                        <p className="text-gray-500 text-sm">Fiabilité</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-3xl font-heading font-bold text-gray-900">{creator.performance_score || 0}</p>
                        <p className="text-gray-500 text-sm">Performance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Portfolio Tabs */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <Tabs defaultValue="video" className="w-full">
                      <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6">
                        <TabsTrigger value="video" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                          Vidéo
                        </TabsTrigger>
                        <TabsTrigger value="info" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                          Infos
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="video">
                        {creator.portfolio_videos?.length > 0 ? (
                          <div className="grid md:grid-cols-2 gap-4">
                            {creator.portfolio_videos.map((video, i) => (
                              <motion.a
                                key={i}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="w-6 h-6 text-primary fill-primary ml-1" />
                                  </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="font-medium truncate">{video.title}</p>
                                  <p className="text-sm text-white/80 capitalize">{video.platform}</p>
                                </div>
                              </motion.a>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-xl">
                            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Aucune vidéo dans le portfolio</p>
                            <p className="text-gray-400 text-sm mt-1">Ce créateur n'a pas encore ajouté de vidéos</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="info">
                        <div className="space-y-6">
                          {/* Specialties */}
                          {creator.content_types?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Types de contenu</h4>
                              <div className="flex flex-wrap gap-2">
                                {creator.content_types.map((type) => (
                                  <Badge key={type} className="bg-primary/10 text-primary hover:bg-primary/20">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Equipment */}
                          {creator.equipment?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Équipement</h4>
                              <div className="grid grid-cols-2 gap-3">
                                {creator.equipment.map((item) => {
                                  const Icon = getEquipmentIcon(item);
                                  return (
                                    <div key={item} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                      <Icon className="w-5 h-5 text-gray-400" />
                                      <span className="text-gray-700">{item}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Sectors */}
                          {creator.sectors?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Secteurs d'expertise</h4>
                              <div className="flex flex-wrap gap-2">
                                {creator.sectors.map((sector) => (
                                  <Badge key={sector} variant="outline" className="border-gray-200">
                                    {sector}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Brands */}
                          {creator.brands_worked?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Marques partenaires</h4>
                              <div className="flex flex-wrap gap-2">
                                {creator.brands_worked.map((brand, i) => (
                                  <div key={i} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">
                                    {brand}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Experience */}
                          {creator.experience_level && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Niveau d'expérience</h4>
                              <Badge className={`
                                ${creator.experience_level === 'expert' ? 'bg-primary text-white' : ''}
                                ${creator.experience_level === 'intermediate' ? 'bg-blue-100 text-blue-700' : ''}
                                ${creator.experience_level === 'beginner' ? 'bg-gray-100 text-gray-700' : ''}
                              `}>
                                {creator.experience_level === 'expert' && 'Expert'}
                                {creator.experience_level === 'intermediate' && 'Intermédiaire'}
                                {creator.experience_level === 'beginner' && 'Débutant'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Reviews */}
                {creator.reviews?.length > 0 && (
                  <Card className="border-0 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        Avis clients ({creator.reviews.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {creator.reviews.map((review, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[...Array(5)].map((_, j) => (
                                <Star 
                                  key={j} 
                                  className={`w-4 h-4 ${j < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-gray-500 text-sm">{review.business_name || "Entreprise"}</span>
                          </div>
                          <p className="text-gray-700">{review.comment}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Pricing */}
              <div className="space-y-6">
                {/* Pricing Card */}
                <Card className="border-0 shadow-md sticky top-24">
                  <CardContent className="p-6">
                    {mockPackages.map((pkg, i) => (
                      <div key={i} className={`${i > 0 ? 'mt-6 pt-6 border-t border-gray-100' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-heading font-semibold text-gray-900">{pkg.name}</h3>
                          <p className="font-heading text-2xl font-bold text-primary">€{pkg.price}</p>
                        </div>
                        <ul className="space-y-2 mb-4">
                          {pkg.includes.map((item, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                        <div className="text-sm text-gray-500 mb-4">
                          <span className="font-medium">Format:</span> {pkg.format}
                        </div>
                        {i === 0 && (
                          <Button 
                            onClick={() => setContactDialogOpen(true)}
                            className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                          >
                            Choisir ce pack
                          </Button>
                        )}
                      </div>
                    ))}

                    {/* Additional Options */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h4 className="font-medium text-gray-900 mb-3">Options additionnelles</h4>
                      <div className="space-y-2">
                        {additionalOptions.map((opt, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{opt.name}</span>
                            <span className="font-medium text-gray-900">+€{opt.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Card */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Projets terminés</span>
                      <span className="font-semibold text-gray-900">{creator.completed_projects || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Temps de réponse</span>
                      <span className="font-semibold text-gray-900">~24h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Membre depuis</span>
                      <span className="font-semibold text-gray-900">2024</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Contacter {creator.name || "ce créateur"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 mb-4">
              <p className="text-gray-700 text-sm">
                Pour contacter ce créateur, vous devez créer un projet. Le créateur pourra alors candidater et vous pourrez échanger directement.
              </p>
            </div>
            <Button
              onClick={() => {
                setContactDialogOpen(false);
                navigate("/business");
              }}
              className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Créer un projet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorProfile;
