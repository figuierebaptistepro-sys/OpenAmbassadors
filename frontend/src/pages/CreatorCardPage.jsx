import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Star, Crown, ShieldCheck, Trophy, ExternalLink, 
  Instagram, Youtube, Twitter, Linkedin, Link as LinkIcon,
  Briefcase, ChevronRight, Loader2, Sparkles, Heart,
  Mail, Globe, Play, Zap, Award, TrendingUp, Users
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Niche labels with emojis
const NICHE_CONFIG = {
  beaute: { label: "Beauté & Cosmétique", color: "from-pink-500 to-rose-500", bg: "bg-pink-50" },
  igaming: { label: "iGaming", color: "from-purple-500 to-indigo-500", bg: "bg-purple-50" },
  gaming: { label: "Gaming", color: "from-violet-500 to-purple-500", bg: "bg-violet-50" },
  mode: { label: "Mode & Lifestyle", color: "from-rose-500 to-pink-500", bg: "bg-rose-50" },
  tech: { label: "Tech & Innovation", color: "from-blue-500 to-cyan-500", bg: "bg-blue-50" },
  food: { label: "Food & Gastronomie", color: "from-orange-500 to-amber-500", bg: "bg-orange-50" },
  fitness: { label: "Fitness & Sport", color: "from-green-500 to-emerald-500", bg: "bg-green-50" },
  voyage: { label: "Voyage & Tourisme", color: "from-sky-500 to-blue-500", bg: "bg-sky-50" },
  finance: { label: "Finance & Business", color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50" },
  immobilier: { label: "Immobilier", color: "from-amber-500 to-yellow-500", bg: "bg-amber-50" },
  auto: { label: "Automobile", color: "from-slate-500 to-gray-500", bg: "bg-slate-50" },
  education: { label: "Éducation", color: "from-indigo-500 to-blue-500", bg: "bg-indigo-50" },
  sante: { label: "Santé & Bien-être", color: "from-teal-500 to-cyan-500", bg: "bg-teal-50" },
  enfants: { label: "Famille & Enfants", color: "from-yellow-500 to-orange-500", bg: "bg-yellow-50" },
  animaux: { label: "Animaux", color: "from-lime-500 to-green-500", bg: "bg-lime-50" },
  musique: { label: "Musique & Entertainment", color: "from-fuchsia-500 to-pink-500", bg: "bg-fuchsia-50" },
  b2b: { label: "B2B & Services Pro", color: "from-slate-600 to-slate-500", bg: "bg-slate-50" },
  ecommerce: { label: "E-commerce", color: "from-cyan-500 to-blue-500", bg: "bg-cyan-50" }
};

// Badge configurations
const BADGE_CONFIG = {
  premium: { 
    icon: Crown, 
    gradient: "from-amber-400 via-yellow-500 to-amber-600",
    glow: "shadow-amber-500/50"
  },
  verified: { 
    icon: ShieldCheck, 
    gradient: "from-blue-400 to-blue-600",
    glow: "shadow-blue-500/50"
  },
  top_rated: { 
    icon: Star, 
    gradient: "from-yellow-400 to-orange-500",
    glow: "shadow-yellow-500/50"
  },
  experienced: { 
    icon: Trophy, 
    gradient: "from-emerald-400 to-green-600",
    glow: "shadow-emerald-500/50"
  }
};

// Social icons with brand colors
const SOCIAL_CONFIG = {
  instagram: { 
    icon: Instagram, 
    gradient: "from-purple-500 via-pink-500 to-orange-400",
    hover: "hover:shadow-pink-500/30"
  },
  youtube: { 
    icon: Youtube, 
    gradient: "from-red-600 to-red-500",
    hover: "hover:shadow-red-500/30"
  },
  twitter: { 
    icon: Twitter, 
    gradient: "from-sky-500 to-blue-500",
    hover: "hover:shadow-sky-500/30"
  },
  linkedin: { 
    icon: Linkedin, 
    gradient: "from-blue-600 to-blue-700",
    hover: "hover:shadow-blue-600/30"
  },
  tiktok: { 
    icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ), 
    gradient: "from-gray-900 to-gray-800",
    hover: "hover:shadow-gray-500/30"
  }
};

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
};

// Animated background particles
const FloatingParticle = ({ delay, duration, size, left, top }) => (
  <motion.div
    className="absolute rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 blur-xl"
    style={{ width: size, height: size, left: `${left}%`, top: `${top}%` }}
    animate={{
      y: [0, -30, 0],
      x: [0, 15, 0],
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3]
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
);

const CreatorCardPage = ({ user }) => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

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
      navigate(`/login?redirect=/@${username}`);
      return;
    }
    
    if (user.user_type !== "business") {
      navigate("/select-type");
      return;
    }
    
    if (!user.is_subscribed && !user.is_premium) {
      navigate("/business/subscribe");
      return;
    }
    
    navigate(`/dashboard/proposals/new?creator=${username}`);
  };

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50/30 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gray-500 font-medium">Chargement du profil...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50/30 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
          <p className="text-gray-500 mb-6">Le profil @{username} n'existe pas ou n'est plus disponible</p>
          <Button 
            onClick={() => navigate("/")} 
            variant="outline"
            className="rounded-full px-6"
          >
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    );
  }

  const nicheConfig = NICHE_CONFIG[creator.niche] || { label: creator.niche, color: "from-gray-500 to-gray-600", bg: "bg-gray-50" };
  const socialLinks = Object.entries(creator.social || {}).filter(([_, url]) => url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-pink-50/30 overflow-hidden" style={{ overscrollBehavior: 'none' }}>
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <FloatingParticle delay={0} duration={8} size={200} left={10} top={20} />
        <FloatingParticle delay={2} duration={10} size={150} left={80} top={60} />
        <FloatingParticle delay={4} duration={12} size={180} left={60} top={10} />
        <FloatingParticle delay={1} duration={9} size={120} left={20} top={70} />
      </div>

      {/* Hero Section */}
      <div className="relative">
        {/* Banner with Glassmorphism */}
        <div className="h-36 sm:h-44 md:h-56 relative overflow-hidden">
          {/* Default gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-r ${nicheConfig.color} opacity-80`} />
          
          {/* Animated mesh gradient overlay */}
          <div className="absolute inset-0 opacity-50">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-black/10 via-transparent to-transparent" />
          </div>
          
          {/* Custom banner image */}
          {creator.banner && (
            <motion.img 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              src={getImageUrl(creator.banner)} 
              alt="" 
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent" />
        </div>
        
        {/* Profile Card */}
        <div className="max-w-lg mx-auto px-4 -mt-20 sm:-mt-24 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center"
          >
            {/* Profile Picture with Ring */}
            <div className="relative inline-block">
              <motion.div 
                className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-pink-500 to-purple-500 opacity-75 blur-sm"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-white p-1 shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-pink-100">
                  {creator.picture ? (
                    <motion.img 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: imageLoaded ? 1 : 0 }}
                      src={getImageUrl(creator.picture)} 
                      alt={creator.name} 
                      className="w-full h-full object-cover"
                      onLoad={() => setImageLoaded(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl font-bold bg-gradient-to-br from-primary to-pink-500 bg-clip-text text-transparent">
                        {(creator.name || "C")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Premium indicator */}
              {creator.is_premium && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
                >
                  <Crown className="w-5 h-5 text-white" />
                </motion.div>
              )}
            </div>
            
            {/* Name & Username */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {creator.name}
              </h1>
              <p className="text-gray-500 font-medium">@{creator.username}</p>
            </motion.div>
            
            {/* Badges */}
            {creator.badges && creator.badges.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 mt-4 flex-wrap"
              >
                {creator.badges.map((badge, i) => {
                  const config = BADGE_CONFIG[badge.type] || {};
                  const IconComponent = config.icon || Award;
                  return (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${config.gradient} text-white text-sm font-medium shadow-lg ${config.glow}`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{badge.label}</span>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
            
            {/* Niche & Location */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-3 mt-4 flex-wrap"
            >
              {creator.niche && (
                <span className={`${nicheConfig.bg} text-gray-700 px-4 py-1.5 rounded-full text-sm font-medium border border-gray-100`}>
                  {nicheConfig.label}
                </span>
              )}
              {creator.city && (
                <span className="flex items-center gap-1.5 text-gray-500 text-sm">
                  <MapPin className="w-4 h-4" />
                  {creator.city}
                </span>
              )}
            </motion.div>
            
            {/* Stats Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-5 inline-flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg shadow-gray-200/50 border border-gray-100"
            >
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[1,2,3,4,5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-4 h-4 ${star <= Math.round(creator.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                    />
                  ))}
                </div>
                <span className="font-bold text-gray-900">{(creator.rating || 5).toFixed(1)}</span>
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-gray-600 text-sm">Score</span>
                <span className="font-bold text-primary">{creator.completion_score}%</span>
              </div>
            </motion.div>
            
            {/* Bio */}
            {creator.bio && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-5 text-gray-600 max-w-md mx-auto leading-relaxed"
              >
                {creator.bio}
              </motion.p>
            )}
            
            {/* CTA Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, type: "spring" }}
              className="mt-6"
            >
              <Button 
                onClick={handleCollaboration}
                size="lg"
                className="group relative overflow-hidden bg-gradient-to-r from-primary via-pink-500 to-purple-500 hover:shadow-2xl hover:shadow-primary/30 text-white px-8 py-6 text-lg rounded-full transition-all duration-300 hover:scale-105"
                data-testid="collaboration-cta"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Proposer une collaboration
                  <Zap className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="max-w-lg mx-auto px-4 py-10 space-y-8 relative z-10">
        {/* Offers Section */}
        {creator.offers && creator.offers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Mes Offres</h2>
            </div>
            <div className="space-y-3">
              {creator.offers.map((offer, i) => (
                <motion.div 
                  key={offer.offer_id || i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="group relative bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {offer.title}
                      </h3>
                      {offer.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{offer.description}</p>
                      )}
                      {offer.price && (
                        <p className="mt-2 inline-flex items-center gap-1 text-primary font-bold">
                          {offer.price}
                        </p>
                      )}
                    </div>
                    {offer.external_link && (
                      <a 
                        href={offer.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-primary/10 flex items-center justify-center transition-colors"
                      >
                        <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                      </a>
                    )}
                  </div>
                  {/* Decorative gradient */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-pink-500/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
        
        {/* Links Section */}
        {creator.links && creator.links.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Mes Liens</h2>
            </div>
            <div className="space-y-2">
              {creator.links.map((link, i) => (
                <motion.a
                  key={link.link_id || i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 + i * 0.1 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-primary/20 shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-primary/10 group-hover:to-pink-50 flex items-center justify-center transition-all">
                    <Globe className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="flex-1 font-medium text-gray-900 group-hover:text-primary transition-colors">
                    {link.title}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </motion.a>
              ))}
            </div>
          </motion.section>
        )}
        
        {/* Social Links */}
        {socialLinks.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="pt-4"
          >
            <div className="flex items-center justify-center gap-3">
              {socialLinks.map(([platform, url]) => {
                const config = SOCIAL_CONFIG[platform] || { gradient: "from-gray-500 to-gray-600" };
                const IconComponent = config.icon || LinkIcon;
                return (
                  <motion.a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-lg ${config.hover} hover:shadow-xl transition-all duration-300`}
                  >
                    {typeof IconComponent === 'function' && IconComponent.prototype ? (
                      <IconComponent className="w-5 h-5" />
                    ) : (
                      <IconComponent />
                    )}
                  </motion.a>
                );
              })}
            </div>
          </motion.section>
        )}
      </div>
      
      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="py-10 text-center relative z-10"
      >
        <a 
          href="https://openambassadors.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors group"
        >
          <div className="w-6 h-6 rounded-lg overflow-hidden">
            <img 
              src="/logo-sun.png" 
              alt="OpenAmbassadors" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            />
          </div>
          <span className="text-sm font-medium">Powered by OpenAmbassadors</span>
        </a>
      </motion.footer>
    </div>
  );
};

export default CreatorCardPage;
