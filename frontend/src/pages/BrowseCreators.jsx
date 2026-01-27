import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowLeft, Search, User, MapPin, Star, CheckCircle,
  SlidersHorizontal, Award, Filter
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CONTENT_TYPES = ["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview", "Montage"];

const BrowseCreators = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    city: searchParams.get("q") || "",
    content_type: "",
    available: false,
    incubator_only: false,
  });

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append("city", filters.city);
      if (filters.available) params.append("available", "true");
      if (filters.incubator_only) params.append("incubator_only", "true");
      if (filters.content_type) params.append("content_type", filters.content_type);

      const response = await fetch(`${API_URL}/api/creators?${params.toString()}`, {
        credentials: "include",
      });
      if (response.ok) {
        setCreators(await response.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchCreators();
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-white font-semibold mb-3">Disponibilité</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.available}
              onCheckedChange={(c) => setFilters({ ...filters, available: c })}
            />
            <span className="text-slate-300 text-sm">Disponible maintenant</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.incubator_only}
              onCheckedChange={(c) => setFilters({ ...filters, incubator_only: c })}
            />
            <span className="text-slate-300 text-sm">Incubateur Premium</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">Type de contenu</h3>
        <div className="space-y-2">
          {CONTENT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.content_type === type}
                onCheckedChange={(c) => setFilters({ ...filters, content_type: c ? type : "" })}
              />
              <span className="text-slate-300 text-sm">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <Button onClick={handleSearch} className="w-full bg-primary hover:bg-primary-hover">
        Appliquer les filtres
      </Button>
    </div>
  );

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
                <span className="font-heading font-bold text-xl text-white">Créateurs</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                placeholder="Rechercher par ville..."
                className="pl-10 bg-slate-800 border-slate-700 text-white"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="bg-primary hover:bg-primary-hover">
              Rechercher
            </Button>
          </div>

          {/* Mobile Filter */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden border-slate-700 text-slate-300">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filtres
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-900 border-slate-800">
              <SheetHeader>
                <SheetTitle className="text-white">Filtres</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <Card className="bg-slate-800 border-slate-700 sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Filtres
                </h2>
                <FilterPanel />
              </CardContent>
            </Card>
          </aside>

          {/* Creators Grid */}
          <div className="flex-1">
            <p className="text-slate-400 mb-6">{creators.length} créateurs trouvés</p>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : creators.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creators.map((creator) => (
                  <motion.div
                    key={creator.profile_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className="bg-slate-800 border-slate-700 hover:border-primary/50 cursor-pointer transition-all"
                      onClick={() => navigate(`/creators/${creator.user_id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {creator.picture ? (
                              <img src={creator.picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-semibold truncate">
                                {creator.name || "Créateur"}
                              </h3>
                              {creator.is_premium && (
                                <Award className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            {creator.city && (
                              <p className="text-slate-400 text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {creator.city}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-white text-sm">{creator.rating?.toFixed(1) || "0.0"}</span>
                              <span className="text-slate-500 text-sm">({creator.reviews_count || 0})</span>
                            </div>
                          </div>
                        </div>

                        {creator.content_types?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-4">
                            {creator.content_types.slice(0, 3).map((type) => (
                              <Badge key={type} variant="outline" className="text-xs border-slate-600 text-slate-300">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                          <span className="text-primary font-semibold">
                            {creator.min_rate && creator.max_rate
                              ? `${creator.min_rate}€ - ${creator.max_rate}€`
                              : "Sur devis"}
                          </span>
                          {creator.available ? (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">Disponible</Badge>
                          ) : (
                            <Badge className="bg-slate-600 text-slate-300 text-xs">Indisponible</Badge>
                          )}
                        </div>
                        
                        {creator.portfolio_status === "incomplete" && (
                          <p className="text-amber-400 text-xs mt-2">⚠️ Portfolio incomplet</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">Aucun créateur trouvé</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BrowseCreators;
