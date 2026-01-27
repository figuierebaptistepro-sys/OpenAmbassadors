import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Clock, Euro, Users, ChevronRight, Filter, Search, Crown, CheckCircle } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ProjectsPage = ({ user }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects`, { credentials: "include" });
      if (response.ok) setProjects(await response.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedProject) return;
    try {
      const response = await fetch(`${API_URL}/api/projects/${selectedProject.project_id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: applicationMessage }),
      });
      if (response.ok) {
        toast.success("Candidature envoyée !");
        setApplyDialogOpen(false);
        setApplicationMessage("");
        setSelectedProject(null);
        fetchProjects();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const filteredProjects = projects.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Missions</h1>
        <p className="text-gray-500 text-xs sm:text-sm">{filteredProjects.length} missions disponibles</p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
          <Button variant="outline" size="sm" className="border-gray-200">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Projects */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.project_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-all h-full overflow-hidden">
                  {/* Project Banner */}
                  <div className="relative h-32 bg-gray-100">
                    {project.banner_url ? (
                      <img 
                        src={project.banner_url?.startsWith("http") ? project.banner_url : `${API_URL}${project.banner_url}`} 
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Briefcase className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                    {project.incubator_only && (
                      <Badge className="absolute top-2 right-2 bg-primary text-xs">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-4">
                    {/* Business Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {project.business_logo ? (
                          <img 
                            src={project.business_logo?.startsWith("http") ? project.business_logo : `${API_URL}${project.business_logo}`} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">
                            {(project.business_name || "E")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-xs truncate">{project.business_name || "Entreprise"}</span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-heading font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{project.title}</h3>
                    <p className="text-gray-500 text-xs line-clamp-2 mb-3">{project.description}</p>

                    {/* Stats */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          {project.budget ? project.budget : "À définir"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {project.target_creators || 1} créateur(s)
                        </span>
                        {project.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {project.duration}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <Badge variant="outline" className="text-xs border-gray-200">{project.content_type || "UGC"}</Badge>
                        {project.remote_ok && (
                          <Badge variant="outline" className="text-xs border-gray-200">Remote OK</Badge>
                        )}
                        <Badge className={`text-xs ${
                          project.status === "open" ? "bg-green-100 text-green-700" :
                          project.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {project.status === "open" ? "Ouvert" : project.status === "in_progress" ? "En cours" : "Terminé"}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      onClick={() => { setSelectedProject(project); setApplyDialogOpen(true); }}
                      size="sm"
                      className="w-full bg-primary hover:bg-primary-hover text-xs"
                      disabled={project.status !== "open"}
                    >
                      {project.status === "open" ? "Postuler" : "Fermé"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-heading font-bold text-gray-900 mb-2">Aucune mission</h3>
            <p className="text-gray-500 text-sm">Revenez plus tard pour découvrir de nouvelles opportunités</p>
          </div>
        )}
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Postuler à &quot;{selectedProject?.title}&quot;</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Présentez-vous et expliquez pourquoi vous êtes le bon créateur pour cette mission.</p>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                className="w-full h-32 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none text-sm"
                placeholder="Bonjour, je suis intéressé(e) par cette mission car..."
              />
            </div>
            <Button onClick={handleApply} className="w-full bg-primary hover:bg-primary-hover">
              <CheckCircle className="w-4 h-4 mr-2" />
              Envoyer ma candidature
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ProjectsPage;
