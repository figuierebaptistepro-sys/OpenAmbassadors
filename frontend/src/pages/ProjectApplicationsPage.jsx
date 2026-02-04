import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, Star, MapPin, Crown, CheckCircle, XCircle,
  Clock, Euro, Calendar, ExternalLink, Instagram, MessageCircle,
  User, Mail, Phone, Award, Eye, ChevronRight, Bell, BellRing
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  accepted: { label: "Accepté", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Refusé", color: "bg-red-100 text-red-700", icon: XCircle },
};

const ProjectApplicationsPage = ({ user }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [projectNotifications, setProjectNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchProjectNotifications();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects/business/${projectId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        toast.error("Projet non trouvé");
        navigate("/business/projects");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (creatorId, newStatus) => {
    setProcessing(true);
    try {
      const response = await fetch(
        `${API_URL}/api/projects/business/${projectId}/application/${creatorId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (response.ok) {
        toast.success(newStatus === "accepted" ? "Candidature acceptée !" : "Candidature refusée");
        fetchProject();
        setActionDialogOpen(false);
        setSelectedCreator(null);
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (creator, type) => {
    setSelectedCreator(creator);
    setActionType(type);
    setActionDialogOpen(true);
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
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) return null;

  const applications = project.applications || [];
  const pendingCount = applications.filter(a => a.status === "pending").length;
  const acceptedCount = applications.filter(a => a.status === "accepted").length;

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/business/projects")}
            className="p-2"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900 truncate">
              {project.title}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {applications.length} candidature(s) • {pendingCount} en attente
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total", value: applications.length, color: "bg-gray-100 text-gray-700" },
            { label: "En attente", value: pendingCount, color: "bg-yellow-100 text-yellow-700" },
            { label: "Acceptés", value: acceptedCount, color: "bg-green-100 text-green-700" },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-gray-500 text-xs">{stat.label}</p>
                <p className={`font-heading text-2xl font-bold ${stat.color.split(" ")[1]}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Project Info Summary */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Euro className="w-4 h-4 text-gray-400" />
                Budget: <strong>{project.budget || "À définir"}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-400" />
                Créateurs: <strong>{project.target_creators || 1}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                Durée: <strong>{project.duration || "—"}</strong>
              </span>
              <Badge className={`text-xs ${
                project.status === "open" ? "bg-green-100 text-green-700" :
                project.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                {project.status === "open" ? "En ligne" : 
                 project.status === "in_progress" ? "En cours" : 
                 project.status === "pending" ? "En attente" : "Terminé"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        <h2 className="font-heading font-bold text-gray-900 mb-4">Candidatures</h2>
        
        {applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app, index) => {
              const creator = app.creator || {};
              const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={app.creator_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Creator Avatar & Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="w-14 h-14 border-2 border-white shadow-sm flex-shrink-0">
                            <AvatarImage src={getImageUrl(creator.picture)} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {(creator.name || "C")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-semibold text-gray-900">
                                {creator.name || "Créateur"}
                              </h3>
                              {creator.is_premium && (
                                <Badge className="bg-primary/10 text-primary text-xs">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                              {creator.is_verified && (
                                <CheckCircle className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
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
                              {creator.follower_range && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {creator.follower_range}
                                </span>
                              )}
                            </div>

                            {/* Specialties */}
                            {creator.specialties?.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {creator.specialties.slice(0, 3).map((s, i) => (
                                  <Badge key={i} variant="outline" className="text-xs border-gray-200">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                          <Badge className={`${statusConfig.color} text-xs`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          
                          <p className="text-xs text-gray-400">
                            {formatDate(app.applied_at)}
                          </p>

                          <div className="flex gap-2">
                            <Link to={`/creators/${creator.user_id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-200 text-xs"
                                data-testid={`view-creator-${creator.user_id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Profil
                              </Button>
                            </Link>
                            
                            {app.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-xs"
                                  onClick={() => openActionDialog(app, "accept")}
                                  data-testid={`accept-${creator.user_id}`}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Accepter
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                                  onClick={() => openActionDialog(app, "reject")}
                                  data-testid={`reject-${creator.user_id}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Social Links */}
                      {creator.social_links && Object.keys(creator.social_links).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                          {creator.social_links.instagram && (
                            <a
                              href={`https://instagram.com/${creator.social_links.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-600"
                            >
                              <Instagram className="w-4 h-4" />
                              @{creator.social_links.instagram}
                            </a>
                          )}
                          {creator.social_links.tiktok && (
                            <a
                              href={`https://tiktok.com/@${creator.social_links.tiktok}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                              </svg>
                              @{creator.social_links.tiktok}
                            </a>
                          )}
                          {creator.social_links.youtube && (
                            <a
                              href={`https://youtube.com/@${creator.social_links.youtube}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              {creator.social_links.youtube}
                            </a>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-heading font-semibold text-gray-900 mb-2">
                Aucune candidature
              </h3>
              <p className="text-gray-500 text-sm">
                Les créateurs n'ont pas encore postulé à ce projet
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {actionType === "accept" ? "Accepter la candidature ?" : "Refuser la candidature ?"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "accept"
                ? `Vous allez accepter ${selectedCreator?.creator?.name || "ce créateur"} pour votre projet. Le projet passera en statut "En cours".`
                : `Vous allez refuser la candidature de ${selectedCreator?.creator?.name || "ce créateur"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 border-gray-200"
              onClick={() => setActionDialogOpen(false)}
              disabled={processing}
            >
              Annuler
            </Button>
            <Button
              className={`flex-1 ${actionType === "accept" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
              onClick={() => handleStatusChange(selectedCreator?.creator_id, actionType === "accept" ? "accepted" : "rejected")}
              disabled={processing}
            >
              {processing ? "..." : actionType === "accept" ? "Accepter" : "Refuser"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ProjectApplicationsPage;
