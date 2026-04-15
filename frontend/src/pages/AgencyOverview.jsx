import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Video, Users, TrendingUp, ChevronRight, RefreshCw, Link2, CalendarClock, Clock } from "lucide-react";
import AppLayout from "../components/AppLayout";
import AgencyNav from "../components/AgencyNav";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUSES = [
  { key: "brief_recu",  label: "Brief reçu",  color: "bg-gray-100 text-gray-600" },
  { key: "casting",     label: "Casting",      color: "bg-blue-100 text-blue-700" },
  { key: "tournage",    label: "Tournage",     color: "bg-amber-100 text-amber-700" },
  { key: "montage",     label: "Montage",      color: "bg-purple-100 text-purple-700" },
  { key: "livraison",   label: "Livraison",    color: "bg-orange-100 text-orange-700" },
  { key: "termine",     label: "Terminé",      color: "bg-green-100 text-green-700" },
];

const statusLabel = (key) => STATUSES.find(s => s.key === key)?.label || key;
const statusColor = (key) => STATUSES.find(s => s.key === key)?.color || "bg-gray-100 text-gray-600";

export default function AgencyOverview({ user }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [campsRes, clientsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/agency/campaigns`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/agency/clients`, { credentials: "include" }),
        fetch(`${API_URL}/api/admin/agency/stats`, { credentials: "include" }),
      ]);
      if (campsRes.ok) setCampaigns(await campsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch { toast.error("Erreur chargement"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const generateInvite = async () => {
    const r = await fetch(`${API_URL}/api/admin/agency/invitations`, { method: "POST", credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      navigator.clipboard.writeText(`${window.location.origin}/register?invite=${data.token}`);
      toast.success("Lien d'invitation copié !");
    }
  };

  // Computed
  const needsScriptAction = campaigns.filter(c =>
    (c.scripts || []).some(s => s.status === "modifications_demandees")
  );
  const stalledCampaigns = campaigns.filter(c => {
    if (c.status === "termine") return false;
    const updated = new Date(c.updated_at);
    const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 7;
  });
  const inDelivery = campaigns.filter(c => c.status === "livraison");
  const activeCampaigns = campaigns.filter(c => c.status !== "termine");

  const urgentDeadlines = campaigns.filter(c => {
    if (!c.deadline || c.status === "termine") return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.ceil((new Date(c.deadline) - today) / (1000 * 60 * 60 * 24));
    return diff <= 3;
  }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const recentCampaigns = [...campaigns].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8);

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
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Clients actifs", value: stats?.clients_actifs ?? clients.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", link: "/agency/clients" },
                { label: "Campagnes actives", value: stats?.campagnes_actives ?? activeCampaigns.length, icon: TrendingUp, color: "text-[#FF2E63]", bg: "bg-pink-50", link: "/agency/campaigns" },
                { label: "Scripts à traiter", value: stats?.scripts_en_attente ?? needsScriptAction.length, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50", link: "/agency/scripts" },
                { label: "Vidéos livrées (mois)", value: stats?.videos_livrees_mois ?? 0, icon: Video, color: "text-green-600", bg: "bg-green-50", link: "/agency/campaigns" },
              ].map(({ label, value, icon: Icon, color, bg, link }) => (
                <Card key={label} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(link)}>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Needs attention */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">⚡ Nécessite une action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {needsScriptAction.length === 0 && stalledCampaigns.length === 0 && inDelivery.length === 0 && urgentDeadlines.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Tout est à jour ✓</p>
                  ) : (
                    <>
                      {urgentDeadlines.map(c => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const diff = Math.ceil((new Date(c.deadline) - today) / (1000 * 60 * 60 * 24));
                        const overdue = diff < 0;
                        const label = overdue
                          ? `En retard de ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""}`
                          : diff === 0 ? "Deadline aujourd'hui !"
                          : `Deadline dans ${diff} jour${diff > 1 ? "s" : ""}`;
                        return (
                          <div key={c.campaign_id} onClick={() => navigate(`/agency/campaign/${c.campaign_id}`)}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${overdue ? "bg-red-50 border-red-100 hover:bg-red-100" : "bg-orange-50 border-orange-100 hover:bg-orange-100"}`}>
                            <CalendarClock className={`w-4 h-4 flex-shrink-0 ${overdue ? "text-red-500" : "text-orange-500"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{c.title}</p>
                              <p className={`text-xs ${overdue ? "text-red-600" : "text-orange-600"}`}>{c.client_name} — {label}</p>
                            </div>
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${overdue ? "text-red-400" : "text-orange-400"}`} />
                          </div>
                        );
                      })}
                      {needsScriptAction.map(c => (
                        <div key={c.campaign_id} onClick={() => navigate(`/agency/campaign/${c.campaign_id}`)}
                          className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
                          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{c.title}</p>
                            <p className="text-xs text-orange-600">{c.client_name} — modifs script demandées</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        </div>
                      ))}
                      {stalledCampaigns.map(c => (
                        <div key={c.campaign_id} onClick={() => navigate(`/agency/campaign/${c.campaign_id}`)}
                          className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl cursor-pointer hover:bg-yellow-100 transition-colors">
                          <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{c.title}</p>
                            <p className="text-xs text-yellow-700">{c.client_name} — bloquée depuis +7 jours</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        </div>
                      ))}
                      {inDelivery.map(c => (
                        <div key={c.campaign_id} onClick={() => navigate(`/agency/campaign/${c.campaign_id}`)}
                          className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                          <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{c.title}</p>
                            <p className="text-xs text-blue-700">{c.client_name} — en attente de livraison vidéos</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Recent activity */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">🕐 Activité récente</CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400" onClick={fetchAll}>
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-1">
                  {recentCampaigns.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Aucune campagne</p>
                  ) : recentCampaigns.map(c => (
                    <div key={c.campaign_id} onClick={() => navigate(`/agency/campaign/${c.campaign_id}`)}
                      className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{c.title}</p>
                        <p className="text-xs text-gray-400 truncate">{c.client_name}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(c.status)}`}>
                        {statusLabel(c.status)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Clients rapide */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-semibold">👥 Clients ({clients.length})</CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/agency/clients")}>
                    Voir tout <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {clients.slice(0, 5).map(c => {
                    const clientCamps = campaigns.filter(camp => camp.client_id === c.user_id);
                    const active = clientCamps.filter(camp => camp.status !== "termine");
                    return (
                      <div key={c.user_id} onClick={() => navigate("/agency/clients")}
                        className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                        <div className="w-8 h-8 rounded-full bg-[#FF2E63]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#FF2E63] font-bold text-xs">{(c.name || c.email || "?")[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{c.name || c.email}</p>
                          <p className="text-xs text-gray-400">{active.length} campagne{active.length !== 1 ? "s" : ""} active{active.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    );
                  })}
                  {clients.length === 0 && (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-xs text-gray-400">Aucun client pour l'instant</p>
                      <Button size="sm" onClick={generateInvite} className="h-7 text-xs bg-[#FF2E63] hover:bg-[#e0254f] text-white">
                        <Link2 className="w-3 h-3 mr-1" /> Inviter un client
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick invite */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">🔗 Inviter un nouveau client</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-4">Génère un lien unique — le client s'inscrit et son compte est automatiquement tagué client agence.</p>
                  <Button onClick={generateInvite} className="w-full bg-[#FF2E63] hover:bg-[#e0254f] text-white text-sm">
                    <Link2 className="w-4 h-4 mr-2" /> Générer et copier le lien
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
