import { useRef, useState } from "react";
import { Upload, Film, Eye, Download, Trash2, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function VideosTab({ campaign, campaignId, formula, deliveryNotes, onUpdate, onDeliveryNotesChange, onSave, saving }) {
  const videoRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVideo, setPreviewVideo] = useState(null);

  const handleUpload = (file) => {
    setUploading(true);
    setUploadProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        onUpdate({ ...campaign, delivered_videos: [...(campaign.delivered_videos || []), data] });
        toast.success("Vidéo uploadée");
      } else toast.error("Erreur upload");
    };
    xhr.onerror = () => { setUploading(false); toast.error("Erreur réseau"); };
    const fd = new FormData();
    fd.append("file", file);
    xhr.open("POST", `${API_URL}/api/admin/agency/campaigns/${campaignId}/upload-video`);
    xhr.withCredentials = true;
    xhr.send(fd);
  };

  const deleteVideo = async (videoId) => {
    const r = await fetch(`${API_URL}/api/admin/agency/campaigns/${campaignId}/delivered-videos/${videoId}`, {
      method: "DELETE", credentials: "include",
    });
    if (r.ok) {
      onUpdate({ ...campaign, delivered_videos: campaign.delivered_videos.filter(v => v.video_id !== videoId) });
      toast.success("Vidéo supprimée");
    }
  };

  const videos = campaign?.delivered_videos || [];

  return (
    <div className="space-y-5">
      {/* Progress */}
      {formula && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Progression — {formula.label}</p>
            <span className={`text-sm font-bold ${videos.length >= formula.videos ? "text-green-600" : "text-gray-600"}`}>
              {videos.length} / {formula.videos} vidéos
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-3 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (videos.length / formula.videos) * 100)}%`,
                backgroundColor: videos.length >= formula.videos ? "#22c55e" : "#FF2E63",
              }} />
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div>
        <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/avi" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        {uploading ? (
          <div className="border-2 border-[#FF2E63] border-dashed rounded-xl p-6 space-y-3">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-3 bg-[#FF2E63] rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-center text-sm text-gray-500">{uploadProgress}% — Upload en cours...</p>
          </div>
        ) : (
          <button onClick={() => videoRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 hover:border-[#FF2E63] rounded-xl py-8 transition-colors group">
            <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#FF2E63] mx-auto mb-2 transition-colors" />
            <p className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors">Cliquer pour uploader une vidéo</p>
            <p className="text-xs text-gray-300 mt-1">MP4, MOV, WebM — jusqu'à 500MB</p>
          </button>
        )}
      </div>

      {/* Video grid */}
      {videos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">
            Vidéos livrées ({videos.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {videos.map(v => (
              <div key={v.video_id} className="group relative rounded-xl overflow-hidden bg-gray-900 aspect-[9/16] border border-gray-200">
                {v.thumbnail
                  ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Film className="w-8 h-8 text-gray-500" />
                      <p className="text-xs text-gray-500 px-2 text-center truncate">{v.filename}</p>
                    </div>
                }
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <a href={v.url} target="_blank" rel="noreferrer"
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform" onClick={e => e.stopPropagation()}>
                    <Eye className="w-4 h-4 text-gray-800" />
                  </a>
                  <a href={v.url} download
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform" onClick={e => e.stopPropagation()}>
                    <Download className="w-4 h-4 text-gray-800" />
                  </a>
                  <button onClick={() => deleteVideo(v.video_id)}
                    className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
                <p className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] text-white bg-gradient-to-t from-black/80 to-transparent truncate">
                  {v.filename}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery note */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Note de livraison pour le client</label>
        <Textarea
          className="border-gray-200 resize-none min-h-[80px]"
          placeholder="Instructions, mot d'accompagnement..."
          value={deliveryNotes}
          onChange={e => onDeliveryNotesChange(e.target.value)}
        />
        <Button onClick={onSave} disabled={saving} size="sm" className="mt-2 bg-[#FF2E63] hover:bg-[#e0254f] text-white text-xs">
          <Save className="w-3 h-3 mr-1" /> Sauvegarder la note
        </Button>
      </div>
    </div>
  );
}
