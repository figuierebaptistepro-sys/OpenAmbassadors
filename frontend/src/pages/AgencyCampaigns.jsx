import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, RefreshCw, AlertCircle, ArrowRight, Film, FileText
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import AgencyNav from "../components/AgencyNav";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function getDeadlineInfo(deadline) {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(deadline);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { label: `En retard ${Math.abs(diff)}j`, color: "bg-red-100 text-red-700", icon: "🔴" };
  if (diff === 0) return { label: "Aujourd'hui !",                 color: "bg-red-100 text-red-700", icon: "🔴" };
  if (diff <= 3) return { label: `Dans ${diff}j`,                  color: "bg-orange-100 text-orange-700", icon: "🟠" };
  if (diff <= 7) return { label: `Dans ${diff}j`,                  color: "bg-yellow-100 text-yellow-700", icon: "🟡" };
  return { label: new Date(deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), color: "bg-gray-100 text-gray-400", icon: "📅" };
}

const STATUSES = [
  { key: "brief_recu",  label: "Brief reçu",  color: "border-gray-300",   head: "bg-gray-100",   dot: "bg-gray-400",    text: "text-gray-600"  },
  { key: "casting",     label: "Casting",      color: "border-blue-300",   head: "bg-blue-50",    dot: "bg-blue-500",    text: "text-blue-700"  },
  { key: "tournage",    label: "Tournage",     color: "border-amber-300",  head: "bg-amber-50",   dot: "bg-amber-500",   text: "text-amber-700" },
  { key: "montage",     label: "Montage",      color: "border-purple-300", head: "bg-purple-50",  dot: "bg-purple-500",  text: "text-purple-700"},
  { key: "livraison",   label: "Livraison",    color: "border-orange-300", head: "bg-orange-50",  dot: "bg-orange-500",  text: "text-orange-700"},
  { key: "termine",     label: "Terminé",      color: "border-green-300",  head: "bg-green-50",   dot: "bg-green-500",   text: "text-green-700" },
];

const FORMULAS = {
  "12_videos": { label: "12 vidéos/mois", videos: 12 },
  "20_videos": { label: "20 vidéos/mois", videos: 20 },
};

export default function AgencyCampaigns({ user }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [movingId, setMovingId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/campaigns`, { credentials: "include" });
      if (r.ok) setCampaigns(await r.json());
    } catch { toast.error("Erreur chargement"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const moveStatus = async (campaignId, newStatus, e) => {
    e.stopPropagation();
    setMovingId(campaignId);
    await fetch(`${API_URL}/api/admin/agency/campaigns/${campaignId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ status: newStatus }),
    });
    setCampaigns(prev => prev.map(c => c.campaign_id === campaignId ? { ...c, status: newStatus } : c));
    setMovingId(null);
  };

  const filtered = campaigns.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.title?.toLowerCase().includes(q)
      || c.client_name?.toLowerCase().includes(q)
      || c.creator_name?.toLowerCase().includes(q);
  });

  const needsAttention = campaigns.filter(c =>
    (c.scripts || []).some(s => s.status === "modifications_demandees")
  );

  if (loading) return (
    <AppLayout user={user}>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout user={user}>
      <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen overflow-hidden">
        <AgencyNav />

        {/* Search bar */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              className="pl-8 h-8 text-sm border-gray-200 bg-gray-50"
              placeholder="Filtrer par client, campagne, créateur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} campagne{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Attention banner */}
        {needsAttention.length > 0 && (
          <div className="flex-shrink-0 bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
            <span className="text-xs font-medium text-orange-700 flex-shrink-0">Modifs demandées :</span>
            {needsAttention.map(c => (
              <button key={c.campaign_id} onClick={() => navigate(`/agency/campaign/${c.campaign_id}`)}
                className="flex-shrink-0 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1">
                {c.client_name} — {c.title} <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#F6F7FB]">
          <div className="flex gap-3 h-full p-4 min-w-max">
            {STATUSES.map(st => {
              const cols = filtered.filter(c => c.status === st.key);
              return (
                <div key={st.key} className="flex flex-col w-64 flex-shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${st.head} border-t-2 border-x border-b-0 ${st.color}`}>
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
                    <span className={`ml-auto text-xs font-bold ${st.text} opacity-60`}>{cols.length}</span>
                  </div>
                  <div className={`flex-1 overflow-y-auto border-x border-b ${st.color} rounded-b-xl bg-white/70 p-2 space-y-2 min-h-0`}>
                    {cols.length === 0 && <div className="text-center py-8 text-xs text-gray-300">Vide</div>}
                    {cols.map(c => (
                      <CampaignCard
                        key={c.campaign_id}
                        campaign={c}
                        status={st}
                        onOpen={() => navigate(`/agency/campaign/${c.campaign_id}`)}
                        onMove={moveStatus}
                        moving={movingId === c.campaign_id}
                        statuses={STATUSES}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function CampaignCard({ campaign: c, onOpen, onMove, moving, statuses }) {
  const formula = FORMULAS[c.formula];
  const pct = formula ? Math.round(((c.videos_delivered || 0) / formula.videos) * 100) : null;
  const pendingScripts = (c.scripts || []).filter(s => s.status === "modifications_demandees").length;
  const currentIdx = statuses.findIndex(s => s.key === c.status);
  const nextStatus = statuses[currentIdx + 1];

  return (
    <div
      onClick={onOpen}
      className={`bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group ${moving ? "opacity-50" : ""}`}
    >
      <div className="mb-2">
        <p className="text-xs text-gray-400 font-medium truncate">{c.client_name || c.client_email}</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug">{c.title}</p>
      </div>

      <div className="flex flex-wrap gap-1 mb-2.5">
        {c.creator_name && (
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">🎬 {c.creator_name}</span>
        )}
        {formula && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">📦 {formula.label}</span>
        )}
        {pendingScripts > 0 && (
          <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" /> {pendingScripts} modif
          </span>
        )}
        {(c.delivered_videos || []).length > 0 && (
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Film className="w-2.5 h-2.5" /> {(c.delivered_videos || []).length} vidéo{(c.delivered_videos || []).length > 1 ? "s" : ""}
          </span>
        )}
        {(c.scripts || []).length > 0 && (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <FileText className="w-2.5 h-2.5" /> {(c.scripts || []).length} script{(c.scripts || []).length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {formula && (
        <div className="mb-2.5">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Vidéos</span>
            <span className={pct >= 100 ? "text-green-600 font-semibold" : ""}>{c.videos_delivered || 0}/{formula.videos}</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full">
            <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? "#22c55e" : "#FF2E63" }} />
          </div>
        </div>
      )}

      {/* Deadline */}
      {(() => { const dl = getDeadlineInfo(c.deadline); return dl ? (
        <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md mb-2 w-fit ${dl.color}`}>
          <span>{dl.icon}</span> {dl.label}
        </div>
      ) : null; })()}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">Mois {c.order || 1}</span>
        {nextStatus && (
          <button
            onClick={e => onMove(c.campaign_id, nextStatus.key, e)}
            className="opacity-0 group-hover:opacity-100 text-[10px] flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-all bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full"
          >
            {nextStatus.label} <ArrowRight className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
