import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, User, MapPin, Star, CheckCircle, Filter, Globe, Navigation, Crown, Video, Users
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Slider } from "../components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const CONTENT_TYPES = ["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview", "Montage"];
const VISIBILITY_OPTIONS = [
  { value: "", label: "Toutes" },
  { value: "1K", label: "1K+" },
  { value: "5K", label: "5K+" },
  { value: "10K", label: "10K+" },
  { value: "35K", label: "35K+" },
  { value: "50K", label: "50K+" },
  { value: "100K", label: "100K+" },
  { value: "250K", label: "250K+" },
  { value: "1M", label: "1M+" },
];

const BrowseCreators = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    mode: "all",
    city: searchParams.get("q") || "",
    radius: 50,
    content_type: "",
    available: false,
    incubator_only: false,
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
      if (filters.incubator_only) params.append("incubator_only", "true");
      if (filters.content_type) params.append("content_type", filters.content_type);
      if (filters.min_score > 0) params.append("min_score", filters.min_score.toString());
      if (filters.visibility) params.append("visibility", filters.visibility);

      const response = await fetch(`${API_URL}/api/creators?${params.toString()}`, { credentials: "include" });
      if (response.ok) setCreators(await response.json());
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
      {/* Mode */}
      <div>
        <Label className="text-gray-900 font-semibold mb-2 block text-sm">Mode</Label>
        <div className="space-y-2">
          {[
            { id: "local", label: "Local", icon: Navigation },
            { id: "remote", label: "À distance", icon: Globe },
            { id: "all", label: "Les deux", icon: null },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setFilters({ ...filters, mode: mode.id })}
              className={`w-full p-2.5 rounded-lg border text-left flex items-center gap-2 text-sm transition-all ${
                filters.mode === mode.id
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {mode.icon && <mode.icon className="w-4 h-4" />}
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {filters.mode === "local" && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-gray-700 mb-1.5 block text-sm">Ville</Label>
            <Input
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              placeholder="Paris"
              className="bg-white border-gray-200"
            />
          </div>
          <div>
            <Label className="text-gray-700 mb-1.5 block text-sm">Rayon: {filters.radius} km</Label>
            <Slider value={[filters.radius]} onValueChange={([v]) => setFilters({ ...filters, radius: v })} max={200} min={10} step={10} />
          </div>
        </div>
      )}

      {/* Score */}
      <div>
        <Label className="text-gray-900 font-semibold mb-2 block text-sm">Score minimum</Label>
        <div className="grid grid-cols-4 gap-2">
          {[0, 30, 50, 70].map((score) => (
            <button
              key={score}
              onClick={() => setFilters({ ...filters, min_score: score })}
              className={`py-2 rounded-lg border text-xs transition-all ${
                filters.min_score === score
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {score === 0 ? "Tous" : `${score}+`}
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
            <Checkbox checked={filters.incubator_only} onCheckedChange={(c) => setFilters({ ...filters, incubator_only: c })} />
            <span className="text-gray-700 text-sm flex items-center gap-1">
              Premium <Crown className="w-3 h-3 text-primary" />
            </span>
          </label>
        </div>
      </div>

      {/* Content Type */}
      <div>
        <Label className="text-gray-900 font-semibold mb-2 block text-sm">Type de contenu</Label>
        <div className="grid grid-cols-2 gap-2">
          {CONTENT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={filters.content_type === type} onCheckedChange={(c) => setFilters({ ...filters, content_type: c ? type : "" })} />
              <span className="text-gray-700 text-xs">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <Button onClick={() => { fetchCreators(); onApply?.(); }} className="w-full bg-primary hover:bg-primary-hover text-sm">
        Appliquer
      </Button>
    </div>
  );

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Trouver un créateur</h1>
            <p className="text-gray-500 text-xs sm:text-sm hidden sm:block">{creators.length} créateurs disponibles</p>
          </div>
          {/* Mobile filter button */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden border-gray-200">
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

        {/* Search bar */}
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, ville..."
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && fetchCreators()}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
          <Button onClick={fetchCreators} className="bg-primary hover:bg-primary-hover">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Filters */}
        <aside className="hidden lg:block w-72 flex-shrink-0 border-r border-gray-200 bg-white p-6 min-h-[calc(100vh-120px)]">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">Filtres</h3>
          <FilterPanel />
        </aside>

        {/* Results */}
        <div className="flex-1 p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : creators.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {creators.map((creator, index) => (
                <motion.div
                  key={creator.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/creators/${creator.user_id}`}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                            {creator.picture ? (
                              <img src={getImageUrl(creator.picture)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                <span className="text-xl font-bold text-primary">{(creator.name || "C")[0].toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900 truncate text-sm">{creator.name || "Créateur"}</h3>
                              {creator.is_premium && <Crown className="w-4 h-4 text-primary flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              {creator.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {creator.city}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                {creator.rating?.toFixed(1) || "5.0"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {creator.available && <Badge className="bg-green-100 text-green-700 text-xs">Dispo</Badge>}
                              {creator.portfolio_status === "incomplete" && (
                                <Badge variant="outline" className="text-xs border-orange-200 text-orange-600">
                                  <Video className="w-3 h-3 mr-1" />
                                  Portfolio
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Score bar */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Score</span>
                            <span className="font-medium text-primary">{creator.completion_score || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${creator.completion_score || 0}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-heading font-bold text-gray-900 mb-2">Aucun créateur trouvé</h3>
              <p className="text-gray-500 text-sm mb-4">Essayez de modifier vos filtres</p>
              <Button variant="outline" onClick={() => setFilters({ mode: "all", city: "", radius: 50, content_type: "", available: false, incubator_only: false, min_score: 0 })}>
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default BrowseCreators;
