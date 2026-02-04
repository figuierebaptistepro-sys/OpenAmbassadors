import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Star, CheckCircle, AlertCircle, Loader2, ExternalLink, Users, Briefcase, Zap, ArrowRight, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ExternalReviewPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invitationData, setInvitationData] = useState(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setError("Lien invalide");
      setLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reviews/external/validate?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setInvitationData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Ce lien n'est plus valide");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError("Veuillez sélectionner une note");
      return;
    }
    if (comment.length < 10) {
      setError("Le commentaire doit faire au moins 10 caractères");
      return;
    }
    if (!reviewerName.trim()) {
      setError("Veuillez entrer votre nom");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/reviews/external`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          comment,
          reviewer_name: reviewerName,
        }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.detail || "Erreur lors de l'envoi");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // SUCCESS PAGE - avec CTA pour s'inscrire
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-pink-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">🌟</span>
              </div>
              <span className="text-xl font-bold text-gray-900">OpenAmbassadors</span>
            </Link>
          </div>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8"
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white mb-2">Merci pour votre avis !</h1>
              <p className="text-white/90">
                Votre évaluation de {rating} étoile{rating > 1 ? 's' : ''} a été publiée avec succès.
              </p>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-600">
                Vous venez d'aider <strong>{invitationData?.creator_name}</strong> à développer sa réputation sur OpenAmbassadors.
              </p>
            </div>
          </motion.div>

          {/* CTA Section - Inscription */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-xl overflow-hidden text-white"
          >
            <div className="p-8">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-yellow-400" />
                <span className="text-yellow-400 font-semibold text-sm">OFFRE SPÉCIALE</span>
              </div>
              
              <h2 className="text-2xl font-bold mb-3">
                Besoin de créateurs de contenu pour votre entreprise ?
              </h2>
              <p className="text-gray-300 mb-6">
                Rejoignez OpenAmbassadors et accédez à notre réseau de créateurs vérifiés : 
                UGC, vidéastes, influenceurs... Publiez votre première mission gratuitement !
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-white/10 rounded-xl">
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">500+</div>
                  <div className="text-xs text-gray-400">Créateurs</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl">
                  <Star className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                  <div className="text-2xl font-bold">4.8</div>
                  <div className="text-xs text-gray-400">Note moyenne</div>
                </div>
                <div className="text-center p-4 bg-white/10 rounded-xl">
                  <Zap className="w-6 h-6 mx-auto mb-2 text-green-400" />
                  <div className="text-2xl font-bold">48h</div>
                  <div className="text-xs text-gray-400">Réponse</div>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">Accès à des créateurs vérifiés avec portfolio vidéo</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">Filtrez par ville, spécialité, tarif et disponibilité</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">Messagerie intégrée et gestion de projet simplifiée</span>
                </div>
              </div>

              {/* CTA Button */}
              <Link to={`/login?ref=review&company=${encodeURIComponent(invitationData?.company_name || '')}`}>
                <Button className="w-full bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white py-6 text-lg font-semibold rounded-xl shadow-lg shadow-primary/30">
                  Créer mon compte entreprise gratuitement
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <p className="text-center text-gray-400 text-xs mt-3">
                Inscription gratuite • Pas de carte bancaire requise
              </p>
            </div>
          </motion.div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8">
            OpenAmbassadors - La plateforme qui connecte créateurs et entreprises
          </p>
        </div>
      </div>
    );
  }

  // ERROR PAGE
  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link to="/login">
              <Button className="bg-primary hover:bg-primary/90">
                Découvrir OpenAmbassadors
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // FORM PAGE
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🌟</span>
            </div>
            <span className="text-xl font-bold text-gray-900">OpenAmbassadors</span>
          </Link>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-pink-500 p-6 text-white text-center">
            <h1 className="text-xl font-bold mb-2">Partagez votre expérience</h1>
            <p className="text-white/80 text-sm">
              Votre avis aide les entreprises à trouver les meilleurs créateurs
            </p>
          </div>

          {/* Creator Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                {invitationData?.creator_picture ? (
                  <img
                    src={invitationData.creator_picture}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-2xl font-bold">
                    {(invitationData?.creator_name || "C")[0]}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  {invitationData?.creator_name}
                </p>
                <p className="text-sm text-gray-500">
                  Créateur sur OpenAmbassadors
                </p>
                {invitationData?.collaboration_description && (
                  <p className="text-sm text-gray-600 mt-2 italic bg-gray-50 p-2 rounded-lg">
                    "{invitationData.collaboration_description}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Your Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre nom *
              </label>
              <Input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Jean Dupont"
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Entreprise : <span className="font-medium">{invitationData?.company_name}</span>
              </p>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Votre note *
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre avis *
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Décrivez votre expérience de collaboration avec ce créateur..."
                rows={5}
                className="resize-none bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {comment.length}/2000 (min. 10)
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Info */}
            <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-gray-400 mt-0.5" />
              <p className="text-xs text-gray-500">
                Cet avis sera marqué comme <strong>"Avis externe"</strong> et apparaîtra sur le profil du créateur.
              </p>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 py-6 text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Star className="w-5 h-5 mr-2" />
                  Publier mon avis
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* CTA Teaser */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl text-white text-center"
        >
          <Briefcase className="w-10 h-10 mx-auto mb-3 text-primary" />
          <h3 className="font-bold text-lg mb-2">Vous cherchez des créateurs ?</h3>
          <p className="text-gray-300 text-sm mb-4">
            Découvrez notre réseau de 500+ créateurs vérifiés et publiez votre première mission gratuitement.
          </p>
          <Link to={`/login?ref=review&company=${encodeURIComponent(invitationData?.company_name || '')}`}>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900">
              Découvrir OpenAmbassadors
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          OpenAmbassadors - La plateforme qui connecte créateurs et entreprises
        </p>
      </div>
    </div>
  );
};

export default ExternalReviewPage;
