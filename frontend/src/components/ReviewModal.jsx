import { useState } from "react";
import { Star, X, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ReviewModal = ({ isOpen, onClose, mission, reviewee, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Veuillez sélectionner une note");
      return;
    }
    if (comment.length < 10) {
      setError("Le commentaire doit faire au moins 10 caractères");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mission_id: mission.project_id || mission.mission_id,
          rating,
          comment,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.detail || "Erreur lors de l'envoi");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {success ? (
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Merci pour votre avis !</h3>
              <p className="text-gray-500">Votre évaluation a été publiée avec succès.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">Évaluer votre collaboration</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Mission : {mission?.title || mission?.mission_title}
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Reviewee info */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {reviewee?.picture || reviewee?.reviewee_picture ? (
                      <img
                        src={reviewee?.picture || reviewee?.reviewee_picture}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                        {(reviewee?.name || reviewee?.reviewee_name || "?")[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {reviewee?.name || reviewee?.reviewee_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {reviewee?.company_name || ""}
                    </p>
                  </div>
                </div>

                {/* Star Rating */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Comment évaluez-vous cette collaboration ?
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${
                            star <= (hoverRating || rating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {rating === 1 && "Très insatisfait"}
                    {rating === 2 && "Insatisfait"}
                    {rating === 3 && "Correct"}
                    {rating === 4 && "Satisfait"}
                    {rating === 5 && "Excellent !"}
                  </p>
                </div>

                {/* Comment */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Décrivez votre expérience
                  </label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Partagez les détails de votre collaboration..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {comment.length}/2000 (min. 10)
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Badge info */}
                <div className="mb-6 p-3 bg-primary/5 rounded-lg flex items-start gap-2">
                  <span className="text-lg">✅</span>
                  <p className="text-xs text-gray-600">
                    Cet avis sera marqué comme <strong>"Avis vérifié via OpenAmbassadors"</strong> car il est lié à une mission réalisée sur la plateforme.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    "Publier l'avis"
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReviewModal;
