import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, ArrowLeft, User, MapPin, Star, CheckCircle,
  Video, ExternalLink, MessageSquare, Calendar, Clock,
  Globe, Briefcase, DollarSign
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CreatorProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreator();
  }, [userId]);

  const fetchCreator = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setCreator(data);
      } else {
        toast.error("Créateur non trouvé");
        navigate("/creators");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    // Check if user is logged in
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      if (!response.ok) {
        toast.info("Connectez-vous pour contacter ce créateur");
        navigate("/login");
        return;
      }
      navigate("/messages", { state: { contactUserId: userId, contactName: creator?.name } });
    } catch {
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!creator) {
    return null;
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
              <Link to="/creators" className="text-slate-600 hover:text-primary font-medium">
                Créateurs
              </Link>
              <Link to="/login">
                <Button variant="outline">Connexion</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-primary/10 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {creator.picture ? (
                      <img src={creator.picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="font-heading text-2xl md:text-3xl font-bold text-slate-900">
                        {creator.name || "Créateur"}
                      </h1>
                      {creator.is_verified && (
                        <Badge className="bg-blue-500">
                          <CheckCircle className="w-3 h-3 mr-1" /> Vérifié
                        </Badge>
                      )}
                      {creator.available && (
                        <Badge className="bg-green-500">Disponible</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-slate-600 mb-4">
                      {creator.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {creator.city}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-medium">{creator.rating?.toFixed(1) || "0.0"}</span>
                        <span className="text-slate-400">({creator.reviews_count || 0} avis)</span>
                      </div>
                    </div>

                    {creator.bio && (
                      <p className="text-slate-600 mb-4">{creator.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {creator.can_travel && (
                        <Badge variant="secondary">
                          <CheckCircle className="w-3 h-3 mr-1" /> Se déplace
                        </Badge>
                      )}
                      {creator.works_remote && (
                        <Badge variant="secondary">
                          <Globe className="w-3 h-3 mr-1" /> Remote
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="portfolio">
              <TabsList className="bg-white border">
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="reviews">Avis ({creator.reviews?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="portfolio" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio vidéo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {creator.portfolio_videos?.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {creator.portfolio_videos.map((video, index) => (
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
                        <p className="text-slate-500">Aucune vidéo dans le portfolio</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Avis clients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {creator.reviews?.length > 0 ? (
                      <div className="space-y-4">
                        {creator.reviews.map((review, index) => (
                          <div key={index} className="border-b border-slate-100 pb-4 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {review.business_name || "Entreprise"}
                                  </p>
                                  <div className="flex text-yellow-400">
                                    {[...Array(review.rating)].map((_, i) => (
                                      <Star key={i} className="w-3 h-3 fill-current" />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-slate-600">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Star className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500">Aucun avis pour le moment</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <p className="text-sm text-slate-500 mb-1">Tarifs</p>
                  <p className="font-heading text-3xl font-bold text-slate-900">
                    {creator.min_rate && creator.max_rate
                      ? `${creator.min_rate}€ - ${creator.max_rate}€`
                      : "Sur devis"}
                  </p>
                  <p className="text-sm text-slate-500">par vidéo</p>
                </div>

                <Button
                  onClick={handleContact}
                  className="w-full bg-primary hover:bg-primary-hover mb-3"
                  data-testid="contact-creator-btn"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contacter
                </Button>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Projets terminés</span>
                    <span className="font-medium">{creator.completed_projects || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Temps de réponse</span>
                    <span className="font-medium">~24h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Types */}
            {creator.content_types?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Types de contenu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {creator.content_types.map((type) => (
                      <Badge key={type} variant="outline">{type}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sectors */}
            {creator.sectors?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Secteurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {creator.sectors.map((sector) => (
                      <Badge key={sector} className="bg-secondary text-secondary-foreground">
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Badges */}
            {creator.badges?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {creator.badges.map((badge) => (
                      <div key={badge} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="capitalize">{badge.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreatorProfile;
