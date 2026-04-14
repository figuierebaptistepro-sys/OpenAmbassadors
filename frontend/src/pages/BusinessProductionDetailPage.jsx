import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Check, Film, FileText, PlayCircle, Package,
  Download, CheckCircle, MessageSquare
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AGENCY_STATUSES = [
  { key: "brief_recu",  label: "Brief reçu",            color: "bg-slate-500",   light: "bg-slate-100 text-slate-700" },
  { key: "casting",     label: "Casting",               color: "bg-blue-500",    light: "bg-blue-100 text-blue-700" },
  { key: "tournage",    label: "Tournage",              color: "bg-orange-500",  light: "bg-orange-100 text-orange-700" },
  { key: "montage",     label: "Montage",               color: "bg-purple-500",  light: "bg-purple-100 text-purple-700" },
  { key: "livraison",   label: "Livraison des fichiers", color: "bg-green-500",   light: "bg-green-100 text-green-700" },
  { key: "termine",     label: "Terminé",               color: "bg-emerald-600", light: "bg-emerald-100 text-emerald-700" },
];

const AGENCY_FORMULAS = [
  { key: "12_videos", label: "12 vidéos / mois", videos: 12 },
  { key: "20_videos", label: "20 vidéos / mois", videos: 20 },
];

const BusinessProductionDetailPage = ({ user }) => {
  const navigate = useNavigate();
  const { campaign_id } = useParams();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scriptCommentMap, setScriptCommentMap] = useState({});
  const [scriptCommentOpen, setScriptCommentOpen] = useState({});

  const fetchCampaign = async () => {
    try {
      const r = await fetch(`${API_URL}/api/agency/my-campaigns`, { credentials: "include" });
      if (r.ok) {
        const campaigns = await r.json();
        const found = campaigns.find(c => String(c.campaign_id) === String(campaign_id));
        setCampaign(found || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [campaign_id]);

  const handleScriptAction = async (scriptId, action, comment) => {
    try {
      const r = await fetch(
        `${API_URL}/api/agency/my-campaigns/${campaign_id}/scripts/${scriptId}/action`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action, comment: comment || undefined }),
        }
      );
      if (r.ok) {
        toast.success(action === "valide" ? "Script validé !" : "Modifications demandées");
        setScriptCommentOpen(prev => ({ ...prev, [scriptId]: false }));
        setScriptCommentMap(prev => ({ ...prev, [scriptId]: "" }));
        await fetchCampaign();
      } else {
        toast.error("Erreur lors de l'action");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-[#FF2E63] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <AppLayout user={user}>
        <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
          <div className="text-center">
            <Film className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Campagne introuvable</p>
            <Button
              className="mt-4 bg-[#FF2E63] hover:bg-[#FF5C8A] text-white"
              onClick={() => navigate("/business/projects")}
            >
              Retour aux projets
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentIdx = AGENCY_STATUSES.findIndex(s => s.key === campaign.status);
  const status = AGENCY_STATUSES[Math.max(0, currentIdx)];
  const formula = AGENCY_FORMULAS.find(f => f.key === campaign.formula);
  const videosDelivered = campaign.videos_delivered || 0;
  const videosTotal = formula?.videos || 0;
  const videosPct = videosTotal ? Math.min(100, Math.round((videosDelivered / videosTotal) * 100)) : 0;
  const stepPct = Math.round(((currentIdx + 1) / AGENCY_STATUSES.length) * 100);
  const scripts = campaign.scripts || [];

  return (
    <AppLayout user={user}>
      <div className="bg-[#F6F7FB] min-h-screen">
        {/* Top header bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => navigate("/business/projects")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#FF2E63] transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Mes Projets
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

          {/* Campaign Hero Header */}
          <div className="rounded-2xl overflow-hidden shadow-md">
            <div className="p-5" style={{ background: "linear-gradient(135deg, #FF2E63 0%, #c2185b 100%)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Status badge */}
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full mb-3 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {status.label}
                  </span>
                  {/* Title */}
                  <h1 className="font-heading font-bold text-white text-xl leading-tight mb-1">
                    {campaign.title}
                  </h1>
                  {formula && (
                    <p className="text-white/70 text-xs flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {formula.label}
                    </p>
                  )}
                </div>
                {/* Creator avatar */}
                {campaign.creator_name && (
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {campaign.creator_picture ? (
                      <img
                        src={campaign.creator_picture.startsWith("http") ? campaign.creator_picture : `${API_URL}${campaign.creator_picture}`}
                        alt={campaign.creator_name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white/50 shadow-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl">
                          {campaign.creator_name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-white/90 text-[10px] font-semibold truncate max-w-[60px] text-center">
                      {campaign.creator_name}
                    </span>
                    <span className="text-white/60 text-[9px] text-center">Créateur attitré</span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar section */}
            <div className="bg-white px-5 pt-4 pb-4">
              <div className="mb-1.5 flex justify-between items-center text-xs text-gray-500">
                <span className="font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#FF2E63]" />
                  Étape {currentIdx + 1}/6 — {status.label}
                </span>
                <span className="font-bold text-gray-900">{stepPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all"
                  style={{ width: `${stepPct}%`, background: "linear-gradient(90deg, #FF2E63, #FF5C8A)" }}
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="avancement" className="w-full">
            <TabsList className="w-full bg-white shadow-sm rounded-xl">
              <TabsTrigger value="avancement" className="flex-1 text-xs data-[state=active]:text-[#FF2E63]">
                Avancement
              </TabsTrigger>
              <TabsTrigger value="scripts" className="flex-1 text-xs data-[state=active]:text-[#FF2E63]">
                Scripts {scripts.length > 0 && `(${scripts.length})`}
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex-1 text-xs data-[state=active]:text-[#FF2E63]">
                Vidéos
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Avancement ── */}
            <TabsContent value="avancement" className="mt-4 space-y-4">
              {/* Stepper */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Étapes de production</p>
                <div className="flex items-start overflow-x-auto pb-1">
                  {AGENCY_STATUSES.map((s, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={s.key} className="flex items-center flex-shrink-0">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                            done    ? "bg-[#FF2E63] border-[#FF2E63] text-white" :
                            active  ? "bg-white border-[#FF2E63] text-[#FF2E63] shadow-sm ring-4 ring-pink-100" :
                                      "bg-gray-100 border-gray-200 text-gray-400"
                          }`}>
                            {done ? <Check className="w-4 h-4" /> : i + 1}
                          </div>
                          <span
                            className={`text-center leading-tight max-w-[48px] ${
                              active ? "font-semibold text-[#FF2E63]" : done ? "text-gray-400" : "text-gray-300"
                            }`}
                            style={{ fontSize: "9px" }}
                          >
                            {s.label.split(" ")[0]}
                          </span>
                        </div>
                        {i < AGENCY_STATUSES.length - 1 && (
                          <div className={`h-px w-6 mx-1 mb-4 ${i < currentIdx ? "bg-[#FF2E63]" : "bg-gray-200"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Videos delivered */}
              {formula && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5 text-[#FF2E63]" />
                    Vidéos livrées
                  </p>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {videosDelivered}
                      <span className="text-sm font-normal text-gray-400 ml-1">/ {videosTotal}</span>
                    </span>
                    <span className="text-sm font-semibold text-[#FF2E63]">{videosPct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{ width: `${videosPct}%`, background: "linear-gradient(90deg, #FF2E63, #FF5C8A)" }}
                    />
                  </div>
                </div>
              )}

              {/* Client notes */}
              {campaign.client_notes && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Note
                  </p>
                  <p className="text-sm text-gray-500 italic leading-relaxed">{campaign.client_notes}</p>
                </div>
              )}
            </TabsContent>

            {/* ── Tab: Scripts ── */}
            <TabsContent value="scripts" className="mt-4">
              {scripts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm py-14 text-center px-6">
                  <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">Aucun script pour le moment</p>
                  <p className="text-xs text-gray-400 mt-1">Votre équipe prépare les scripts.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scripts.map(s => (
                    <div key={s.script_id} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                      {/* Title + status badge */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900">{s.title}</p>
                        {s.status === "valide" && (
                          <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">
                            Validé
                          </span>
                        )}
                        {s.status === "en_attente" && (
                          <span className="shrink-0 text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                            En attente de validation
                          </span>
                        )}
                        {s.status === "modifications_demandees" && (
                          <span className="shrink-0 text-xs bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full font-medium">
                            Modifications demandées
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</p>

                      {/* Orange callout if modifications requested */}
                      {s.status === "modifications_demandees" && s.client_comment && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                          <p className="text-xs font-semibold text-orange-700 mb-0.5">Votre commentaire</p>
                          <p className="text-xs text-orange-600 leading-relaxed">{s.client_comment}</p>
                        </div>
                      )}

                      {/* Actions for en_attente */}
                      {s.status === "en_attente" && (
                        <div className="space-y-2 pt-1">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-8 text-xs text-white"
                              style={{ background: "#FF2E63" }}
                              onClick={() => handleScriptAction(s.script_id, "valide", null)}
                            >
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() =>
                                setScriptCommentOpen(prev => ({ ...prev, [s.script_id]: !prev[s.script_id] }))
                              }
                            >
                              Demander des modifications
                            </Button>
                          </div>

                          {scriptCommentOpen[s.script_id] && (
                            <div className="space-y-2">
                              <Textarea
                                className="text-xs min-h-[70px]"
                                placeholder="Décrivez les modifications souhaitées..."
                                value={scriptCommentMap[s.script_id] || ""}
                                onChange={e =>
                                  setScriptCommentMap(prev => ({ ...prev, [s.script_id]: e.target.value }))
                                }
                              />
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={() =>
                                  handleScriptAction(s.script_id, "modifications_demandees", scriptCommentMap[s.script_id])
                                }
                              >
                                Envoyer
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Tab: Vidéos ── */}
            <TabsContent value="videos" className="mt-4">
              {campaign.video_delivery_link ? (
                <div className="space-y-4">
                  {/* Hero card */}
                  <div
                    className="rounded-2xl p-6 text-center shadow-md"
                    style={{ background: "linear-gradient(135deg, #FF2E63 0%, #c2185b 100%)" }}
                  >
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Film className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="font-heading font-bold text-white text-xl mb-2">Vos vidéos sont prêtes !</h2>
                    <p className="text-white/80 text-sm mb-5">Téléchargez toutes vos vidéos en un clic.</p>
                    <a
                      href={campaign.video_delivery_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        className="bg-white text-[#FF2E63] hover:bg-gray-100 font-semibold shadow-lg"
                        size="lg"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger les vidéos
                      </Button>
                    </a>
                  </div>

                  {/* Delivery notes */}
                  {campaign.delivery_notes && (
                    <div className="bg-white rounded-2xl shadow-sm p-4">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">Note de livraison</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{campaign.delivery_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm py-14 text-center px-6">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Film className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Vos vidéos seront disponibles ici une fois le tournage et montage terminés.
                  </p>
                  <p className="text-xs text-gray-400">
                    Statut actuel : <span className="font-semibold">{status.label}</span>
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default BusinessProductionDetailPage;
