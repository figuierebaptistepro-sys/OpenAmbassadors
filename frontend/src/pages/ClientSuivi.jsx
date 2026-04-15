import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, AlertCircle, Clock, Film, Package,
  FileText, PlayCircle, ExternalLink, Lock, ArrowRight,
  ChevronRight, RefreshCw, Check, MessageSquare, Star
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUSES = [
  { key: "brief_recu",  label: "Brief reçu",    color: "bg-slate-500"  },
  { key: "casting",     label: "Casting",        color: "bg-blue-500"   },
  { key: "tournage",    label: "Tournage",       color: "bg-amber-500"  },
  { key: "montage",     label: "Montage",        color: "bg-purple-500" },
  { key: "livraison",   label: "Livraison",      color: "bg-green-500"  },
  { key: "termine",     label: "Terminé",        color: "bg-emerald-600"},
];

function groupByPackage(campaigns) {
  const pkgs = {};
  const singles = [];
  campaigns.forEach(c => {
    if (c.package_id) {
      if (!pkgs[c.package_id]) pkgs[c.package_id] = [];
      pkgs[c.package_id].push(c);
    } else {
      singles.push([c]);
    }
  });
  return [
    ...Object.values(pkgs).map(g => g.sort((a, b) => (a.order || 1) - (b.order || 1))),
    ...singles,
  ];
}

// Single script card — client-facing
function ScriptCard({ script, campaignId, onActionDone }) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const doAction = async (action) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/agency/my-campaigns/${campaignId}/scripts/${script.script_id}/action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, comment: comment || undefined }),
      });
      if (r.ok) {
        toast.success(action === "valide" ? "Script validé !" : "Retours envoyés à l'équipe");
        setCommentOpen(false);
        setComment("");
        onActionDone();
      } else {
        toast.error("Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
    setLoading(false);
  };

  const { status, title, content, client_comment } = script;

  // Hide realise from client (it's an internal status)
  if (status === "realise") return null;

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-shadow ${
      status === "en_attente" ? "border-[#FF2E63]/20 shadow-md shadow-[#FF2E63]/5" :
      status === "valide"     ? "border-green-200" :
      status === "modifications_demandees" ? "border-orange-200" :
      "border-gray-200"
    }`}>
      {/* Card top color band */}
      <div className={`h-1 w-full ${
        status === "en_attente"              ? "bg-gradient-to-r from-[#FF2E63] to-[#FF5C8A]" :
        status === "valide"                  ? "bg-green-400" :
        status === "modifications_demandees" ? "bg-orange-400" :
        "bg-gray-200"
      }`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className={`w-4 h-4 flex-shrink-0 ${
              status === "valide" ? "text-green-500" :
              status === "en_attente" ? "text-[#FF2E63]" :
              "text-gray-400"
            }`} />
            <p className="font-semibold text-gray-900 text-sm leading-tight">{title}</p>
          </div>

          {/* Status pill */}
          {status === "valide" && (
            <span className="flex items-center gap-1 text-[11px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
              <Check className="w-3 h-3" /> Approuvé
            </span>
          )}
          {status === "en_attente" && (
            <span className="flex items-center gap-1 text-[11px] bg-[#FFF1F5] text-[#FF2E63] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 animate-pulse">
              <Clock className="w-3 h-3" /> À valider
            </span>
          )}
          {status === "modifications_demandees" && (
            <span className="flex items-center gap-1 text-[11px] bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
              <MessageSquare className="w-3 h-3" /> Retours envoyés
            </span>
          )}
          {status === "refuse" && (
            <span className="flex items-center gap-1 text-[11px] bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
              Refusé
            </span>
          )}
        </div>

        {/* Script content */}
        {content && (
          <div className={`rounded-xl p-4 mb-4 text-sm leading-relaxed whitespace-pre-wrap ${
            status === "valide" ? "bg-green-50/60 text-gray-600" :
            status === "en_attente" ? "bg-gray-50 text-gray-700" :
            "bg-gray-50 text-gray-600"
          }`}>
            {content}
          </div>
        )}

        {/* Previous comment (modifications_demandees) */}
        {status === "modifications_demandees" && client_comment && (
          <div className="flex gap-3 bg-orange-50 border border-orange-100 rounded-xl p-3.5 mb-4">
            <MessageSquare className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-orange-600 mb-1">Votre retour</p>
              <p className="text-sm text-orange-700 italic">"{client_comment}"</p>
            </div>
          </div>
        )}

        {/* Validated state */}
        {status === "valide" && (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Vous avez approuvé ce script — l'équipe peut procéder au tournage.</span>
          </div>
        )}

        {/* Modifications confirmed */}
        {status === "modifications_demandees" && (
          <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Retours reçus — l'équipe va modifier ce script et vous le soumettre à nouveau.</span>
          </div>
        )}

        {/* Actions (only for en_attente) */}
        {status === "en_attente" && (
          <div className="space-y-3">
            <div className="flex gap-2.5">
              <button
                disabled={loading}
                onClick={() => doAction("valide")}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-[#FF2E63] text-white hover:bg-[#e0284f] disabled:opacity-50 transition-colors shadow-sm shadow-[#FF2E63]/20"
              >
                <CheckCircle className="w-4 h-4" />
                Approuver ce script
              </button>
              <button
                disabled={loading}
                onClick={() => setCommentOpen(v => !v)}
                className="flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-xl border-2 border-orange-200 text-orange-700 hover:bg-orange-50 disabled:opacity-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Modifications
              </button>
            </div>

            {commentOpen && (
              <div className="space-y-2.5 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-xs font-semibold text-orange-700">Décrivez les modifications souhaitées :</p>
                <Textarea
                  className="text-sm min-h-[80px] border-orange-200 bg-white"
                  placeholder="Ex : Changer le ton pour être plus dynamique, enlever la partie sur X..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    disabled={loading || !comment.trim()}
                    onClick={() => doAction("modifications_demandees")}
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    Envoyer mes retours
                  </button>
                  <button onClick={() => { setCommentOpen(false); setComment(""); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Single month view
function MonthView({ campaign, onRefresh }) {
  const statusIdx = STATUSES.findIndex(s => s.key === campaign.status);
  const currentStatus = STATUSES[statusIdx] || STATUSES[0];
  const formula = campaign.formula === "20_videos" ? "20 vidéos / mois" :
                  campaign.formula === "12_videos" ? "12 vidéos / mois" : null;

  const scripts = (campaign.scripts || []).filter(s => s.status !== "realise");
  const awaitingCount = scripts.filter(s => s.status === "en_attente").length;
  const validatedCount = scripts.filter(s => s.status === "valide").length;

  return (
    <div className="space-y-6">

      {/* Client notes from the team */}
      {campaign.client_notes && (
        <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Star className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Message de votre équipe</p>
            <p className="text-sm text-gray-700 leading-relaxed">{campaign.client_notes}</p>
          </div>
        </div>
      )}

      {/* Status stepper */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Avancement de la production</p>
        <div className="flex items-center overflow-x-auto pb-1 gap-0">
          {STATUSES.map((s, i) => {
            const done = i < statusIdx;
            const active = i === statusIdx;
            return (
              <div key={s.key} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                    done   ? "bg-[#FF2E63] border-[#FF2E63] text-white" :
                    active ? "bg-white border-[#FF2E63] text-[#FF2E63] shadow-sm ring-4 ring-[#FF2E63]/10" :
                             "bg-gray-100 border-gray-200 text-gray-400"
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-center leading-tight max-w-[52px] text-[9px] font-semibold ${
                    active ? "text-[#FF2E63]" : done ? "text-gray-400" : "text-gray-300"
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < STATUSES.length - 1 && (
                  <div className={`h-0.5 w-6 mx-0.5 mb-4 rounded-full transition-colors ${
                    i < statusIdx ? "bg-[#FF2E63]" : "bg-gray-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scripts section */}
      {scripts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Scripts à valider</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {awaitingCount > 0 && (
                <span className="text-xs bg-[#FFF1F5] text-[#FF2E63] font-semibold px-2 py-0.5 rounded-full">
                  {awaitingCount} en attente
                </span>
              )}
              {validatedCount > 0 && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                  {validatedCount} approuvé{validatedCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Guidance box when scripts need action */}
          {awaitingCount > 0 && (
            <div className="bg-[#FFF1F5] border border-[#FF2E63]/15 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#FF2E63] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[10px] font-bold">{awaitingCount}</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-semibold text-[#FF2E63]">Action requise !</span> Lisez attentivement les scripts ci-dessous et approuvez-les ou demandez des modifications avant le tournage.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {scripts.map(s => (
              <ScriptCard key={s.script_id} script={s} campaignId={campaign.campaign_id} onActionDone={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {scripts.length === 0 && (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Aucun script pour ce mois</p>
          <p className="text-xs text-gray-400 mt-1">Votre équipe préparera les scripts très prochainement</p>
        </div>
      )}

      {/* Videos section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Film className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Vidéos livrées</h3>
        </div>

        {campaign.video_delivery_link ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 text-center space-y-3">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
              <PlayCircle className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Vos vidéos sont prêtes ! 🎉</p>
              <p className="text-xs text-gray-500">Cliquez ci-dessous pour accéder et télécharger vos fichiers</p>
            </div>
            <Button className="bg-[#FF2E63] hover:bg-[#e0284f] text-white shadow-sm shadow-[#FF2E63]/20"
              onClick={() => window.open(campaign.video_delivery_link, "_blank")}>
              <ExternalLink className="w-4 h-4 mr-2" /> Accéder aux vidéos
            </Button>
            {campaign.delivery_notes && (
              <p className="text-xs text-gray-500 italic">{campaign.delivery_notes}</p>
            )}
          </div>
        ) : campaign.delivered_videos?.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {campaign.delivered_videos.map((v, i) => (
                <a key={i} href={v.url} target="_blank" rel="noreferrer"
                  className="group aspect-video bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center relative">
                  <PlayCircle className="w-8 h-8 text-white/60 group-hover:text-white group-hover:scale-110 transition-all" />
                  <span className="absolute bottom-1.5 left-2 text-[10px] text-white/70 truncate max-w-[80%]">{v.name || `Vidéo ${i + 1}`}</span>
                </a>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">{campaign.delivered_videos.length} vidéo{campaign.delivered_videos.length > 1 ? "s" : ""} livrée{campaign.delivered_videos.length > 1 ? "s" : ""}</p>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-200">
            <Film className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">Vos vidéos apparaîtront ici dès la livraison</p>
            {formula && <p className="text-xs text-gray-400 mt-1">{formula}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientSuivi({ user }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkgIdx, setSelectedPkgIdx] = useState(0);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);

  const fetchCampaigns = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/agency/my-campaigns`, { credentials: "include" });
      if (r.ok) setCampaigns(await r.json());
    } catch { toast.error("Erreur de chargement"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const packages = groupByPackage(campaigns);

  // Auto-select active month on pkg change
  useEffect(() => {
    if (packages.length > 0 && packages[selectedPkgIdx]) {
      const pkg = packages[selectedPkgIdx];
      const activeIdx = pkg.findIndex(c => c.status !== "non_commence" && c.status !== "termine");
      setSelectedMonthIdx(activeIdx >= 0 ? activeIdx : Math.max(0, pkg.findLastIndex(c => c.status !== "non_commence")));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPkgIdx, campaigns.length]);

  if (loading) return (
    <AppLayout user={user}>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    </AppLayout>
  );

  if (campaigns.length === 0) return (
    <AppLayout user={user}>
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-[#FFF1F5] rounded-3xl flex items-center justify-center mx-auto mb-5">
          <Film className="w-10 h-10 text-[#FF2E63]" />
        </div>
        <h2 className="font-bold text-gray-900 text-xl mb-2">Votre espace production</h2>
        <p className="text-gray-500 text-sm">Aucune campagne en cours pour le moment.<br />Votre équipe préparera tout très bientôt !</p>
        <button onClick={() => navigate("/business")} className="mt-6 text-sm text-[#FF2E63] font-medium hover:underline flex items-center gap-1 mx-auto">
          Retour au tableau de bord <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </AppLayout>
  );

  const currentPkg = packages[selectedPkgIdx] || [];
  const currentCampaign = currentPkg[selectedMonthIdx] || currentPkg[0];
  const isMultiMonth = currentPkg.length > 1;

  // Count pending scripts across all campaigns
  const totalPending = campaigns.flatMap(c => c.scripts || []).filter(s => s.status === "en_attente").length;

  return (
    <AppLayout user={user}>
      <div className="flex flex-col min-h-screen bg-[#F6F7FB]">

        {/* Page header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-[#FF2E63] flex items-center justify-center">
                    <Film className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h1 className="font-bold text-gray-900 text-lg">Mon espace production</h1>
                </div>
                {totalPending > 0 && (
                  <p className="text-xs text-[#FF2E63] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF2E63] animate-pulse" />
                    {totalPending} script{totalPending > 1 ? "s" : ""} en attente de votre validation
                  </p>
                )}
              </div>
              <button onClick={fetchCampaigns} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">

          {/* Package tabs (if multiple packages) */}
          {packages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {packages.map((pkg, pkgIdx) => {
                const isSelected = pkgIdx === selectedPkgIdx;
                const monthCount = pkg.length;
                const pkgPending = pkg.flatMap(c => c.scripts || []).filter(s => s.status === "en_attente").length;
                return (
                  <button key={pkgIdx} onClick={() => { setSelectedPkgIdx(pkgIdx); setSelectedMonthIdx(0); }}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      isSelected ? "bg-white border-[#FF2E63] text-[#FF2E63] shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    <Package className="w-4 h-4" />
                    Programme {monthCount} mois
                    {pkgPending > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#FF2E63] text-white text-[9px] font-bold flex items-center justify-center">
                        {pkgPending}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Month navigator (if multi-month) */}
          {isMultiMonth && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Programme — {currentPkg.length} mois</p>
              <div className="flex items-center gap-2">
                {currentPkg.map((c, i) => {
                  const isActive = i === selectedMonthIdx;
                  const isNotStarted = c.status === "non_commence";
                  const isDone = c.status === "termine";
                  const pending = (c.scripts || []).filter(s => s.status === "en_attente").length;

                  return (
                    <div key={c.campaign_id} className="flex items-center gap-2 flex-1">
                      <button
                        disabled={isNotStarted}
                        onClick={() => setSelectedMonthIdx(i)}
                        className={`flex flex-col items-center gap-1.5 flex-1 p-2.5 rounded-xl transition-all border ${
                          isActive     ? "bg-[#FFF1F5] border-[#FF2E63]/30 shadow-sm" :
                          isNotStarted ? "bg-gray-50 border-gray-100 cursor-not-allowed opacity-50" :
                          isDone       ? "bg-gray-50 border-gray-100 hover:border-gray-200" :
                                         "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 relative ${
                          isDone       ? "bg-green-500 border-green-500 text-white" :
                          isActive     ? "bg-[#FF2E63] border-[#FF2E63] text-white shadow-md shadow-[#FF2E63]/20" :
                          isNotStarted ? "bg-gray-200 border-gray-200 text-gray-400" :
                                         "bg-gray-100 border-gray-200 text-gray-600"
                        }`}>
                          {isDone ? <Check className="w-4 h-4" /> : isNotStarted ? <Lock className="w-3.5 h-3.5" /> : c.order || i + 1}
                          {pending > 0 && !isNotStarted && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF2E63] border-2 border-white text-white text-[8px] font-bold flex items-center justify-center">
                              {pending}
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-semibold text-center leading-tight ${
                          isActive ? "text-[#FF2E63]" : isDone ? "text-green-600" : isNotStarted ? "text-gray-300" : "text-gray-500"
                        }`}>
                          Mois {c.order || i + 1}
                          <br />
                          <span className="font-normal opacity-75">
                            {isDone ? "Terminé ✓" : isNotStarted ? "À venir" : isActive ? "En cours" : "Passé"}
                          </span>
                        </p>
                      </button>
                      {i < currentPkg.length - 1 && (
                        <div className={`h-px w-4 flex-shrink-0 rounded-full ${
                          i < selectedMonthIdx ? "bg-[#FF2E63]" : "bg-gray-200"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Non-started placeholder */}
          {currentCampaign?.status === "non_commence" && (
            <div className="text-center py-14 bg-white rounded-2xl border border-gray-200">
              <Lock className="w-12 h-12 mx-auto mb-4 text-gray-200" />
              <p className="font-semibold text-gray-600 mb-1">Ce mois n'a pas encore commencé</p>
              <p className="text-xs text-gray-400">Il démarrera à la fin du mois précédent.</p>
            </div>
          )}

          {/* Month content */}
          {currentCampaign && currentCampaign.status !== "non_commence" && (
            <MonthView
              key={currentCampaign.campaign_id}
              campaign={currentCampaign}
              onRefresh={fetchCampaigns}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
