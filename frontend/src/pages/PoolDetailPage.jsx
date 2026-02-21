import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, Users, Clock, Euro, Zap, ChevronLeft, 
  Play, TrendingUp, Target, Sparkles, Eye, Award,
  Instagram, Youtube, Link2, Send, CheckCircle, AlertCircle,
  ExternalLink, Copy, Crown
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

// TikTok icon component
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const getPlatformIcon = (platform) => {
  switch (platform) {
    case "TIKTOK":
      return <TikTokIcon className="w-5 h-5" />;
    case "INSTAGRAM_REELS":
      return <Instagram className="w-5 h-5" />;
    case "YOUTUBE_SHORTS":
      return <Youtube className="w-5 h-5" />;
    default:
      return <Play className="w-5 h-5" />;
  }
};

const getPlatformName = (platform) => {
  switch (platform) {
    case "TIKTOK": return "TikTok";
    case "INSTAGRAM_REELS": return "Instagram Reels";
    case "YOUTUBE_SHORTS": return "YouTube Shorts";
    default: return platform;
  }
};

const PoolDetailPage = ({ user }) => {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const [pool, setPool] = useState(null);
  const [participation, setParticipation] = useState(null);
  const [application, setApplication] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("brief"); // brief | submissions | leaderboard

  // Form state for single submission
  const [submitForm, setSubmitForm] = useState({
    platform: "",
    content_url: "",
    description: ""
  });
  
  // Apply form state
  const [applyMessage, setApplyMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, [poolId]);

  const fetchData = async () => {
    try {
      const [poolRes, submissionsRes, leaderboardRes] = await Promise.all([
        fetch(`${API_URL}/api/pools/${poolId}`, { credentials: "include" }),
        fetch(`${API_URL}/api/pools/my/submissions?pool_id=${poolId}`, { credentials: "include" }),
        fetch(`${API_URL}/api/pools/${poolId}/leaderboard`, { credentials: "include" })
      ]);

      if (poolRes.ok) {
        const data = await poolRes.json();
        setPool(data);
        setParticipation(data.participation);
        setApplication(data.application);
      }
      if (submissionsRes.ok) {
        const data = await submissionsRes.json();
        setSubmissions(data);
      }
      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPool = async () => {
    // If pool requires approval, open apply dialog
    if (pool?.requires_approval) {
      setApplyDialogOpen(true);
      return;
    }
    
    // Direct join
    try {
      const response = await fetch(`${API_URL}/api/pools/${poolId}/join`, {
        method: "POST",
        credentials: "include"
      });

      if (response.ok) {
        const result = await response.json();
        if (result.type === "application") {
          toast.success("Candidature envoyée ! En attente de validation.");
        } else {
          toast.success("Tu as rejoint le pool ! Publie du contenu pour gagner.");
        }
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur lors de l'inscription");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  };

  const handleApplyPool = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/pools/${poolId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: applyMessage })
      });

      if (response.ok) {
        toast.success("Candidature envoyée ! En attente de validation par la marque.");
        setApplyDialogOpen(false);
        setApplyMessage("");
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur lors de la candidature");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitContent = async () => {
    if (!submitForm.platform || !submitForm.content_url) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/pools/${poolId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(submitForm)
      });

      if (response.ok) {
        toast.success("✅ Contenu soumis avec succès !");
        setSubmitDialogOpen(false);
        setSubmitForm({ platform: "", content_url: "", description: "" });
        fetchData();
        setActiveTab("submissions");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur lors de la soumission");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const getTimeRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    return days;
  };

  if (loading) {
    return (
      <AppLayout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  if (!pool) {
    return (
      <AppLayout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Pool non trouvé</h2>
            <Button className="mt-4" onClick={() => navigate("/arena")}>
              Retour à l'Arena
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const hasJoined = !!participation;
  const hasApplied = !!application;
  const applicationPending = application?.status === "pending";
  const applicationRejected = application?.status === "rejected";
  const ui = pool.ui_arena || {};
  
  // Determine CTA state
  const renderCTA = () => {
    if (pool.status !== "active") return null;
    
    if (hasJoined) {
      return (
        <Button 
          size="lg"
          className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600"
          onClick={() => setSubmitDialogOpen(true)}
          data-testid="submit-content-btn"
        >
          <Send className="w-5 h-5 mr-2" />
          Soumettre du contenu
        </Button>
      );
    }
    
    if (applicationPending) {
      return (
        <Button 
          size="lg"
          disabled
          className="bg-yellow-500/80 cursor-not-allowed"
          data-testid="application-pending-btn"
        >
          <Clock className="w-5 h-5 mr-2 animate-pulse" />
          Candidature en attente
        </Button>
      );
    }
    
    if (applicationRejected) {
      return (
        <Button 
          size="lg"
          disabled
          className="bg-red-500/50 cursor-not-allowed"
          data-testid="application-rejected-btn"
        >
          <AlertCircle className="w-5 h-5 mr-2" />
          Candidature refusée
        </Button>
      );
    }
    
    // Not joined, not applied
    return (
      <Button 
        size="lg"
        className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600"
        onClick={handleJoinPool}
        data-testid="join-pool-btn"
      >
        <Zap className="w-5 h-5 mr-2" />
        {pool.requires_approval ? "Postuler" : "Rejoindre le pool"}
      </Button>
    );
  };

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Back button */}
          <button 
            onClick={() => navigate("/pool")}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour aux Pools
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className={
                  pool.status === "active" 
                    ? "bg-green-500 text-white" 
                    : "bg-gray-500 text-white"
                }>
                  {pool.status === "active" ? "Actif" : "Terminé"}
                </Badge>
                {pool.requires_approval && (
                  <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Candidature requise
                  </Badge>
                )}
                <span className="text-gray-400 text-sm">{pool.brand?.industry}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">{pool.brand?.name}</h1>
              <p className="text-gray-400 mt-1">{pool.brief?.key_message}</p>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              {renderCTA()}
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Euro className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-xl font-bold">{pool.budget_remaining}€</div>
              <div className="text-xs text-gray-400">Budget restant</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-xl font-bold">{pool.total_participants}</div>
              <div className="text-xs text-gray-400">Participants</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <div className="text-xl font-bold">{getTimeRemaining(pool.end_date)}j</div>
              <div className="text-xs text-gray-400">Restants</div>
            </div>
              <Award className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-xl font-bold">{pool.max_payout_per_creator}€</div>
              <div className="text-xs text-gray-400">Gain max</div>
            </div>
          </div>

          {/* My stats if joined */}
          {hasJoined && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-green-400">Tu participes à ce pool</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{participation?.total_submissions || 0}</div>
                  <div className="text-xs text-gray-400">Mes publications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{participation?.total_views || 0}</div>
                  <div className="text-xs text-gray-400">Mes vues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {(participation?.estimated_earnings || 0).toFixed(2)}€
                  </div>
                  <div className="text-xs text-gray-400">Gains estimés</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 bg-white border-b sticky top-14 lg:top-0 z-30">
        <div className="flex gap-2">
          {["brief", "submissions", "leaderboard"].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "bg-primary" : ""}
            >
              {tab === "brief" && "Brief"}
              {tab === "submissions" && `Mes soumissions (${submissions.length})`}
              {tab === "leaderboard" && "Classement"}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "brief" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main brief */}
            <div className="lg:col-span-2 space-y-6">
              {/* How it works */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Comment ça marche
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{ui.mode_explanation}</p>
                </CardContent>
              </Card>

              {/* Offer description */}
              <Card>
                <CardHeader>
                  <CardTitle>L'offre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{pool.brief?.offer_description}</p>
                  
                  {pool.brief?.cta && (
                    <div className="p-4 bg-primary/10 rounded-xl">
                      <p className="font-semibold text-primary">Call to Action:</p>
                      <p className="text-gray-700">{pool.brief?.cta}</p>
                    </div>
                  )}

                  {pool.brief?.landing_url && (
                    <a 
                      href={pool.brief.landing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Voir la page de destination
                    </a>
                  )}
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle>Exigences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pool.brief?.mandatory_hashtags?.length > 0 && (
                    <div>
                      <Label className="text-gray-500 text-sm">Hashtags obligatoires</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pool.brief.mandatory_hashtags.map((tag, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-gray-100"
                            onClick={() => copyToClipboard(tag)}
                          >
                            {tag}
                            <Copy className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {pool.brief?.mandatory_mentions?.length > 0 && (
                    <div>
                      <Label className="text-gray-500 text-sm">Mentions obligatoires</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pool.brief.mandatory_mentions.map((mention, i) => (
                          <Badge 
                            key={i} 
                            variant="outline"
                            className="cursor-pointer hover:bg-gray-100"
                            onClick={() => copyToClipboard(mention)}
                          >
                            {mention}
                            <Copy className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {pool.brief?.content_format && (
                    <div>
                      <Label className="text-gray-500 text-sm">Format de contenu</Label>
                      <p className="mt-1">{pool.brief.content_format}</p>
                    </div>
                  )}

                  {pool.brief?.things_to_avoid?.length > 0 && (
                    <div>
                      <Label className="text-gray-500 text-sm">À éviter</Label>
                      <ul className="mt-2 space-y-1">
                        {pool.brief.things_to_avoid.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Examples */}
              {pool.brief?.examples_links?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Exemples d'inspiration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {pool.brief.examples_links.map((link, i) => (
                        <a 
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Exemple {i + 1}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Platforms */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Plateformes acceptées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pool.platforms?.map((platform) => (
                      <div key={platform} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        {getPlatformIcon(platform)}
                        <span className="font-medium">{getPlatformName(platform)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Brand info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">À propos de la marque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-gray-500 text-xs">Secteur</Label>
                    <p className="font-medium">{pool.brand?.industry}</p>
                  </div>
                  {pool.brand?.website && (
                    <div>
                      <Label className="text-gray-500 text-xs">Site web</Label>
                      <a 
                        href={pool.brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {pool.brand.website}
                      </a>
                    </div>
                  )}
                  {pool.brand?.social_handles?.length > 0 && (
                    <div>
                      <Label className="text-gray-500 text-xs">Réseaux sociaux</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {pool.brand.social_handles.map((handle, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {handle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="space-y-4">
            {!hasJoined ? (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rejoins d'abord le pool</h3>
                <p className="text-gray-500 mb-4">Tu dois rejoindre le pool avant de soumettre du contenu</p>
                <Button onClick={handleJoinPool}>
                  <Zap className="w-4 h-4 mr-2" />
                  Rejoindre le pool
                </Button>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-16">
                <Send className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune soumission</h3>
                <p className="text-gray-500 mb-4">Tu n'as pas encore soumis de contenu pour ce pool</p>
                <Button onClick={() => setSubmitDialogOpen(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Soumettre du contenu
                </Button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Mes soumissions ({submissions.length})</h3>
                  <Button onClick={() => setSubmitDialogOpen(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <Card key={sub.submission_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              {getPlatformIcon(sub.platform)}
                            </div>
                            <div>
                              <p className="font-medium">{getPlatformName(sub.platform)}</p>
                              <a 
                                href={sub.content_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <Link2 className="w-3 h-3" />
                                Voir le contenu
                              </a>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{sub.views || 0}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(sub.submitted_at).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <h3 className="font-semibold mb-4">Classement des participants</h3>
            {leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun participant</h3>
                <p className="text-gray-500">Sois le premier à rejoindre ce pool !</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((participant, index) => (
                  <Card key={participant.creator_id} className={
                    participant.creator_id === user?.user_id 
                      ? "border-primary bg-primary/5" 
                      : ""
                  }>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? "bg-yellow-100 text-yellow-600" :
                          index === 1 ? "bg-gray-100 text-gray-600" :
                          index === 2 ? "bg-orange-100 text-orange-600" :
                          "bg-gray-50 text-gray-500"
                        }`}>
                          {index === 0 ? <Crown className="w-5 h-5" /> : index + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                          {participant.creator_picture ? (
                            <img src={participant.creator_picture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-gray-500">
                              {(participant.creator_name || "?")[0].toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <p className="font-semibold">
                            {participant.creator_name}
                            {participant.creator_id === user?.user_id && (
                              <Badge className="ml-2 bg-primary text-white text-xs">Toi</Badge>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {participant.total_submissions} publications
                          </p>
                        </div>

                        {/* Views */}
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Eye className="w-4 h-4" />
                            <span className="font-bold">{participant.total_views}</span>
                          </div>
                          <p className="text-xs text-gray-500">vues</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply to Pool Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Postuler à cette pool
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700">
                Cette pool nécessite une approbation de la marque. Une fois accepté, tu pourras soumettre tes vidéos.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Message de motivation (optionnel)</Label>
              <Textarea
                placeholder="Explique pourquoi tu souhaites participer à cette pool..."
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Un bon message augmente tes chances d'être accepté !
              </p>
            </div>

            <Button 
              className="w-full bg-primary hover:bg-primary-hover"
              onClick={handleApplyPool}
              disabled={submitting}
              data-testid="submit-application-btn"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer ma candidature
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Content Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Soumettre du contenu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Plateforme *</Label>
              <Select
                value={submitForm.platform}
                onValueChange={(value) => setSubmitForm({ ...submitForm, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une plateforme" />
                </SelectTrigger>
                <SelectContent>
                  {pool.platforms?.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(platform)}
                        {getPlatformName(platform)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lien de la publication *</Label>
              <Input
                placeholder="https://..."
                value={submitForm.content_url}
                onChange={(e) => setSubmitForm({ ...submitForm, content_url: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Colle le lien direct vers ta vidéo publiée
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                placeholder="Décris brièvement ton contenu..."
                value={submitForm.description}
                onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <Button 
              className="w-full bg-primary hover:bg-primary-hover"
              onClick={handleSubmitContent}
              disabled={submitting}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Soumettre
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default PoolDetailPage;
