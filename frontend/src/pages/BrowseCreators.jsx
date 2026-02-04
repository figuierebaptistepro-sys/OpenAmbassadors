import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, MapPin, Star, Filter, Crown, Video, Users, Play, X, ChevronRight, User, SlidersHorizontal
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const CONTENT_TYPES = ["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview", "Montage"];

const BrowseCreators = ({ user }) => {
  const navigate = useNavigate();
  const [creators, setCreators] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeTab, setActiveTab] = useState("videos"); // "videos" or "creators"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");

  useEffect(() => { fetchCreators(); }, [selectedType]);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("city", searchQuery);
      if (selectedType) params.append("content_type", selectedType);

      const response = await fetch(`${API_URL}/api/creators?${params.toString()}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setCreators(data);
        
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
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  return (
    <AppLayout user={user}>
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        {/* Main tabs */}
        <div className="flex items-center justify-center gap-1 p-2">
          <button
            onClick={() => setActiveTab("creators")}
            className={`flex-1 max-w-[150px] py-2.5 px-4 rounded-full text-sm font-semibold transition-all ${
              activeTab === "creators"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <User className="w-4 h-4 inline mr-1.5" />
            Créateurs
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex-1 max-w-[150px] py-2.5 px-4 rounded-full text-sm font-semibold transition-all ${
              activeTab === "videos"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Video className="w-4 h-4 inline mr-1.5" />
            Vidéos
          </button>
        </div>

        {/* Search & filters */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchCreators()}
              className="pl-9 bg-gray-50 border-gray-200 h-10"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 border-gray-200">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-white rounded-t-2xl h-auto max-h-[70vh]">
              <SheetHeader>
                <SheetTitle className="text-gray-900">Filtrer par type</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-3">
                <button
                  onClick={() => { setSelectedType(""); setFiltersOpen(false); }}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedType === "" ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Tous les types
                </button>
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setFiltersOpen(false); }}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      selectedType === type ? "bg-primary text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Quick type filters - horizontal scroll */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedType("")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              selectedType === "" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Tout
          </button>
          {CONTENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedType === type ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === "creators" ? (
        /* CREATORS VIEW */
        <div className="p-4">
          {creators.length > 0 ? (
            <div className="space-y-3">
              {creators.map((creator, index) => (
                <motion.div
                  key={creator.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link to={`/creators/${creator.user_id}`}>
                    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-4 flex gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {creator.picture ? (
                          <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <span className="text-xl font-bold text-primary">{(creator.name || "C")[0]}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
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
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            {creator.rating?.toFixed(1) || "5.0"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {creator.available && (
                            <Badge className="bg-green-100 text-green-700 text-xs">Disponible</Badge>
                          )}
                          {creator.portfolio_videos?.length > 0 && (
                            <Badge variant="outline" className="text-xs border-gray-200">
                              <Video className="w-3 h-3 mr-1" />
                              {creator.portfolio_videos.length} vidéos
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-400 self-center flex-shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 mb-2">Aucun créateur</h3>
              <p className="text-gray-500 text-sm">Modifiez vos filtres</p>
            </div>
          )}
        </div>
      ) : (
        /* VIDEOS VIEW - Full width feed */
        <div className="pb-4">
          {allVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5">
              {allVideos.map((video, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="relative aspect-[9/16] bg-gray-900 cursor-pointer group"
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
                      <Play className="w-10 h-10 text-white/30" />
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-12 h-12 text-white fill-white" />
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
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black"
          onClick={() => setSelectedVideo(null)}
        >
          {/* Close button */}
          <button 
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-sm rounded-full"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          {/* Video - Full screen */}
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
          
          {/* Creator card - Bottom */}
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
    </AppLayout>
  );
};

export default BrowseCreators;
