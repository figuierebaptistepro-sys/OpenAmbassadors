import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, Search, ChevronRight, CheckCircle, XCircle,
  Clock, AlertCircle, FileText, Film
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import AgencyNav from "../components/AgencyNav";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { SCRIPT_STATUSES } from "../lib/agency";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FILTERS = [
  { key: "all",                     label: "Tous",             icon: FileText  },
  { key: "modifications_demandees", label: "Modifs",           icon: AlertCircle },
  { key: "en_attente",              label: "En attente",       icon: Clock     },
  { key: "valide",                  label: "Validés",          icon: CheckCircle },
  { key: "realise",                 label: "Réalisés",         icon: Film      },
  { key: "refuse",                  label: "Refusés",          icon: XCircle   },
];

const STATUS_ORDER = { modifications_demandees: 0, en_attente: 1, valide: 2, realise: 3, refuse: 4 };

async function patchStatus(campaignId, scriptId, status) {
  return fetch(`${API_URL}/api/admin/agency/campaigns/${campaignId}/scripts/${scriptId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
}

export default function AgencyScripts({ user }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/agency/campaigns`, { credentials: "include" });
      if (r.ok) setCampaigns(await r.json());
    } catch { toast.error("Erreur chargement"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateStatus = async (campaignId, scriptId, status) => {
    const key = `${campaignId}-${scriptId}`;
    setUpdating(key);
    const r = await patchStatus(campaignId, scriptId, status);
    if (r.ok) {
      setCampaigns(prev => prev.map(c => {
        if (c.campaign_id !== campaignId) return c;
        return { ...c, scripts: (c.scripts || []).map(s => s.script_id === scriptId ? { ...s, status } : s) };
      }));
      toast.success(status === "realise" ? "Marqué réalisé 🎬" : "Statut mis à jour");
    } else {
      toast.error("Erreur mise à jour");
    }
    setUpdating(null);
  };

  // Flatten scripts with campaign context
  const allScripts = campaigns.flatMap(c =>
    (c.scripts || []).map(s => ({
      ...s,
      campaign_id: c.campaign_id,
      campaign_title: c.title,
      campaign_status: c.status,
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
  }).sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  // Count per status
  const counts = Object.fromEntries(
    FILTERS.map(f => [f.key, f.key === "all" ? allScripts.length : allScripts.filter(s => s.status === f.key).length])
  );

  // Pipeline stats (excluding realise from "active" pipeline)
  const pipeline = [
    { key: "en_attente",            label: "En attente",  n: counts.en_attente,            color: "bg-gray-400"    },
    { key: "valide",                label: "Validé",      n: counts.valide,                 color: "bg-green-500"   },
    { key: "modifications_demandees",label: "Modifs",     n: counts.modifications_demandees,color: "bg-orange-500"  },
    { key: "realise",               label: "Réalisés 🎬", n: counts.realise,                color: "bg-purple-500"  },
  ];

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

            {/* Pipeline overview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pipeline scripts</p>
              <div className="grid grid-cols-4 gap-3">
                {pipeline.map(p => (
                  <button key={p.key} onClick={() => setFilter(p.key === filter ? "all" : p.key)}
                    className={`rounded-xl p-3 text-center transition-all border ${filter === p.key ? "border-gray-300 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full ${p.color}`} />
                      <p className="text-2xl font-bold text-gray-900">{p.n}</p>
                    </div>
                    <p className="text-[10px] text-gray-400">{p.label}</p>
                  </button>
                ))}
              </div>
              {allScripts.length > 0 && (
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                  {pipeline.filter(p => p.n > 0).map(p => (
                    <div key={p.key} className={`h-full ${p.color} transition-all`}
                      style={{ width: `${(p.n / allScripts.length) * 100}%` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Search + filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input className="pl-9 h-9 border-gray-200 bg-white text-sm" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button size="sm" variant="ghost" className="h-9" onClick={fetchAll}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map(f => {
                const Icon = f.icon;
                return (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                      ${filter === f.key ? "bg-[#FF2E63] text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}>
                    <Icon className="w-3 h-3" />
                    {f.label}
                    <span className={`text-[10px] font-bold ${filter === f.key ? "opacity-80" : "opacity-50"}`}>{counts[f.key]}</span>
                  </button>
                );
              })}
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
                  const isUpdating = updating === key;
                  const isRealise = s.status === "realise";
                  const isTournage = s.campaign_status === "tournage";

                  return (
                    <div key={key} className={`bg-white rounded-xl border p-4 transition-shadow ${isRealise ? "opacity-70 border-purple-100" : "border-gray-200 hover:shadow-sm"}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Breadcrumb */}
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-xs text-gray-400">{s.client_name}</span>
                            <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                            <button className="text-xs text-[#FF2E63] hover:underline font-medium"
                              onClick={() => navigate(`/agency/campaign/${s.campaign_id}`)}>
                              {s.campaign_title}
                            </button>
                            {isTournage && (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🎬 En tournage</span>
                            )}
                          </div>

                          {/* Title */}
                          <p className={`text-sm font-semibold mb-1 ${isRealise ? "text-gray-400 line-through decoration-purple-300" : "text-gray-900"}`}>
                            {s.title || "Script"}
                          </p>

                          {/* Content preview */}
                          {s.content && !isRealise && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{s.content}</p>
                          )}

                          {/* Client comment */}
                          {s.status === "modifications_demandees" && s.client_comment && (
                            <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-2">
                              <p className="text-xs text-orange-700"><span className="font-medium">Client :</span> {s.client_comment}</p>
                            </div>
                          )}
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 flex-shrink-0 ${st.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </div>

                      {/* Actions */}
                      {!isRealise && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-gray-50">
                          <button disabled={isUpdating || s.status === "valide"}
                            onClick={() => updateStatus(s.campaign_id, s.script_id, "valide")}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium">
                            <CheckCircle className="w-3 h-3" /> Valider
                          </button>
                          <button disabled={isUpdating || s.status === "modifications_demandees"}
                            onClick={() => updateStatus(s.campaign_id, s.script_id, "modifications_demandees")}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium">
                            <AlertCircle className="w-3 h-3" /> Modifs
                          </button>
                          <button disabled={isUpdating || s.status === "en_attente"}
                            onClick={() => updateStatus(s.campaign_id, s.script_id, "en_attente")}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium">
                            <Clock className="w-3 h-3" /> En attente
                          </button>

                          {/* Marquer réalisé — visible si tournage ou valide */}
                          {(isTournage || s.status === "valide") && (
                            <button disabled={isUpdating}
                              onClick={() => updateStatus(s.campaign_id, s.script_id, "realise")}
                              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 font-medium ml-auto">
                              <Film className="w-3 h-3" /> Réalisé 🎬
                            </button>
                          )}

                          {!isTournage && s.status !== "valide" && (
                            <button className="ml-auto text-xs text-gray-400 hover:text-[#FF2E63] flex items-center gap-1"
                              onClick={() => navigate(`/agency/campaign/${s.campaign_id}`)}>
                              Voir <ChevronRight className="w-3 h-3" />
                            </button>
                          )}

                          {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                        </div>
                      )}

                      {/* Réalisé: just undo */}
                      {isRealise && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-purple-100">
                          <Film className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-xs text-purple-500 flex-1">Script réalisé — archivé</span>
                          <button onClick={() => updateStatus(s.campaign_id, s.script_id, "valide")}
                            className="text-[11px] text-purple-400 hover:text-purple-700 font-medium">
                            Annuler
                          </button>
                        </div>
                      )}
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
