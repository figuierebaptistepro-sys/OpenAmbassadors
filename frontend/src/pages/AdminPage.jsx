import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, Briefcase, CreditCard, Shield, CheckCircle, XCircle, Clock,
  Euro, TrendingUp, Crown, Building2, UserCheck, UserX, Eye, ChevronRight,
  AlertCircle, Search, Filter, RefreshCw, Mail, Calendar, MapPin, Wallet,
  Ban, Trash2, AlertTriangle, MessageCircle, Flag, Lock, Unlock, Gift,
  Star, Bell, Activity, BarChart3, Send, UserPlus, DollarSign, Percent,
  ExternalLink, Copy, ArrowUpRight, ArrowDownRight, X, Plus, Link, Hash
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
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

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const AdminPage = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data states
  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [reports, setReports] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  
  // Global search
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const debouncedSearch = useDebounce(globalSearch, 300);
  
  // Selected items
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [affiliateReferrals, setAffiliateReferrals] = useState([]);
  const [fullUserData, setFullUserData] = useState(null);
  
  // Filters
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState("pending");
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("open");
  const [reviewSourceFilter, setReviewSourceFilter] = useState("all");
  
  // Dialog states
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userFullDialogOpen, setUserFullDialogOpen] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [earningDialogOpen, setEarningDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationDialogOpen, setConversationDialogOpen] = useState(false);
  const [affiliateDialogOpen, setAffiliateDialogOpen] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  
  // Forms
  const [earningForm, setEarningForm] = useState({ creator_id: "", amount: "", description: "" });
  const [creditForm, setCreditForm] = useState({ 
    user: null, 
    amount: "", 
    description: "", 
    credit_type: "payment" 
  });
  const [notificationForm, setNotificationForm] = useState({ 
    target: "all", 
    title: "", 
    message: "", 
    type: "info",
    link: "",
    filters: {},
    selectedUsers: [],
    userSearch: ""
  });
  const [notificationPreview, setNotificationPreview] = useState(null);

  // Global search effect
  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      handleGlobalSearch(debouncedSearch);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchStats();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "withdrawals") fetchWithdrawals();
    if (activeTab === "projects") fetchProjects();
    if (activeTab === "access") fetchAccessRequests();
    if (activeTab === "messages") { fetchConversations(); fetchReports(); }
    if (activeTab === "affiliates") fetchAffiliates();
    if (activeTab === "reviews") fetchReviews();
    if (activeTab === "activity") fetchActivityLogs();
  }, [activeTab, userTypeFilter, userStatusFilter, withdrawalStatusFilter, projectStatusFilter, reportStatusFilter, reviewSourceFilter]);

  // ==================== FETCH FUNCTIONS ====================
  
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

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/analytics`, { credentials: "include" });
      if (response.ok) setAnalytics(await response.json());
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      let url = `${API_URL}/api/admin/users?limit=100`;
      if (userTypeFilter !== "all") url += `&user_type=${userTypeFilter}`;
      if (userStatusFilter !== "all") url += `&status=${userStatusFilter}`;
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) { const data = await response.json(); setUsers(data.users); }
    } catch (error) { console.error("Error:", error); }
  };

  // Global search
  const handleGlobalSearch = async (query) => {
    setSearchLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/users/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (error) { console.error("Error:", error); }
    setSearchLoading(false);
  };

  // Get full user data
  const fetchFullUserData = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/full`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setFullUserData(data);
        setUserFullDialogOpen(true);
      }
    } catch (error) { console.error("Error:", error); toast.error("Erreur"); }
  };

  // Quick credit
  const handleQuickCredit = async () => {
    if (!creditForm.user || !creditForm.amount || creditForm.amount <= 0) {
      toast.error("Sélectionnez un utilisateur et entrez un montant");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/admin/wallet/quick-credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: creditForm.user.user_id,
          amount: parseFloat(creditForm.amount),
          description: creditForm.description || "Crédit admin",
          credit_type: creditForm.credit_type
        })
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`${creditForm.amount}€ crédités ! Nouveau solde: ${data.new_balance}€`);
        setCreditDialogOpen(false);
        setCreditForm({ user: null, amount: "", description: "", credit_type: "payment" });
      }
    } catch (error) { toast.error("Erreur"); }
  };

  // Notification preview
  const previewNotificationRecipients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/notifications/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          target: notificationForm.target,
          filters: notificationForm.filters,
          user_ids: notificationForm.selectedUsers.map(u => u.user_id)
        })
      });
      if (response.ok) {
        const data = await response.json();
        setNotificationPreview(data);
      }
    } catch (error) { console.error("Error:", error); }
  };

  // Send advanced notification
  const handleSendAdvancedNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      toast.error("Titre et message requis");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/admin/notifications/send-advanced`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          target: notificationForm.selectedUsers.length > 0 ? "specific" : notificationForm.target,
          filters: notificationForm.filters,
          user_ids: notificationForm.selectedUsers.map(u => u.user_id),
          title: notificationForm.title,
          message: notificationForm.message,
          type: notificationForm.type,
          link: notificationForm.link || null
        })
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Notification envoyée à ${data.count} utilisateur(s)`);
        setNotificationDialogOpen(false);
        setNotificationForm({ 
          target: "all", title: "", message: "", type: "info", link: "",
          filters: {}, selectedUsers: [], userSearch: ""
        });
        setNotificationPreview(null);
      }
    } catch (error) { toast.error("Erreur"); }
  };

  // Add user to notification recipients
  const addUserToNotification = (user) => {
    if (!notificationForm.selectedUsers.find(u => u.user_id === user.user_id)) {
      setNotificationForm({
        ...notificationForm,
        selectedUsers: [...notificationForm.selectedUsers, user],
        userSearch: ""
      });
    }
  };

  // Remove user from notification recipients
  const removeUserFromNotification = (userId) => {
    setNotificationForm({
      ...notificationForm,
      selectedUsers: notificationForm.selectedUsers.filter(u => u.user_id !== userId)
    });
  };

  // Copy user ID to clipboard
  const copyUserId = (userId) => {
    navigator.clipboard.writeText(userId);
    toast.success("ID copié !");
  };

  const fetchWithdrawals = async () => {
    try {
      let url = `${API_URL}/api/admin/withdrawals?limit=100`;
      if (withdrawalStatusFilter !== "all") url += `&status=${withdrawalStatusFilter}`;
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) { const data = await response.json(); setWithdrawals(data.withdrawals); }
    } catch (error) { console.error("Error:", error); }
  };

  const fetchProjects = async () => {
    try {
      let url = `${API_URL}/api/admin/projects?limit=100`;
      if (projectStatusFilter !== "all") url += `&status=${projectStatusFilter}`;
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) { const data = await response.json(); setProjects(data.projects); }
    } catch (error) { console.error("Error:", error); }
  };

  const fetchAccessRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/access-requests?status=pending`, { credentials: "include" });
      if (response.ok) { const data = await response.json(); setAccessRequests(data.requests); }
    } catch (error) { console.error("Error:", error); }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/admin/conversations`, { credentials: "include" });
      if (response.ok) setConversations(await response.json());
    } catch (error) { console.error("Error:", error); }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/admin/reports?status=${reportStatusFilter}`, { credentials: "include" });
      if (response.ok) setReports(await response.json());
    } catch (error) { console.error("Error:", error); }
  };

  const fetchAffiliates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/affiliates`, { credentials: "include" });
      if (response.ok) setAffiliates(await response.json());
    } catch (error) { console.error("Error:", error); }
  };

  const fetchAffiliateReferrals = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/affiliates/${userId}/referrals`, { credentials: "include" });
      if (response.ok) setAffiliateReferrals(await response.json());
    } catch (error) { console.error("Error:", error); }
  };

  const fetchReviews = async () => {
    try {
      let url = `${API_URL}/api/admin/reviews`;
      if (reviewSourceFilter !== "all") url += `?source=${reviewSourceFilter}`;
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) setReviews(await response.json());
    } catch (error) { console.error("Error:", error); }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/activity-logs?limit=50`, { credentials: "include" });
      if (response.ok) setActivityLogs(await response.json());
    } catch (error) { console.error("Error:", error); }
  };

  const fetchConversationMessages = async (conversationId) => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations/${conversationId}/messages?limit=100`, { credentials: "include" });
      if (response.ok) setConversationMessages(await response.json());
    } catch (error) { console.error("Error:", error); }
  };

  // ==================== ACTION HANDLERS ====================

  const handleVerifyUser = async (userId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/verify`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status })
      });
      if (response.ok) { toast.success("Statut mis à jour !"); fetchUsers(); setUserDialogOpen(false); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleTogglePremium = async (userId, isPremium) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/premium`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ is_premium: isPremium })
      });
      if (response.ok) { toast.success(isPremium ? "Premium activé !" : "Premium désactivé"); fetchUsers(); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.user_id}/ban`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ is_banned: !selectedUser.is_banned, reason: banReason })
      });
      if (response.ok) {
        toast.success(selectedUser.is_banned ? "Utilisateur débanni !" : "Utilisateur banni !");
        fetchUsers(); setBanDialogOpen(false); setUserDialogOpen(false); setBanReason("");
      }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.user_id}`, { method: "DELETE", credentials: "include" });
      if (response.ok) {
        toast.success("Utilisateur supprimé"); fetchUsers(); fetchStats();
        setDeleteDialogOpen(false); setUserDialogOpen(false);
      }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleProcessWithdrawal = async (transactionId, action) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/wallet/process-withdrawal`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ transaction_id: transactionId, action })
      });
      if (response.ok) { toast.success(action === "approve" ? "Retrait approuvé !" : "Retrait refusé"); fetchWithdrawals(); fetchStats(); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleAddEarning = async () => {
    if (!earningForm.creator_id || !earningForm.amount) { toast.error("Remplissez tous les champs"); return; }
    try {
      const response = await fetch(`${API_URL}/api/admin/wallet/add-earning`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ creator_id: earningForm.creator_id, amount: parseFloat(earningForm.amount), description: earningForm.description || "Paiement mission" })
      });
      if (response.ok) { toast.success("Paiement ajouté !"); setEarningDialogOpen(false); setEarningForm({ creator_id: "", amount: "", description: "" }); fetchStats(); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleProcessAccessRequest = async (requestId, action) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/access-requests/${requestId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action })
      });
      if (response.ok) { toast.success(action === "approve" ? "Demande approuvée !" : "Demande refusée"); fetchAccessRequests(); fetchStats(); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleUpdateProjectStatus = async (projectId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/projects/${projectId}/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status })
      });
      if (response.ok) { toast.success("Statut mis à jour !"); fetchProjects(); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleViewConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setConversationDialogOpen(true);
    await fetchConversationMessages(conversation.conversation_id);
  };

  const handleBlockConversation = async (conversationId, block) => {
    try {
      const endpoint = block ? "block" : "unblock";
      const response = await fetch(`${API_URL}/api/messaging/admin/conversations/${conversationId}/${endpoint}`, { method: "POST", credentials: "include" });
      if (response.ok) { toast.success(block ? "Conversation bloquée" : "Conversation débloquée"); fetchConversations(); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/admin/messages/${messageId}/delete`, { method: "POST", credentials: "include" });
      if (response.ok) { toast.success("Message supprimé"); if (selectedConversation) fetchConversationMessages(selectedConversation.conversation_id); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleCloseReport = async (reportId) => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/admin/reports/${reportId}/close`, { method: "POST", credentials: "include" });
      if (response.ok) { toast.success("Signalement traité"); fetchReports(); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleViewAffiliate = async (affiliate) => {
    setSelectedAffiliate(affiliate);
    setAffiliateDialogOpen(true);
    await fetchAffiliateReferrals(affiliate.user_id);
  };

  const handleModerateReview = async (reviewId, action, reason = "") => {
    try {
      const response = await fetch(`${API_URL}/api/admin/reviews/${reviewId}/moderate`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action, reason })
      });
      if (response.ok) { toast.success(`Avis ${action}`); fetchReviews(); }
    } catch (error) { toast.error("Erreur"); }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) { toast.error("Titre et message requis"); return; }
    try {
      const response = await fetch(`${API_URL}/api/admin/notifications/send`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(notificationForm)
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Notification envoyée à ${data.count} utilisateurs`);
        setNotificationDialogOpen(false);
        setNotificationForm({ target: "all", title: "", message: "", type: "info" });
      }
    } catch (error) { toast.error("Erreur"); }
  };

  // ==================== HELPERS ====================

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const getActivityIcon = (type) => {
    const icons = {
      user_signup: UserPlus,
      project_created: Briefcase,
      review_posted: Star,
      referral: Gift,
      withdrawal: Wallet
    };
    return icons[type] || Activity;
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
              <p className="text-gray-500 text-xs sm:text-sm">Centre de contrôle plateforme</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setNotificationDialogOpen(true)} variant="outline" size="sm" className="border-gray-200">
              <Bell className="w-4 h-4 mr-2" />
              Notifier
            </Button>
            <Button onClick={() => { fetchStats(); fetchAnalytics(); }} variant="outline" size="sm" className="border-gray-200">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-1" />Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-1" />Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Gift className="w-4 h-4 mr-1" />Affiliés
              {affiliates.length > 0 && <Badge className="ml-1 bg-green-500 text-white text-xs">{affiliates.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Star className="w-4 h-4 mr-1" />Avis
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <MessageCircle className="w-4 h-4 mr-1" />Messages
              {reports.filter(r => r.status === "open").length > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs">{reports.filter(r => r.status === "open").length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Wallet className="w-4 h-4 mr-1" />Paiements
              {stats?.pending?.withdrawals > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs">{stats.pending.withdrawals}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Briefcase className="w-4 h-4 mr-1" />Projets
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-1" />Activité
            </TabsTrigger>
          </TabsList>

          {/* ==================== OVERVIEW TAB ==================== */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Utilisateurs", value: analytics?.users?.total || 0, sub: `+${analytics?.users?.this_week || 0} cette semaine`, icon: Users, color: "bg-blue-100 text-blue-600", trend: "up" },
                { label: "Créateurs", value: analytics?.users?.creators || 0, sub: `${analytics?.users?.premium_creators || 0} Premium`, icon: Crown, color: "bg-pink-100 text-pink-600" },
                { label: "Entreprises", value: analytics?.users?.businesses || 0, sub: `${analytics?.users?.subscribed_businesses || 0} Abonnées`, icon: Building2, color: "bg-purple-100 text-purple-600" },
                { label: "Projets", value: analytics?.projects?.total || 0, sub: `${analytics?.projects?.open || 0} Ouverts`, icon: Briefcase, color: "bg-yellow-100 text-yellow-600" },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-500 text-xs">{stat.label}</p>
                          <div className="flex items-center gap-2">
                            <p className="font-heading text-xl font-bold text-gray-900">{stat.value}</p>
                            {stat.trend === "up" && <ArrowUpRight className="w-4 h-4 text-green-500" />}
                          </div>
                          <p className="text-xs text-gray-400">{stat.sub}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Affiliate & Revenue Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="w-5 h-5 text-green-500" />
                    Programme Affiliation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{analytics?.affiliates?.total_affiliates || 0}</p>
                      <p className="text-xs text-gray-500">Affiliés</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{analytics?.affiliates?.total_referrals || 0}</p>
                      <p className="text-xs text-gray-500">Parrainages</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <p className="text-2xl font-bold text-green-600">{analytics?.affiliates?.paying_referrals || 0}</p>
                      <p className="text-xs text-gray-500">Convertis payants</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <p className="text-2xl font-bold text-blue-600">{analytics?.affiliates?.conversion_rate || 0}%</p>
                      <p className="text-xs text-gray-500">Taux conversion</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Commissions en attente</span>
                      <span className="font-bold text-green-600">{(analytics?.affiliates?.pending_commissions || 0).toFixed(2)}€</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Avis & Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{analytics?.reviews?.total || 0}</p>
                      <p className="text-xs text-gray-500">Avis total</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{analytics?.engagement?.conversations || 0}</p>
                      <p className="text-xs text-gray-500">Conversations</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <p className="text-2xl font-bold text-green-600">{analytics?.reviews?.verified || 0}</p>
                      <p className="text-xs text-gray-500">Avis vérifiés</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <p className="text-2xl font-bold text-blue-600">{analytics?.reviews?.external || 0}</p>
                      <p className="text-xs text-gray-500">Avis externes</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Messages échangés</span>
                      <span className="font-bold text-blue-600">{analytics?.engagement?.messages || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-orange-500" />
                    Retraits en attente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.pending?.withdrawals > 0 ? (
                    <>
                      <p className="text-3xl font-bold text-orange-600 mb-2">{stats.pending.withdrawal_amount?.toFixed(2)}€</p>
                      <p className="text-sm text-gray-500 mb-3">{stats.pending.withdrawals} demande(s)</p>
                      <Button onClick={() => setActiveTab("withdrawals")} className="w-full bg-orange-500 hover:bg-orange-600">
                        Traiter <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Aucun retrait en attente ✓</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flag className="w-5 h-5 text-red-500" />
                    Signalements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reports.filter(r => r.status === "open").length > 0 ? (
                    <>
                      <p className="text-3xl font-bold text-red-600 mb-2">{reports.filter(r => r.status === "open").length}</p>
                      <p className="text-sm text-gray-500 mb-3">signalement(s) à traiter</p>
                      <Button onClick={() => setActiveTab("messages")} className="w-full bg-red-500 hover:bg-red-600">
                        Voir <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Aucun signalement ✓</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Euro className="w-5 h-5 text-green-500" />
                    Revenus plateforme
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600 mb-2">{(stats?.revenue?.total_fees_collected || 0).toFixed(2)}€</p>
                  <p className="text-sm text-gray-500 mb-3">Commissions (15%)</p>
                  <Button onClick={() => setEarningDialogOpen(true)} variant="outline" className="w-full border-gray-200">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Ajouter paiement
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== AFFILIATES TAB ==================== */}
          <TabsContent value="affiliates" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gift className="w-5 h-5 text-green-500" />
                    Tous les affiliés ({affiliates.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {affiliates.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {affiliates.map((aff) => (
                      <div key={aff.user_id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                              <span className="font-bold text-green-600">{aff.user?.name?.[0] || "?"}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{aff.user?.name || "Utilisateur"}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <code className="bg-gray-100 px-2 py-0.5 rounded">{aff.code}</code>
                                <span>•</span>
                                <span>{aff.user?.email}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="font-bold text-gray-900">{aff.stats.total_clicks}</p>
                              <p className="text-xs text-gray-500">Clics</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-gray-900">{aff.stats.total_signups}</p>
                              <p className="text-xs text-gray-500">Inscrits</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-green-600">{aff.stats.paying_users}</p>
                              <p className="text-xs text-gray-500">Payants</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-blue-600">{(aff.stats.pending_earnings || 0).toFixed(2)}€</p>
                              <p className="text-xs text-gray-500">En attente</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleViewAffiliate(aff)} className="border-gray-200">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun affilié</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== REVIEWS TAB ==================== */}
          <TabsContent value="reviews" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={reviewSourceFilter} onValueChange={setReviewSourceFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="verified">Vérifiés</SelectItem>
                  <SelectItem value="external">Externes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {reviews.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {reviews.map((review) => (
                      <div key={review.review_id} className={`p-4 hover:bg-gray-50 ${review.is_hidden ? "opacity-50" : ""} ${review.is_flagged ? "bg-red-50" : ""}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`w-4 h-4 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                                ))}
                              </div>
                              <Badge className={`text-xs ${review.source === "verified" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                {review.source === "verified" ? "Vérifié" : "Externe"}
                              </Badge>
                              {review.is_hidden && <Badge className="bg-gray-100 text-gray-600 text-xs">Masqué</Badge>}
                              {review.is_flagged && <Badge className="bg-red-100 text-red-600 text-xs">Signalé</Badge>}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{review.comment || "Pas de commentaire"}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Par: <strong>{review.reviewer_name || review.reviewer?.name || "Anonyme"}</strong></span>
                              <span>Pour: <strong>{review.reviewee?.name || "Utilisateur"}</strong></span>
                              <span>{formatDate(review.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModerateReview(review.review_id, review.is_hidden ? "unhide" : "hide")}
                              className="border-gray-200"
                            >
                              {review.is_hidden ? <Eye className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModerateReview(review.review_id, "delete")}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun avis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== MESSAGES TAB ==================== */}
          <TabsContent value="messages" className="space-y-6">
            {/* Reports */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flag className="w-5 h-5 text-red-500" />
                    Signalements
                  </CardTitle>
                  <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Ouverts</SelectItem>
                      <SelectItem value="closed">Traités</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {reports.length > 0 ? (
                  <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {reports.map((report) => (
                      <div key={report.report_id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Badge className={`text-xs mb-1 ${report.reason === "harassment" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {report.reason}
                            </Badge>
                            <p className="text-sm text-gray-700">{report.note || "Pas de détail"}</p>
                            <p className="text-xs text-gray-500 mt-1">Par: {report.reporter?.name || "?"} • {formatDateTime(report.created_at)}</p>
                          </div>
                          {report.status === "open" && (
                            <Button size="sm" onClick={() => handleCloseReport(report.report_id)} className="bg-green-500 hover:bg-green-600">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8"><CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">Aucun signalement</p></div>
                )}
              </CardContent>
            </Card>

            {/* Conversations */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  Conversations ({conversations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {conversations.length > 0 ? (
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {conversations.map((conv) => (
                      <div key={conv.conversation_id} className={`p-4 hover:bg-gray-50 ${conv.status === "blocked" ? "bg-red-50" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-medium text-purple-600">{conv.company?.name?.[0] || "E"}</div>
                              <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-medium text-blue-600">{conv.creator?.name?.[0] || "C"}</div>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{conv.company?.name || "Entreprise"} ↔ {conv.creator?.name || "Créateur"}</p>
                              <p className="text-xs text-gray-500">{conv.message_count || 0} messages {conv.status === "blocked" && <Badge className="bg-red-100 text-red-600 text-xs ml-1">Bloquée</Badge>}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewConversation(conv)} className="border-gray-200"><Eye className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleBlockConversation(conv.conversation_id, conv.status !== "blocked")} className={conv.status === "blocked" ? "border-green-200 text-green-600" : "border-red-200 text-red-600"}>
                              {conv.status === "blocked" ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8"><MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">Aucune conversation</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== USERS TAB ==================== */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="creator">Créateurs</SelectItem>
                  <SelectItem value="business">Entreprises</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Statut" /></SelectTrigger>
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
                          {u.picture ? <img src={getImageUrl(u.picture)} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 text-sm">{u.name || "Sans nom"}</p>
                            {u.is_banned && <Badge className="bg-red-500 text-white text-xs"><Ban className="w-3 h-3 mr-1" />Banni</Badge>}
                            {u.is_premium && <Badge className="bg-gradient-to-r from-primary to-pink-500 text-white text-xs"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
                            <Badge className={`text-xs ${u.user_type === "creator" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{u.user_type === "creator" ? "Créateur" : "Entreprise"}</Badge>
                          </div>
                          <p className="text-gray-500 text-xs">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedUser(u); setUserDialogOpen(true); }} className="border-gray-200"><Eye className="w-4 h-4" /></Button>
                          {u.user_type === "creator" && <Button size="sm" variant={u.is_premium ? "default" : "outline"} onClick={() => handleTogglePremium(u.user_id, !u.is_premium)} className={u.is_premium ? "bg-primary" : "border-gray-200"}><Crown className="w-4 h-4" /></Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Aucun utilisateur</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== WITHDRAWALS TAB ==================== */}
          <TabsContent value="withdrawals" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={withdrawalStatusFilter} onValueChange={setWithdrawalStatusFilter}>
                <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Statut" /></SelectTrigger>
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
                          {w.user?.picture ? <img src={getImageUrl(w.user.picture)} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{w.user?.name || "Utilisateur"}</p>
                          <p className="text-gray-500 text-xs">IBAN: ****{w.bank_iban?.slice(-4) || "N/A"} • {formatDate(w.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900">{w.amount?.toFixed(2)}€</p>
                          <Badge className={`text-xs ${w.status === "pending" ? "bg-yellow-100 text-yellow-700" : w.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {w.status === "pending" ? "En attente" : w.status === "completed" ? "Approuvé" : "Refusé"}
                          </Badge>
                        </div>
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleProcessWithdrawal(w.transaction_id, "approve")} className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleProcessWithdrawal(w.transaction_id, "reject")} className="border-red-200 text-red-600"><XCircle className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12"><Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Aucun retrait</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== PROJECTS TAB ==================== */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Statut" /></SelectTrigger>
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
                          {p.banner_url ? <img src={getImageUrl(p.banner_url)} alt="" className="w-full h-full object-cover" /> : <Briefcase className="w-6 h-6 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{p.title}</p>
                          <p className="text-gray-500 text-xs">{p.company_name || "Entreprise"} • {p.budget} • {p.applications?.length || 0} candidatures</p>
                        </div>
                        <Select value={p.status} onValueChange={(value) => handleUpdateProjectStatus(p.project_id, value)}>
                          <SelectTrigger className={`w-32 text-xs ${p.status === "open" ? "bg-green-50 border-green-200" : p.status === "in_progress" ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
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
                  <div className="text-center py-12"><Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Aucun projet</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ACTIVITY TAB ==================== */}
          <TabsContent value="activity" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Activité récente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activityLogs.length > 0 ? (
                  <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {activityLogs.map((log, i) => {
                      const IconComp = getActivityIcon(log.type);
                      return (
                        <div key={i} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            log.type === "user_signup" ? "bg-blue-100 text-blue-600" :
                            log.type === "project_created" ? "bg-yellow-100 text-yellow-600" :
                            log.type === "review_posted" ? "bg-pink-100 text-pink-600" :
                            log.type === "referral" ? "bg-green-100 text-green-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{log.title}</p>
                            <p className="text-xs text-gray-500">{log.subtitle}</p>
                          </div>
                          <p className="text-xs text-gray-400">{formatDateTime(log.timestamp)}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12"><Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Aucune activité récente</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== DIALOGS ==================== */}
      
      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {selectedUser?.picture ? <img src={getImageUrl(selectedUser.picture)} alt="" className="w-full h-full object-cover" /> : <Users className="w-6 h-6 text-gray-400" />}
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
                <div><p className="text-gray-500 text-xs">Type</p><p className="font-medium">{selectedUser.user_type === "creator" ? "Créateur" : "Entreprise"}</p></div>
                <div><p className="text-gray-500 text-xs">Premium</p><p className="font-medium">{selectedUser.is_premium ? "Oui" : "Non"}</p></div>
                <div><p className="text-gray-500 text-xs">Vérification</p><p className="font-medium">{selectedUser.verification_status || "Non vérifié"}</p></div>
                <div><p className="text-gray-500 text-xs">Inscription</p><p className="font-medium">{formatDate(selectedUser.created_at)}</p></div>
              </div>
              <div className="pt-2 space-y-2">
                <p className="text-gray-500 text-xs">Actions de vérification</p>
                <div className="flex flex-wrap gap-2">
                  {["unverified", "verified", "portfolio_validated", "incubator_certified", "suspended"].map((status) => (
                    <Button key={status} size="sm" variant={selectedUser.verification_status === status ? "default" : "outline"} onClick={() => handleVerifyUser(selectedUser.user_id, status)} className={selectedUser.verification_status === status ? "bg-primary" : "border-gray-200"}>
                      {status === "unverified" && "Non vérifié"}{status === "verified" && "Vérifié"}{status === "portfolio_validated" && "Portfolio"}{status === "incubator_certified" && "Certifié"}{status === "suspended" && "Suspendu"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <p className="text-gray-500 text-xs">Actions dangereuses</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setBanDialogOpen(true)} className={`flex-1 ${selectedUser.is_banned ? "border-green-200 text-green-600" : "border-orange-200 text-orange-600"}`}>
                    <Ban className="w-4 h-4 mr-2" />{selectedUser.is_banned ? "Débannir" : "Bannir"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteDialogOpen(true)} className="flex-1 border-red-200 text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />Supprimer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Ban className="w-5 h-5 text-orange-500" />{selectedUser?.is_banned ? "Débannir ?" : "Bannir ?"}</AlertDialogTitle>
            <AlertDialogDescription>{selectedUser?.is_banned ? "L'utilisateur pourra se reconnecter." : "L'utilisateur ne pourra plus se connecter."}</AlertDialogDescription>
          </AlertDialogHeader>
          {!selectedUser?.is_banned && <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Raison du ban..." className="bg-gray-50" />}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanUser} className={selectedUser?.is_banned ? "bg-green-500" : "bg-orange-500"}>{selectedUser?.is_banned ? "Débannir" : "Bannir"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" />Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est <strong>irréversible</strong>. Toutes les données seront supprimées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-500"><Trash2 className="w-4 h-4 mr-2" />Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Earning Dialog */}
      <Dialog open={earningDialogOpen} onOpenChange={setEarningDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-md mx-4">
          <DialogHeader><DialogTitle>Ajouter un paiement créateur</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-sm text-gray-500">ID créateur</label><Input value={earningForm.creator_id} onChange={(e) => setEarningForm({ ...earningForm, creator_id: e.target.value })} placeholder="user_xxxx" className="bg-gray-50" /></div>
            <div><label className="text-sm text-gray-500">Montant (€)</label><Input type="number" value={earningForm.amount} onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })} placeholder="100" className="bg-gray-50" /></div>
            <div><label className="text-sm text-gray-500">Description</label><Input value={earningForm.description} onChange={(e) => setEarningForm({ ...earningForm, description: e.target.value })} placeholder="Paiement mission" className="bg-gray-50" /></div>
            <Button onClick={handleAddEarning} className="w-full bg-primary"><CreditCard className="w-4 h-4 mr-2" />Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-md mx-4">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-blue-500" />Envoyer une notification</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-500">Destinataires</label>
              <Select value={notificationForm.target} onValueChange={(v) => setNotificationForm({ ...notificationForm, target: v })}>
                <SelectTrigger className="bg-gray-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  <SelectItem value="creators">Créateurs uniquement</SelectItem>
                  <SelectItem value="businesses">Entreprises uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-500">Type</label>
              <Select value={notificationForm.type} onValueChange={(v) => setNotificationForm({ ...notificationForm, type: v })}>
                <SelectTrigger className="bg-gray-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="promo">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm text-gray-500">Titre</label><Input value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} placeholder="Titre de la notification" className="bg-gray-50" /></div>
            <div><label className="text-sm text-gray-500">Message</label><Textarea value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} placeholder="Votre message..." className="bg-gray-50" rows={3} /></div>
            <Button onClick={handleSendNotification} className="w-full bg-blue-500 hover:bg-blue-600"><Send className="w-4 h-4 mr-2" />Envoyer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversation Dialog */}
      <Dialog open={conversationDialogOpen} onOpenChange={setConversationDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-500" />Conversation</span>
              {selectedConversation && (
                <Button size="sm" variant="outline" onClick={() => handleBlockConversation(selectedConversation.conversation_id, selectedConversation.status !== "blocked")} className={selectedConversation.status === "blocked" ? "border-green-200 text-green-600" : "border-red-200 text-red-600"}>
                  {selectedConversation.status === "blocked" ? <><Unlock className="w-4 h-4 mr-1" />Débloquer</> : <><Lock className="w-4 h-4 mr-1" />Bloquer</>}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {conversationMessages.map((msg) => (
              <div key={msg.message_id} className={`p-3 rounded-lg ${msg.deleted_at ? "bg-red-50 opacity-50" : "bg-gray-50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.sender?.name || "?"}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(msg.created_at)}</span>
                      {msg.deleted_at && <Badge className="bg-red-100 text-red-600 text-xs">Supprimé</Badge>}
                    </div>
                    <p className="text-sm text-gray-700">{msg.text || "📎 Fichier"}</p>
                  </div>
                  {!msg.deleted_at && <Button size="sm" variant="ghost" onClick={() => handleDeleteMessage(msg.message_id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Affiliate Dialog */}
      <Dialog open={affiliateDialogOpen} onOpenChange={setAffiliateDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gift className="w-5 h-5 text-green-500" />Détails affilié: {selectedAffiliate?.user?.name}</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-gray-50 rounded-xl"><p className="text-xl font-bold">{selectedAffiliate.stats.total_clicks}</p><p className="text-xs text-gray-500">Clics</p></div>
                <div className="text-center p-3 bg-gray-50 rounded-xl"><p className="text-xl font-bold">{selectedAffiliate.stats.total_signups}</p><p className="text-xs text-gray-500">Inscrits</p></div>
                <div className="text-center p-3 bg-green-50 rounded-xl"><p className="text-xl font-bold text-green-600">{selectedAffiliate.stats.paying_users}</p><p className="text-xs text-gray-500">Payants</p></div>
                <div className="text-center p-3 bg-blue-50 rounded-xl"><p className="text-xl font-bold text-blue-600">{(selectedAffiliate.stats.pending_earnings || 0).toFixed(2)}€</p><p className="text-xs text-gray-500">En attente</p></div>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-2">Utilisateurs parrainés ({affiliateReferrals.length})</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {affiliateReferrals.map((ref) => (
                    <div key={ref.referral_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{ref.referred_user?.name || ref.referred_name || "?"}</p>
                        <p className="text-xs text-gray-500">{ref.referred_user?.email || ref.referred_email}</p>
                      </div>
                      <Badge className={`text-xs ${ref.status === "paying" ? "bg-green-100 text-green-700" : ref.status === "trial" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {ref.status === "paying" ? "Payant" : ref.status === "trial" ? "Essai" : ref.status === "cancelled" ? "Résilié" : "Gratuit"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminPage;
