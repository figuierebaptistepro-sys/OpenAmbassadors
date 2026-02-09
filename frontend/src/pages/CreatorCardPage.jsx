import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, Star, Crown, ShieldCheck, Trophy, ExternalLink, 
  Instagram, Youtube, Twitter, Linkedin, Link as LinkIcon,
  Briefcase, ChevronRight, Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Niche labels
const NICHE_LABELS = {
  beaute: "Beauté & Cosmétique",
  igaming: "iGaming",
  gaming: "Gaming",
  mode: "Mode & Lifestyle",
  tech: "Tech & Innovation",
  food: "Food & Gastronomie",
  fitness: "Fitness & Sport",
  voyage: "Voyage & Tourisme",
  finance: "Finance & Business",
  immobilier: "Immobilier",
  auto: "Automobile",
  education: "Éducation",
  sante: "Santé & Bien-être",
  enfants: "Famille & Enfants",
  animaux: "Animaux",
  musique: "Musique & Entertainment",
  b2b: "B2B & Services Pro",
  ecommerce: "E-commerce"
};

// Badge icons
const BadgeIcon = ({ type }) => {
  switch (type) {
    case "premium": return <Crown className="w-3 h-3" />;
    case "verified": return <ShieldCheck className="w-3 h-3" />;
    case "top_rated": return <Star className="w-3 h-3" />;
    case "experienced": return <Trophy className="w-3 h-3" />;
    default: return null;
  }
};

// Social icons
const SocialIcon = ({ platform }) => {
  switch (platform) {
    case "instagram": return <Instagram className="w-5 h-5" />;
    case "youtube": return <Youtube className="w-5 h-5" />;
    case "twitter": return <Twitter className="w-5 h-5" />;
    case "linkedin": return <Linkedin className="w-5 h-5" />;
    case "tiktok": return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    );
    default: return <LinkIcon className="w-5 h-5" />;
  }
};

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
};

const CreatorCardPage = ({ user }) => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCreatorCard();
  }, [username]);

  const fetchCreatorCard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/c/${username}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Créateur non trouvé");
        } else {
          setError("Erreur lors du chargement");
        }
        return;
      }
      const data = await response.json();
      setCreator(data);
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleCollaboration = () => {
    if (!user) {
      // Not logged in -> redirect to login
      navigate(`/login?redirect=/@${username}`);
      return;
    }
    
    if (user.user_type !== "business") {
      // Not a business account
      navigate("/select-type");
      return;
    }
    
    if (!user.is_subscribed && !user.is_premium) {
      // Business not subscribed -> redirect to subscription page
      navigate("/business/subscribe");
      return;
    }
    
    // Business subscribed -> redirect to proposal creation
    navigate(`/dashboard/proposals/new?creator=${username}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
          <p className="text-gray-500 mb-4">Le profil @{username} n'existe pas</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const socialLinks = Object.entries(creator.social || {}).filter(([_, url]) => url);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" style={{ overscrollBehavior: 'none' }}>
      {/* Hero Section */}
      <div className="relative">
        {/* Banner */}
        <div className="h-32 sm:h-40 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-pink-100">
          {creator.banner && (
            <img 
              src={getImageUrl(creator.banner)} 
              alt="" 
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        {/* Profile Info */}
        <div className="max-w-lg mx-auto px-4 -mt-16 sm:-mt-20 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Profile Picture */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full bg-white shadow-xl border-4 border-white overflow-hidden">
              {creator.picture ? (
                <img 
                  src={getImageUrl(creator.picture)} 
                  alt={creator.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">
                    {(creator.name || "C")[0]}
                  </span>
                </div>
              )}
            </div>
            
            {/* Name */}
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">
              {creator.name}
            </h1>
            
            {/* Username */}
            <p className="text-gray-500 text-sm">@{creator.username}</p>
            
            {/* Badges */}
            {creator.badges && creator.badges.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                {creator.badges.map((badge, i) => (
                  <Badge 
                    key={i}
                    className={`
                      ${badge.type === "premium" ? "bg-gradient-to-r from-primary to-pink-500 text-white" : ""}
                      ${badge.type === "verified" ? "bg-blue-100 text-blue-700" : ""}
                      ${badge.type === "top_rated" ? "bg-yellow-100 text-yellow-700" : ""}
                      ${badge.type === "experienced" ? "bg-green-100 text-green-700" : ""}
                    `}
                  >
                    <BadgeIcon type={badge.type} />
                    <span className="ml-1">{badge.label}</span>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Niche & Location */}
            <div className="flex items-center justify-center gap-3 mt-3 text-sm text-gray-600 flex-wrap">
              {creator.niche && (
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {NICHE_LABELS[creator.niche] || creator.niche}
                </span>
              )}
              {creator.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {creator.city}
                </span>
              )}
            </div>
            
            {/* Score */}
            <div className="mt-4 inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{creator.rating?.toFixed(1) || "5.0"}</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600 text-sm">
                Score profil : <span className="font-semibold text-primary">{creator.completion_score}%</span>
              </span>
            </div>
            
            {/* Bio */}
            {creator.bio && (
              <p className="mt-4 text-gray-600 max-w-md mx-auto">
                {creator.bio}
              </p>
            )}
            
            {/* CTA Button */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <Button 
                onClick={handleCollaboration}
                size="lg"
                className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-primary/30"
                data-testid="collaboration-cta"
              >
                <Briefcase className="w-5 h-5 mr-2" />
                Proposer une collaboration
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Offers Section */}
        {creator.offers && creator.offers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Mes Offres</h2>
            <div className="space-y-3">
              {creator.offers.map((offer, i) => (
                <Card key={offer.offer_id || i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{offer.title}</h3>
                        {offer.description && (
                          <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
                        )}
                        {offer.price && (
                          <p className="text-primary font-semibold mt-2">{offer.price}</p>
                        )}
                      </div>
                      {offer.external_link && (
                        <a 
                          href={offer.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-5 h-5 text-gray-400" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        )}
        
        {/* Links Section */}
        {creator.links && creator.links.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Mes Liens</h2>
            <div className="space-y-2">
              {creator.links.map((link, i) => (
                <a
                  key={link.link_id || i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <LinkIcon className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                  </div>
                  <span className="flex-1 font-medium text-gray-900">{link.title}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </motion.section>
        )}
        
        {/* Social Links */}
        {socialLinks.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-4 pt-4"
          >
            {socialLinks.map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
              >
                <SocialIcon platform={platform} />
              </a>
            ))}
          </motion.section>
        )}
      </div>
      
      {/* Footer */}
      <footer className="py-8 text-center">
        <a 
          href="https://openambassadors.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
        >
          <img 
            src="/logo-sun.png" 
            alt="OpenAmbassadors" 
            className="w-5 h-5"
          />
          Powered by OpenAmbassadors
        </a>
      </footer>
    </div>
  );
};

export default CreatorCardPage;
