import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowLeft, User, MapPin, Star, CheckCircle,
  Video, ExternalLink, Award, Shield, Briefcase, Globe
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CreatorProfile = ({ currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const getVerificationLabel = (status) => {
    switch (status) {
      case "incubator_certified": return { label: "Certifié Incubateur", color: "bg-gradient-to-r from-amber-500 to-orange-500" };
      case "portfolio_validated": return { label: "Portfolio Validé", color: "bg-blue-500" };
      case "identity_verified": return { label: "Identité Vérifiée", color: "bg-green-500" };
      default: return { label: "Non vérifié", color: "bg-slate-600" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!creator) return null;

  const verification = getVerificationLabel(creator.verification_status);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-heading font-bold text-xl text-white">Profil</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-700 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {creator.picture ? (
                      <img src={creator.picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">
                        {creator.name || "Créateur"}
                      </h1>
                      {creator.is_premium && (
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                          <Award className="w-3 h-3 mr-1" /> Premium
                        </Badge>
                      )}
                      <Badge className={`${verification.color} text-white`}>
                        {verification.label}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-slate-400 mb-4">
                      {creator.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {creator.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        {creator.rating?.toFixed(1) || "0.0"} ({creator.reviews_count || 0} avis)
                      </span>
                    </div>

                    {creator.bio && (
                      <p className="text-slate-300 mb-4">{creator.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {creator.can_travel && (
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          <CheckCircle className="w-3 h-3 mr-1" /> Se déplace
                        </Badge>
                      )}
                      {creator.works_remote && (
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          <Globe className="w-3 h-3 mr-1" /> Remote
                        </Badge>
                      )}
                      {creator.available && (
                        <Badge className="bg-green-500/20 text-green-400">
                          Disponible
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700">
                  <div className="text-center">
                    <p className="text-2xl font-heading font-bold text-white">{creator.completion_score || 0}%</p>
                    <p className="text-slate-400 text-sm">Complétion</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-heading font-bold text-white">{creator.reliability_score || 0}</p>
                    <p className="text-slate-400 text-sm">Fiabilité</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-heading font-bold text-white">{creator.performance_score || 0}</p>
                    <p className="text-slate-400 text-sm">Performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portfolio */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Portfolio
                  {creator.portfolio_status === "incomplete" && (
                    <Badge className="bg-amber-500/20 text-amber-400 text-xs ml-2">
                      &lt;3 vidéos
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {creator.portfolio_videos?.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {creator.portfolio_videos.map((video, i) => (
                      <div key={i} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Video className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{video.title}</p>
                            <p className="text-slate-400 text-sm capitalize">{video.platform}</p>
                            {video.views > 0 && (
                              <p className="text-slate-500 text-sm">{video.views.toLocaleString()} vues</p>
                            )}
                          </div>
                          <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune vidéo dans le portfolio</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            {creator.reviews?.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Avis clients</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {creator.reviews.map((review, i) => (
                    <div key={i} className="pb-4 border-b border-slate-700 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex text-yellow-500">
                          {[...Array(review.rating)].map((_, j) => (
                            <Star key={j} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        <span className="text-slate-400 text-sm">{review.business_name || "Entreprise"}</span>
                      </div>
                      <p className="text-slate-300">{review.comment}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <Card className="bg-slate-800 border-slate-700 sticky top-24">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <p className="text-slate-400 text-sm mb-1">Tarifs</p>
                  <p className="font-heading text-3xl font-bold text-white">
                    {creator.min_rate && creator.max_rate
                      ? `${creator.min_rate}€ - ${creator.max_rate}€`
                      : "Sur devis"}
                  </p>
                  <p className="text-slate-400 text-sm">par vidéo</p>
                </div>

                {/* Note: No direct messaging - must go through project */}
                <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 text-center">
                  <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-300 text-sm mb-3">
                    Pour contacter ce créateur, déposez un projet
                  </p>
                  <Button
                    onClick={() => navigate("/business")}
                    className="w-full bg-primary hover:bg-primary-hover"
                    data-testid="contact-via-project-btn"
                  >
                    Déposer un projet
                  </Button>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Projets terminés</span>
                    <span className="text-white">{creator.completed_projects || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Temps de réponse</span>
                    <span className="text-white">~24h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Types */}
            {creator.content_types?.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Spécialités</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {creator.content_types.map((type) => (
                      <Badge key={type} variant="outline" className="border-slate-600 text-slate-300">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Equipment */}
            {creator.equipment?.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Matériel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {creator.equipment.map((item) => (
                      <Badge key={item} className="bg-slate-700 text-slate-300">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Brands */}
            {creator.brands_worked?.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Marques travaillées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {creator.brands_worked.map((brand, i) => (
                      <Badge key={i} className="bg-primary/20 text-primary">
                        {brand}
                      </Badge>
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
