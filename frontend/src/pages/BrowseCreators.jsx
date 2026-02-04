import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, MapPin, Star, Filter, Crown, Video, Users, Play, X, ChevronRight, Grid3X3, LayoutGrid
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const CONTENT_TYPES = ["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview", "Montage"];
const VISIBILITY_OPTIONS = [
  { value: "", label: "Toutes" },
  { value: "1K", label: "1K+" },
  { value: "5K", label: "5K+" },
  { value: "10K", label: "10K+" },
  { value: "50K", label: "50K+" },
  { value: "100K", label: "100K+" },
];

const BrowseCreators = ({ user }) => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [viewMode, setViewMode] = useState("videos"); // "videos" or "creators"
  
  const [filters, setFilters] = useState({
    city: "",
    content_type: "",
    available: false,
    premium_only: false,
    min_score: 0,
    visibility: "",
  });

  useEffect(() => { fetchCreators(); }, []);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append("city", filters.city);
      if (filters.available) params.append("available", "true");
      if (filters.premium_only) params.append("incubator_only", "true");
      if (filters.content_type) params.append("content_type", filters.content_type);
      if (filters.min_score > 0) params.append("min_score", filters.min_score.toString());
      if (filters.visibility) params.append("visibility", filters.visibility);

      const response = await fetch(`${API_URL}/api/creators?${params.toString()}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setCreators(data);
        
        // Extract all videos from creators
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
                  visibility: creator.visibility
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
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const FilterPanel = ({ onApply }) => (
    <div className="space-y-5">
      {/* Search */}
      <div>
        <Label className="text-gray-900 font-semibold mb-2 block text-sm">Recherche</Label>
        <Input
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          placeholder="Ville, nom..."
          className="bg-gray-50 border-gray-200"
        />
      </div>

      {/* Visibility Filter */}
      <div>
        <Label className="text-gray-900 font-semibold mb-2 block text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Audience
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ ...filters, visibility: opt.value })}
              className={`py-2 rounded-lg border text-xs transition-all ${
                filters.visibility === opt.value
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Type */}
      <div>
        <Label className="text-gray-900 font-semibold mb-2 block text-sm">Type de contenu</Label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setFilters({ ...filters, content_type: filters.content_type === type ? "" : type })}
              className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                filters.content_type === type
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div>
        <Label className="text-gray-900 font-semibold mb-2 block text-sm">Options</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={filters.available} onCheckedChange={(c) => setFilters({ ...filters, available: c })} />
            <span className="text-gray-700 text-sm">Disponible maintenant</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={filters.premium_only} onCheckedChange={(c) => setFilters({ ...filters, premium_only: c })} />
            <span className="text-gray-700 text-sm flex items-center gap-1">
              Premium uniquement <Crown className="w-3 h-3 text-primary" />
            </span>
          </label>
        </div>
      </div>

      <Button onClick={() => { fetchCreators(); onApply?.(); }} className="w-full bg-primary hover:bg-primary-hover text-sm">
        Appliquer les filtres
      </Button>
      
      <button 
        onClick={() => {
          setFilters({ city: "", content_type: "", available: false, premium_only: false, min_score: 0, visibility: "" });
        }}
        className="w-full text-gray-500 text-sm hover:text-gray-700"
      >
        Réinitialiser
      </button>
    </div>
  );

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg font-bold text-gray-900">Découvrir</h1>
            <p className="text-gray-500 text-xs">{allVideos.length} vidéos • {creators.length} créateurs</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("videos")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "videos" ? "bg-white shadow-sm" : ""}`}
              >
                <Grid3X3 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode("creators")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "creators" ? "bg-white shadow-sm" : ""}`}
              >
                <LayoutGrid className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            {/* Filter button */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="border-gray-200">
                  <Filter className="w-4 h-4 mr-1.5" />
                  Filtres
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-white w-full sm:max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-gray-900">Filtres</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterPanel onApply={() => setFiltersOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Quick filters */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilters({ ...filters, content_type: filters.content_type === type ? "" : type });
                setTimeout(fetchCreators, 100);
              }}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                filters.content_type === type
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : viewMode === "videos" ? (
          /* Video Grid - TikTok style */
          allVideos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2">
              {allVideos.map((video, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="relative aspect-[9/16] bg-gray-900 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedVideo(video)}
                >
                  {/* Video thumbnail */}
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
                      <Play className="w-8 h-8 text-white/40" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>
                  
                  {/* Creator info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <Link 
                      to={`/creators/${video.creator.user_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-5 h-5 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
                        {video.creator.picture ? (
                          <img src={getImageUrl(video.creator.picture)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-white font-bold">
                            {(video.creator.name || "C")[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-white text-[10px] sm:text-xs font-medium truncate">
                        {video.creator.name?.split(' ')[0] || "Créateur"}
                      </span>
                      {video.creator.is_premium && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-heading font-bold text-gray-900 mb-2">Aucune vidéo trouvée</h3>
              <p className="text-gray-500 text-sm">Modifiez vos filtres pour voir plus de contenus</p>
            </div>
          )
        ) : (
          /* Creators Grid */
          creators.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {creators.map((creator, index) => (
                <motion.div
                  key={creator.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link to={`/creators/${creator.user_id}`}>
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-3">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden mb-2">
                          {creator.picture ? (
                            <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                              <span className="text-xl font-bold text-primary">{(creator.name || "C")[0]}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{creator.name?.split(' ')[0] || "Créateur"}</h3>
                          {creator.is_premium && <Crown className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {creator.city && <span className="truncate">{creator.city}</span>}
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {creator.rating?.toFixed(1) || "5.0"}
                          </span>
                        </div>
                        {creator.portfolio_videos?.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                            <Video className="w-3 h-3" />
                            {creator.portfolio_videos.length} vidéos
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-heading font-bold text-gray-900 mb-2">Aucun créateur trouvé</h3>
              <p className="text-gray-500 text-sm">Modifiez vos filtres</p>
            </div>
          )
        )}
      </div>

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
          
          {/* Video container */}
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
                <Play className="w-12 h-12 mb-4 opacity-60" />
                <p className="text-sm mb-4 opacity-80">Lien externe</p>
                <a 
                  href={selectedVideo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Ouvrir
                </a>
              </div>
            )}
          </div>
          
          {/* Creator info */}
          <div className="absolute bottom-4 left-4 right-4">
            <Link 
              to={`/creators/${selectedVideo.creator.user_id}`}
              className="flex items-center gap-3 bg-black/50 backdrop-blur-sm p-3 rounded-xl hover:bg-black/70 transition-colors"
              onClick={() => setSelectedVideo(null)}
            >
              <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
                {selectedVideo.creator.picture ? (
                  <img src={getImageUrl(selectedVideo.creator.picture)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {(selectedVideo.creator.name || "C")[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-medium text-sm">{selectedVideo.creator.name || "Créateur"}</span>
                  {selectedVideo.creator.is_premium && <Crown className="w-4 h-4 text-yellow-400" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  {selectedVideo.creator.city && <span>{selectedVideo.creator.city}</span>}
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    {selectedVideo.creator.rating?.toFixed(1) || "5.0"}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </Link>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default BrowseCreators;
