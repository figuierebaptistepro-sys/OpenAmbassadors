import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, Search, Filter, User, MapPin, Star, CheckCircle,
  ChevronDown, X, SlidersHorizontal, Grid, List
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

const CONTENT_TYPES = [
  { id: "ugc", label: "UGC" },
  { id: "micro-trottoir", label: "Micro-trottoir" },
  { id: "face-cam", label: "Face cam" },
  { id: "ads", label: "Ads" },
  { id: "interview", label: "Interview" },
  { id: "montage", label: "Montage only" },
];

const SECTORS = [
  "Beauté", "Mode", "Tech", "Food", "Sport", "Lifestyle",
  "Finance", "Immobilier", "Santé", "Éducation", "Voyage", "Gaming"
];

const BrowseCreators = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState({
    city: "",
    content_types: [],
    sectors: [],
    available: false,
    can_travel: false,
    works_remote: false,
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
      if (filters.can_travel) params.append("can_travel", "true");
      if (filters.works_remote) params.append("works_remote", "true");
      if (filters.content_types.length > 0) {
        filters.content_types.forEach(t => params.append("content_type", t));
      }

      const response = await fetch(`${API_URL}/api/creators?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCreators(data);
      }
    } catch (error) {
      console.error("Error fetching creators:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, city: searchQuery }));
    fetchCreators();
  };

  const toggleContentType = (type) => {
    setFilters(prev => ({
      ...prev,
      content_types: prev.content_types.includes(type)
        ? prev.content_types.filter(t => t !== type)
        : [...prev.content_types, type]
    }));
  };

  const clearFilters = () => {
    setFilters({
      city: "",
      content_types: [],
      sectors: [],
      available: false,
      can_travel: false,
      works_remote: false,
    });
    setSearchQuery("");
    fetchCreators();
  };

  const activeFiltersCount = 
    filters.content_types.length +
    (filters.available ? 1 : 0) +
    (filters.can_travel ? 1 : 0) +
    (filters.works_remote ? 1 : 0) +
    (filters.city ? 1 : 0);

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading font-semibold mb-3">Disponibilité</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.available}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, available: checked }))}
            />
            <span className="text-sm">Disponible maintenant</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.can_travel}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, can_travel: checked }))}
            />
            <span className="text-sm">Peut se déplacer</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.works_remote}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, works_remote: checked }))}
            />
            <span className="text-sm">Travaille à distance</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-heading font-semibold mb-3">Types de contenu</h3>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((type) => (
            <Badge
              key={type.id}
              variant={filters.content_types.includes(type.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleContentType(type.id)}
            >
              {type.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button
          variant="outline"
          className="w-full"
          onClick={clearFilters}
        >
          Réinitialiser les filtres
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-heading font-bold text-xl text-slate-900">UGC Machine</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/packs" className="text-slate-600 hover:text-primary font-medium hidden md:block">
                Packs
              </Link>
              <Link to="/login">
                <Button variant="outline">Connexion</Button>
              </Link>
              <Link to="/register/business">
                <Button className="bg-primary hover:bg-primary-hover hidden md:flex">
                  Commencer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Trouvez votre créateur
          </h1>
          <p className="text-slate-600">
            {creators.length} créateurs disponibles pour vos projets
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Rechercher par ville..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                data-testid="search-input"
              />
            </div>
            <Button onClick={handleSearch} className="bg-primary hover:bg-primary-hover">
              Rechercher
            </Button>
          </div>

          <div className="flex gap-3">
            {/* Mobile Filter Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-primary">{activeFiltersCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtres</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterPanel />
                </div>
              </SheetContent>
            </Sheet>

            {/* View Toggle */}
            <div className="hidden md:flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-slate-100" : ""}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-slate-100" : ""}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-semibold">Filtres</h2>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary">{activeFiltersCount}</Badge>
                  )}
                </div>
                <FilterPanel />
              </CardContent>
            </Card>
          </aside>

          {/* Creators Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : creators.length > 0 ? (
              <div className={`grid gap-6 ${viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                {creators.map((creator) => (
                  <motion.div
                    key={creator.profile_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all h-full"
                      onClick={() => navigate(`/creators/${creator.user_id}`)}
                      data-testid={`creator-card-${creator.user_id}`}
                    >
                      <CardContent className={`p-6 ${viewMode === "list" ? "flex items-center gap-6" : ""}`}>
                        <div className={`${viewMode === "list" ? "flex-shrink-0" : "flex justify-center mb-4"}`}>
                          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center overflow-hidden">
                            {creator.picture ? (
                              <img src={creator.picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-8 h-8 text-primary" />
                            )}
                          </div>
                        </div>
                        
                        <div className={viewMode === "list" ? "flex-1" : ""}>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-heading font-semibold text-lg text-slate-900">
                              {creator.name || "Créateur"}
                            </h3>
                            {creator.is_verified && (
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                            {creator.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {creator.city}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="w-3 h-3 fill-current" />
                              <span>{creator.rating?.toFixed(1) || "0.0"}</span>
                            </div>
                          </div>

                          {creator.content_types?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {creator.content_types.slice(0, 3).map((type) => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                              {creator.content_types.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{creator.content_types.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="font-heading font-semibold text-primary">
                              {creator.min_rate && creator.max_rate
                                ? `${creator.min_rate}€ - ${creator.max_rate}€`
                                : "Sur devis"}
                            </span>
                            {creator.available && (
                              <Badge className="bg-green-500 text-xs">Disponible</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-slate-900 mb-2">
                  Aucun créateur trouvé
                </h3>
                <p className="text-slate-500 mb-4">
                  Essayez de modifier vos critères de recherche
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BrowseCreators;
