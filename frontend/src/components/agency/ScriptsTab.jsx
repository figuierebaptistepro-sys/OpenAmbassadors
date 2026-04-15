import { useState } from "react";
import { Plus, X, CheckCircle, AlertCircle, Clock, Film, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { FileText } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  en_attente:              { label: "En attente",      badge: "bg-gray-100 text-gray-600",     border: "border-gray-200",   bg: "bg-white"        },
  valide:                  { label: "Validé",           badge: "bg-green-100 text-green-700",   border: "border-green-200",  bg: "bg-green-50"     },
  modifications_demandees: { label: "Modifs demandées", badge: "bg-orange-100 text-orange-700", border: "border-orange-200", bg: "bg-orange-50"    },
  refuse:                  { label: "Refusé",           badge: "bg-red-100 text-red-700",       border: "border-red-200",    bg: "bg-red-50"       },
  realise:                 { label: "Réalisé 🎬",       badge: "bg-purple-100 text-purple-700", border: "border-purple-100", bg: "bg-purple-50/40" },
};

async function patchScriptStatus(campaignId, scriptId, status) {
  return fetch(`${API_URL}/api/admin/agency/campaigns/${campaignId}/scripts/${scriptId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
}

export default function ScriptsTab({ campaign, campaignId, campaignStatus, onUpdate }) {
  const [newScript, setNewScript] = useState({ title: "", content: "" });
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState({}); // script_id → bool for realise collapse
  const [updating, setUpdating] = useState(null);
  const [showRealise, setShowRealise] = useState(false);

  const isTournage = campaignStatus === "tournage";

  const updateStatus = async (scriptId, status) => {
    setUpdating(scriptId);
    const r = await patchScriptStatus(campaignId, scriptId, status);
    if (r.ok) {
      onUpdate({ ...campaign, scripts: (campaign.scripts || []).map(s => s.script_id === scriptId ? { ...s, status } : s) });
      toast.success(status === "realise" ? "Script marqué réalisé 🎬" : "Statut mis à jour");
    } else {
      toast.error("Erreur mise à jour");
    }
    setUpdating(null);
  };

  const addScript = async () => {
    if (!newScript.title.trim()) { toast.error("Titre requis"); return; }
    setAdding(true);
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${campaignId}/scripts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(newScript),
    });
    if (r.ok) {
      const added = await r.json();
      onUpdate({ ...campaign, scripts: [...(campaign.scripts || []), added] });
      setNewScript({ title: "", content: "" });
      toast.success("Script ajouté");
    }
    setAdding(false);
  };

  const deleteScript = async (scriptId) => {
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${campaignId}/scripts/${scriptId}`, {
      method: "DELETE", credentials: "include",
    });
    if (r.ok) {
      onUpdate({ ...campaign, scripts: (campaign.scripts || []).filter(s => s.script_id !== scriptId) });
      toast.success("Script supprimé");
    }
  };

  const scripts = campaign?.scripts || [];
  const active = scripts.filter(s => s.status !== "realise");
  const realise = scripts.filter(s => s.status === "realise");

  // Stats bar
  const stats = {
    total: scripts.length,
    valide: scripts.filter(s => s.status === "valide").length,
    en_attente: scripts.filter(s => s.status === "en_attente").length,
    modifs: scripts.filter(s => s.status === "modifications_demandees").length,
    realise: realise.length,
  };

  return (
    <div className="space-y-4">

      {/* Stats overview */}
      {scripts.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total",       value: stats.total,      color: "text-gray-700", bg: "bg-white" },
            { label: "À valider",   value: stats.en_attente, color: "text-gray-600", bg: "bg-gray-50" },
            { label: "Modifs",      value: stats.modifs,     color: "text-orange-700", bg: "bg-orange-50" },
            { label: "Réalisés",    value: stats.realise,    color: "text-purple-700", bg: "bg-purple-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-gray-100 p-3 text-center`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tournage banner */}
      {isTournage && stats.valide > 0 && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <Camera className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <p className="text-xs text-purple-700 flex-1">
            <span className="font-semibold">Mode tournage</span> — {stats.valide} script{stats.valide > 1 ? "s" : ""} validé{stats.valide > 1 ? "s" : ""} à réaliser.
            Marquez-les comme réalisés au fur et à mesure.
          </p>
        </div>
      )}

      {/* Active scripts */}
      {active.length === 0 && realise.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun script pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {active.map(s => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.en_attente;
            const isUpdating = updating === s.script_id;
            return (
              <div key={s.script_id} className={`rounded-xl border p-4 ${cfg.border} ${cfg.bg}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title + badge */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm text-gray-900">{s.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                    </div>
                    {/* Content */}
                    {s.content && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{s.content}</p>
                    )}
                    {/* Client comment */}
                    {s.status === "modifications_demandees" && s.client_comment && (
                      <div className="mt-2 bg-orange-100 border border-orange-200 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-orange-800 mb-0.5">Commentaire client :</p>
                        <p className="text-sm text-orange-700 italic">"{s.client_comment}"</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteScript(s.script_id)} className="text-gray-200 hover:text-red-400 flex-shrink-0 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-black/5">
                  {/* Client-facing actions */}
                  <button disabled={isUpdating || s.status === "valide"}
                    onClick={() => updateStatus(s.script_id, "valide")}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors">
                    <CheckCircle className="w-3 h-3" /> Valider
                  </button>
                  <button disabled={isUpdating || s.status === "modifications_demandees"}
                    onClick={() => updateStatus(s.script_id, "modifications_demandees")}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors">
                    <AlertCircle className="w-3 h-3" /> Modifs
                  </button>
                  <button disabled={isUpdating || s.status === "en_attente"}
                    onClick={() => updateStatus(s.script_id, "en_attente")}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors">
                    <Clock className="w-3 h-3" /> En attente
                  </button>

                  {/* Tournage-only action */}
                  {isTournage && (s.status === "valide" || s.status === "en_attente") && (
                    <button disabled={isUpdating}
                      onClick={() => updateStatus(s.script_id, "realise")}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors ml-auto">
                      <Film className="w-3 h-3" /> Marquer réalisé
                    </button>
                  )}
                  {isUpdating && <span className="text-[10px] text-gray-400 ml-auto">Mise à jour...</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Réalisés — collapsible section */}
      {realise.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowRealise(v => !v)}
            className="flex items-center gap-2 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors mb-2"
          >
            <Film className="w-3.5 h-3.5" />
            {realise.length} script{realise.length > 1 ? "s" : ""} réalisé{realise.length > 1 ? "s" : ""} 🎬
            {showRealise ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showRealise && (
            <div className="space-y-2">
              {realise.map(s => (
                <div key={s.script_id} className="rounded-xl border border-purple-100 bg-purple-50/40 px-4 py-3 flex items-center gap-3">
                  <Film className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 line-through decoration-purple-300">{s.title}</p>
                    {s.content && <p className="text-xs text-gray-400 truncate mt-0.5">{s.content}</p>}
                  </div>
                  <button
                    onClick={() => updateStatus(s.script_id, "valide")}
                    className="text-[10px] text-purple-400 hover:text-purple-700 flex-shrink-0 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add script */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 space-y-3 bg-white">
        <p className="text-sm font-semibold text-gray-600">+ Ajouter un script</p>
        <Input
          className="h-10 border-gray-200"
          placeholder="Titre (ex: Script UGC Tenue été)"
          value={newScript.title}
          onChange={e => setNewScript(s => ({ ...s, title: e.target.value }))}
        />
        <Textarea
          className="border-gray-200 resize-none min-h-[100px]"
          placeholder="Contenu — scène par scène, texte, indications visuelles, ton..."
          value={newScript.content}
          onChange={e => setNewScript(s => ({ ...s, content: e.target.value }))}
        />
        <Button onClick={addScript} disabled={adding || !newScript.title.trim()} className="bg-gray-900 hover:bg-gray-800 text-white text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          {adding ? "Ajout..." : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}
