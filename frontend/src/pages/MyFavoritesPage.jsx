import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart, MapPin, Star, Users, ChevronRight, Search, 
  MessageCircle, Trash2, ExternalLink, Instagram, Youtube
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// TikTok icon
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const MyFavoritesPage = ({ user }) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await fetch(`${API_URL}/api/favorites`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (creatorId) => {
    setRemovingId(creatorId);
    try {
      const response = await fetch(`${API_URL}/api/favorites/${creatorId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.user_id !== creatorId));
        toast.success("Retiré des favoris");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setRemovingId(null);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const filteredFavorites = favorites.filter(creator => 
    creator.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    creator.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    creator.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
            </div>
            <div>
              <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Mes Favoris</h1>
              <p className="text-gray-500 text-xs sm:text-sm">{favorites.length} créateur{favorites.length > 1 ? 's' : ''} sauvegardé{favorites.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/creators")}
            variant="outline"
            className="border-gray-200"
          >
            <Users className="w-4 h-4 mr-2" />
            Découvrir des créateurs
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search */}
        {favorites.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher un créateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 border-gray-200"
              />
            </div>
          </div>
        )}

        {/* Content */}
        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-pink-300" />
            </div>
            <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">Aucun favori</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Parcourez les profils créateurs et cliquez sur le coeur pour les sauvegarder ici
            </p>
            <Button onClick={() => navigate("/creators")} className="bg-primary hover:bg-primary-hover">
              <Users className="w-4 h-4 mr-2" />
              Découvrir des créateurs
            </Button>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-gray-900 mb-2">Aucun résultat</h3>
            <p className="text-gray-500 text-sm">Aucun créateur ne correspond à "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFavorites.map((creator, index) => (
              <motion.div
                key={creator.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden h-full">
                  <CardContent className="p-0">
                    {/* Header with image */}
                    <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200">
                      {creator.banner && (
                        <img 
                          src={getImageUrl(creator.banner)} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      
                      {/* Remove button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFavorite(creator.user_id); }}
                        disabled={removingId === creator.user_id}
                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-red-50 transition-colors group/btn"
                        data-testid={`remove-favorite-${creator.user_id}`}
                      >
                        {removingId === creator.user_id ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-gray-400 group-hover/btn:text-red-500" />
                        )}
                      </button>

                      {/* Avatar */}
                      <div className="absolute -bottom-8 left-4">
                        <div className="w-16 h-16 rounded-xl bg-white shadow-lg overflow-hidden border-2 border-white">
                          {creator.picture ? (
                            <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <span className="text-2xl font-bold text-primary">
                                {(creator.name || "?")[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-10 px-4 pb-4">
                      <h3 className="font-semibold text-gray-900 truncate">{creator.name}</h3>
                      
                      {creator.city && (
                        <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{creator.city}</span>
                        </div>
                      )}

                      {/* Rating */}
                      {creator.rating > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium">{creator.rating?.toFixed(1)}</span>
                          {creator.reviews_count > 0 && (
                            <span className="text-gray-400 text-sm">({creator.reviews_count})</span>
                          )}
                        </div>
                      )}

                      {/* Social icons */}
                      <div className="flex items-center gap-2 mt-3">
                        {creator.tiktok && <TikTokIcon className="w-4 h-4 text-gray-400" />}
                        {creator.instagram && <Instagram className="w-4 h-4 text-gray-400" />}
                        {creator.youtube && <Youtube className="w-4 h-4 text-gray-400" />}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => navigate(`/creators/${creator.user_id}`)}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Voir profil
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 text-xs bg-primary hover:bg-primary-hover"
                          onClick={() => navigate(`/messages?user=${creator.user_id}`)}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Contacter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MyFavoritesPage;
