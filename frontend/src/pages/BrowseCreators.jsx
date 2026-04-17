import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Star, Crown, Video, Play, X, ChevronRight, User,
  SlidersHorizontal, Map, Filter, ChevronDown, Check, RotateCcw,
  Globe, Camera, Clock, Briefcase
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CONTENT_TYPES = ["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview", "Montage"];
const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "expert", label: "Expert" },
];

// Niches / Secteurs d'activité
const NICHES = [
  { id: "beaute", label: "Beauté", icon: "💄" },
  { id: "igaming", label: "iGaming", icon: "🎰" },
  { id: "gaming", label: "Gaming", icon: "🎮" },
  { id: "mode", label: "Mode", icon: "👗" },
  { id: "tech", label: "Tech", icon: "📱" },
  { id: "food", label: "Food", icon: "🍕" },
  { id: "fitness", label: "Fitness", icon: "💪" },
  { id: "voyage", label: "Voyage", icon: "✈️" },
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "immobilier", label: "Immobilier", icon: "🏠" },
  { id: "auto", label: "Auto", icon: "🚗" },
  { id: "education", label: "Éducation", icon: "📚" },
  { id: "sante", label: "Santé", icon: "🧘" },
  { id: "enfants", label: "Famille", icon: "👶" },
  { id: "animaux", label: "Animaux", icon: "🐾" },
  { id: "musique", label: "Musique", icon: "🎵" },
  { id: "b2b", label: "B2B", icon: "💼" },
  { id: "ecommerce", label: "E-commerce", icon: "🛒" },
];

const FRENCH_CITIES = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", 
  "Bordeaux", "Lille", "Strasbourg", "Montpellier", "Rennes"
];

// City coordinates for France
const CITY_COORDS = {
  "paris": [48.8566, 2.3522],
  "lyon": [45.764, 4.8357],
  "marseille": [43.2965, 5.3698],
  "toulouse": [43.6047, 1.4442],
  "nice": [43.7102, 7.262],
  "nantes": [47.2184, -1.5536],
  "bordeaux": [44.8378, -0.5792],
  "lille": [50.6292, 3.0573],
  "strasbourg": [48.5734, 7.7521],
  "montpellier": [43.6108, 3.8767],
  "rennes": [48.1173, -1.6778],
  "aix en provence": [43.5297, 5.4474],
  "aix-en-provence": [43.5297, 5.4474],
  "test": [48.8566, 2.3522],
};

// Custom marker icon
const createMarkerIcon = (isPremium) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 36px; 
      height: 36px; 
      background: ${isPremium ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : '#1f2937'}; 
      border-radius: 50%; 
      border: 3px solid white; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

/* ── VideoCard: thumbnail statique (si dispo) OU frame vidéo + play au hover ── */
const VideoCard = ({ video, index, onClick, getImageUrl }) => {
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const videoRef = useRef(null);
  const cardRef = useRef(null);

  const hasThumbnail = !!video.thumbnail;
  const isVideo = video.url && (
    video.url.includes('.mp4') || video.url.includes('.mov') ||
    video.url.includes('.webm') || video.type === 'uploaded'
  );
  const videoSrc = isVideo ? getImageUrl(video.url) : null;

  // Charge la vidéo dans le viewport — seulement si pas de thumbnail statique
  useEffect(() => {
    if (hasThumbnail) return; // thumbnail statique dispo → pas besoin de charger la vidéo
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [hasThumbnail]);

  const handleLoadedMetadata = () => {
    if (videoRef.current && !hovered) {
      videoRef.current.currentTime = Math.min(1.5, (videoRef.current.duration || 10) * 0.1);
    }
  };

  const handleSeeked = () => {
    if (!hovered) setFrameReady(true);
  };

  const handleMouseEnter = () => {
    setHovered(true);
    if (videoRef.current) {
      if (hasThumbnail) {
        // Vidéo pas encore dans le DOM — on l'active maintenant
        setInView(true);
      }
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setVideoReady(false);
    if (videoRef.current) {
      videoRef.current.pause();
      if (!hasThumbnail) {
        videoRef.current.currentTime = Math.min(1.5, (videoRef.current.duration || 10) * 0.1);
      }
    }
  };

  const showVideo = hovered && (hasThumbnail ? videoReady : true);

  return (
    <div
      ref={cardRef}
      className="relative aspect-[9/16] bg-gray-900 cursor-pointer group overflow-hidden"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={`video-card-${index}`}
    >
      {/* Shimmer skeleton — visible until thumbnail or frame is ready */}
      {((hasThumbnail && !thumbLoaded) || (!hasThumbnail && !frameReady)) && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse" />
      )}

      {/* Thumbnail statique (nouvelles vidéos avec FFmpeg) — zéro charge réseau */}
      {hasThumbnail && (
        <div className={`absolute inset-0 transition-opacity duration-300 ${showVideo ? 'opacity-0' : thumbLoaded ? 'opacity-100' : 'opacity-0'}`}>
          <img
            src={getImageUrl(video.thumbnail)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onLoad={() => setThumbLoaded(true)}
          />
        </div>
      )}

      {/* Vidéo : pour thumbnail (seekée) si pas de thumb statique, et toujours pour le hover */}
      {isVideo && (hasThumbnail ? inView : inView) && (
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          loop
          playsInline
          preload={hasThumbnail ? "none" : "metadata"}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          onCanPlay={() => { if (hovered) setVideoReady(true); }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            hasThumbnail ? (showVideo ? 'opacity-100' : 'opacity-0') : 'opacity-100'
          }`}
        />
      )}

      {/* Play overlay — disparaît au hover */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${hovered ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:bg-black/70 transition-all">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Creator info */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <Link
          to={`/creators/${video.creator.user_id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex-shrink-0 border border-white/30">
            {video.creator.picture ? (
              <img src={getImageUrl(video.creator.picture)} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">
                {(video.creator.name || "C")[0]}
              </div>
            )}
          </div>
          <span className="text-white text-xs font-medium truncate flex-1">
            {video.creator.name || "Créateur"}
          </span>
          {video.creator.is_premium && <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
        </Link>
      </div>
    </div>
  );
};

/* ── Vignette vidéo dans la bannière — remplit toute la hauteur disponible ── */
const VideoBannerItem = ({ video, getImageUrl }) => {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);
  const isVideo = video?.url && (
    video.url.includes('.mp4') || video.url.includes('.mov') ||
    video.url.includes('.webm') || video.type === 'uploaded'
  );

  const handleEnter = () => { setHovered(true); videoRef.current?.play().catch(() => {}); };
  const handleLeave = () => {
    setHovered(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  };

  return (
    <div
      className="relative h-full w-full bg-gray-900 overflow-hidden"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {!loaded && <div className="absolute inset-0 bg-gray-800 animate-pulse" />}
      {video?.thumbnail && (
        <img
          src={getImageUrl(video.thumbnail)}
          alt=""
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${hovered ? 'scale-105' : 'scale-100'}`}
          onLoad={() => setLoaded(true)}
        />
      )}
      {!video?.thumbnail && isVideo && (
        <video
          src={`${getImageUrl(video.url)}#t=1`}
          muted playsInline preload="metadata"
          className="w-full h-full object-cover"
          onLoadedData={() => setLoaded(true)}
        />
      )}
      {isVideo && hovered && (
        <video
          ref={videoRef}
          src={getImageUrl(video.url)}
          muted loop playsInline autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
};

/* ── Carte créateur — hauteur uniforme ── */
const DEFAULT_BANNER_STYLE = {
  background: "linear-gradient(160deg, #fff5f7 0%, #ffe0e9 40%, #ffd6e7 70%, #fce4ec 100%)"
};

const CreatorCard = ({ creator, index, getImageUrl }) => {
  const videos = creator.portfolio_videos?.slice(0, 3) || [];
  const hasVideos = videos.length > 0;
  const hasBrands = creator.brands_worked?.length > 0;
  const gridCols = videos.length >= 3 ? 'grid-cols-3' : videos.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link to={`/creators/${creator.user_id}`} data-testid={`creator-card-${creator.user_id}`}>
        {/* Pas de overflow-hidden sur la card → l'avatar peut déborder */}
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">

          {/* ── Wrapper bannière + avatar (relative pour positionner l'avatar) ── */}
          <div className="relative">

            {/* Bannière h-44 avec overflow-hidden + coins arrondis en haut */}
            <div className="h-44 overflow-hidden rounded-t-2xl relative">
              {hasVideos ? (
                <div className={`absolute inset-0 grid gap-0.5 ${gridCols}`}>
                  {videos.map((v, i) => (
                    <VideoBannerItem key={i} video={v} getImageUrl={getImageUrl} />
                  ))}
                </div>
              ) : (
                <div className="absolute inset-0" style={DEFAULT_BANNER_STYLE}>
                  <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl"
                    style={{ background: "radial-gradient(circle, #FF2E6322 0%, transparent 70%)" }} />
                  <div className="absolute -bottom-6 left-0 w-36 h-36 rounded-full blur-3xl"
                    style={{ background: "radial-gradient(circle, #c2185b18 0%, transparent 70%)" }} />
                </div>
              )}

              {/* Badge disponible */}
              {creator.available && (
                <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  Disponible
                </div>
              )}

              {/* Badge commandes */}
              {creator.completed_projects > 0 && (
                <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  {creator.completed_projects} commandes
                </div>
              )}
            </div>

            {/* Avatar — positionné sur le wrapper (pas dans overflow-hidden) */}
            <div className="absolute -bottom-5 left-4 z-20">
              <div className="w-12 h-12 rounded-xl border-[3px] border-white shadow-lg overflow-hidden bg-gray-100">
                {creator.picture ? (
                  <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-pink-400">
                    <span className="text-base font-bold text-white">{(creator.name || "C")[0]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Logos marques ── */}
          {hasBrands ? (
            <div className="px-4 pt-7 pb-2 flex items-center gap-3 overflow-x-auto scrollbar-none">
              {creator.brands_worked.slice(0, 5).map((brand, i) => (
                <span key={i} className="text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-widest">{brand}</span>
              ))}
            </div>
          ) : (
            <div className="pt-7" />
          )}

          {/* ── Infos ── */}
          <div className="px-4 pb-4">
            {/* Nom + rating */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-bold text-gray-900 truncate text-sm">{creator.name || "Créateur"}</h3>
                {creator.is_premium && (
                  <div className="w-4 h-4 flex-shrink-0 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              {creator.rating > 0 ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-bold text-gray-900">{creator.rating.toFixed(1)}</span>
                  {creator.reviews_count > 0 && (
                    <span className="text-[11px] text-gray-400">({creator.reviews_count})</span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">Nouveau</span>
              )}
            </div>

            {/* Détails */}
            <div className="space-y-1.5">
              {creator.city && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{creator.city}</span>
                </div>
              )}
              {creator.equipment?.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Camera className="w-3 h-3 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{creator.equipment.slice(0, 2).join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3 flex-shrink-0 text-gray-400" />
                <span className="flex-1">Réponse</span>
                <span className="font-semibold text-gray-700">{creator.response_time || "moins de 24h"}</span>
              </div>
            </div>

            {/* Tags */}
            {creator.content_types?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                {creator.content_types.slice(0, 3).map(type => (
                  <span key={type} className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full">{type}</span>
                ))}
                {creator.niches?.slice(0, 2).map(n => {
                  const niche = NICHES.find(x => x.id === n);
                  return niche ? (
                    <span key={n} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded-full">{niche.icon} {niche.label}</span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const BrowseCreators = ({ user }) => {
  const [creators, setCreators] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentSkip, setCurrentSkip] = useState(0);
  const PAGE_SIZE = 30;
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeTab, setActiveTab] = useState("creators");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mapCenter] = useState([46.603354, 1.888334]);

  // Filters state
  const [filters, setFilters] = useState({
    search: "",
    city: "",
    contentTypes: [],
    niches: [],
    experienceLevel: "",
    available: false,
    premiumOnly: false,
    minRating: 0,
  });

  // Count active filters
  const activeFiltersCount = [
    filters.city,
    filters.contentTypes.length > 0,
    filters.niches.length > 0,
    filters.experienceLevel,
    filters.available,
    filters.premiumOnly,
    filters.minRating > 0,
  ].filter(Boolean).length;

  useEffect(() => { setCurrentSkip(0); fetchCreators(0, true); }, [filters]);

  const applyClientFilters = (data) => {
    if (filters.premiumOnly) data = data.filter(c => c.is_premium);
    if (filters.minRating > 0) data = data.filter(c => (c.rating || 5) >= filters.minRating);
    if (filters.contentTypes.length > 1) data = data.filter(c => filters.contentTypes.every(type => c.content_types?.includes(type)));
    if (filters.niches.length > 0) data = data.filter(c => filters.niches.some(niche => c.niches?.includes(niche)));
    return data;
  };

  const fetchCreators = async (skip = 0, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.city) params.append("city", filters.city);
      if (filters.contentTypes.length > 0) params.append("content_type", filters.contentTypes[0]);
      if (filters.experienceLevel) params.append("experience_level", filters.experienceLevel);
      if (filters.available) params.append("available", "true");
      params.append("skip", skip);
      params.append("limit", PAGE_SIZE);

      const response = await fetch(`${API_URL}/api/creators?${params.toString()}`, { credentials: "include" });
      if (response.ok) {
        let data = await response.json();
        data = applyClientFilters(data);
        setHasMore(data.length === PAGE_SIZE);
        if (reset) {
          setCreators(data);
        } else {
          setCreators(prev => [...prev, ...data]);
        }
        setCurrentSkip(skip + PAGE_SIZE);
        
        // Extract all videos
        const videos = [];
        data.forEach(creator => {
          if (creator.portfolio_videos?.length > 0) {
            creator.portfolio_videos.forEach(video => {
              videos.push({
                ...video,
                creator: {
                  user_id: creator.user_id,
                  name: creator.name,
                  picture: creator.picture,
                  city: creator.city,
                  is_premium: creator.is_premium,
                  rating: creator.rating,
                }
              });
            });
          }
        });
        setAllVideos(videos);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      city: "",
      contentTypes: [],
      niches: [],
      experienceLevel: "",
      available: false,
      premiumOnly: false,
      minRating: 0,
    });
  };

  const toggleContentType = (type) => {
    setFilters(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter(t => t !== type)
        : [...prev.contentTypes, type]
    }));
  };

  const toggleNiche = (nicheId) => {
    setFilters(prev => ({
      ...prev,
      niches: prev.niches.includes(nicheId)
        ? prev.niches.filter(n => n !== nicheId)
        : [...prev.niches, nicheId]
    }));
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const getCreatorCoords = (city) => {
    if (!city) return null;
    const normalized = city.toLowerCase().trim();
    return CITY_COORDS[normalized] || null;
  };

  const creatorsWithCoords = creators.filter(c => getCreatorCoords(c.city));

  // Filter Panel Component (shared between desktop sidebar and mobile drawer)
  const FilterPanel = ({ isMobile = false }) => (
    <div className={`${isMobile ? '' : 'space-y-6'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-gray-900">Filtres</h3>
          {activeFiltersCount > 0 && (
            <Badge className="bg-primary text-white text-xs">{activeFiltersCount}</Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Recherche</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Nom, mot-clé..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-9 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      {/* City */}
      <div className="space-y-2 mt-4">
        <Label className="text-sm font-medium text-gray-700">Ville</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filters.city}
            onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Toutes les villes</option>
            {FRENCH_CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Content Types */}
      <div className="space-y-3 mt-4">
        <Label className="text-sm font-medium text-gray-700">Type de contenu</Label>
        <div className="space-y-2">
          {CONTENT_TYPES.map(type => (
            <label
              key={type}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={filters.contentTypes.includes(type)}
                onCheckedChange={() => toggleContentType(type)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Niches */}
      <div className="space-y-3 mt-4">
        <Label className="text-sm font-medium text-gray-700">Niches / Secteurs</Label>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
          {NICHES.map(niche => (
            <button
              key={niche.id}
              onClick={() => toggleNiche(niche.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filters.niches.includes(niche.id)
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{niche.icon}</span>
              <span>{niche.label}</span>
            </button>
          ))}
        </div>
        {filters.niches.length > 0 && (
          <button
            onClick={() => setFilters(prev => ({ ...prev, niches: [] }))}
            className="text-xs text-gray-500 hover:text-primary"
          >
            Effacer les niches
          </button>
        )}
      </div>

      {/* Experience Level */}
      <div className="space-y-2 mt-4">
        <Label className="text-sm font-medium text-gray-700">Niveau d'expérience</Label>
        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map(level => (
            <label
              key={level.value}
              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                filters.experienceLevel === level.value
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="experience"
                value={level.value}
                checked={filters.experienceLevel === level.value}
                onChange={(e) => setFilters(prev => ({ ...prev, experienceLevel: e.target.value }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                filters.experienceLevel === level.value
                  ? 'border-primary bg-primary'
                  : 'border-gray-300'
              }`}>
                {filters.experienceLevel === level.value && (
                  <Check className="w-2.5 h-2.5 text-white" />
                )}
              </div>
              <span className="text-sm text-gray-700">{level.label}</span>
            </label>
          ))}
          {filters.experienceLevel && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, experienceLevel: "" }))}
              className="text-xs text-gray-500 hover:text-primary"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">Note minimum</Label>
          <span className="text-sm font-semibold text-primary">
            {filters.minRating > 0 ? `${filters.minRating}+ ★` : 'Toutes'}
          </span>
        </div>
        <Slider
          value={[filters.minRating]}
          onValueChange={([value]) => setFilters(prev => ({ ...prev, minRating: value }))}
          max={5}
          step={0.5}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>5</span>
        </div>
      </div>

      {/* Quick toggles */}
      <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm text-gray-700 group-hover:text-gray-900">Disponibles uniquement</span>
          <div
            onClick={() => setFilters(prev => ({ ...prev, available: !prev.available }))}
            className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
              filters.available ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
              filters.available ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">Premium uniquement</span>
          </div>
          <div
            onClick={() => setFilters(prev => ({ ...prev, premiumOnly: !prev.premiumOnly }))}
            className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
              filters.premiumOnly ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
              filters.premiumOnly ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </div>
        </label>
      </div>

      {/* Results count */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{creators.length}</span> créateur{creators.length !== 1 ? 's' : ''} trouvé{creators.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );

  return (
    <AppLayout user={user}>
      <div className="flex min-h-screen">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-72 xl:w-80 bg-white border-r border-gray-200 p-6 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <FilterPanel />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header with Tabs */}
          <div className="bg-white border-b border-gray-200 sticky top-0 lg:top-14 z-20">

            {/* Mobile: filter row */}
            <div className="flex lg:hidden items-center justify-between px-3 pt-3 pb-2">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium">Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-primary text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <span className="text-xs text-gray-400">
                <span className="font-semibold text-gray-700">{creators.length}</span> créateur{creators.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Tabs row (mobile: full width below filter row) */}
            <div className="flex items-center justify-between px-3 pb-3 lg:px-6 lg:py-0 lg:h-14">
              {/* View tabs */}
              <div className="flex items-center gap-1 w-full lg:w-auto">
                {[
                  { key: "creators", label: "Créateurs", icon: User, testId: "tab-creators" },
                  { key: "videos",   label: "Vidéos",    icon: Video, testId: "tab-videos" },
                  { key: "map",      label: "Carte",     icon: Map,   testId: "tab-map" },
                ].map(({ key, label, icon: Icon, testId }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    data-testid={testId}
                    className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 py-2 lg:px-4 rounded-full text-sm font-semibold transition-all ${
                      activeTab === key
                        ? "bg-primary text-white shadow-md shadow-primary/30"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              {/* Desktop: results count */}
              <div className="hidden lg:block text-sm text-gray-500 ml-4 whitespace-nowrap">
                <span className="font-semibold text-gray-900">{creators.length}</span> résultat{creators.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Active filters tags (desktop) */}
            {activeFiltersCount > 0 && (
              <div className="hidden lg:flex items-center gap-2 px-6 pb-3 flex-wrap">
                {filters.city && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary border-0">
                    <MapPin className="w-3 h-3" />
                    {filters.city}
                    <button onClick={() => setFilters(prev => ({ ...prev, city: "" }))} className="ml-1 hover:text-primary/70">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.contentTypes.map(type => (
                  <Badge key={type} variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary border-0">
                    {type}
                    <button onClick={() => toggleContentType(type)} className="ml-1 hover:text-primary/70">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {filters.experienceLevel && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary border-0">
                    {EXPERIENCE_LEVELS.find(l => l.value === filters.experienceLevel)?.label}
                    <button onClick={() => setFilters(prev => ({ ...prev, experienceLevel: "" }))} className="ml-1 hover:text-primary/70">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.available && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-700 border-0">
                    Disponible
                    <button onClick={() => setFilters(prev => ({ ...prev, available: false }))} className="ml-1 hover:text-green-600">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.premiumOnly && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-700 border-0">
                    <Crown className="w-3 h-3" />
                    Premium
                    <button onClick={() => setFilters(prev => ({ ...prev, premiumOnly: false }))} className="ml-1 hover:text-yellow-600">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {filters.minRating > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary border-0">
                    <Star className="w-3 h-3" />
                    {filters.minRating}+
                    <button onClick={() => setFilters(prev => ({ ...prev, minRating: 0 }))} className="ml-1 hover:text-primary/70">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={resetFilters}
                  className="text-sm text-gray-500 hover:text-primary transition-colors ml-2"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : activeTab === "creators" ? (
            /* CREATORS VIEW — grille de cards */
            <div className="p-4 lg:p-6">
              {creators.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {creators.map((creator, index) => (
                      <CreatorCard
                        key={creator.user_id}
                        creator={creator}
                        index={index}
                        getImageUrl={getImageUrl}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="text-center pt-6">
                      <Button
                        onClick={() => fetchCreators(currentSkip, false)}
                        disabled={loadingMore}
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/5"
                      >
                        {loadingMore ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Chargement...
                          </span>
                        ) : "Voir plus de créateurs"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-2">Aucun créateur trouvé</h3>
                  <p className="text-gray-500 text-sm mb-4">Essayez de modifier vos filtres</p>
                  <Button onClick={resetFilters} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}
            </div>
          ) : activeTab === "videos" ? (
            /* VIDEOS VIEW */
            <div className="pb-4">
              {allVideos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-0.5">
                  {allVideos.map((video, index) => (
                    <VideoCard
                      key={index}
                      video={video}
                      index={index}
                      onClick={() => setSelectedVideo(video)}
                      getImageUrl={getImageUrl}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-2">Aucune vidéo</h3>
                  <p className="text-gray-500 text-sm">Les créateurs n'ont pas encore ajouté de vidéos</p>
                </div>
              )}
            </div>
          ) : (
            /* MAP VIEW */
            <div className="h-[calc(100vh-180px)] lg:h-[calc(100vh-130px)] relative">
              <MapContainer 
                center={mapCenter} 
                zoom={6} 
                className="w-full h-full z-0"
                style={{ background: '#f3f4f6' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {creatorsWithCoords.map((creator) => {
                  const coords = getCreatorCoords(creator.city);
                  if (!coords) return null;
                  
                  return (
                    <Marker 
                      key={creator.user_id} 
                      position={coords}
                      icon={createMarkerIcon(creator.is_premium)}
                    >
                      <Popup className="creator-popup">
                        <Link to={`/creators/${creator.user_id}`} className="block p-1">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {creator.picture ? (
                                <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                  <span className="text-lg font-bold text-primary">{(creator.name || "C")[0]}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-900 text-sm">{creator.name}</span>
                                {creator.is_premium && <Crown className="w-3.5 h-3.5 text-primary" />}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{creator.city}</span>
                                {creator.rating > 0 ? (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  {creator.rating?.toFixed(1)}
                                </span>
                                ) : (
                                <span className="text-xs text-primary font-medium">Nouveau créateur</span>
                                )}
                              </div>
                              {creator.available && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                  Disponible
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
              
              {/* Map legend */}
              <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-3 z-[1000]">
                <p className="text-xs text-gray-500 mb-2">{creatorsWithCoords.length} créateurs sur la carte</p>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-gray-800"></div>
                    <span>Standard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500"></div>
                    <span>Premium</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Filtres</h2>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <FilterPanel isMobile />
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
                <Button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Voir {creators.length} résultat{creators.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black"
          onClick={() => setSelectedVideo(null)}
        >
          <button 
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-sm rounded-full"
            data-testid="close-video-modal"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <div 
            className="w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedVideo.url?.includes('.mp4') || selectedVideo.url?.includes('.mov') || selectedVideo.url?.includes('.webm') || selectedVideo.type === 'uploaded' ? (
              <video 
                src={getImageUrl(selectedVideo.url)} 
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            ) : (
              <div className="text-center text-white">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-60" />
                <p className="mb-4">Lien externe</p>
                <a 
                  href={selectedVideo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white text-black rounded-full font-medium"
                >
                  Ouvrir
                </a>
              </div>
            )}
          </div>
          
          <Link 
            to={`/creators/${selectedVideo.creator.user_id}`}
            className="absolute bottom-6 left-4 right-4 flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl"
            onClick={() => setSelectedVideo(null)}
          >
            <div className="w-12 h-12 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
              {selectedVideo.creator.picture ? (
                <img src={getImageUrl(selectedVideo.creator.picture)} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                  {(selectedVideo.creator.name || "C")[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{selectedVideo.creator.name || "Créateur"}</span>
                {selectedVideo.creator.is_premium && <Crown className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                {selectedVideo.creator.city && <span>{selectedVideo.creator.city}</span>}
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  {selectedVideo.creator.rating?.toFixed(1) || "5.0"}
                </span>
              </div>
            </div>
            <div className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-semibold">
              Voir profil
            </div>
          </Link>
        </div>
      )}

      {/* Custom styles for map */}
      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
        }
        .leaflet-popup-content {
          margin: 8px;
        }
        .leaflet-popup-tip {
          background: white;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </AppLayout>
  );
};

export default BrowseCreators;
