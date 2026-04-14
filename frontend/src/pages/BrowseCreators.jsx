import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, Star, Crown, Video, Play, X, ChevronRight, User, 
  SlidersHorizontal, Map, Filter, ChevronDown, Check, RotateCcw
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
            {/* Mobile filter button + tabs */}
            <div className="flex items-center justify-between p-3 lg:px-6">
              {/* Mobile filter button */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium">Filtres</span>
                {activeFiltersCount > 0 && (
                  <Badge className="bg-primary text-white text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                    {activeFiltersCount}
                  </Badge>
                )}
              </button>

              {/* View tabs */}
              <div className="flex items-center gap-1 mx-auto lg:mx-0">
                <button
                  onClick={() => setActiveTab("creators")}
                  className={`py-2 px-4 rounded-full text-sm font-semibold transition-all ${
                    activeTab === "creators"
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  data-testid="tab-creators"
                >
                  <User className="w-4 h-4 inline mr-1.5" />
                  Créateurs
                </button>
                <button
                  onClick={() => setActiveTab("videos")}
                  className={`py-2 px-4 rounded-full text-sm font-semibold transition-all ${
                    activeTab === "videos"
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  data-testid="tab-videos"
                >
                  <Video className="w-4 h-4 inline mr-1.5" />
                  Vidéos
                </button>
                <button
                  onClick={() => setActiveTab("map")}
                  className={`py-2 px-4 rounded-full text-sm font-semibold transition-all ${
                    activeTab === "map"
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  data-testid="tab-map"
                >
                  <Map className="w-4 h-4 inline mr-1.5" />
                  Carte
                </button>
              </div>

              {/* Desktop: Results count */}
              <div className="hidden lg:block text-sm text-gray-500">
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
            /* CREATORS VIEW */
            <div className="p-4 lg:p-6">
              {creators.length > 0 ? (
                <div className="space-y-3">
                  {creators.map((creator, index) => (
                    <motion.div
                      key={creator.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link to={`/creators/${creator.user_id}`} data-testid={`creator-card-${creator.user_id}`}>
                        <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-4 flex gap-4">
                          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                            {creator.picture ? (
                              <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                <span className="text-xl lg:text-2xl font-bold text-primary">{(creator.name || "C")[0]}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">{creator.name || "Créateur"}</h3>
                              {creator.is_premium && <Crown className="w-4 h-4 text-primary flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                              {creator.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {creator.city}
                                </span>
                              )}
                              {creator.rating > 0 ? (
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                {creator.rating?.toFixed(1)}
                              </span>
                              ) : (
                              <span className="text-xs text-primary font-medium">Nouveau créateur</span>
                              )}
                              {creator.experience_level && (
                                <span className="hidden sm:inline text-gray-400">
                                  {EXPERIENCE_LEVELS.find(l => l.value === creator.experience_level)?.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-nowrap overflow-hidden">
                              {creator.available && (
                                <Badge className="bg-green-100 text-green-700 text-xs flex-shrink-0">Disponible</Badge>
                              )}
                              {creator.content_types?.slice(0, 2).map(type => (
                                <Badge key={type} variant="outline" className="text-xs border-gray-200 flex-shrink-0">
                                  {type}
                                </Badge>
                              ))}
                              {creator.portfolio_videos?.length > 0 && (
                                <Badge variant="outline" className="text-xs border-gray-200 flex-shrink-0">
                                  <Video className="w-3 h-3 mr-1" />
                                  {creator.portfolio_videos.length}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <ChevronRight className="w-5 h-5 text-gray-400 self-center flex-shrink-0" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                  {/* Load more button */}
                  {hasMore && (
                    <div className="text-center pt-4">
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
                </div>
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
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="relative aspect-[9/16] bg-gray-900 cursor-pointer group"
                      onClick={() => setSelectedVideo(video)}
                      data-testid={`video-card-${index}`}
                    >
                      {video.url?.includes('.mp4') || video.url?.includes('.mov') || video.url?.includes('.webm') || video.type === 'uploaded' ? (
                        <video 
                          src={`${getImageUrl(video.url)}#t=0.5`}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          onLoadedData={(e) => { e.target.currentTime = 0.5; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                          <Play className="w-10 h-10 text-white/30" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-12 h-12 text-white fill-white" />
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                        <Link 
                          to={`/creators/${video.creator.user_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex-shrink-0 border border-white/30">
                            {video.creator.picture ? (
                              <img src={getImageUrl(video.creator.picture)} alt="" className="w-full h-full object-cover" />
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
                    </motion.div>
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
                                <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
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
                <img src={getImageUrl(selectedVideo.creator.picture)} alt="" className="w-full h-full object-cover" />
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
