import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, Briefcase, CreditCard, Shield, CheckCircle, XCircle, Clock,
  Euro, TrendingUp, Crown, Building2, UserCheck, UserX, Eye, ChevronRight,
  AlertCircle, Search, Filter, RefreshCw, Mail, Calendar, MapPin, Wallet,
  Ban, Trash2, AlertTriangle
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPage = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data states
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  
  // Filters
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState("pending");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [earningDialogOpen, setEarningDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  
  // Earning form
  const [earningForm, setEarningForm] = useState({
    creator_id: "",
    amount: "",
    description: ""
  });

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "withdrawals") fetchWithdrawals();
    if (activeTab === "projects") fetchProjects();
    if (activeTab === "access") fetchAccessRequests();
  }, [activeTab, userTypeFilter, userStatusFilter, withdrawalStatusFilter, projectStatusFilter]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, { credentials: "include" });
      if (response.ok) setStats(await response.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      let url = `${API_URL}/api/admin/users?limit=100`;
      if (userTypeFilter !== "all") url += `&user_type=${userTypeFilter}`;
      if (userStatusFilter !== "all") url += `&status=${userStatusFilter}`;
      
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      let url = `${API_URL}/api/admin/withdrawals?limit=100`;
      if (withdrawalStatusFilter !== "all") url += `&status=${withdrawalStatusFilter}`;
      
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      let url = `${API_URL}/api/admin/projects?limit=100`;
      if (projectStatusFilter !== "all") url += `&status=${projectStatusFilter}`;
      
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchAccessRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/access-requests?status=pending`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setAccessRequests(data.requests);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleVerifyUser = async (userId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        toast.success("Statut mis à jour !");
        fetchUsers();
        setUserDialogOpen(false);
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleTogglePremium = async (userId, isPremium) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/premium`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_premium: isPremium })
      });
      if (response.ok) {
        toast.success(isPremium ? "Premium activé !" : "Premium désactivé");
        fetchUsers();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.user_id}/ban`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_banned: !selectedUser.is_banned, reason: banReason })
      });
      if (response.ok) {
        toast.success(selectedUser.is_banned ? "Utilisateur débanni !" : "Utilisateur banni !");
        fetchUsers();
        setBanDialogOpen(false);
        setUserDialogOpen(false);
        setBanReason("");
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.user_id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (response.ok) {
        toast.success("Utilisateur supprimé définitivement");
        fetchUsers();
        fetchStats();
        setDeleteDialogOpen(false);
        setUserDialogOpen(false);
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleProcessWithdrawal = async (transactionId, action) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/wallet/process-withdrawal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transaction_id: transactionId, action })
      });
      if (response.ok) {
        toast.success(action === "approve" ? "Retrait approuvé !" : "Retrait refusé");
        fetchWithdrawals();
        fetchStats();
        setWithdrawalDialogOpen(false);
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleAddEarning = async () => {
    if (!earningForm.creator_id || !earningForm.amount) {
      toast.error("Remplissez tous les champs");
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/admin/wallet/add-earning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          creator_id: earningForm.creator_id,
          amount: parseFloat(earningForm.amount),
          description: earningForm.description || "Paiement mission"
        })
      });
      if (response.ok) {
        toast.success("Paiement ajouté !");
        setEarningDialogOpen(false);
        setEarningForm({ creator_id: "", amount: "", description: "" });
        fetchStats();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleProcessAccessRequest = async (requestId, action) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/access-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action })
      });
      if (response.ok) {
        toast.success(action === "approve" ? "Demande approuvée !" : "Demande refusée");
        fetchAccessRequests();
        fetchStats();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleUpdateProjectStatus = async (projectId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/projects/${projectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        toast.success("Statut mis à jour !");
        fetchProjects();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric"
    });
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Administration</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Gérez la plateforme</p>
            </div>
          </div>
          <Button onClick={() => { fetchStats(); }} variant="outline" size="sm" className="border-gray-200">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1 flex-wrap h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              Paiements
              {stats?.pending?.withdrawals > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">{stats.pending.withdrawals}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              Projets
            </TabsTrigger>
            <TabsTrigger value="access" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              Demandes
              {stats?.pending?.access_requests > 0 && (
                <Badge className="ml-2 bg-yellow-500 text-white text-xs">{stats.pending.access_requests}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Utilisateurs", value: stats?.users?.total || 0, icon: Users, color: "bg-blue-100 text-blue-600" },
                { label: "Créateurs", value: stats?.users?.total_creators || 0, icon: Users, color: "bg-green-100 text-green-600", sub: `${stats?.users?.premium_creators || 0} Premium` },
                { label: "Entreprises", value: stats?.users?.total_businesses || 0, icon: Building2, color: "bg-purple-100 text-purple-600" },
                { label: "Projets Actifs", value: stats?.projects?.open || 0, icon: Briefcase, color: "bg-yellow-100 text-yellow-600" },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">{stat.label}</p>
                          <p className="font-heading text-xl font-bold text-gray-900">{stat.value}</p>
                          {stat.sub && <p className="text-xs text-gray-400">{stat.sub}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pending Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pending Withdrawals */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-orange-500" />
                      Retraits en attente
                    </CardTitle>
                    {stats?.pending?.withdrawals > 0 && (
                      <Badge className="bg-orange-100 text-orange-700">
                        {stats.pending.withdrawals} • {stats.pending.withdrawal_amount?.toFixed(2)}€
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {stats?.pending?.withdrawals > 0 ? (
                    <Button onClick={() => setActiveTab("withdrawals")} className="w-full bg-orange-500 hover:bg-orange-600">
                      Traiter les demandes
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Aucun retrait en attente</p>
                  )}
                </CardContent>
              </Card>

              {/* Revenue */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Euro className="w-5 h-5 text-green-500" />
                    Revenus plateforme
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-2">
                    <p className="text-gray-500 text-xs">Commissions collectées (15%)</p>
                    <p className="font-heading text-3xl font-bold text-green-600">
                      {(stats?.revenue?.total_fees_collected || 0).toFixed(2)}€
                    </p>
                  </div>
                  <Button onClick={() => setEarningDialogOpen(true)} variant="outline" className="w-full border-gray-200 mt-2">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Ajouter un paiement créateur
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={withdrawalStatusFilter} onValueChange={setWithdrawalStatusFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="completed">Approuvés</SelectItem>
                  <SelectItem value="rejected">Refusés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {withdrawals.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {withdrawals.map((w) => (
                      <div key={w.transaction_id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {w.user?.picture ? (
                            <img src={getImageUrl(w.user.picture)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{w.user?.name || "Utilisateur"}</p>
                          <p className="text-gray-500 text-xs">{w.user?.email}</p>
                          <p className="text-gray-400 text-xs mt-1">
                            IBAN: ****{w.bank_iban?.slice(-4) || "N/A"} • {formatDate(w.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-heading font-bold text-lg text-gray-900">{w.amount?.toFixed(2)}€</p>
                          <Badge className={`text-xs ${
                            w.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            w.status === "completed" ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {w.status === "pending" ? "En attente" : w.status === "completed" ? "Approuvé" : "Refusé"}
                          </Badge>
                        </div>
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleProcessWithdrawal(w.transaction_id, "approve")}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleProcessWithdrawal(w.transaction_id, "reject")}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun retrait</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="creator">Créateurs</SelectItem>
                  <SelectItem value="business">Entreprises</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="verified">Vérifiés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {users.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <div key={u.user_id} className={`p-4 flex items-center gap-4 hover:bg-gray-50 ${u.is_banned ? "bg-red-50" : ""}`}>
                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {u.picture ? (
                            <img src={getImageUrl(u.picture)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 text-sm">{u.name || "Sans nom"}</p>
                            {u.is_banned && (
                              <Badge className="bg-red-500 text-white text-xs">
                                <Ban className="w-3 h-3 mr-1" />Banni
                              </Badge>
                            )}
                            {u.is_premium && (
                              <Badge className="bg-gradient-to-r from-primary to-pink-500 text-white text-xs">
                                <Crown className="w-3 h-3 mr-1" />Premium
                              </Badge>
                            )}
                            <Badge className={`text-xs ${u.user_type === "creator" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {u.user_type === "creator" ? "Créateur" : "Entreprise"}
                            </Badge>
                          </div>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                          <p className="text-gray-400 text-xs">
                            {u.profile?.city || u.profile?.company_name || "—"} • Inscrit {formatDate(u.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => { setSelectedUser(u); setUserDialogOpen(true); }}
                            className="border-gray-200"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {u.user_type === "creator" && (
                            <Button 
                              size="sm" 
                              variant={u.is_premium ? "default" : "outline"}
                              onClick={() => handleTogglePremium(u.user_id, !u.is_premium)}
                              className={u.is_premium ? "bg-primary" : "border-gray-200"}
                            >
                              <Crown className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun utilisateur</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="open">Ouverts</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminés</SelectItem>
                  <SelectItem value="cancelled">Annulés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {projects.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {projects.map((p) => (
                      <div key={p.project_id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                        <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {p.banner_url ? (
                            <img src={getImageUrl(p.banner_url)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Briefcase className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{p.title}</p>
                          <p className="text-gray-500 text-xs">{p.company_name || p.business?.name || "Entreprise"}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>{p.budget}€</span>
                            <span>{p.content_type}</span>
                            <span>{p.applications?.length || 0} candidatures</span>
                          </div>
                        </div>
                        <Select 
                          value={p.status} 
                          onValueChange={(value) => handleUpdateProjectStatus(p.project_id, value)}
                        >
                          <SelectTrigger className={`w-32 text-xs ${
                            p.status === "open" ? "bg-green-50 border-green-200" :
                            p.status === "in_progress" ? "bg-blue-50 border-blue-200" :
                            p.status === "completed" ? "bg-gray-50 border-gray-200" :
                            "bg-red-50 border-red-200"
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Ouvert</SelectItem>
                            <SelectItem value="in_progress">En cours</SelectItem>
                            <SelectItem value="completed">Terminé</SelectItem>
                            <SelectItem value="cancelled">Annulé</SelectItem>
                            <SelectItem value="suspended">Suspendu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun projet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Requests Tab */}
          <TabsContent value="access" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Demandes d&apos;accès en attente</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {accessRequests.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {accessRequests.map((r) => (
                      <div key={r.request_id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{r.email}</p>
                          <p className="text-gray-500 text-xs">{r.message || "Pas de message"}</p>
                          <p className="text-gray-400 text-xs mt-1">{formatDate(r.created_at)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleProcessAccessRequest(r.request_id, "approve")}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleProcessAccessRequest(r.request_id, "reject")}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucune demande en attente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {selectedUser?.picture ? (
                  <img src={getImageUrl(selectedUser.picture)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-gray-900">{selectedUser?.name || "Utilisateur"}</p>
                <p className="text-gray-500 text-sm font-normal">{selectedUser?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Type</p>
                  <p className="font-medium">{selectedUser.user_type === "creator" ? "Créateur" : "Entreprise"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Premium</p>
                  <p className="font-medium">{selectedUser.is_premium ? "Oui" : "Non"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Vérification</p>
                  <p className="font-medium">{selectedUser.verification_status || "Non vérifié"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Inscription</p>
                  <p className="font-medium">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>

              {selectedUser.profile && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-gray-500 text-xs mb-2">Profil</p>
                  {selectedUser.user_type === "creator" ? (
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-500">Ville:</span> {selectedUser.profile.city || "—"}</p>
                      <p><span className="text-gray-500">Bio:</span> {selectedUser.profile.bio || "—"}</p>
                      <p><span className="text-gray-500">Spécialités:</span> {selectedUser.profile.content_types?.join(", ") || "—"}</p>
                    </div>
                  ) : (
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-500">Entreprise:</span> {selectedUser.profile.company_name || "—"}</p>
                      <p><span className="text-gray-500">Secteur:</span> {selectedUser.profile.industry || "—"}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 space-y-2">
                <p className="text-gray-500 text-xs">Actions de vérification</p>
                <div className="flex flex-wrap gap-2">
                  {["unverified", "verified", "portfolio_validated", "incubator_certified", "suspended"].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedUser.verification_status === status ? "default" : "outline"}
                      onClick={() => handleVerifyUser(selectedUser.user_id, status)}
                      className={selectedUser.verification_status === status ? "bg-primary" : "border-gray-200"}
                    >
                      {status === "unverified" && "Non vérifié"}
                      {status === "verified" && "Vérifié"}
                      {status === "portfolio_validated" && "Portfolio validé"}
                      {status === "incubator_certified" && "Certifié"}
                      {status === "suspended" && "Suspendu"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Ban/Delete Actions */}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <p className="text-gray-500 text-xs">Actions dangereuses</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBanDialogOpen(true)}
                    className={`flex-1 ${selectedUser.is_banned ? "border-green-200 text-green-600 hover:bg-green-50" : "border-orange-200 text-orange-600 hover:bg-orange-50"}`}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {selectedUser.is_banned ? "Débannir" : "Bannir"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
                {selectedUser.is_banned && selectedUser.ban_reason && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                    Raison du ban : {selectedUser.ban_reason}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban Confirmation Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-orange-500" />
              {selectedUser?.is_banned ? "Débannir l'utilisateur ?" : "Bannir l'utilisateur ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_banned 
                ? `${selectedUser?.name || "Cet utilisateur"} pourra à nouveau se connecter et utiliser la plateforme.`
                : `${selectedUser?.name || "Cet utilisateur"} ne pourra plus se connecter à la plateforme.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!selectedUser?.is_banned && (
            <div className="py-2">
              <label className="text-sm text-gray-500">Raison du ban (optionnel)</label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ex: Comportement inapproprié..."
                className="bg-gray-50 mt-1"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              className={selectedUser?.is_banned ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"}
            >
              {selectedUser?.is_banned ? "Débannir" : "Bannir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Supprimer définitivement ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est <span className="font-semibold text-red-600">irréversible</span>. 
              Toutes les données de <span className="font-semibold">{selectedUser?.name || "cet utilisateur"}</span> seront 
              supprimées : profil, projets, transactions, avis...
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Earning Dialog */}
      <Dialog open={earningDialogOpen} onOpenChange={setEarningDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Ajouter un paiement créateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-500">ID du créateur</label>
              <Input
                value={earningForm.creator_id}
                onChange={(e) => setEarningForm({ ...earningForm, creator_id: e.target.value })}
                placeholder="user_xxxx"
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Montant brut (€)</label>
              <Input
                type="number"
                value={earningForm.amount}
                onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })}
                placeholder="100"
                className="bg-gray-50"
              />
              {earningForm.amount && (
                <p className="text-xs text-gray-400 mt-1">
                  Net après 15% : {(parseFloat(earningForm.amount) * 0.85).toFixed(2)}€ (0€ si Premium)
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-500">Description</label>
              <Input
                value={earningForm.description}
                onChange={(e) => setEarningForm({ ...earningForm, description: e.target.value })}
                placeholder="Paiement mission UGC"
                className="bg-gray-50"
              />
            </div>
            <Button onClick={handleAddEarning} className="w-full bg-primary hover:bg-primary-hover">
              <CreditCard className="w-4 h-4 mr-2" />
              Ajouter le paiement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminPage;
