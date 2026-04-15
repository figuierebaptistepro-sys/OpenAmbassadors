import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Trash2, Plus, X, Upload, Film,
  CheckCircle, AlertCircle, Clock, FileText, Video,
  Info, ChevronRight, Download, Eye, CalendarClock
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function getDeadlineInfo(deadline) {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(deadline);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { label: `En retard (${Math.abs(diff)}j)`, color: "bg-red-100 text-red-700 border-red-200" };
  if (diff === 0) return { label: "Deadline aujourd'hui !",          color: "bg-red-100 text-red-700 border-red-200" };
  if (diff <= 3) return { label: `Deadline dans ${diff}j`,           color: "bg-orange-100 text-orange-700 border-orange-200" };
  if (diff <= 7) return { label: `Deadline dans ${diff}j`,           color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  return { label: `Deadline : ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`, color: "bg-gray-100 text-gray-500 border-gray-200" };
}

const STATUSES = [
  { key: "brief_recu",  label: "Brief reçu",  color: "bg-gray-100 text-gray-600",     ring: "ring-gray-300"    },
  { key: "casting",     label: "Casting",      color: "bg-blue-100 text-blue-700",     ring: "ring-blue-300"    },
  { key: "tournage",    label: "Tournage",     color: "bg-amber-100 text-amber-700",   ring: "ring-amber-300"   },
  { key: "montage",     label: "Montage",      color: "bg-purple-100 text-purple-700", ring: "ring-purple-300"  },
  { key: "livraison",   label: "Livraison",    color: "bg-orange-100 text-orange-700", ring: "ring-orange-300"  },
  { key: "termine",     label: "Terminé",      color: "bg-green-100 text-green-700",   ring: "ring-green-300"   },
];

const FORMULAS = [
  { key: "12_videos", label: "12 vidéos / mois", videos: 12 },
  { key: "20_videos", label: "20 vidéos / mois", videos: 20 },
];

const TABS = [
  { key: "infos",    label: "Infos",    icon: Info },
  { key: "scripts",  label: "Scripts",  icon: FileText },
  { key: "videos",   label: "Vidéos",   icon: Video },
];

const EMPTY_FORM = {
  client_id: "", title: "", description: "", budget: "", formula: "",
  creator_id: "", creator_name: "", notes: "", client_notes: "",
  status: "brief_recu", order: 1, delivery_notes: "", deadline: "", total_months: 1
};

export default function AgencyCampaignPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [tab, setTab] = useState("infos");
  const [campaign, setCampaign] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [clients, setClients] = useState([]);
  const [creators, setCreators] = useState([]);
  const [packageMonths, setPackageMonths] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  // Script state
  const [newScript, setNewScript] = useState({ title: "", content: "" });
  const [addingScript, setAddingScript] = useState(false);

  // Video state
  const videoRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVideo, setPreviewVideo] = useState(null);

  const fetchClients = useCallback(async () => {
    const r = await fetch(`${API_URL}/api/admin/agency/clients`, { credentials: "include" });
    if (r.ok) setClients(await r.json());
  }, []);

  const fetchCreators = useCallback(async () => {
    const r = await fetch(`${API_URL}/api/admin/users?user_type=creator&limit=200`, { credentials: "include" });
    if (r.ok) { const d = await r.json(); setCreators(d.users || d || []); }
  }, []);

  const fetchCampaign = useCallback(async () => {
    if (isNew) return;
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${id}`, { credentials: "include" });
    if (!r.ok) { navigate("/agency"); return; }
    const found = await r.json();
    setCampaign(found);
    // Load package siblings if multi-month
    if (found.package_id) {
      const allR = await fetch(`${API_URL}/api/admin/agency/campaigns`, { credentials: "include" });
      if (allR.ok) {
        const all = await allR.json();
        setPackageMonths(all.filter(c => c.package_id === found.package_id).sort((a, b) => a.order - b.order));
      }
    } else {
      setPackageMonths([]);
    }
    setForm({
      client_id: found.client_id, title: found.title, description: found.description || "",
      budget: found.budget || "", formula: found.formula || "", creator_id: found.creator_id || "",
      creator_name: found.creator_name || "", notes: found.notes || "",
      client_notes: found.client_notes || "", status: found.status,
      order: found.order || 1, delivery_notes: found.delivery_notes || "",
      deadline: found.deadline || "", total_months: found.total_months || 1
    });
    setLoading(false);
  }, [id, isNew, navigate]);

  useEffect(() => {
    fetchClients();
    fetchCreators();
    if (isNew) setLoading(false);
    else fetchCampaign();
  }, [fetchClients, fetchCreators, fetchCampaign, isNew]);

  const save = async () => {
    if (!form.client_id || !form.title.trim()) { toast.error("Client et titre requis"); return; }
    setSaving(true);
    try {
      const url = isNew
        ? `${API_URL}/api/admin/agency/campaigns`
        : `${API_URL}/api/admin/agency/campaigns/${id}`;
      const r = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form)
      });
      if (r.ok) {
        toast.success(isNew ? "Campagne créée" : "Modifications enregistrées");
        if (isNew) { const d = await r.json(); navigate(`/agency/campaign/${d.campaign_id}`, { replace: true }); }
        else fetchCampaign();
      } else toast.error("Erreur");
    } catch { toast.error("Erreur réseau"); }
    setSaving(false);
  };

  const deleteCampaign = async () => {
    if (!window.confirm("Supprimer cette campagne définitivement ?")) return;
    await fetch(`${API_URL}/api/admin/agency/campaigns/${id}`, { method: "DELETE", credentials: "include" });
    toast.success("Campagne supprimée");
    navigate("/agency");
  };

  // ── Scripts ──
  const addScript = async () => {
    if (!newScript.title.trim()) { toast.error("Titre requis"); return; }
    setAddingScript(true);
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${id}/scripts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(newScript)
    });
    if (r.ok) {
      const added = await r.json();
      setCampaign(prev => ({ ...prev, scripts: [...(prev.scripts || []), added] }));
      setNewScript({ title: "", content: "" });
      toast.success("Script ajouté");
    }
    setAddingScript(false);
  };

  const deleteScript = async (scriptId) => {
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${id}/scripts/${scriptId}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setCampaign(prev => ({ ...prev, scripts: prev.scripts.filter(s => s.script_id !== scriptId) }));
      toast.success("Script supprimé");
    }
  };

  // ── Videos ──
  const handleUpload = (file) => {
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
        setCampaign(prev => ({ ...prev, delivered_videos: [...(prev.delivered_videos || []), data] }));
        toast.success("Vidéo uploadée");
      } else toast.error("Erreur upload");
    };
    xhr.onerror = () => { setUploading(false); toast.error("Erreur réseau"); };
    const fd = new FormData();
    fd.append("file", file);
    xhr.open("POST", `${API_URL}/api/admin/agency/campaigns/${id}/upload-video`);
    xhr.withCredentials = true;
    xhr.send(fd);
  };

  const deleteVideo = async (videoId) => {
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${id}/delivered-videos/${videoId}`, { method: "DELETE", credentials: "include" });
    if (r.ok) {
      setCampaign(prev => ({ ...prev, delivered_videos: prev.delivered_videos.filter(v => v.video_id !== videoId) }));
      toast.success("Vidéo supprimée");
    }
  };

  const formula = FORMULAS.find(f => f.key === form.formula);
  const currentStatusInfo = STATUSES.find(s => s.key === form.status) || STATUSES[0];
  const pendingScripts = (campaign?.scripts || []).filter(s => s.status === "modifications_demandees").length;
  const deadlineInfo = getDeadlineInfo(form.deadline);

  if (loading) return (
    <AppLayout user={user}>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#FF2E63] border-t-transparent rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout user={user}>
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Header ── */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => navigate("/agency")} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">{campaign?.client_name || "Nouveau client"}</p>
            <h1 className="text-xl font-bold text-gray-900 truncate">{form.title || "Nouvelle campagne"}</h1>
            {!isNew && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${currentStatusInfo.color}`}>{currentStatusInfo.label}</span>
                {pendingScripts > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {pendingScripts} modif{pendingScripts > 1 ? "s" : ""} demandée{pendingScripts > 1 ? "s" : ""}
                  </span>
                )}
                {formula && (
                  <span className="text-xs text-gray-400">{campaign?.videos_delivered || 0}/{formula.videos} vidéos</span>
                )}
                {deadlineInfo && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 border ${deadlineInfo.color}`}>
                    <CalendarClock className="w-3 h-3" /> {deadlineInfo.label}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isNew && (
              <Button size="sm" variant="ghost" onClick={deleteCampaign} className="h-8 text-red-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={saving} className="h-8 bg-[#FF2E63] hover:bg-[#e0254f] text-white text-xs px-4">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Enregistrement..." : isNew ? "Créer" : "Enregistrer"}
            </Button>
          </div>
        </div>

        {/* ── Non-commence banner ── */}
        {!isNew && form.status === "non_commence" && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Ce mois n'a pas encore démarré</p>
              <p className="text-xs text-gray-400">Il démarrera automatiquement ou vous pouvez le lancer manuellement.</p>
            </div>
            <Button size="sm" className="bg-[#FF2E63] hover:bg-[#e0254f] text-white text-xs h-8 flex-shrink-0"
              onClick={async () => {
                const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${id}/activate`, { method: "POST", credentials: "include" });
                if (r.ok) { toast.success("Mois démarré !"); fetchCampaign(); }
              }}>
              Lancer ce mois →
            </Button>
          </div>
        )}

        {/* ── Status stepper ── */}
        {!isNew && form.status !== "non_commence" && (
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {STATUSES.map((s, i) => {
              const currentIdx = STATUSES.findIndex(x => x.key === form.status);
              const done = i < currentIdx;
              const active = s.key === form.status;
              return (
                <button key={s.key} onClick={() => setForm(f => ({ ...f, status: s.key }))}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${active ? "bg-[#FF2E63] text-white shadow-sm" : done ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {s.label}
                </button>
              );
            })}
            {form.total_months > 1 && form.status === "termine" && packageMonths.some(m => m.status === "non_commence") && (
              <button
                onClick={async () => {
                  const next = packageMonths.find(m => m.status === "non_commence");
                  if (next) { await fetch(`${API_URL}/api/admin/agency/campaigns/${next.campaign_id}/activate`, { method: "POST", credentials: "include" }); navigate(`/agency/campaign/${next.campaign_id}`); }
                }}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FF2E63]/10 text-[#FF2E63] hover:bg-[#FF2E63]/20 transition-all ml-2"
              >
                → Démarrer mois {(packageMonths.find(m => m.status === "non_commence") || {}).order}
              </button>
            )}
          </div>
        )}

        {/* ── Package month navigator ── */}
        {!isNew && packageMonths.length > 1 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-gray-400 flex-shrink-0">Engagement {form.total_months} mois :</span>
            {packageMonths.map(m => {
              const isCurrent = m.campaign_id === id;
              const isNotStarted = m.status === "non_commence";
              const st = STATUSES.find(s => s.key === m.status);
              return (
                <button
                  key={m.campaign_id}
                  onClick={() => !isCurrent && navigate(`/agency/campaign/${m.campaign_id}`)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                    ${isCurrent ? "bg-[#FF2E63] text-white border-[#FF2E63]" : isNotStarted ? "bg-gray-50 text-gray-400 border-gray-200 cursor-pointer hover:border-gray-300" : "bg-white text-gray-600 border-gray-200 cursor-pointer hover:border-gray-300"}`}
                >
                  Mois {m.order}
                  {isNotStarted ? <span className="opacity-60">· À venir</span> : <span className={`w-1.5 h-1.5 rounded-full ${st?.ring?.replace("ring-","bg-") || "bg-gray-400"}`} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Tabs ── */}
        {!isNew && (
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {TABS.map(t => {
              const Icon = t.icon;
              const hasBadge = t.key === "scripts" && pendingScripts > 0;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
                    ${tab === t.key ? "border-[#FF2E63] text-[#FF2E63]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {hasBadge && <span className="w-4 h-4 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center">{pendingScripts}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* ══════ TAB: INFOS ══════ */}
        {(isNew || tab === "infos") && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Client */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Client *</label>
                <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger className="h-10 border-gray-200"><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.name || c.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Titre */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Titre de la campagne *</label>
                <Input className="h-10 border-gray-200" placeholder="ex: Campagne Printemps Lululemon" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Budget</label>
                <Input className="h-10 border-gray-200" placeholder="ex: 2 500€" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
              </div>

              {/* Formule */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Formule</label>
                <Select value={form.formula} onValueChange={v => setForm(f => ({ ...f, formula: v }))}>
                  <SelectTrigger className="h-10 border-gray-200"><SelectValue placeholder="Choisir une formule" /></SelectTrigger>
                  <SelectContent>
                    {FORMULAS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Créateur */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Créateur attitré</label>
                <Select value={form.creator_id || "__none__"} onValueChange={v => {
                  const cId = v === "__none__" ? "" : v;
                  const creator = creators.find(c => c.user_id === cId);
                  setForm(f => ({ ...f, creator_id: cId, creator_name: creator?.name || "" }));
                }}>
                  <SelectTrigger className="h-10 border-gray-200"><SelectValue placeholder="Aucun créateur" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {creators.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.name || c.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Durée d'engagement (new) / Numéro de mois (existing) */}
              {isNew ? (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Durée d'engagement</label>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map(m => (
                      <button key={m} type="button" onClick={() => setForm(f => ({ ...f, total_months: m }))}
                        className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors
                          ${form.total_months === m ? "bg-[#FF2E63] text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                        {m} mois
                      </button>
                    ))}
                  </div>
                  {form.total_months > 1 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      {form.total_months} mois seront créés. Mois 1 démarre directement, les suivants sont en "À venir".
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Mois {form.order} / {form.total_months}
                    {form.total_months > 1 && <span className="text-gray-400 font-normal"> — engagement {form.total_months} mois</span>}
                  </label>
                  <div className="h-10 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                    Mois {form.order} sur {form.total_months}
                  </div>
                </div>
              )}

              {/* Deadline */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Date de livraison <span className="text-gray-400 font-normal">(deadline)</span>
                </label>
                <Input
                  type="date"
                  className="h-10 border-gray-200"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                />
              </div>

              {/* Statut (new only) */}
              {isNew && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Statut initial</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="h-10 border-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Description / Objectif</label>
              <Textarea className="border-gray-200 resize-none min-h-[80px]" placeholder="Objectif de la campagne, contexte produit..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Notes internes */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Notes internes <span className="text-gray-400 font-normal">(invisibles pour le client)</span>
              </label>
              <Textarea className="border-gray-200 resize-none min-h-[80px] bg-yellow-50 border-yellow-200" placeholder="Notes de production, contacts, détails logistiques..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Message client */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                Message pour le client <span className="text-gray-400 font-normal">(affiché dans son dashboard)</span>
              </label>
              <Textarea className="border-gray-200 resize-none min-h-[80px]" placeholder="Message visible par le client dans son espace..." value={form.client_notes} onChange={e => setForm(f => ({ ...f, client_notes: e.target.value }))} />
            </div>

            {/* Save button */}
            <div className="pt-2">
              <Button onClick={save} disabled={saving} className="bg-[#FF2E63] hover:bg-[#e0254f] text-white px-8">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Enregistrement..." : isNew ? "Créer la campagne" : "Enregistrer les modifications"}
              </Button>
            </div>
          </div>
        )}

        {/* ══════ TAB: SCRIPTS ══════ */}
        {!isNew && tab === "scripts" && (
          <div className="space-y-4">
            {/* Existing scripts */}
            {(campaign?.scripts || []).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun script pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(campaign?.scripts || []).map(s => (
                  <div key={s.script_id} className={`rounded-xl border p-4 ${s.status === "modifications_demandees" ? "border-orange-200 bg-orange-50" : s.status === "valide" ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm text-gray-900">{s.title}</p>
                          {s.status === "valide" && (
                            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Validé
                            </span>
                          )}
                          {s.status === "en_attente" && (
                            <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> En attente
                            </span>
                          )}
                          {s.status === "modifications_demandees" && (
                            <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" /> Modifs demandées
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{s.content}</p>
                      </div>
                      <button onClick={() => deleteScript(s.script_id)} className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors mt-0.5">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {s.status === "modifications_demandees" && s.client_comment && (
                      <div className="mt-3 bg-orange-100 border border-orange-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-orange-800 mb-1">Commentaire du client :</p>
                        <p className="text-sm text-orange-700 italic">"{s.client_comment}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add script */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-600">Ajouter un script</p>
              <Input className="h-10 border-gray-200" placeholder="Titre du script (ex: Script UGC Tenue été)" value={newScript.title} onChange={e => setNewScript(s => ({ ...s, title: e.target.value }))} />
              <Textarea className="border-gray-200 resize-none min-h-[120px]" placeholder="Contenu du script — scène par scène, texte, indications visuelles..." value={newScript.content} onChange={e => setNewScript(s => ({ ...s, content: e.target.value }))} />
              <Button onClick={addScript} disabled={addingScript || !newScript.title.trim()} className="bg-gray-900 hover:bg-gray-800 text-white text-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                {addingScript ? "Ajout..." : "Ajouter ce script"}
              </Button>
            </div>
          </div>
        )}

        {/* ══════ TAB: VIDÉOS ══════ */}
        {!isNew && tab === "videos" && (
          <div className="space-y-5">
            {/* Progress */}
            {formula && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Progression — {formula.label}</p>
                  <span className={`text-sm font-bold ${(campaign?.videos_delivered || 0) >= formula.videos ? "text-green-600" : "text-gray-600"}`}>
                    {campaign?.videos_delivered || 0} / {formula.videos} vidéos
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((campaign?.videos_delivered || 0) / formula.videos) * 100)}%`,
                      backgroundColor: (campaign?.videos_delivered || 0) >= formula.videos ? "#22c55e" : "#FF2E63"
                    }} />
                </div>
              </div>
            )}

            {/* Upload zone */}
            <div>
              <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/avi" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
              {uploading ? (
                <div className="border-2 border-[#FF2E63] border-dashed rounded-xl p-6 space-y-3">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-3 bg-[#FF2E63] rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-center text-sm text-gray-500">{uploadProgress}% — Upload en cours...</p>
                </div>
              ) : (
                <button onClick={() => videoRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-[#FF2E63] rounded-xl py-8 transition-colors group">
                  <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#FF2E63] mx-auto mb-2 transition-colors" />
                  <p className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors">Cliquer pour uploader une vidéo</p>
                  <p className="text-xs text-gray-300 mt-1">MP4, MOV, WebM — jusqu'à 500MB</p>
                </button>
              )}
            </div>

            {/* Video grid */}
            {(campaign?.delivered_videos || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Vidéos livrées ({(campaign?.delivered_videos || []).length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(campaign?.delivered_videos || []).map(v => (
                    <div key={v.video_id} className="group relative rounded-xl overflow-hidden bg-gray-900 aspect-[9/16] border border-gray-200">
                      {v.thumbnail
                        ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-2"><Film className="w-8 h-8 text-gray-500" /><p className="text-xs text-gray-500 px-2 text-center truncate">{v.filename}</p></div>
                      }
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <a href={v.url} target="_blank" rel="noreferrer"
                          className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform" onClick={e => e.stopPropagation()}>
                          <Eye className="w-4 h-4 text-gray-800" />
                        </a>
                        <a href={v.url} download
                          className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform" onClick={e => e.stopPropagation()}>
                          <Download className="w-4 h-4 text-gray-800" />
                        </a>
                        <button onClick={() => deleteVideo(v.video_id)}
                          className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <p className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] text-white bg-gradient-to-t from-black/80 to-transparent truncate">{v.filename}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery note */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Note de livraison pour le client</label>
              <Textarea className="border-gray-200 resize-none min-h-[80px]" placeholder="Instructions, mot d'accompagnement..." value={form.delivery_notes} onChange={e => setForm(f => ({ ...f, delivery_notes: e.target.value }))} />
              <Button onClick={save} disabled={saving} size="sm" className="mt-2 bg-[#FF2E63] hover:bg-[#e0254f] text-white text-xs">
                <Save className="w-3 h-3 mr-1" /> Sauvegarder la note
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreviewVideo(null)}>
          <video src={previewVideo} controls autoPlay className="max-h-[90vh] max-w-full rounded-xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setPreviewVideo(null)} className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
        </div>
      )}
    </AppLayout>
  );
}
