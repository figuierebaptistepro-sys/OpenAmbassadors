import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, BookOpen, Play, Lock, CheckCircle, Clock, Crown, Search, 
  Filter, Star, Award
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LearnPage = ({ user }) => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trainings`, {
        credentials: "include",
      });
      if (response.ok) {
        setTrainings(await response.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCompleteTraining = async (trainingId, isPremium, isLocked) => {
    if (isPremium && isLocked) {
      setPremiumDialogOpen(true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/trainings/${trainingId}/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.message} ${data.bonus}`);
        fetchTrainings();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleJoinIncubator = async () => {
    try {
      await fetch(`${API_URL}/api/incubator/join`, { method: "POST", credentials: "include" });
      toast.success("Bienvenue dans l'Incubateur Premium !");
      setPremiumDialogOpen(false);
      fetchTrainings();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const categories = ["all", "Fondamentaux", "Spécialisation", "Avancé", "Business"];

  const filteredTrainings = trainings.filter(t => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const freeTrainings = filteredTrainings.filter(t => !t.is_premium);
  const premiumTrainings = filteredTrainings.filter(t => t.is_premium);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType={user?.user_type} isPremium={user?.is_premium} onLogout={handleLogout} />

      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-xl font-bold text-gray-900">Learn</h1>
              <p className="text-gray-500 text-sm">Formez-vous et boostez votre visibilité</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher une formation..."
                className="pl-10 bg-white border-gray-200 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {cat === "all" ? "Tous" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Banner */}
          <Card className="border-0 shadow-md mb-8 bg-gradient-to-r from-primary to-primary-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h2 className="font-heading text-xl font-bold mb-1">
                    Complétez des formations pour gagner en visibilité
                  </h2>
                  <p className="text-white/80">+5 points par formation complétée</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-heading font-bold">
                    {trainings.filter(t => t.is_completed).length}
                  </p>
                  <p className="text-white/80 text-sm">formations complétées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Free Trainings */}
          <section className="mb-12">
            <h2 className="text-xl font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Formations gratuites
              <Badge variant="outline" className="border-green-300 text-green-700 ml-2">
                Accès libre
              </Badge>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {freeTrainings.map((training) => (
                <motion.div
                  key={training.training_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden bg-white">
                    <div className="aspect-video bg-gray-100 relative">
                      {training.thumbnail && (
                        <img src={training.thumbnail} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        {training.is_completed ? (
                          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-8 h-8 text-white" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"
                               onClick={() => handleCompleteTraining(training.training_id, false, false)}>
                            <Play className="w-8 h-8 text-primary fill-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <Badge variant="outline" className="mb-2 border-gray-200 text-gray-500 text-xs">
                        {training.category}
                      </Badge>
                      <h3 className="text-gray-900 font-semibold mb-1">{training.title}</h3>
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{training.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {training.duration}
                        </span>
                        {training.is_completed ? (
                          <Badge className="bg-green-100 text-green-700">Complétée ✓</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteTraining(training.training_id, false, false)}
                            className="bg-primary hover:bg-primary-hover shadow-sm shadow-primary/20"
                          >
                            Commencer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Premium Trainings */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Formations Premium
              <Badge className="bg-primary text-white ml-2">
                Incubateur
              </Badge>
            </h2>
            
            {!user?.is_premium && (
              <Card className="border-0 shadow-md mb-6 premium-card">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-gray-900">Débloquez toutes les formations</h3>
                      <p className="text-gray-600 text-sm">Rejoignez l'Incubateur Premium pour 49€/mois</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setPremiumDialogOpen(true)}
                    className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                  >
                    Débloquer
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {premiumTrainings.map((training) => {
                const isLocked = training.is_premium && !user?.is_premium;
                
                return (
                  <motion.div
                    key={training.training_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className={`border-0 shadow-md overflow-hidden bg-white ${isLocked ? 'opacity-80' : 'hover:shadow-lg'} transition-all`}>
                      <div className="aspect-video bg-gray-100 relative">
                        {training.thumbnail && (
                          <img src={training.thumbnail} alt="" className={`w-full h-full object-cover ${isLocked ? 'opacity-60' : ''}`} />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          {isLocked ? (
                            <div className="w-16 h-16 bg-gray-800/80 rounded-full flex items-center justify-center">
                              <Lock className="w-8 h-8 text-white" />
                            </div>
                          ) : training.is_completed ? (
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                              <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-primary/90 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"
                                 onClick={() => handleCompleteTraining(training.training_id, true, isLocked)}>
                              <Play className="w-8 h-8 text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <Badge className="absolute top-2 right-2 bg-primary text-white">
                          Premium
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <Badge variant="outline" className="mb-2 border-gray-200 text-gray-500 text-xs">
                          {training.category}
                        </Badge>
                        <h3 className="text-gray-900 font-semibold mb-1">{training.title}</h3>
                        <p className="text-gray-500 text-sm mb-3 line-clamp-2">{training.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {training.duration}
                          </span>
                          {isLocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPremiumDialogOpen(true)}
                              className="border-primary text-primary hover:bg-primary-soft"
                            >
                              <Lock className="w-3 h-3 mr-1" /> Débloquer
                            </Button>
                          ) : training.is_completed ? (
                            <Badge className="bg-green-100 text-green-700">Complétée ✓</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteTraining(training.training_id, true, false)}
                              className="bg-primary hover:bg-primary-hover"
                            >
                              Commencer
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {/* Premium Dialog */}
      <Dialog open={premiumDialogOpen} onOpenChange={setPremiumDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Rejoindre l'Incubateur Premium
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-6">
              Débloquez toutes les formations Premium et boostez votre carrière de créateur.
            </p>
            <ul className="space-y-3 mb-6">
              {[
                "Accès à toutes les formations avancées",
                "Priorité dans l'algorithme de recherche",
                "Badge Premium visible sur votre profil",
                "Briefs exclusifs réservés aux membres",
                "Support prioritaire"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="text-center mb-6">
              <p className="text-3xl font-heading font-bold text-gray-900">49€<span className="text-lg text-gray-500">/mois</span></p>
            </div>
            <Button
              onClick={handleJoinIncubator}
              className="w-full bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20"
            >
              Confirmer l'inscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LearnPage;
