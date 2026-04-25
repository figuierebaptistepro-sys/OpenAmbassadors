import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Film, PlayCircle, Download, X, Mail, Check, Bell, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
};

const SharePage = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const isUnsub = searchParams.get("unsubscribe") === "1" || window.location.pathname.endsWith("/unsubscribe");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const [selectedVideo, setSelectedVideo] = useState(null);

  // Auto-unsubscribe handler if URL is /share/:token/unsubscribe?email=...&t=...
  const [unsubResult, setUnsubResult] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes("/unsubscribe")) {
      const e = searchParams.get("email");
      const t = searchParams.get("t");
      if (e && t) {
        fetch(`${API_URL}/api/share/${token}/unsubscribe?email=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`)
          .then(r => r.json().then(j => ({ ok: r.ok, j })))
          .then(({ ok, j }) => {
            setUnsubResult(ok ? "ok" : (j.detail || "Erreur"));
          })
          .catch(() => setUnsubResult("Erreur réseau"));
      } else {
        setUnsubResult("Paramètres manquants");
      }
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/share/${token}`)
      .then(async r => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.detail || "Lien invalide");
        }
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${API_URL}/api/share/${token}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (r.ok) {
        setSubscribed(true);
        toast.success("Vous serez notifié des nouveaux fichiers");
      } else {
        const j = await r.json().catch(() => ({}));
        toast.error(j.detail || "Erreur lors de l'inscription");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render: unsubscribe page ----
  if (window.location.pathname.includes("/unsubscribe")) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          {unsubResult === null ? (
            <>
              <div className="w-10 h-10 border-4 border-[#FF2E63] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Désinscription en cours…</p>
            </>
          ) : unsubResult === "ok" ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="font-heading font-bold text-xl text-gray-900 mb-2">Désinscription confirmée</h1>
              <p className="text-sm text-gray-500">Vous ne recevrez plus de notifications pour ce partage.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="font-heading font-bold text-xl text-gray-900 mb-2">Désinscription impossible</h1>
              <p className="text-sm text-gray-500">{unsubResult}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF2E63] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="font-heading font-bold text-xl text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const videos = data?.delivered_videos || [];

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      {/* Top header bar */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg" style={{ background: "linear-gradient(135deg, #FF2E63 0%, #c2185b 100%)" }} />
            <span className="font-heading font-bold text-gray-900">OpenAmbassadors</span>
          </div>
          <span className="text-xs text-gray-400">Partage privé</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero */}
        <div
          className="rounded-2xl p-6 sm:p-8 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, #FF2E63 0%, #c2185b 100%)" }}
        >
          <p className="text-white/70 text-xs uppercase font-semibold tracking-wider mb-2">Partage</p>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl mb-2">{data.title}</h1>
          {(data.videos_total || data.videos_delivered) && (
            <p className="text-white/80 text-sm">
              {data.videos_delivered || 0}{data.videos_total ? ` / ${data.videos_total}` : ""} fichier{(data.videos_delivered || 0) > 1 ? "s" : ""} disponible{(data.videos_delivered || 0) > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Notification subscribe */}
        <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FFF1F5] rounded-xl flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-[#FF2E63]" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-gray-900">Recevoir les notifications</h2>
              <p className="text-sm text-gray-500">Soyez alerté par email à chaque nouveau fichier ajouté.</p>
            </div>
          </div>

          {subscribed ? (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
              <Check className="w-4 h-4" />
              Notifications activées pour <strong>{email}</strong>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:border-[#FF2E63] focus:outline-none text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 px-6 text-white font-semibold"
                style={{ background: "linear-gradient(90deg, #FF2E63, #FF5C8A)" }}
              >
                {submitting ? "..." : "M'inscrire"}
              </Button>
            </form>
          )}
        </div>

        {/* Files */}
        {videos.length > 0 ? (
          <div className="space-y-4">
            <h2 className="font-heading font-semibold text-gray-900 px-1">Fichiers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {videos.map(v => (
                <div
                  key={v.video_id}
                  className="relative group rounded-2xl overflow-hidden bg-gray-900 aspect-[9/16] cursor-pointer shadow-md"
                  onClick={() => setSelectedVideo(v)}
                >
                  {v.thumbnail ? (
                    <img src={getMediaUrl(v.thumbnail)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #FF2E63 0%, #c2185b 100%)" }}
                    >
                      <Film className="w-8 h-8 text-white/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <PlayCircle className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[10px] text-white truncate">{v.filename}</p>
                  </div>
                </div>
              ))}
            </div>
            {data.delivery_notes && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Note de livraison</p>
                <p className="text-sm text-gray-600 leading-relaxed">{data.delivery_notes}</p>
              </div>
            )}
          </div>
        ) : data.video_delivery_link ? (
          <a
            href={data.video_delivery_link}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl p-8 text-center shadow-sm bg-white hover:shadow-md transition-all"
          >
            <div className="w-16 h-16 bg-[#FFF1F5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-[#FF2E63]" />
            </div>
            <p className="font-heading font-semibold text-gray-900 mb-1">Télécharger les fichiers</p>
            <p className="text-sm text-gray-500">Cliquez pour accéder au dossier de partage</p>
          </a>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-500 mb-1">Aucun fichier pour le moment</p>
            <p className="text-sm text-gray-400">
              Inscrivez-vous ci-dessus pour être notifié dès qu'un fichier est disponible.
            </p>
          </div>
        )}
      </main>

      {/* Video player modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm"
            >
              <X className="w-5 h-5" /> Fermer
            </button>
            <video
              src={getMediaUrl(selectedVideo.url)}
              controls
              autoPlay
              className="w-full rounded-2xl shadow-2xl max-h-[70vh]"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-white/70 text-sm truncate">{selectedVideo.filename}</p>
              <a
                href={getMediaUrl(selectedVideo.url)}
                download={selectedVideo.filename}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white text-[#FF2E63] font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-100"
              >
                <Download className="w-4 h-4" /> Télécharger
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharePage;
