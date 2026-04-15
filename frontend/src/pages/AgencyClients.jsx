import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Link2, Building2, ChevronRight, RefreshCw, ExternalLink, Trash2 } from "lucide-react";
import AppLayout from "../components/AppLayout";
import AgencyNav from "../components/AgencyNav";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUSES = {
  brief_recu:  { label: "Brief reçu",  color: "bg-gray-100 text-gray-600" },
  casting:     { label: "Casting",      color: "bg-blue-100 text-blue-700" },
  tournage:    { label: "Tournage",     color: "bg-amber-100 text-amber-700" },
  montage:     { label: "Montage",      color: "bg-purple-100 text-purple-700" },
  livraison:   { label: "Livraison",    color: "bg-orange-100 text-orange-700" },
  termine:     { label: "Terminé",      color: "bg-green-100 text-green-700" },
};

export default function AgencyClients({ user }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInvites, setShowInvites] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [clientsRes, campsRes, invsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/agency/clients`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/agency/campaigns`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/agency/invitations`, { credentials: "include" }),
      ]);
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (campsRes.ok) setCampaigns(await campsRes.json());
      if (invsRes.ok) setInvitations(await invsRes.json());
    } catch { toast.error("Erreur chargement"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const generateInvite = async () => {
    const r = await fetch(`${API_URL}/api/admin/agency/invitations`, { method: "POST", credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      const link = `${window.location.origin}/register?invite=${data.token}`;
      navigator.clipboard.writeText(link);
      toast.success("Lien copié !");
      fetchAll();
      setShowInvites(true);
    }
  };

  const removeClient = async (userId) => {
    if (!window.confirm("Retirer ce client de l'agence ?")) return;
    const r = await fetch(`${API_URL}/api/admin/agency/clients/${userId}/toggle`, { method: "PATCH", credentials: "include" });
    if (r.ok) { toast.success("Client retiré"); fetchAll(); }
  };

  const filtered = clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  const clientsWithData = filtered.map(client => {
    const clientCamps = campaigns.filter(c => c.client_id === client.user_id);
    const active = clientCamps.filter(c => c.status !== "termine");
    const done = clientCamps.filter(c => c.status === "termine");
    const latestActive = active.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    return { ...client, clientCamps, active, done, latestActive };
  });

  if (loading) return (
    <AppLayout user={user}>
      <div className="flex items-center justify-center h-64"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>
    </AppLayout>
  );

  return (
    <AppLayout user={user}>
      <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen overflow-hidden">
        <AgencyNav />

        <div className="flex-1 overflow-y-auto bg-[#F6F7FB]">
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input className="pl-9 h-9 border-gray-200 bg-white text-sm" placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button onClick={generateInvite} className="h-9 text-sm bg-[#FF2E63] hover:bg-[#e0254f] text-white">
                <Link2 className="w-4 h-4 mr-2" /> Inviter un client
              </Button>
            </div>

            {/* Invitations actives */}
            {invitations.filter(i => !i.used).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button onClick={() => setShowInvites(!showInvites)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <span>🔗 {invitations.filter(i => !i.used).length} lien{invitations.filter(i => !i.used).length > 1 ? "s" : ""} d'invitation actif{invitations.filter(i => !i.used).length > 1 ? "s" : ""}</span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showInvites ? "rotate-90" : ""}`} />
                </button>
                {showInvites && (
                  <div className="border-t border-gray-100 px-4 pb-3 space-y-2 pt-2">
                    {invitations.filter(i => !i.used).map(inv => (
                      <div key={inv.token} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <code className="flex-1 text-xs text-gray-500 truncate">{window.location.origin}/register?invite={inv.token}</code>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register?invite=${inv.token}`); toast.success("Copié !"); }}
                          className="text-gray-400 hover:text-gray-700 flex-shrink-0">
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Clients total</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-[#FF2E63]">{campaigns.filter(c => c.status !== "termine").length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Campagnes actives</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{campaigns.filter(c => c.status === "termine").length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Campagnes terminées</p>
              </div>
            </div>

            {/* Client list */}
            {clientsWithData.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400 mb-4">Aucun client agence pour l'instant</p>
                <Button onClick={generateInvite} className="bg-[#FF2E63] hover:bg-[#e0254f] text-white text-sm">
                  <Link2 className="w-4 h-4 mr-2" /> Inviter le premier client
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {clientsWithData.map(client => (
                  <Card key={client.user_id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      {/* Client header */}
                      <div className="flex items-center gap-4 p-4 border-b border-gray-50">
                        <div className="w-11 h-11 rounded-full bg-[#FF2E63]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#FF2E63] font-bold text-lg">{(client.name || client.email || "?")[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{client.name || "—"}</p>
                          <p className="text-xs text-gray-500">{client.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500">
                          <span className="bg-[#FF2E63]/10 text-[#FF2E63] px-2 py-0.5 rounded-full font-medium">{client.active.length} active{client.active.length !== 1 ? "s" : ""}</span>
                          {client.done.length > 0 && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{client.done.length} terminée{client.done.length !== 1 ? "s" : ""}</span>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => navigate(`/agency/campaign/new`)}>
                            <Plus className="w-3 h-3 mr-1" /> Campagne
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-300 hover:text-red-500" onClick={() => removeClient(client.user_id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Campaigns */}
                      {client.clientCamps.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400">Aucune campagne — <button className="text-[#FF2E63] hover:underline" onClick={() => navigate("/agency/campaign/new")}>en créer une</button></div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {client.clientCamps.map(c => {
                            const st = STATUSES[c.status] || STATUSES.brief_recu;
                            const formula = c.formula === "12_videos" ? 12 : c.formula === "20_videos" ? 20 : null;
                            const pct = formula ? Math.min(100, Math.round(((c.videos_delivered || 0) / formula) * 100)) : null;
                            return (
                              <div key={c.campaign_id} onClick={() => navigate(`/agency/campaign/${c.campaign_id}`)}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer group transition-colors">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${st.color}`}>{st.label}</span>
                                    {(c.scripts || []).some(s => s.status === "modifications_demandees") && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium flex-shrink-0">⚠ Modifs</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {c.creator_name && <span className="text-xs text-gray-400">🎬 {c.creator_name}</span>}
                                    {formula && (
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-20 h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 rounded-full bg-[#FF2E63]" style={{ width: `${pct}%` }} /></div>
                                        <span className="text-xs text-gray-400">{c.videos_delivered || 0}/{formula}</span>
                                      </div>
                                    )}
                                    <span className="text-xs text-gray-400">Mois {c.order || 1}</span>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
