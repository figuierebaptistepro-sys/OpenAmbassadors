import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Search, ChevronRight, CheckCircle, XCircle, Clock, AlertCircle, FileText } from "lucide-react";
import AppLayout from "../components/AppLayout";
import AgencyNav from "../components/AgencyNav";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SCRIPT_STATUSES = {
  en_attente:              { label: "En attente",          color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400"    },
  valide:                  { label: "Validé",               color: "bg-green-100 text-green-700",  dot: "bg-green-500"   },
  modifications_demandees: { label: "Modifs demandées",     color: "bg-orange-100 text-orange-700",dot: "bg-orange-500"  },
  refuse:                  { label: "Refusé",               color: "bg-red-100 text-red-700",      dot: "bg-red-500"     },
};

const FILTERS = [
  { key: "all",                   label: "Tous" },
  { key: "en_attente",            label: "En attente" },
  { key: "modifications_demandees", label: "Modifs demandées" },
  { key: "valide",                label: "Validés" },
  { key: "refuse",                label: "Refusés" },
];

export default function AgencyScripts({ user }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [updatingScript, setUpdatingScript] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/campaigns`, { credentials: "include" });
      if (r.ok) setCampaigns(await r.json());
    } catch { toast.error("Erreur chargement"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Flatten scripts with campaign context
  const allScripts = campaigns.flatMap(c =>
    (c.scripts || []).map(s => ({
      ...s,
      campaign_id: c.campaign_id,
      campaign_title: c.title,
      client_name: c.client_name || c.client_email,
    }))
  );

  const filtered = allScripts.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title?.toLowerCase().includes(q)
      || s.campaign_title?.toLowerCase().includes(q)
      || s.client_name?.toLowerCase().includes(q);
  }).sort((a, b) => {
    // modifications_demandees first, then en_attente, then the rest
    const order = { modifications_demandees: 0, en_attente: 1, valide: 2, refuse: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });

  const updateScriptStatus = async (campaignId, scriptId, newStatus) => {
    const key = `${campaignId}-${scriptId}`;
    setUpdatingScript(key);
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${campaignId}/scripts/${scriptId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (r.ok) {
        setCampaigns(prev => prev.map(c => {
          if (c.campaign_id !== campaignId) return c;
          return { ...c, scripts: (c.scripts || []).map(s => s.script_id === scriptId ? { ...s, status: newStatus } : s) };
        }));
        toast.success("Statut mis à jour");
      } else {
        toast.error("Erreur mise à jour");
      }
    } catch { toast.error("Erreur réseau"); }
    setUpdatingScript(null);
  };

  // Counts by status for filter tabs
  const counts = FILTERS.reduce((acc, f) => {
    acc[f.key] = f.key === "all" ? allScripts.length : allScripts.filter(s => s.status === f.key).length;
    return acc;
  }, {});

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

        <div className="flex-1 overflow-y-auto bg-[#F6F7FB]">
          <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  className="pl-9 h-9 border-gray-200 bg-white text-sm"
                  placeholder="Rechercher par script, campagne, client..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Button size="sm" variant="ghost" className="h-9" onClick={fetchAll}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                    ${filter === f.key
                      ? "bg-[#FF2E63] text-white"
                      : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}
                >
                  {f.label}
                  <span className={`text-[10px] font-bold ${filter === f.key ? "opacity-80" : "opacity-60"}`}>
                    {counts[f.key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Scripts list */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">Aucun script trouvé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(s => {
                  const st = SCRIPT_STATUSES[s.status] || SCRIPT_STATUSES.en_attente;
                  const key = `${s.campaign_id}-${s.script_id}`;
                  const isUpdating = updatingScript === key;
                  return (
                    <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Campaign + client breadcrumb */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs text-gray-400">{s.client_name}</span>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            <button
                              className="text-xs text-[#FF2E63] hover:underline font-medium truncate"
                              onClick={() => navigate(`/agency/campaign/${s.campaign_id}`)}
                            >
                              {s.campaign_title}
                            </button>
                          </div>

                          {/* Script title */}
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            {s.title || `Script`}
                          </p>

                          {/* Script content preview */}
                          {s.content && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{s.content}</p>
                          )}

                          {/* Feedback if any */}
                          {s.feedback && (
                            <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-2">
                              <p className="text-xs text-orange-700"><span className="font-medium">Feedback client :</span> {s.feedback}</p>
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.color} flex items-center gap-1`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                        <button
                          disabled={isUpdating || s.status === "valide"}
                          onClick={() => updateScriptStatus(s.campaign_id, s.script_id, "valide")}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Valider
                        </button>
                        <button
                          disabled={isUpdating || s.status === "modifications_demandees"}
                          onClick={() => updateScriptStatus(s.campaign_id, s.script_id, "modifications_demandees")}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Modifs
                        </button>
                        <button
                          disabled={isUpdating || s.status === "refuse"}
                          onClick={() => updateScriptStatus(s.campaign_id, s.script_id, "refuse")}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Refuser
                        </button>
                        <button
                          disabled={isUpdating || s.status === "en_attente"}
                          onClick={() => updateScriptStatus(s.campaign_id, s.script_id, "en_attente")}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          <Clock className="w-3.5 h-3.5" /> En attente
                        </button>
                        <button
                          className="ml-auto text-xs text-gray-400 hover:text-[#FF2E63] flex items-center gap-1 transition-colors"
                          onClick={() => navigate(`/agency/campaign/${s.campaign_id}`)}
                        >
                          Voir campagne <ChevronRight className="w-3 h-3" />
                        </button>
                        {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
