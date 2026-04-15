import { useState } from "react";
import { Plus, X, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { FileText } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ScriptsTab({ campaign, campaignId, onUpdate }) {
  const [newScript, setNewScript] = useState({ title: "", content: "" });
  const [adding, setAdding] = useState(false);

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
      onUpdate({ ...campaign, scripts: campaign.scripts.filter(s => s.script_id !== scriptId) });
      toast.success("Script supprimé");
    }
  };

  const scripts = campaign?.scripts || [];

  return (
    <div className="space-y-4">
      {scripts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun script pour l'instant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map(s => (
            <div key={s.script_id} className={`rounded-xl border p-4 ${
              s.status === "modifications_demandees" ? "border-orange-200 bg-orange-50"
              : s.status === "valide" ? "border-green-200 bg-green-50"
              : "border-gray-200 bg-white"
            }`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-gray-900">{s.title}</p>
                    {s.status === "valide" && (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Validé
                      </span>
                    )}
                    {s.status === "en_attente" && (
                      <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> En attente
                      </span>
                    )}
                    {s.status === "modifications_demandees" && (
                      <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Modifs demandées
                      </span>
                    )}
                    {s.status === "refuse" && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Refusé
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{s.content}</p>
                </div>
                <button onClick={() => deleteScript(s.script_id)} className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {s.status === "modifications_demandees" && s.client_comment && (
                <div className="mt-3 bg-orange-100 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-orange-800 mb-1">Commentaire du client :</p>
                  <p className="text-sm text-orange-700 italic">"{s.client_comment}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add script */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-600">Ajouter un script</p>
        <Input
          className="h-10 border-gray-200"
          placeholder="Titre du script (ex: Script UGC Tenue été)"
          value={newScript.title}
          onChange={e => setNewScript(s => ({ ...s, title: e.target.value }))}
        />
        <Textarea
          className="border-gray-200 resize-none min-h-[120px]"
          placeholder="Contenu du script — scène par scène, texte, indications visuelles..."
          value={newScript.content}
          onChange={e => setNewScript(s => ({ ...s, content: e.target.value }))}
        />
        <Button onClick={addScript} disabled={adding || !newScript.title.trim()} className="bg-gray-900 hover:bg-gray-800 text-white text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          {adding ? "Ajout..." : "Ajouter ce script"}
        </Button>
      </div>
    </div>
  );
}
