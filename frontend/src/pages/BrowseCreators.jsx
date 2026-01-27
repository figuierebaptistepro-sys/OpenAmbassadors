import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowLeft, Search, User, MapPin, Star, CheckCircle,
  SlidersHorizontal, Award, Filter, Globe, Navigation
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Slider } from "../components/ui/slider";
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
    mode: "all", // local, remote, all
    city: searchParams.get("q") || "",
    radius: 50,
    content_type: "",
    available: false,
    incubator_only: false,
    min_score: 0,
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
      if (filters.min_score > 0) params.append("min_score", filters.min_score.toString());

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

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Mode */}
      <div>
        <Label className="text-gray-900 font-semibold mb-3 block">Mode</Label>
        <div className="space-y-2">
          {[
            { id: "local", label: "Local", icon: Navigation },
            { id: "remote", label: "À distance", icon: Globe },
            { id: "all", label: "Les deux", icon: null },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setFilters({ ...filters, mode: mode.id })}
              className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
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

      {/* Local Options */}
      {filters.mode === "local" && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-gray-700 mb-2 block">Ville</Label>
            <Input
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              placeholder="Paris"
              className="bg-white border-gray-200"
            />
          </div>
          <div>
            <Label className="text-gray-700 mb-2 block">Rayon: {filters.radius} km</Label>
            <Slider
              value={[filters.radius]}
              onValueChange={([v]) => setFilters({ ...filters, radius: v })}
              max={200}
              min={10}
              step={10}
              className="py-2"
            />
          </div>
        </div>
      )}

      {/* Score */}
      <div>
        <Label className="text-gray-900 font-semibold mb-3 block">Score minimum</Label>
        <div className="flex gap-2">
          {[0, 30, 50, 70].map((score) => (
            <button
              key={score}
              onClick={() => setFilters({ ...filters, min_score: score })}
              className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                filters.min_score === score
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {score === 0 ? "Tous" : `${score}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <Label className="text-gray-900 font-semibold mb-3 block">Options</Label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={filters.available}
              onCheckedChange={(c) => setFilters({ ...filters, available: c })}
            />
            <span className="text-gray-700">Disponible maintenant</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={filters.incubator_only}
              onCheckedChange={(c) => setFilters({ ...filters, incubator_only: c })}
            />
            <span className="text-gray-700 flex items-center gap-2">
              Premium uniquement
              <Badge className="bg-primary text-white text-xs">Incubateur</Badge>
            </span>
          </label>
        </div>
      </div>

      {/* Content Type */}
      <div>
        <Label className="text-gray-900 font-semibold mb-3 block">Type de contenu</Label>
        <div className="space-y-2">
          {CONTENT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={filters.content_type === type}
                onCheckedChange={(c) => setFilters({ ...filters, content_type: c ? type : "" })}
              />
              <span className="text-gray-700">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <Button onClick={handleSearch} className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20">
        Appliquer les filtres
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType="business" onLogout={handleLogout} />

      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-heading text-xl font-bold text-gray-900">Find Creator</h1>
              <Badge variant="outline" className="border-gray-200">
                {creators.length} créateurs
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile Filter */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="md:hidden border-gray-200">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filtres
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-white border-l-0 shadow-2xl">
                  <SheetHeader>
                    <SheetTitle className="text-gray-900">Filtres</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterPanel />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        <main className="p-8">
          <div className="flex gap-8">
            {/* Filters Sidebar */}
            <aside className="hidden md:block w-72 flex-shrink-0">
              <Card className="border-0 shadow-md sticky top-24">
                <CardContent className="p-6">
                  <h2 className="font-heading font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filtres
                  </h2>
                  <FilterPanel />
                </CardContent>
              </Card>
            </aside>

            {/* Results */}
            <div className="flex-1">
              {/* Search Bar */}
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom ou ville..."
                    className="pl-10 bg-white border-gray-200 shadow-sm"
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20">
                  Rechercher
                </Button>
              </div>

              {/* Results Grid */}
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
                        className="border-0 shadow-md hover:shadow-lg cursor-pointer transition-all bg-white"
                        onClick={() => navigate(`/creators/${creator.user_id}`)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                              {creator.picture ? (
                                <img src={creator.picture} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-gray-900 font-semibold truncate">
                                  {creator.name || "Créateur"}
                                </h3>
                                {creator.is_premium && (
                                  <Award className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              {creator.city && (
                                <p className="text-gray-500 text-sm flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {creator.city}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-gray-700 text-sm font-medium">
                                  {creator.rating?.toFixed(1) || "0.0"}
                                </span>
                                <span className="text-gray-400 text-sm">
                                  ({creator.reviews_count || 0})
                                </span>
                              </div>
                            </div>
                          </div>

                          {creator.content_types?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-4">
                              {creator.content_types.slice(0, 3).map((type) => (
                                <Badge key={type} variant="outline" className="text-xs border-gray-200 text-gray-600">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <span className="text-primary font-semibold">
                              {creator.min_rate && creator.max_rate
                                ? `${creator.min_rate}€ - ${creator.max_rate}€`
                                : "Sur devis"}
                            </span>
                            {creator.available ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">Disponible</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-500 text-xs">Indisponible</Badge>
                            )}
                          </div>
                          
                          {creator.portfolio_status === "incomplete" && (
                            <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
                              ⚠️ Portfolio incomplet
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-12 text-center">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun créateur trouvé</p>
                    <p className="text-gray-400 text-sm mt-1">Essayez de modifier vos filtres</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BrowseCreators;
