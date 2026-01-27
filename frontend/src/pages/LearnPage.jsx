import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Play, Clock, Star, Crown, Lock, Award } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

const CATEGORIES = ["Tous", "Fondamentaux", "Spécialisation", "Avancé", "Business"];

const TRAININGS = [
  { id: 1, title: "Les bases du contenu UGC", description: "Apprenez à créer du contenu authentique", duration: "45 min", category: "Fondamentaux", premium: false, image: "📱", points: 5 },
  { id: 2, title: "Maîtriser l'éclairage", description: "Techniques d'éclairage professionnelles", duration: "30 min", category: "Fondamentaux", premium: false, image: "💡", points: 5 },
  { id: 3, title: "Storytelling pour marques", description: "Racontez des histoires qui convertissent", duration: "1h", category: "Spécialisation", premium: false, image: "📖", points: 10 },
  { id: 4, title: "Montage mobile avancé", description: "Capcut, InShot et outils pro", duration: "1h30", category: "Spécialisation", premium: true, image: "🎬", points: 15 },
  { id: 5, title: "Négocier ses tarifs", description: "Maximisez votre valeur", duration: "45 min", category: "Business", premium: true, image: "💰", points: 10 },
  { id: 6, title: "Personal Branding", description: "Construisez votre marque personnelle", duration: "2h", category: "Avancé", premium: true, image: "⭐", points: 20 },
];

const LearnPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");

  const isPremium = user?.is_premium;

  const filteredTrainings = TRAININGS.filter((t) => {
    const matchCategory = activeCategory === "Tous" || t.category === activeCategory;
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Learn</h1>
        <p className="text-gray-500 text-xs sm:text-sm">Formez-vous et gagnez des points</p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Points Banner */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-primary to-primary-hover text-white mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="font-heading font-bold text-sm sm:text-base">+5 points par formation</p>
                <p className="text-white/80 text-xs">Complétez des formations pour booster votre score</p>
              </div>
            </div>
            {!isPremium && (
              <Badge className="bg-white/20 text-white text-xs hidden sm:inline-flex">
                <Crown className="w-3 h-3 mr-1" />
                Premium: accès illimité
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Trainings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrainings.map((training) => {
            const isLocked = training.premium && !isPremium;
            
            return (
              <Card key={training.id} className={`border-0 shadow-sm overflow-hidden ${isLocked ? "opacity-75" : ""}`}>
                <div className="h-28 sm:h-32 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center relative">
                  <span className="text-4xl sm:text-5xl">{training.image}</span>
                  {training.premium && (
                    <Badge className="absolute top-2 right-2 bg-primary text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {!training.premium && (
                    <Badge className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs">Accès libre</Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {training.duration}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      +{training.points} pts
                    </span>
                  </div>
                  <h3 className="font-heading font-semibold text-gray-900 text-sm mb-1">{training.title}</h3>
                  <p className="text-gray-500 text-xs mb-3 line-clamp-2">{training.description}</p>
                  <Button
                    size="sm"
                    disabled={isLocked}
                    className={`w-full text-xs ${
                      isLocked
                        ? "bg-gray-100 text-gray-500"
                        : "bg-primary hover:bg-primary-hover"
                    }`}
                  >
                    {isLocked ? (
                      <><Lock className="w-3 h-3 mr-1" />Réservé Premium</>
                    ) : (
                      <><Play className="w-3 h-3 mr-1" />Commencer</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTrainings.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune formation trouvée</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LearnPage;
