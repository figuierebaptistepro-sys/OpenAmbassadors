import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowLeft, BookOpen, Play, Lock, CheckCircle, Clock, Award
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TrainingsPage = ({ user }) => {
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleCompleteTraining = async (trainingId) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const freeTrainings = trainings.filter(t => !t.is_premium);
  const premiumTrainings = trainings.filter(t => t.is_premium);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-heading font-bold text-xl text-white">Formations</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2">
            Bibliothèque de formations
          </h1>
          <p className="text-slate-400">
            Complétez des formations pour booster votre visibilité (+5 points par formation)
          </p>
        </div>

        {/* Free Trainings */}
        <section className="mb-12">
          <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Formations gratuites
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {freeTrainings.map((training) => (
              <motion.div
                key={training.training_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-slate-800 border-slate-700 hover:border-primary/50 transition-colors overflow-hidden">
                  <div className="aspect-video bg-slate-700 relative">
                    {training.thumbnail && (
                      <img src={training.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {training.is_completed ? (
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 border-slate-600 text-slate-300 text-xs">
                      {training.category}
                    </Badge>
                    <h3 className="text-white font-semibold mb-1">{training.title}</h3>
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">{training.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {training.duration}
                      </span>
                      {training.is_completed ? (
                        <Badge className="bg-green-500/20 text-green-400">Complétée</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTraining(training.training_id)}
                          className="bg-primary hover:bg-primary-hover"
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
          <h2 className="text-xl font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Formations Premium
            {!user?.is_premium && (
              <Badge className="bg-amber-500/20 text-amber-400 text-xs">Incubateur requis</Badge>
            )}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {premiumTrainings.map((training) => (
              <motion.div
                key={training.training_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`bg-slate-800 border-slate-700 overflow-hidden ${training.is_locked ? 'opacity-75' : 'hover:border-amber-500/50'} transition-colors`}>
                  <div className="aspect-video bg-slate-700 relative">
                    {training.thumbnail && (
                      <img src={training.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {training.is_locked ? (
                        <div className="w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center">
                          <Lock className="w-8 h-8 text-slate-400" />
                        </div>
                      ) : training.is_completed ? (
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-amber-500/20 backdrop-blur rounded-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-amber-400 fill-amber-400" />
                        </div>
                      )}
                    </div>
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      Premium
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 border-slate-600 text-slate-300 text-xs">
                      {training.category}
                    </Badge>
                    <h3 className="text-white font-semibold mb-1">{training.title}</h3>
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">{training.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {training.duration}
                      </span>
                      {training.is_locked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate("/dashboard")}
                          className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                        >
                          <Lock className="w-3 h-3 mr-1" /> Débloquer
                        </Button>
                      ) : training.is_completed ? (
                        <Badge className="bg-green-500/20 text-green-400">Complétée</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTraining(training.training_id)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
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
      </main>
    </div>
  );
};

export default TrainingsPage;
