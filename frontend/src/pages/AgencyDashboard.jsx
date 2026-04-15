import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Search, Settings, Trash2, Upload, Film, X,
  ChevronRight, Copy, Link2, FileText, CheckCircle, AlertCircle,
  Clock, TrendingUp, Video, Building2, RefreshCw
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AGENCY_STATUSES = [
  { key: "brief_recu",  label: "Brief reçu",   color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400" },
  { key: "casting",     label: "Casting",       color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  { key: "tournage",    label: "Tournage",      color: "bg-yellow-100 text-yellow-700",dot: "bg-yellow-500" },
  { key: "montage",     label: "Montage",       color: "bg-purple-100 text-purple-700",dot: "bg-purple-500" },
  { key: "livraison",   label: "Livraison",     color: "bg-orange-100 text-orange-700",dot: "bg-orange-500" },
  { key: "termine",     label: "Terminé",       color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
];

const AGENCY_FORMULAS = [
  { key: "12_videos", label: "12 vidéos / mois", videos: 12 },
  { key: "20_videos", label: "20 vidéos / mois", videos: 20 },
];

const statusInfo = (key) => AGENCY_STATUSES.find(s => s.key === key) || AGENCY_STATUSES[0];
const formulaInfo = (key) => AGENCY_FORMULAS.find(f => f.key === key);

const EMPTY_FORM = {
  client_id: "", title: "", description: "", budget: "", formula: "",
  creator_id: "", creator_name: "", notes: "", client_notes: "",
  status: "brief_recu", order: 1, video_delivery_link: "", delivery_notes: ""
};

export default function AgencyDashboard({ user }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [creators, setCreators] = useState([]);
  const [stats, setStats] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Campaign modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newScript, setNewScript] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);

  // Video upload
  const videoInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [campsRes, clientsRes, creatorsRes, statsRes, invsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/agency/campaigns`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/agency/clients`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/creators`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/agency/stats`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/agency/invitations`, { credentials: "include" }),
      ]);
      if (campsRes.ok) setCampaigns(await campsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (creatorsRes.ok) { const d = await creatorsRes.json(); setCreators(d.creators || d || []); }
      if (statsRes.ok) setStats(await statsRes.json());
      if (invsRes.ok) setInvitations(await invsRes.json());
    } catch (e) { toast.error("Erreur chargement"); }
    setLoading(false);
  };

  // Group campaigns by client
  const clientsWithCampaigns = clients.map(client => ({
    ...client,
    campaigns: campaigns.filter(c => c.client_id === client.user_id)
  })).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.campaigns.some(camp => camp.title?.toLowerCase().includes(q))
    );
  }).filter(c => {
    if (filterStatus === "all") return true;
    return c.campaigns.some(camp => camp.status === filterStatus);
  });

  // Clients with no campaigns yet
  const orphanClients = clientsWithCampaigns.filter(c => c.campaigns.length === 0);

  // Open modal for new campaign
  const openNew = (clientId = "") => {
    setEditingCampaign(null);
    setForm({ ...EMPTY_FORM, client_id: clientId });
    setNewScript({ title: "", content: "" });
    setModalOpen(true);
  };

  // Open modal to edit
  const openEdit = (camp) => {
    setEditingCampaign(camp);
    setForm({
      client_id: camp.client_id, title: camp.title, description: camp.description || "",
      budget: camp.budget || "", formula: camp.formula || "", creator_id: camp.creator_id || "",
      creator_name: camp.creator_name || "", notes: camp.notes || "",
      client_notes: camp.client_notes || "", status: camp.status,
      order: camp.order || 1, video_delivery_link: camp.video_delivery_link || "",
      delivery_notes: camp.delivery_notes || ""
    });
    setNewScript({ title: "", content: "" });
    setModalOpen(true);
  };

  const saveCampaign = async () => {
    if (!form.client_id || !form.title) { toast.error("Client et titre requis"); return; }
    setSaving(true);
    try {
      const url = editingCampaign
        ? `${API_URL}/api/admin/agency/campaigns/${editingCampaign.campaign_id}`
        : `${API_URL}/api/admin/agency/campaigns`;
      const method = editingCampaign ? "PATCH" : "POST";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(form)
      });
      if (r.ok) {
        toast.success(editingCampaign ? "Campagne mise à jour" : "Campagne créée");
        setModalOpen(false);
        fetchAll();
      } else toast.error("Erreur");
    } catch (e) { toast.error("Erreur réseau"); }
    setSaving(false);
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm("Supprimer cette campagne ?")) return;
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { toast.success("Supprimée"); fetchAll(); }
  };

  const quickStatus = async (campaignId, newStatus) => {
    await fetch(`${API_URL}/api/admin/agency/campaigns/${campaignId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ status: newStatus })
    });
    setCampaigns(prev => prev.map(c => c.campaign_id === campaignId ? { ...c, status: newStatus } : c));
  };

  const addScript = async () => {
    if (!newScript.title.trim() || !editingCampaign) return;
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${editingCampaign.campaign_id}/scripts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(newScript)
    });
    if (r.ok) {
      const added = await r.json();
      setEditingCampaign(prev => ({ ...prev, scripts: [...(prev.scripts || []), added] }));
      setNewScript({ title: "", content: "" });
      toast.success("Script ajouté");
    }
  };

  const deleteScript = async (scriptId) => {
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${editingCampaign.campaign_id}/scripts/${scriptId}`, {
      method: "DELETE", credentials: "include"
    });
    if (r.ok) {
      setEditingCampaign(prev => ({ ...prev, scripts: prev.scripts.filter(s => s.script_id !== scriptId) }));
      toast.success("Script supprimé");
    }
  };

  const handleVideoUpload = (file) => {
    if (!editingCampaign) return;
    setUploading(true);
    setUploadProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        setEditingCampaign(prev => ({ ...prev, delivered_videos: [...(prev.delivered_videos || []), data] }));
        toast.success("Vidéo uploadée");
        fetchAll();
      } else toast.error("Erreur upload");
    };
    xhr.onerror = () => { setUploading(false); toast.error("Erreur réseau"); };
    const fd = new FormData();
    fd.append("file", file);
    xhr.open("POST", `${API_URL}/api/admin/agency/campaigns/${editingCampaign.campaign_id}/upload-video`);
    xhr.withCredentials = true;
    xhr.send(fd);
  };

  const deleteVideo = async (videoId) => {
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${editingCampaign.campaign_id}/delivered-videos/${videoId}`, {
      method: "DELETE", credentials: "include"
    });
    if (r.ok) {
      setEditingCampaign(prev => ({ ...prev, delivered_videos: prev.delivered_videos.filter(v => v.video_id !== videoId) }));
      toast.success("Vidéo supprimée");
    }
  };

  const generateInvite = async () => {
    const r = await fetch(`${API_URL}/api/admin/agency/invitations`, { method: "POST", credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      const link = `${window.location.origin}/register?invite=${data.token}`;
      navigator.clipboard.writeText(link);
      toast.success("Lien copié dans le presse-papiers !");
      fetchAll();
    }
  };

  if (loading) return (
    <AppLayout user={user}>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout user={user}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agence Studiosavora</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gestion des clients et productions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateInvite} className="border-gray-200 text-sm">
              <Link2 className="w-4 h-4 mr-2" /> Inviter un client
            </Button>
            <Button onClick={() => openNew()} className="bg-[#FF2E63] hover:bg-[#e0254f] text-white text-sm">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle campagne
            </Button>
          </div>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Clients actifs", value: stats.clients_actifs, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Campagnes en cours", value: stats.campagnes_actives, icon: TrendingUp, color: "text-[#FF2E63]", bg: "bg-pink-50" },
              { label: "Scripts à valider", value: stats.scripts_en_attente, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Vidéos livrées (mois)", value: stats.videos_livrees_mois, icon: Video, color: "text-green-600", bg: "bg-green-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 leading-tight">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search + filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9 h-9 border-gray-200 bg-white"
              placeholder="Rechercher un client ou une campagne..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-44 border-gray-200 bg-white text-sm">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {AGENCY_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Client blocks */}
        {clientsWithCampaigns.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun client agence pour l'instant.</p>
            <Button variant="outline" className="mt-4 text-sm border-gray-200" onClick={generateInvite}>
              <Link2 className="w-4 h-4 mr-2" /> Générer un lien d'invitation
            </Button>
          </div>
        )}

        {clientsWithCampaigns.map(client => (
          <Card key={client.user_id} className="border-0 shadow-sm overflow-hidden">
            {/* Client header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FF2E63]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#FF2E63] font-bold text-sm">
                    {(client.name || client.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{client.name || "—"}</p>
                  <p className="text-xs text-gray-500">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{client.campaigns.length} campagne{client.campaigns.length !== 1 ? "s" : ""}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#FF2E63] hover:bg-pink-50" onClick={() => openNew(client.user_id)}>
                  <Plus className="w-3 h-3 mr-1" /> Campagne
                </Button>
              </div>
            </div>

            {/* Campaigns table */}
            {client.campaigns.length === 0 ? (
              <div className="px-5 py-5 text-sm text-gray-400 text-center">
                Aucune campagne — <button className="text-[#FF2E63] hover:underline" onClick={() => openNew(client.user_id)}>en créer une</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.campaigns.map(camp => {
                  const st = statusInfo(camp.status);
                  const formula = formulaInfo(camp.formula);
                  const pct = formula ? Math.round(((camp.videos_delivered || 0) / formula.videos) * 100) : null;
                  const pendingScripts = (camp.scripts || []).filter(s => s.status === "modifications_demandees").length;

                  return (
                    <div key={camp.campaign_id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <p className="font-semibold text-sm text-gray-900">{camp.title}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                            {pendingScripts > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                <AlertCircle className="w-3 h-3" /> {pendingScripts} modif demandée{pendingScripts > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Meta row */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                            {camp.creator_name && <span>🎬 {camp.creator_name}</span>}
                            {camp.budget && <span>💰 {camp.budget}</span>}
                            {formula && <span>📦 {formula.label}</span>}
                            <span>Mois {camp.order || 1}</span>
                            {(camp.delivered_videos || []).length > 0 && (
                              <span className="text-green-600">✓ {(camp.delivered_videos || []).length} vidéo{(camp.delivered_videos || []).length > 1 ? "s" : ""} uploadée{(camp.delivered_videos || []).length > 1 ? "s" : ""}</span>
                            )}
                          </div>

                          {/* Progress bar */}
                          {formula && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[180px]">
                                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{camp.videos_delivered || 0}/{formula.videos} vidéos</span>
                            </div>
                          )}

                          {/* Status stepper */}
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {AGENCY_STATUSES.map((s, i) => {
                              const currentIdx = AGENCY_STATUSES.findIndex(x => x.key === camp.status);
                              const done = i <= currentIdx;
                              const active = s.key === camp.status;
                              return (
                                <button
                                  key={s.key}
                                  onClick={() => quickStatus(camp.campaign_id, s.key)}
                                  className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium transition-all
                                    ${active ? "bg-[#FF2E63] text-white" : done ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                                >
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" onClick={() => openEdit(camp)}>
                            <Settings className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-300 hover:text-red-500" onClick={() => deleteCampaign(camp.campaign_id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}

        {/* Invitations actives */}
        {invitations.filter(i => !i.used).length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Liens d'invitation actifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invitations.filter(i => !i.used).map(inv => (
                <div key={inv.token} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <code className="flex-1 text-xs text-gray-500 truncate">{window.location.origin}/register?invite={inv.token}</code>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/register?invite=${inv.token}`);
                    toast.success("Copié !");
                  }}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ======================== CAMPAIGN MODAL ======================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white border-0 shadow-2xl max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingCampaign ? `Modifier — ${editingCampaign.title}` : "Nouvelle campagne"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Base fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-gray-500 mb-1 block">Client *</label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.name || c.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-gray-500 mb-1 block">Titre *</label>
                <Input className="h-9 text-sm" placeholder="Nom de la campagne" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Budget</label>
                <Input className="h-9 text-sm" placeholder="ex: 1500€" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Formule</label>
                <Select value={form.formula} onValueChange={v => setForm(f => ({ ...f, formula: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Formule" /></SelectTrigger>
                  <SelectContent>
                    {AGENCY_FORMULAS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Créateur attitré</label>
                <Select value={form.creator_id || "__none__"} onValueChange={v => {
                  const id = v === "__none__" ? "" : v;
                  const creator = creators.find(c => c.user_id === id);
                  setForm(f => ({ ...f, creator_id: id, creator_name: creator?.name || "" }));
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {creators.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.name || c.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Statut</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGENCY_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Mois</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map(m => (
                    <button key={m} type="button" onClick={() => setForm(f => ({ ...f, order: m }))}
                      className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${form.order === m ? "bg-[#FF2E63] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <Input className="h-9 text-sm" placeholder="Objectif, contexte..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Notes internes (non visibles par le client)</label>
                <Textarea className="text-sm min-h-[60px] resize-none" placeholder="Notes internes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Message pour le client</label>
                <Textarea className="text-sm min-h-[60px] resize-none" placeholder="Affiché dans le dashboard client..." value={form.client_notes} onChange={e => setForm(f => ({ ...f, client_notes: e.target.value }))} />
              </div>
            </div>

            {/* Scripts — only when editing */}
            {editingCampaign && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Scripts ({(editingCampaign.scripts || []).length})
                </p>
                {(editingCampaign.scripts || []).length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun script</p>
                ) : (
                  <div className="space-y-2">
                    {(editingCampaign.scripts || []).map(s => (
                      <div key={s.script_id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800">{s.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.content}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {s.status === "valide" && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Validé</span>}
                            {s.status === "en_attente" && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">En attente</span>}
                            {s.status === "modifications_demandees" && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Modifs</span>}
                            <button onClick={() => deleteScript(s.script_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {s.status === "modifications_demandees" && s.client_comment && (
                          <div className="mt-2 bg-orange-50 border border-orange-100 rounded p-2">
                            <p className="text-xs text-orange-700 italic">"{s.client_comment}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <Input className="h-8 text-xs" placeholder="Titre du script" value={newScript.title} onChange={e => setNewScript(s => ({ ...s, title: e.target.value }))} />
                  <Textarea className="text-xs min-h-[60px] resize-none" placeholder="Contenu du script..." value={newScript.content} onChange={e => setNewScript(s => ({ ...s, content: e.target.value }))} />
                  <Button size="sm" variant="outline" className="h-7 text-xs border-gray-200" onClick={addScript}>
                    <Plus className="w-3 h-3 mr-1" /> Ajouter script
                  </Button>
                </div>
              </div>
            )}

            {/* Video delivery — only when editing */}
            {editingCampaign && (
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Video className="w-3.5 h-3.5" /> Vidéos livrées ({(editingCampaign.delivered_videos || []).length})
                </p>
                {(editingCampaign.delivered_videos || []).length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {(editingCampaign.delivered_videos || []).map(v => (
                      <div key={v.video_id} className="relative group rounded-lg overflow-hidden bg-gray-900 aspect-[9/16]">
                        {v.thumbnail
                          ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Film className="w-5 h-5 text-gray-400" /></div>
                        }
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
                        <button onClick={() => deleteVideo(v.video_id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" />
                        </button>
                        <p className="absolute bottom-0 left-0 right-0 p-1 text-[9px] text-white bg-black/60 truncate">{v.filename}</p>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ""; }} />
                {uploading ? (
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF2E63] rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 text-center">{uploadProgress}% uploadé...</p>
                  </div>
                ) : (
                  <button onClick={() => videoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-xs text-gray-400 hover:border-[#FF2E63] hover:text-[#FF2E63] transition-colors flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" /> Uploader une vidéo
                  </button>
                )}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Note de livraison</label>
                  <Textarea className="text-sm min-h-[50px] resize-none" placeholder="Instructions pour le client..." value={form.delivery_notes} onChange={e => setForm(f => ({ ...f, delivery_notes: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={saveCampaign} disabled={saving} className="flex-1 bg-[#FF2E63] hover:bg-[#e0254f] text-white">
                {saving ? "Enregistrement..." : editingCampaign ? "Mettre à jour" : "Créer la campagne"}
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)} className="border-gray-200">Annuler</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
