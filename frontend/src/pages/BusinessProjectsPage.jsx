import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase, Plus, Edit, Eye, Users, Euro, Clock, CheckCircle,
  AlertCircle, Crown, MapPin, ChevronRight, MoreVertical, Trash2, Bell, BellRing,
  Film, Package, PlayCircle, ArrowRight, Check
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  open: { label: "En ligne", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  completed: { label: "Terminé", color: "bg-gray-100 text-gray-700", dot: "bg-gray-500" },
  cancelled: { label: "Annulé", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
};

const AGENCY_STATUSES = [
  { key: "brief_recu",  label: "Brief reçu",            color: "bg-slate-500",   light: "bg-slate-100 text-slate-700" },
  { key: "casting",     label: "Casting",               color: "bg-blue-500",    light: "bg-blue-100 text-blue-700" },
  { key: "tournage",    label: "Tournage",              color: "bg-orange-500",  light: "bg-orange-100 text-orange-700" },
  { key: "montage",     label: "Montage",               color: "bg-purple-500",  light: "bg-purple-100 text-purple-700" },
  { key: "livraison",   label: "Livraison des fichiers", color: "bg-green-500",   light: "bg-green-100 text-green-700" },
  { key: "termine",     label: "Terminé",               color: "bg-emerald-600", light: "bg-emerald-100 text-emerald-700" },
];
const AGENCY_FORMULAS = [
  { key: "12_videos", label: "12 vidéos / mois", videos: 12 },
  { key: "20_videos", label: "20 vidéos / mois", videos: 20 },
];

const BusinessProjectsPage = ({ user }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [agencyCampaigns, setAgencyCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, completed: 0 });
  const [projectNotifications, setProjectNotifications] = useState({});

  useEffect(() => {
    fetchProjects();
    fetchNotifications();
    if (user?.is_agency_client) fetchAgencyCampaigns();
  }, []);

  const fetchAgencyCampaigns = async () => {
    try {
      const r = await fetch(`${API_URL}/api/agency/my-campaigns`, { credentials: "include" });
      if (r.ok) setAgencyCampaigns(await r.json());
    } catch (e) { console.error(e); }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects/business`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Calculate stats
        setStats({
          total: data.length,
          open: data.filter(p => p.status === "open").length,
          in_progress: data.filter(p => p.status === "in_progress").length,
          completed: data.filter(p => p.status === "completed").length,
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        // Group notifications by project_id and count unread
        const grouped = {};
        (data.notifications || []).forEach(notif => {
          if (notif.data?.project_id && !notif.is_read && notif.type === "application") {
            const pid = notif.data.project_id;
            grouped[pid] = (grouped[pid] || 0) + 1;
          }
        });
        setProjectNotifications(grouped);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Mes Projets</h1>
            <p className="text-gray-500 text-xs sm:text-sm">{projects.length} campagne(s)</p>
          </div>
          <Button
            onClick={() => navigate("/business/projects/new")}
            className="bg-primary hover:bg-primary-hover"
            data-testid="new-project-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau projet
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total + agencyCampaigns.length, color: "bg-gray-100 text-gray-700" },
            { label: "En ligne", value: stats.open, color: "bg-green-100 text-green-700" },
            { label: "En cours", value: stats.in_progress + agencyCampaigns.filter(c => c.status !== "termine").length, color: "bg-blue-100 text-blue-700" },
            { label: "Terminés", value: stats.completed + agencyCampaigns.filter(c => c.status === "termine").length, color: "bg-gray-100 text-gray-600" },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-gray-500 text-xs">{stat.label}</p>
                <p className={`font-heading text-2xl font-bold ${stat.color.split(" ")[1]}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ===== AGENCY CAMPAIGNS — treated as projects ===== */}
        {user?.is_agency_client && agencyCampaigns.length > 0 && (
          <div className="mb-6">
            <h2 className="font-heading text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              Productions Studiosavora
              <span className="text-xs font-normal text-gray-400">({agencyCampaigns.length})</span>
            </h2>
            <div className="space-y-4">
              {agencyCampaigns.map((c) => {
                const currentIdx = AGENCY_STATUSES.findIndex(s => s.key === c.status);
                const status = AGENCY_STATUSES[currentIdx] || AGENCY_STATUSES[0];
                const formula = AGENCY_FORMULAS.find(f => f.key === c.formula);
                const videosDelivered = c.videos_delivered || 0;
                const videosTotal = formula?.videos || 0;
                const videosPct = videosTotal ? Math.min(100, Math.round((videosDelivered / videosTotal) * 100)) : 0;
                const stepPct = Math.round(((currentIdx + 1) / AGENCY_STATUSES.length) * 100);
                return (
                  <div key={c.campaign_id} className="rounded-2xl shadow-md overflow-hidden cursor-pointer" onClick={() => navigate(`/business/productions/${c.campaign_id}`)}>
                    {/* Hero rose brand — clean, no overlap */}
                    <div className="p-5" style={{ background: "linear-gradient(135deg, #FF2E63 0%, #c2185b 100%)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full mb-2 backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {status.label}
                          </span>
                          <h3 className="font-heading font-bold text-white text-lg leading-tight">{c.title}</h3>
                          {formula && (
                            <p className="text-white/70 text-xs mt-1.5 flex items-center gap-1">
                              <Package className="w-3 h-3" />{formula.label}
                            </p>
                          )}
                        </div>
                        {c.creator_name && (
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            {c.creator_picture ? (
                              <img
                                src={c.creator_picture.startsWith("http") ? c.creator_picture : `${API_URL}${c.creator_picture}`}
                                alt={c.creator_name}
                                className="w-12 h-12 rounded-xl object-cover border-2 border-white/50 shadow"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center shadow">
                                <span className="text-white font-bold text-lg">{c.creator_name[0]?.toUpperCase()}</span>
                              </div>
                            )}
                            <span className="text-white/80 text-[10px] font-medium truncate max-w-[56px]">{c.creator_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* White body — clean, no overlap */}
                    <div className="bg-white px-5 pt-4 pb-4">
                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span className="font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3 text-[#FF2E63]" /> Progression</span>
                          <span className="font-bold text-gray-900">{stepPct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${stepPct}%`, background: "linear-gradient(90deg, #FF2E63, #FF5C8A)" }} />
                        </div>
                      </div>
                      {/* Stepper */}
                      <div className="flex items-center overflow-x-auto pb-1 mb-3">
                        {AGENCY_STATUSES.map((s, i) => {
                          const done = i < currentIdx;
                          const active = i === currentIdx;
                          return (
                            <div key={s.key} className="flex items-center flex-shrink-0">
                              <div className="flex flex-col items-center gap-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                                  done ? "bg-[#FF2E63] border-[#FF2E63] text-white" :
                                  active ? "bg-white border-[#FF2E63] text-[#FF2E63]" :
                                  "bg-gray-100 border-gray-200 text-gray-400"
                                }`}>
                                  {done ? <Check className="w-3 h-3" /> : i + 1}
                                </div>
                                <span className={`text-[9px] text-center leading-tight max-w-[40px] ${active ? "font-semibold text-[#FF2E63]" : done ? "text-gray-400" : "text-gray-300"}`}>
                                  {s.label.split(" ")[0]}
                                </span>
                              </div>
                              {i < AGENCY_STATUSES.length - 1 && (
                                <div className={`h-px w-4 mx-1 mb-3 ${i < currentIdx ? "bg-[#FF2E63]" : "bg-gray-200"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Bottom row */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        {formula && (
                          <div className="flex-1 bg-[#FFF1F5] rounded-lg px-3 py-2 flex items-center justify-between">
                            <span className="text-xs text-[#FF2E63] flex items-center gap-1"><PlayCircle className="w-3 h-3" />Vidéos</span>
                            <span className="text-sm font-bold text-gray-900">{videosDelivered}<span className="text-xs text-gray-400 font-normal">/{videosTotal}</span></span>
                          </div>
                        )}
                        {c.client_notes && (
                          <p className="text-xs text-gray-500 italic line-clamp-1 flex-1">💬 {c.client_notes}</p>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/business/productions/${c.campaign_id}`); }}
                          className="text-xs font-semibold text-[#FF2E63] hover:underline flex items-center gap-1 shrink-0"
                        >
                          Voir les détails <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects List */}
        {projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project, index) => {
              const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.open;
              
              return (
                <motion.div
                  key={project.project_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {/* Banner */}
                      <div className="sm:w-48 h-32 sm:h-auto bg-gray-100 flex-shrink-0">
                        {project.banner_url ? (
                          <img
                            src={getImageUrl(project.banner_url)}
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Briefcase className="w-10 h-10 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <CardContent className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Status + Title */}
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={`text-xs ${statusConfig.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1.5`}></span>
                                {statusConfig.label}
                              </Badge>
                              {project.incubator_only && (
                                <Badge className="bg-primary/10 text-primary text-xs">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="font-heading font-semibold text-gray-900 mb-1">{project.title}</h3>
                            <p className="text-gray-500 text-sm line-clamp-2 mb-3">{project.description}</p>

                            {/* Info */}
                            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Euro className="w-3.5 h-3.5" />
                                {project.budget || "—"}
                              </span>
                              <button 
                                onClick={() => navigate(`/business/projects/${project.project_id}`)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
                                  projectNotifications[project.project_id] 
                                    ? "bg-primary/10 text-primary font-semibold" 
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                {projectNotifications[project.project_id] ? (
                                  <BellRing className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <Users className="w-3.5 h-3.5" />
                                )}
                                {project.applications?.length || 0} candidature(s)
                                {projectNotifications[project.project_id] && (
                                  <span className="ml-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                                    +{projectNotifications[project.project_id]}
                                  </span>
                                )}
                              </button>
                              {project.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {project.duration}
                                </span>
                              )}
                              {project.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {project.location}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/business/projects/${project.project_id}/edit`)}
                              className="border-gray-200"
                              data-testid={`edit-project-${project.project_id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="border-gray-200">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white">
                                <DropdownMenuItem onClick={() => navigate(`/business/projects/${project.project_id}`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Voir les candidatures
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-heading font-semibold text-gray-900 mb-2">Aucun projet</h3>
              <p className="text-gray-500 text-sm mb-4">Créez votre première campagne pour trouver des créateurs</p>
              <Button
                onClick={() => navigate("/business/projects/new")}
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un projet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default BusinessProjectsPage;
