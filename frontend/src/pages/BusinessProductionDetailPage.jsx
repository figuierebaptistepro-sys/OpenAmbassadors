import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Check, Film, FileText, PlayCircle, Package,
  Download, CheckCircle, MessageSquare, MapPin, Star
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AGENCY_STATUSES = [
  { key: "brief_recu",  label: "Brief reçu" },
  { key: "casting",     label: "Casting" },
  { key: "tournage",    label: "Tournage" },
  { key: "montage",     label: "Montage" },
  { key: "livraison",   label: "Livraison des fichiers" },
  { key: "termine",     label: "Terminé" },
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

  useEffect(() => { fetchCampaign(); }, [campaign_id]);

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
        toast.success(action === "valide" ? "Script validé !" : "Modifications demandées envoyées");
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
            <Button className="mt-4 bg-[#FF2E63] hover:bg-[#FF5C8A] text-white" onClick={() => navigate("/business/projects")}>
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

        {/* ── HERO ── */}
        <div className="relative" style={{ background: "linear-gradient(135deg, #FF2E63 0%, #c2185b 100%)" }}>
          <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <button
              onClick={() => navigate("/business/projects")}
              className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Mes Projets
            </button>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-16 flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {status.label}
              </span>
              <h1 className="font-heading font-bold text-white text-2xl sm:text-3xl leading-tight mb-2">
                {campaign.title}
              </h1>
              {campaign.description && (
                <p className="text-white/70 text-sm leading-relaxed">{campaign.description}</p>
              )}
              {formula && (
                <p className="text-white/60 text-xs mt-2 flex items-center gap-1">
                  <Package className="w-3 h-3" />{formula.label}
                </p>
              )}
            </div>
            {campaign.creator_name && (
              <div className="flex-shrink-0 flex flex-col items-center gap-1.5 text-center">
                {campaign.creator_picture ? (
                  <img
                    src={campaign.creator_picture.startsWith("http") ? campaign.creator_picture : `${API_URL}${campaign.creator_picture}`}
                    alt={campaign.creator_name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/40 shadow-xl"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center shadow-xl">
                    <span className="text-white font-bold text-3xl">{campaign.creator_name[0]?.toUpperCase()}</span>
                  </div>
                )}
                <span className="text-white font-semibold text-sm">{campaign.creator_name}</span>
                <span className="text-white/60 text-[10px]">Créateur attitré</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-4">
            <div className="flex justify-between text-[10px] text-white/60 mb-1">
              <span>Étape {currentIdx + 1}/{AGENCY_STATUSES.length} — {status.label}</span>
              <span>{stepPct}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${stepPct}%` }} />
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="px-4 sm:px-6 lg:px-8 -mt-6 pb-10">

          {/* Tabs bar — pulled up over hero */}
          <Tabs defaultValue="avancement" className="w-full">
            <TabsList className="w-full bg-white shadow-lg rounded-2xl mb-6 p-1">
              <TabsTrigger
                value="avancement"
                className="flex-1 rounded-xl text-sm font-medium data-[state=active]:bg-[#FF2E63] data-[state=active]:text-white data-[state=active]:shadow"
              >
                Avancement
              </TabsTrigger>
              <TabsTrigger
                value="scripts"
                className="flex-1 rounded-xl text-sm font-medium data-[state=active]:bg-[#FF2E63] data-[state=active]:text-white data-[state=active]:shadow"
              >
                Scripts {scripts.length > 0 && `(${scripts.length})`}
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="flex-1 rounded-xl text-sm font-medium data-[state=active]:bg-[#FF2E63] data-[state=active]:text-white data-[state=active]:shadow"
              >
                Vidéos
              </TabsTrigger>
            </TabsList>

            {/* ── AVANCEMENT ── */}
            <TabsContent value="avancement" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left: stepper + videos */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Stepper card */}
                  <div className="bg-white rounded-2xl shadow-sm p-5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Étapes de production</p>
                    <div className="space-y-2">
                      {AGENCY_STATUSES.map((s, i) => {
                        const done = i < currentIdx;
                        const active = i === currentIdx;
                        return (
                          <div key={s.key} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                            active ? "bg-[#FFF1F5] border border-[#FF2E63]/20" :
                            done   ? "bg-gray-50" : "opacity-40"
                          }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              done   ? "bg-[#FF2E63] text-white" :
                              active ? "bg-[#FF2E63] text-white shadow-md" :
                                       "bg-gray-200 text-gray-400"
                            }`}>
                              {done ? <Check className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={`font-medium text-sm flex-1 ${active ? "text-[#FF2E63]" : done ? "text-gray-500" : "text-gray-400"}`}>
                              {s.label}
                            </span>
                            {active && (
                              <span className="text-xs font-semibold text-[#FF2E63] bg-[#FF2E63]/10 px-2 py-0.5 rounded-full">
                                En cours
                              </span>
                            )}
                            {done && <Check className="w-4 h-4 text-[#FF2E63]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Videos progress */}
                  {formula && (
                    <div className="bg-white rounded-2xl shadow-sm p-5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <PlayCircle className="w-3.5 h-3.5 text-[#FF2E63]" /> Vidéos livrées
                      </p>
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <span className="text-4xl font-bold text-gray-900">{videosDelivered}</span>
                          <span className="text-gray-400 text-lg font-normal ml-1">/ {videosTotal}</span>
                        </div>
                        <span className="text-lg font-bold text-[#FF2E63]">{videosPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div className="h-3 rounded-full transition-all" style={{ width: `${videosPct}%`, background: "linear-gradient(90deg, #FF2E63, #FF5C8A)" }} />
                      </div>
                    </div>
                  )}

                  {/* Client notes */}
                  {campaign.client_notes && (
                    <div className="bg-white rounded-2xl shadow-sm p-5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Note
                      </p>
                      <p className="text-sm text-gray-600 italic leading-relaxed">{campaign.client_notes}</p>
                    </div>
                  )}
                </div>

                {/* Right sidebar: creator + formula */}
                <div className="space-y-4">
                  {/* Creator card */}
                  {campaign.creator_name && (
                    <div className="bg-white rounded-2xl shadow-sm p-5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Créateur attitré</p>
                      <div className="flex items-center gap-3">
                        {campaign.creator_picture ? (
                          <img
                            src={campaign.creator_picture.startsWith("http") ? campaign.creator_picture : `${API_URL}${campaign.creator_picture}`}
                            alt={campaign.creator_name}
                            className="w-14 h-14 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-[#FFF1F5] flex items-center justify-center">
                            <span className="text-[#FF2E63] font-bold text-xl">{campaign.creator_name[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{campaign.creator_name}</p>
                          {campaign.creator_city && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />{campaign.creator_city}
                            </p>
                          )}
                        </div>
                      </div>
                      {campaign.creator_content_types?.length > 0 && (
                        <div className="flex gap-1.5 mt-3 flex-wrap">
                          {campaign.creator_content_types.slice(0, 4).map(t => (
                            <span key={t} className="text-xs bg-[#FFF1F5] text-[#FF2E63] px-2 py-0.5 rounded-full font-medium">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Formula + budget */}
                  {(formula || campaign.budget) && (
                    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                      {formula && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Formule</p>
                          <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-[#FF2E63]" />{formula.label}
                          </p>
                        </div>
                      )}
                      {campaign.budget && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Budget</p>
                          <p className="font-semibold text-gray-900 text-sm">💰 {campaign.budget}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── SCRIPTS ── */}
            <TabsContent value="scripts" className="mt-0">
              {scripts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm py-20 text-center px-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-base font-semibold text-gray-500 mb-1">Aucun script pour le moment</p>
                  <p className="text-sm text-gray-400">Votre équipe prépare les scripts de votre campagne.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {scripts.map(s => (
                    <div key={s.script_id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-heading font-semibold text-gray-900">{s.title}</p>
                        {s.status === "valide" && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                            <Check className="w-3 h-3" /> Validé
                          </span>
                        )}
                        {s.status === "en_attente" && (
                          <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                            En attente
                          </span>
                        )}
                        {s.status === "modifications_demandees" && (
                          <span className="shrink-0 text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                            Modifs demandées
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line flex-1">{s.content}</p>

                      {/* Comment callout */}
                      {s.status === "modifications_demandees" && s.client_comment && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                          <p className="text-xs font-semibold text-orange-700 mb-0.5">Votre commentaire</p>
                          <p className="text-xs text-orange-600 leading-relaxed">{s.client_comment}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {s.status === "en_attente" && (
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="h-9 text-xs text-white flex-1"
                              style={{ background: "linear-gradient(90deg, #FF2E63, #FF5C8A)" }}
                              onClick={() => handleScriptAction(s.script_id, "valide", null)}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Valider ce script
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                              onClick={() => setScriptCommentOpen(prev => ({ ...prev, [s.script_id]: !prev[s.script_id] }))}
                            >
                              Modifier
                            </Button>
                          </div>
                          {scriptCommentOpen[s.script_id] && (
                            <div className="space-y-2">
                              <Textarea
                                className="text-sm min-h-[80px] resize-none"
                                placeholder="Décrivez les modifications souhaitées..."
                                value={scriptCommentMap[s.script_id] || ""}
                                onChange={e => setScriptCommentMap(prev => ({ ...prev, [s.script_id]: e.target.value }))}
                              />
                              <Button
                                size="sm"
                                className="h-9 text-xs bg-orange-500 hover:bg-orange-600 text-white w-full"
                                onClick={() => handleScriptAction(s.script_id, "modifications_demandees", scriptCommentMap[s.script_id])}
                              >
                                Envoyer les modifications
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

            {/* ── VIDÉOS ── */}
            <TabsContent value="videos" className="mt-0">
              {campaign.video_delivery_link ? (
                <div className="space-y-4">
                  <div
                    className="rounded-2xl p-8 sm:p-12 text-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, #FF2E63 0%, #c2185b 100%)" }}
                  >
                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-5">
                      <Film className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="font-heading font-bold text-white text-2xl mb-2">Vos vidéos sont prêtes !</h2>
                    <p className="text-white/80 text-sm mb-6">Cliquez ci-dessous pour accéder à toutes vos vidéos.</p>
                    <a href={campaign.video_delivery_link} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-white text-[#FF2E63] hover:bg-gray-100 font-bold shadow-xl px-8 py-3 h-auto text-base">
                        <Download className="w-5 h-5 mr-2" />
                        Télécharger les vidéos
                      </Button>
                    </a>
                  </div>
                  {campaign.delivery_notes && (
                    <div className="bg-white rounded-2xl shadow-sm p-5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Note de livraison</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{campaign.delivery_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm py-20 text-center px-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                    <Film className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-base font-semibold text-gray-500 mb-2">
                    Vos vidéos ne sont pas encore disponibles
                  </p>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto">
                    Elles seront accessibles ici une fois le tournage et le montage terminés.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#FF2E63] bg-[#FFF1F5] px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF2E63] animate-pulse" />
                    Étape actuelle : {status.label}
                  </div>
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
