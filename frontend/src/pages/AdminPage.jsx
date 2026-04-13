import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, Briefcase, CreditCard, Shield, CheckCircle, XCircle, Clock,
  Euro, TrendingUp, Crown, Building2, UserCheck, UserX, Eye, ChevronRight,
  AlertCircle, Search, Filter, RefreshCw, Mail, Calendar, MapPin, Wallet,
  Ban, Trash2, AlertTriangle, MessageCircle, Flag, Lock, Unlock, Gift,
  Star, Bell, Activity, BarChart3, Send, UserPlus, DollarSign, Percent,
  ExternalLink, Copy, ArrowUpRight, ArrowDownRight, X, Plus, Link, Hash, Settings, Inbox
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
  const [demandes, setDemandes] = useState([]);
  const [agencyCampaigns, setAgencyCampaigns] = useState([]);
  const [agencyClients, setAgencyClients] = useState([]);
  const [agencyInvitations, setAgencyInvitations] = useState([]);
  const [campaignForm, setCampaignForm] = useState({ client_id: "", title: "", description: "", budget: "", creator_name: "", notes: "", status: "brief_recu" });
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const AGENCY_STATUSES = [
    { key: "brief_recu", label: "Brief reçu" },
    { key: "recherche_createur", label: "Recherche créateur" },
    { key: "createur_trouve", label: "Créateur trouvé" },
    { key: "en_production", label: "Contenu en production" },
    { key: "livraison", label: "Livraison" },
    { key: "termine", label: "Terminé" },
  ];

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
    // Register admin user_id so collaboration requests route to this inbox
    fetch(`${API_URL}/api/admin/register-id`, { method: "POST", credentials: "include" })
      .then(r => r.ok && console.log("Admin ID registered"))
      .catch(() => {});
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
    if (activeTab === "demandes") fetchDemandes();
    if (activeTab === "agence") { fetchAgencyCampaigns(); fetchAgencyClients(); fetchAgencyInvitations(); }
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

  const fetchDemandes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/collaboration-requests`, { credentials: "include" });
      if (response.ok) setDemandes(await response.json());
    } catch (error) { console.error("Error:", error); }
  };

  const fetchAgencyCampaigns = async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/campaigns`, { credentials: "include" });
      if (r.ok) setAgencyCampaigns(await r.json());
    } catch (e) { console.error(e); }
  };

  const fetchAgencyClients = async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/clients`, { credentials: "include" });
      if (r.ok) setAgencyClients(await r.json());
    } catch (e) { console.error(e); }
  };

  const fetchAgencyInvitations = async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/invitations`, { credentials: "include" });
      if (r.ok) setAgencyInvitations(await r.json());
    } catch (e) { console.error(e); }
  };

  const generateInvitationLink = async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/invitations`, { method: "POST", credentials: "include" });
      if (r.ok) {
        const { token } = await r.json();
        const link = `${window.location.origin}/register?invite=${token}`;
        await navigator.clipboard.writeText(link);
        toast.success("Lien copié dans le presse-papier !");
        fetchAgencyInvitations();
      }
    } catch (e) { toast.error("Erreur"); }
  };

  const saveCampaign = async () => {
    if (!campaignForm.client_id || !campaignForm.title) { toast.error("Client et titre requis"); return; }
    try {
      const url = editingCampaign
        ? `${API_URL}/api/admin/agency/campaigns/${editingCampaign.campaign_id}`
        : `${API_URL}/api/admin/agency/campaigns`;
      const method = editingCampaign ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(campaignForm) });
      if (r.ok) {
        toast.success(editingCampaign ? "Campagne mise à jour" : "Campagne créée");
        setShowCampaignForm(false);
        setEditingCampaign(null);
        setCampaignForm({ client_id: "", title: "", description: "", budget: "", creator_name: "", notes: "", status: "brief_recu" });
        fetchAgencyCampaigns();
      } else { toast.error("Erreur lors de l'enregistrement"); }
    } catch (e) { toast.error("Erreur"); }
  };

  const deleteCampaign = async (id) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${id}`, { method: "DELETE", credentials: "include" });
      if (r.ok) { toast.success("Campagne supprimée"); fetchAgencyCampaigns(); }
      else { toast.error("Erreur lors de la suppression"); }
    } catch (e) { toast.error("Erreur"); }
  };

  const updateCampaignStatus = async (id, status) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status })
      });
      if (r.ok) fetchAgencyCampaigns();
      else toast.error("Erreur lors de la mise à jour");
    } catch (e) { toast.error("Erreur"); }
  };

  const updateDemandeStatus = async (requestId, status) => {
    try {
      await fetch(`${API_URL}/api/admin/collaboration-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status })
      });
      fetchDemandes();
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
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Administration</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Centre de contrôle plateforme</p>
            </div>
          </div>
          
          {/* Global Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Rechercher un utilisateur (nom, email, ID)..."
              className="pl-10 bg-gray-50 border-gray-200"
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
                {searchResults.map((u) => (
                  <div
                    key={u.user_id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => {
                      fetchFullUserData(u.user_id);
                      setShowSearchResults(false);
                      setGlobalSearch("");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {u.picture ? <img src={getImageUrl(u.picture)} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">{u.name || "Sans nom"}</p>
                          <Badge className={`text-xs ${u.user_type === "creator" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {u.user_type === "creator" ? "Créateur" : "Entreprise"}
                          </Badge>
                          {u.is_premium && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{u.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{u.user_id}</code>
                          {u.wallet && <span className="text-xs text-green-600 font-medium">{u.wallet.balance?.toFixed(2)}€</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setCreditDialogOpen(true)} className="bg-green-500 hover:bg-green-600" size="sm">
              <DollarSign className="w-4 h-4 mr-1" />
              Créditer
            </Button>
            <Button onClick={() => setNotificationDialogOpen(true)} variant="outline" size="sm" className="border-gray-200">
              <Bell className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Notifier</span>
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
            <TabsTrigger value="demandes" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Inbox className="w-4 h-4 mr-1" />Demandes
              {demandes.filter(d => d.status === "pending").length > 0 && (
                <Badge className="ml-1 bg-primary text-white text-xs">{demandes.filter(d => d.status === "pending").length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="agence" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-1" />Agence
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

          {/* ==================== DEMANDES TAB ==================== */}
          <TabsContent value="demandes" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-900">Demandes de collaboration ({demandes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {demandes.length === 0 ? (
                  <div className="text-center py-12"><Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Aucune demande pour l'instant</p></div>
                ) : (
                  <div className="space-y-3">
                    {demandes.map((d) => (
                      <div key={d.request_id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{d.business_name || "Entreprise"}</p>
                            <p className="text-xs text-gray-500">{d.business_email}</p>
                          </div>
                          <Badge className={`text-xs flex-shrink-0 ${
                            d.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            d.status === "accepted" ? "bg-green-100 text-green-700" :
                            d.status === "declined" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {d.status === "pending" ? "En attente" : d.status === "accepted" ? "Acceptée" : d.status === "declined" ? "Refusée" : d.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>→</span>
                          <span className="font-medium">{d.creator_name}</span>
                          {d.budget_range && <Badge variant="outline" className="text-xs">{d.budget_range}</Badge>}
                          {d.content_types?.[0] && <Badge variant="outline" className="text-xs">{d.content_types[0]}</Badge>}
                        </div>
                        {d.brief && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 line-clamp-3">{d.brief}</p>}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          {d.deadline && <span>• Deadline: {d.deadline}</span>}
                        </div>
                        {d.status === "pending" && (
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs" onClick={() => updateDemandeStatus(d.request_id, "accepted")}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Lien fait
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => updateDemandeStatus(d.request_id, "declined")}>
                              <XCircle className="w-3 h-3 mr-1" /> Refuser
                            </Button>
                            <a href={`mailto:${d.business_email}`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline" className="text-xs">
                                <Mail className="w-3 h-3 mr-1" /> Répondre
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== AGENCE TAB ==================== */}
          <TabsContent value="agence" className="space-y-6">

            {/* Invitation link */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Inviter un client agence</CardTitle>
                  <Button size="sm" onClick={generateInvitationLink} className="bg-primary text-white">
                    <Plus className="w-4 h-4 mr-1" />Générer un lien
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">Génère un lien unique à envoyer à ton client. Il s'inscrit et son compte est automatiquement tagué "client agence".</p>
                {agencyInvitations.length > 0 && (
                  <div className="space-y-2">
                    {agencyInvitations.slice(0, 5).map((inv) => (
                      <div key={inv.token} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                        <code className="flex-1 text-xs text-gray-600 truncate">{window.location.origin}/register?invite={inv.token}</code>
                        <Badge className={inv.used ? "bg-gray-200 text-gray-600" : "bg-green-100 text-green-700"}>{inv.used ? "Utilisé" : "Actif"}</Badge>
                        {!inv.used && (
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register?invite=${inv.token}`); toast.success("Copié !"); }}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Campaigns */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Campagnes clients ({agencyCampaigns.length})</CardTitle>
                  <Button size="sm" onClick={() => { setEditingCampaign(null); setCampaignForm({ client_id: "", title: "", description: "", budget: "", creator_name: "", notes: "", status: "brief_recu" }); setShowCampaignForm(true); }} className="bg-primary text-white">
                    <Plus className="w-4 h-4 mr-1" />Nouvelle campagne
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showCampaignForm && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-200">
                    <p className="font-semibold text-sm">{editingCampaign ? "Modifier la campagne" : "Nouvelle campagne"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Client *</label>
                        <Select value={campaignForm.client_id} onValueChange={(v) => setCampaignForm(f => ({ ...f, client_id: v }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                          <SelectContent>
                            {agencyClients.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.name || c.email}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Titre *</label>
                        <Input className="h-9 text-sm" placeholder="Nom de la campagne" value={campaignForm.title} onChange={e => setCampaignForm(f => ({ ...f, title: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Budget</label>
                        <Input className="h-9 text-sm" placeholder="ex: 1500€" value={campaignForm.budget} onChange={e => setCampaignForm(f => ({ ...f, budget: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Créateur assigné</label>
                        <Input className="h-9 text-sm" placeholder="Nom du créateur" value={campaignForm.creator_name} onChange={e => setCampaignForm(f => ({ ...f, creator_name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Statut</label>
                        <Select value={campaignForm.status} onValueChange={(v) => setCampaignForm(f => ({ ...f, status: v }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {AGENCY_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Description</label>
                        <Input className="h-9 text-sm" placeholder="Objectif, contexte..." value={campaignForm.description} onChange={e => setCampaignForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Notes internes (invisibles pour le client)</label>
                      <Textarea className="text-sm min-h-[60px]" placeholder="Notes..." value={campaignForm.notes} onChange={e => setCampaignForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveCampaign} className="bg-primary text-white">Enregistrer</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowCampaignForm(false)}>Annuler</Button>
                    </div>
                  </div>
                )}
                {agencyCampaigns.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Aucune campagne pour l'instant</p>
                ) : (
                  <div className="space-y-3">
                    {agencyCampaigns.map((c) => (
                      <div key={c.campaign_id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-sm">{c.title}</p>
                            <p className="text-xs text-gray-500">{c.client_name} · {c.client_email}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className="text-xs bg-primary/10 text-primary">{AGENCY_STATUSES.find(s => s.key === c.status)?.label || c.status}</Badge>
                            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setEditingCampaign(c); setCampaignForm({ client_id: c.client_id, title: c.title, description: c.description || "", budget: c.budget || "", creator_name: c.creator_name || "", notes: c.notes || "", status: c.status }); setShowCampaignForm(true); }}>
                              <Settings className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-red-500 hover:text-red-700" onClick={() => deleteCampaign(c.campaign_id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {c.description && <p className="text-xs text-gray-600 mb-2">{c.description}</p>}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          {c.budget && <span>💰 {c.budget}</span>}
                          {c.creator_name && <span>🎬 {c.creator_name}</span>}
                        </div>
                        {/* Status stepper */}
                        <div className="mt-3 flex items-center gap-1 overflow-x-auto">
                          {AGENCY_STATUSES.map((s, i) => {
                            const currentIdx = AGENCY_STATUSES.findIndex(x => x.key === c.status);
                            const done = i <= currentIdx;
                            return (
                              <button key={s.key} onClick={() => updateCampaignStatus(c.campaign_id, s.key)}
                                className={`flex-shrink-0 px-2 py-1 rounded text-xs transition-all ${done ? "bg-primary text-white" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}>
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agency clients list */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Clients agence ({agencyClients.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {agencyClients.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun client agence pour l'instant. Génère un lien d'invitation ci-dessus.</p>
                ) : (
                  <div className="space-y-2">
                    {agencyClients.map(c => (
                      <div key={c.user_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name || "—"}</p>
                          <p className="text-xs text-gray-500 truncate">{c.email}</p>
                        </div>
                        <Badge className="bg-primary/10 text-primary text-xs">Client agence</Badge>
                      </div>
                    ))}
                  </div>
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
              {selectedUser.user_type === "creator" && (
                <div className="pt-2 space-y-2">
                  <p className="text-gray-500 text-xs">Visibilité Find Creator</p>
                  <Button size="sm" variant="outline" className="w-full border-primary text-primary hover:bg-primary/5" onClick={async () => {
                    const r = await fetch(`${API_URL}/api/admin/users/${selectedUser.user_id}/ensure-profile`, { method: "POST", credentials: "include" });
                    const d = await r.json();
                    toast.success(d.created ? "Profil créateur créé — visible dans Find Creator" : "Profil déjà existant");
                  }}>
                    <UserCheck className="w-4 h-4 mr-2" />Forcer la création du profil créateur
                  </Button>
                </div>
              )}
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

      {/* Notification Dialog - Advanced */}
      <Dialog open={notificationDialogOpen} onOpenChange={(open) => { setNotificationDialogOpen(open); if (!open) setNotificationPreview(null); }}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              Centre de notifications
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Selected Users */}
            {notificationForm.selectedUsers.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Utilisateurs sélectionnés ({notificationForm.selectedUsers.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {notificationForm.selectedUsers.map((u) => (
                    <Badge key={u.user_id} className="bg-white text-gray-700 pr-1 flex items-center gap-1">
                      {u.name || u.email}
                      <button onClick={() => removeUserFromNotification(u.user_id)} className="hover:bg-gray-100 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search & Add Users */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Ajouter des utilisateurs spécifiques</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={notificationForm.userSearch}
                  onChange={async (e) => {
                    setNotificationForm({ ...notificationForm, userSearch: e.target.value });
                    if (e.target.value.length >= 2) {
                      const res = await fetch(`${API_URL}/api/admin/users/search?q=${encodeURIComponent(e.target.value)}`, { credentials: "include" });
                      if (res.ok) setSearchResults(await res.json());
                    }
                  }}
                  placeholder="Rechercher par nom, email ou ID..."
                  className="pl-10 bg-gray-50"
                />
              </div>
              {notificationForm.userSearch.length >= 2 && searchResults.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {searchResults.filter(u => !notificationForm.selectedUsers.find(s => s.user_id === u.user_id)).slice(0, 5).map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => { addUserToNotification(u); setSearchResults([]); }}
                      className="w-full p-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4 text-green-500" />
                      <span className="font-medium">{u.name || "Sans nom"}</span>
                      <span className="text-gray-500">{u.email}</span>
                      <Badge className="text-xs ml-auto">{u.user_type === "creator" ? "Créateur" : "Entreprise"}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Ou cibler un groupe</p>
              
              {/* Target */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Destinataires</label>
                  <Select 
                    value={notificationForm.target} 
                    onValueChange={(v) => setNotificationForm({ ...notificationForm, target: v })}
                    disabled={notificationForm.selectedUsers.length > 0}
                  >
                    <SelectTrigger className="bg-gray-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les utilisateurs</SelectItem>
                      <SelectItem value="creators">Créateurs uniquement</SelectItem>
                      <SelectItem value="businesses">Entreprises uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Type notification</label>
                  <Select value={notificationForm.type} onValueChange={(v) => setNotificationForm({ ...notificationForm, type: v })}>
                    <SelectTrigger className="bg-gray-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">ℹ️ Information</SelectItem>
                      <SelectItem value="warning">⚠️ Avertissement</SelectItem>
                      <SelectItem value="promo">🎉 Promotion</SelectItem>
                      <SelectItem value="update">🚀 Mise à jour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox 
                    checked={notificationForm.filters.is_premium || false}
                    onCheckedChange={(c) => setNotificationForm({ ...notificationForm, filters: { ...notificationForm.filters, is_premium: c }})}
                    disabled={notificationForm.selectedUsers.length > 0}
                  />
                  <Crown className="w-4 h-4 text-yellow-500" />
                  Premium uniquement
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox 
                    checked={notificationForm.filters.is_subscribed || false}
                    onCheckedChange={(c) => setNotificationForm({ ...notificationForm, filters: { ...notificationForm.filters, is_subscribed: c }})}
                    disabled={notificationForm.selectedUsers.length > 0}
                  />
                  <CreditCard className="w-4 h-4 text-green-500" />
                  Abonnés
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox 
                    checked={notificationForm.filters.has_affiliate || false}
                    onCheckedChange={(c) => setNotificationForm({ ...notificationForm, filters: { ...notificationForm.filters, has_affiliate: c }})}
                    disabled={notificationForm.selectedUsers.length > 0}
                  />
                  <Gift className="w-4 h-4 text-pink-500" />
                  Affiliés
                </label>
              </div>

              {/* Preview button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={previewNotificationRecipients}
                className="mb-3"
                disabled={notificationForm.selectedUsers.length > 0}
              >
                <Eye className="w-4 h-4 mr-2" />
                Prévisualiser les destinataires
              </Button>

              {notificationPreview && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="font-medium text-gray-900">{notificationPreview.count} destinataire(s)</p>
                  {notificationPreview.sample?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ex: {notificationPreview.sample.map(u => u.name || u.email).join(", ")}...
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Titre *</label>
                <Input 
                  value={notificationForm.title} 
                  onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} 
                  placeholder="Titre de la notification" 
                  className="bg-gray-50 mt-1" 
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Message *</label>
                <Textarea 
                  value={notificationForm.message} 
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} 
                  placeholder="Votre message..." 
                  className="bg-gray-50 mt-1" 
                  rows={3} 
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Lien (optionnel)</label>
                <Input 
                  value={notificationForm.link} 
                  onChange={(e) => setNotificationForm({ ...notificationForm, link: e.target.value })} 
                  placeholder="/dashboard ou https://..." 
                  className="bg-gray-50 mt-1" 
                />
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-4">
            <Button onClick={handleSendAdvancedNotification} className="w-full bg-blue-500 hover:bg-blue-600">
              <Send className="w-4 h-4 mr-2" />
              Envoyer à {notificationForm.selectedUsers.length > 0 ? notificationForm.selectedUsers.length : notificationPreview?.count || "?"} utilisateur(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Créditer un utilisateur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Search */}
            <div>
              <label className="text-sm font-medium text-gray-700">Utilisateur (créateur)</label>
              {creditForm.user ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mt-1">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {creditForm.user.picture ? (
                      <img src={getImageUrl(creditForm.user.picture)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{creditForm.user.name}</p>
                    <p className="text-xs text-gray-500">{creditForm.user.email}</p>
                    <code className="text-xs text-gray-400">{creditForm.user.user_id}</code>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setCreditForm({ ...creditForm, user: null })}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un créateur..."
                    className="pl-10 bg-gray-50"
                    onChange={async (e) => {
                      if (e.target.value.length >= 2) {
                        const res = await fetch(`${API_URL}/api/admin/users/search?q=${encodeURIComponent(e.target.value)}&user_type=creator`, { credentials: "include" });
                        if (res.ok) setSearchResults(await res.json());
                      }
                    }}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {searchResults.filter(u => u.user_type === "creator").map((u) => (
                        <button
                          key={u.user_id}
                          onClick={() => { setCreditForm({ ...creditForm, user: u }); setSearchResults([]); }}
                          className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            {u.name?.[0] || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                          {u.wallet && (
                            <span className="ml-auto text-green-600 font-medium text-sm">{u.wallet.balance?.toFixed(2)}€</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-gray-700">Montant (€)</label>
              <Input
                type="number"
                value={creditForm.amount}
                onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                placeholder="100"
                className="bg-gray-50 mt-1"
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium text-gray-700">Type de crédit</label>
              <Select value={creditForm.credit_type} onValueChange={(v) => setCreditForm({ ...creditForm, credit_type: v })}>
                <SelectTrigger className="bg-gray-50 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">💰 Paiement mission</SelectItem>
                  <SelectItem value="bonus">🎁 Bonus</SelectItem>
                  <SelectItem value="refund">↩️ Remboursement</SelectItem>
                  <SelectItem value="correction">🔧 Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700">Description (optionnel)</label>
              <Input
                value={creditForm.description}
                onChange={(e) => setCreditForm({ ...creditForm, description: e.target.value })}
                placeholder="Mission XYZ terminée"
                className="bg-gray-50 mt-1"
              />
            </div>

            <Button 
              onClick={handleQuickCredit} 
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={!creditForm.user || !creditForm.amount}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Créditer {creditForm.amount ? `${creditForm.amount}€` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full User Dialog */}
      <Dialog open={userFullDialogOpen} onOpenChange={setUserFullDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {fullUserData && (
                <>
                  <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    {fullUserData.picture ? (
                      <img src={getImageUrl(fullUserData.picture)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-7 h-7 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-gray-900 text-lg">{fullUserData.name || "Utilisateur"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={fullUserData.user_type === "creator" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}>
                        {fullUserData.user_type === "creator" ? "Créateur" : "Entreprise"}
                      </Badge>
                      {fullUserData.is_premium && <Badge className="bg-yellow-100 text-yellow-700"><Crown className="w-3 h-3 mr-1" />Premium</Badge>}
                      {fullUserData.is_banned && <Badge className="bg-red-100 text-red-700"><Ban className="w-3 h-3 mr-1" />Banni</Badge>}
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {fullUserData && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-sm">{fullUserData.email}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">ID</p>
                  <div className="flex items-center gap-2">
                    <code className="font-medium text-sm">{fullUserData.user_id}</code>
                    <button onClick={() => copyUserId(fullUserData.user_id)} className="text-gray-400 hover:text-gray-600">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Inscription</p>
                  <p className="font-medium text-sm">{formatDate(fullUserData.created_at)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Vérification</p>
                  <p className="font-medium text-sm">{fullUserData.verification_status || "Non vérifié"}</p>
                </div>
              </div>

              {/* Wallet for creators */}
              {fullUserData.user_type === "creator" && fullUserData.wallet && (
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-green-900 flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Cagnotte
                    </h3>
                    <Button 
                      size="sm" 
                      onClick={() => { setCreditForm({ ...creditForm, user: fullUserData }); setCreditDialogOpen(true); setUserFullDialogOpen(false); }}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Créditer
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{fullUserData.wallet.balance?.toFixed(2) || 0}€</p>
                      <p className="text-xs text-gray-500">Disponible</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{fullUserData.wallet.pending_balance?.toFixed(2) || 0}€</p>
                      <p className="text-xs text-gray-500">En attente</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">{fullUserData.wallet.total_earned?.toFixed(2) || 0}€</p>
                      <p className="text-xs text-gray-500">Total gagné</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Affiliate info */}
              {fullUserData.affiliate_code && (
                <div className="bg-pink-50 rounded-xl p-4">
                  <h3 className="font-medium text-pink-900 flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5" />
                    Programme Affiliation
                  </h3>
                  <div className="flex items-center gap-3">
                    <code className="bg-white px-3 py-1 rounded-lg text-sm">{fullUserData.affiliate_code}</code>
                    <span className="text-sm text-gray-600">{fullUserData.referrals_count || 0} parrainage(s)</span>
                  </div>
                </div>
              )}

              {/* Referred by */}
              {fullUserData.referred_by && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-medium text-blue-900 flex items-center gap-2 mb-2">
                    <Link className="w-5 h-5" />
                    Parrainé par
                  </h3>
                  <p className="text-sm">{fullUserData.referred_by.name} ({fullUserData.referred_by.email})</p>
                </div>
              )}

              {/* Profile details */}
              {fullUserData.profile && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Profil</h3>
                  <div className="text-sm space-y-1">
                    {fullUserData.profile.company_name && <p><strong>Entreprise:</strong> {fullUserData.profile.company_name}</p>}
                    {fullUserData.profile.bio && <p><strong>Bio:</strong> {fullUserData.profile.bio}</p>}
                    {fullUserData.profile.location && <p><strong>Lieu:</strong> {fullUserData.profile.location}</p>}
                    {fullUserData.profile.website && <p><strong>Site:</strong> {fullUserData.profile.website}</p>}
                    {fullUserData.profile.specialties?.length > 0 && (
                      <p><strong>Spécialités:</strong> {fullUserData.profile.specialties.join(", ")}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{fullUserData.reviews_count || 0}</p>
                  <p className="text-xs text-gray-500">Avis reçus</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{fullUserData.conversations_count || 0}</p>
                  <p className="text-xs text-gray-500">Conversations</p>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 pt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => { 
                    setSelectedUser(fullUserData); 
                    setUserDialogOpen(true); 
                    setUserFullDialogOpen(false); 
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Gérer
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setNotificationForm({ ...notificationForm, selectedUsers: [fullUserData] });
                    setNotificationDialogOpen(true);
                    setUserFullDialogOpen(false);
                  }}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notifier
                </Button>
              </div>
            </div>
          )}
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
