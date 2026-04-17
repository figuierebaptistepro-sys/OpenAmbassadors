import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Trash2, AlertCircle, Clock,
  FileText, Video, Info, ChevronRight, CalendarClock
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import ScriptsTab from "../components/agency/ScriptsTab";
import VideosTab from "../components/agency/VideosTab";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { WORKFLOW_STATUSES, FORMULAS, FORMULA_MAP, STATUS_MAP, getDeadlineInfo } from "../lib/agency";

const API_URL = process.env.REACT_APP_BACKEND_URL;

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


  const formula = FORMULA_MAP[form.formula] || null;
  const currentStatusInfo = WORKFLOW_STATUSES.find(s => s.key === form.status) || WORKFLOW_STATUSES[0];
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
            {WORKFLOW_STATUSES.map((s, i) => {
              const currentIdx = WORKFLOW_STATUSES.findIndex(x => x.key === form.status);
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
              const st = STATUS_MAP[m.status];
              return (
                <button
                  key={m.campaign_id}
                  onClick={() => !isCurrent && navigate(`/agency/campaign/${m.campaign_id}`)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                    ${isCurrent ? "bg-[#FF2E63] text-white border-[#FF2E63]" : isNotStarted ? "bg-gray-50 text-gray-400 border-gray-200 cursor-pointer hover:border-gray-300" : "bg-white text-gray-600 border-gray-200 cursor-pointer hover:border-gray-300"}`}
                >
                  Mois {m.order}
                  {isNotStarted ? <span className="opacity-60">· À venir</span> : <span className={`w-1.5 h-1.5 rounded-full ${st?.dot || "bg-gray-400"}`} />}
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
                      {WORKFLOW_STATUSES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
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
          <ScriptsTab campaign={campaign} campaignId={id} campaignStatus={form.status} onUpdate={setCampaign} />
        )}

        {/* ══════ TAB: VIDÉOS ══════ */}
        {!isNew && tab === "videos" && (
          <VideosTab
            campaign={campaign}
            campaignId={id}
            formula={formula}
            deliveryNotes={form.delivery_notes}
            onUpdate={setCampaign}
            onDeliveryNotesChange={v => setForm(f => ({ ...f, delivery_notes: v }))}
            onSave={save}
            saving={saving}
          />
        )}
      </div>

    </AppLayout>
  );
}
