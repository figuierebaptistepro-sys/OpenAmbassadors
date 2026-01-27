import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Briefcase, DollarSign, Clock, Users, Award, Lock, Search,
  Filter, Plus, ChevronRight
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ProjectsPage = ({ user }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [packs, setPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  
  const [projectForm, setProjectForm] = useState({
    title: "", description: "", content_type: "UGC",
    budget: "", target_creators: 1, incubator_only: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, packsRes] = await Promise.all([
        fetch(`${API_URL}/api/projects`, { credentials: "include" }),
        fetch(`${API_URL}/api/packs`)
      ]);
      
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (packsRes.ok) setPacks(await packsRes.json());
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

  const handleApply = async (projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/apply`, {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        toast.success("Candidature envoyée !");
        fetchData();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Erreur");
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCreateProject = async () => {
    if (!selectedPack) {
      toast.error("Sélectionnez un pack");
      return;
    }
    if (!projectForm.title || !projectForm.description) {
      toast.error("Titre et description requis");
      return;
    }

    try {
      // First select pack
      await fetch(`${API_URL}/api/business/select-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pack_id: selectedPack }),
      });

      // Then create project
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...projectForm,
          pack_id: selectedPack,
          budget: parseInt(projectForm.budget) || 0,
        }),
      });

      if (response.ok) {
        toast.success("Projet créé !");
        setProjectDialogOpen(false);
        setProjectForm({
          title: "", description: "", content_type: "UGC",
          budget: "", target_creators: 1, incubator_only: false,
        });
        setSelectedPack(null);
        fetchData();
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
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isCreator = user?.user_type === "creator";
  const openProjects = projects.filter(p => p.status === "open");
  const myApplications = projects.filter(p => 
    p.applications?.some(a => a.creator_id === user?.user_id)
  );
  const myProjects = projects.filter(p => p.business_id === user?.user_id);

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType={user?.user_type} isPremium={user?.is_premium} onLogout={handleLogout} />

      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-xl font-bold text-gray-900">
                {isCreator ? "Missions disponibles" : "Mes Projets"}
              </h1>
              <p className="text-gray-500 text-sm">
                {isCreator 
                  ? "Candidatez aux projets qui vous correspondent"
                  : "Gérez vos projets et trouvez des créateurs"}
              </p>
            </div>
            {!isCreator && (
              <Button 
                onClick={() => setProjectDialogOpen(true)}
                className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau projet
              </Button>
            )}
          </div>
        </header>

        <main className="p-8">
          {isCreator ? (
            /* Creator View */
            <>
              {/* Open Projects */}
              <section className="mb-12">
                <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">
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
                          <Card className={`border-0 shadow-md bg-white ${isLocked ? 'opacity-80' : 'hover:shadow-lg'} transition-all`}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-gray-900 font-semibold">{project.title}</h3>
                                    {project.incubator_only && (
                                      <Badge className="bg-primary text-white text-xs">
                                        <Award className="w-3 h-3 mr-1" /> Premium
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="border-gray-200 text-gray-500 text-xs">
                                    {project.content_type}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <p className="text-primary font-heading font-bold text-xl">
                                    {project.budget}€
                                  </p>
                                </div>
                              </div>
                              
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {project.description}
                              </p>
                              
                              <div className="flex items-center gap-4 text-gray-500 text-sm mb-4">
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
                              
                              {isLocked ? (
                                <Button
                                  variant="outline"
                                  className="w-full border-primary text-primary hover:bg-primary-soft"
                                  onClick={() => navigate("/dashboard")}
                                >
                                  <Lock className="w-4 h-4 mr-2" />
                                  Réservé aux membres Premium
                                </Button>
                              ) : hasApplied ? (
                                <Button disabled className="w-full bg-green-100 text-green-700">
                                  Candidature envoyée ✓
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleApply(project.project_id)}
                                  className="w-full bg-primary hover:bg-primary-hover shadow-sm shadow-primary/20"
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
                  <Card className="border-0 shadow-md bg-white">
                    <CardContent className="p-12 text-center">
                      <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Aucun projet disponible pour le moment</p>
                      <p className="text-gray-400 text-sm mt-1">Revenez bientôt !</p>
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* My Applications */}
              {myApplications.length > 0 && (
                <section>
                  <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">
                    Mes candidatures ({myApplications.length})
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myApplications.map((project) => (
                      <Card key={project.project_id} className="border-0 shadow-md bg-white">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-900 font-medium">{project.title}</p>
                              <p className="text-gray-500 text-sm">{project.budget}€</p>
                            </div>
                            <Badge className="bg-blue-100 text-blue-700">En attente</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            /* Business View */
            <>
              {myProjects.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {myProjects.map((project) => (
                    <Card key={project.project_id} className="border-0 shadow-md bg-white">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-gray-900 font-semibold">{project.title}</h3>
                            <Badge variant="outline" className="border-gray-200 text-xs mt-1">
                              {project.content_type}
                            </Badge>
                          </div>
                          <Badge className={
                            project.status === "open" ? "bg-green-100 text-green-700" :
                            project.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }>
                            {project.status === "open" ? "Ouvert" : 
                             project.status === "in_progress" ? "En cours" : project.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">{project.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-primary font-semibold">{project.budget}€</span>
                          <span className="text-gray-500 text-sm">
                            {project.applications?.length || 0} candidature(s)
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-md bg-white">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun projet créé</p>
                    <Button 
                      onClick={() => setProjectDialogOpen(true)}
                      className="mt-4 bg-primary hover:bg-primary-hover"
                    >
                      Créer mon premier projet
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Nouveau projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Pack Selection */}
            <div className="space-y-3">
              <Label className="text-gray-900 font-semibold">1. Choisissez un pack</Label>
              <div className="grid grid-cols-2 gap-3">
                {packs.map((pack) => (
                  <button
                    key={pack.pack_id}
                    onClick={() => setSelectedPack(pack.pack_id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedPack === pack.pack_id
                        ? "border-primary bg-primary-soft"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{pack.icon}</span>
                      <span className="text-gray-900 font-medium">{pack.name}</span>
                    </div>
                    <p className="text-primary font-semibold">{pack.price}€</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <Label className="text-gray-900 font-semibold">2. Détails du projet</Label>
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="Campagne UGC Été 2025"
                  className="bg-gray-50 border-gray-200"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Décrivez votre projet en détail..."
                  className="w-full h-24 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type de contenu</Label>
                  <select
                    value={projectForm.content_type}
                    onChange={(e) => setProjectForm({ ...projectForm, content_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    {["UGC", "Micro-trottoir", "Face cam", "Ads", "Interview"].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Budget (€)</Label>
                  <Input
                    type="number"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                    placeholder="1500"
                    className="bg-gray-50 border-gray-200"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-gray-900 font-medium">Réservé aux membres Premium</p>
                  <p className="text-gray-500 text-sm">Créateurs Incubateur uniquement</p>
                </div>
                <input
                  type="checkbox"
                  checked={projectForm.incubator_only}
                  onChange={(e) => setProjectForm({ ...projectForm, incubator_only: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
            </div>

            <Button 
              onClick={handleCreateProject} 
              className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
              disabled={!selectedPack}
            >
              Créer le projet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
