import { useState, useEffect } from "react";
import { Star, Shield, ExternalLink, Flag, ChevronDown, Award } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Badge definitions
const BADGE_INFO = {
  top_rated: { label: "Top Rated", icon: "🏆", color: "bg-yellow-100 text-yellow-800" },
  rising_star: { label: "Rising Star", icon: "⭐", color: "bg-purple-100 text-purple-800" },
  verified_pro: { label: "Pro Vérifié", icon: "✓", color: "bg-blue-100 text-blue-800" },
  perfect_streak: { label: "5 étoiles consécutives", icon: "🔥", color: "bg-orange-100 text-orange-800" },
  trusted_external: { label: "Reconnu externe", icon: "🌐", color: "bg-green-100 text-green-800" },
};

const ReviewCard = ({ review, onReport }) => {
  const isVerified = review.source === "verified";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
      data-testid={`review-card-${review.review_id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold">
            {(review.reviewer_name || "A")[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{review.reviewer_name}</span>
              {isVerified ? (
                <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Vérifié
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-600 text-xs flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  Externe
                </Badge>
              )}
            </div>
            {review.reviewer_company && (
              <span className="text-sm text-gray-500">{review.reviewer_company}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onReport?.(review.review_id)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Signaler"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= review.rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-200"
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {new Date(review.created_at).toLocaleDateString("fr-FR", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Comment */}
      <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
    </motion.div>
  );
};

const RatingDistribution = ({ distribution }) => {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const percent = total > 0 ? (count / total) * 100 : 0;
        
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-8">{star} ★</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8">{count}</span>
          </div>
        );
      })}
    </div>
  );
};

const ReviewsSection = ({ userId, showTitle = true }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ score: 0, count: 0 });
  const [badges, setBadges] = useState([]);
  const [distribution, setDistribution] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reviews/user/${userId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setStats(data.stats || { score: 0, count: 0 });
        setBadges(data.badges || []);
        setDistribution(data.distribution || {});
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (reviewId) => {
    const reason = prompt("Pourquoi souhaitez-vous signaler cet avis ?");
    if (!reason) return;

    try {
      await fetch(`${API_URL}/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      alert("Signalement enregistré. Merci.");
    } catch (error) {
      console.error("Error reporting:", error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Avis & Évaluations</h3>
          {stats.count > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">{stats.score.toFixed(1)}</span>
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-gray-500">({stats.count} avis)</span>
            </div>
          )}
        </div>
      )}

      {stats.count === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun avis pour le moment</p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score & Badges */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-bold text-gray-900">{stats.score.toFixed(1)}</div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(stats.score)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.verified_count} vérifié{stats.verified_count !== 1 ? "s" : ""} · {stats.external_count} externe{stats.external_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              
              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge) => {
                    const info = BADGE_INFO[badge];
                    if (!info) return null;
                    return (
                      <Badge key={badge} className={`${info.color} text-xs`}>
                        <span className="mr-1">{info.icon}</span>
                        {info.label}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Distribution */}
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Répartition des notes</h4>
              <RatingDistribution distribution={distribution} />
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {displayedReviews.map((review) => (
              <ReviewCard key={review.review_id} review={review} onReport={handleReport} />
            ))}
          </div>

          {/* Show More */}
          {reviews.length > 3 && !showAll && (
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              className="w-full"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Voir tous les avis ({reviews.length})
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewsSection;
export { ReviewCard, RatingDistribution, BADGE_INFO };
