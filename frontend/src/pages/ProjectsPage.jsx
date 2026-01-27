import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowLeft, Briefcase, DollarSign, Clock, Users, Award, Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ProjectsPage = ({ user }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        credentials: "include",
      });
      if (response.ok) {
        setProjects(await response.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/apply`, {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        toast.success("Candidature envoyée !");
        fetchProjects();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Erreur");
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

  const openProjects = projects.filter(p => p.status === "open");
  const myApplications = projects.filter(p => 
    p.applications?.some(a => a.creator_id === user?.user_id)
  );

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
                  <Briefcase className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-heading font-bold text-xl text-white">Missions</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2">
            Missions disponibles
          </h1>
          <p className="text-slate-400">
            Candidatez aux projets qui vous correspondent
          </p>
        </div>

        {/* Open Projects */}
        <section className="mb-12">
          <h2 className="text-xl font-heading font-semibold text-white mb-4">
            Projets ouverts ({openProjects.length})
          </h2>
          
          {openProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {openProjects.map((project) => {
                const hasApplied = project.applications?.some(a => a.creator_id === user?.user_id);
                const isLocked = project.incubator_only && !user?.is_premium;
                
                return (
                  <motion.div
                    key={project.project_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className={`bg-slate-800 border-slate-700 ${isLocked ? 'opacity-75' : 'hover:border-primary/50'} transition-colors`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-semibold">{project.title}</h3>
                              {project.incubator_only && (
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                                  <Award className="w-3 h-3 mr-1" /> Incubateur
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                              {project.content_type}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-primary font-heading font-bold text-xl">
                              {project.budget}€
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                          {project.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-slate-500 text-sm mb-4">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {project.target_creators} créateur(s)
                          </span>
                          {project.deadline && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {project.deadline}
                            </span>
                          )}
                        </div>
                        
                        {project.requirements?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {project.requirements.map((req, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-slate-600 text-slate-400">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {isLocked ? (
                          <Button
                            variant="outline"
                            className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => navigate("/dashboard")}
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Réservé aux membres Incubateur
                          </Button>
                        ) : hasApplied ? (
                          <Button disabled className="w-full bg-green-500/20 text-green-400">
                            Candidature envoyée
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleApply(project.project_id)}
                            className="w-full bg-primary hover:bg-primary-hover"
                          >
                            Candidater
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucun projet disponible pour le moment</p>
                <p className="text-slate-500 text-sm mt-2">Revenez bientôt !</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* My Applications */}
        {myApplications.length > 0 && (
          <section>
            <h2 className="text-xl font-heading font-semibold text-white mb-4">
              Mes candidatures ({myApplications.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {myApplications.map((project) => (
                <Card key={project.project_id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{project.title}</p>
                        <p className="text-slate-400 text-sm">{project.budget}€</p>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400">En attente</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ProjectsPage;
