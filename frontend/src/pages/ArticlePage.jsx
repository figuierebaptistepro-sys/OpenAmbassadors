import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Star, Eye, CheckCircle, Crown, Play, Lock, Share2, BookOpen } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ArticlePage = ({ user }) => {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(null);

  const isPremium = user?.is_premium;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch article
        const articleRes = await fetch(`${API_URL}/api/articles/${articleId}`, {
          credentials: "include"
        });
        
        if (!articleRes.ok) {
          toast.error("Article non trouvé");
          navigate("/learn");
          return;
        }
        
        const articleData = await articleRes.json();
        setArticle(articleData);

        // Fetch user progress
        const progressRes = await fetch(`${API_URL}/api/articles/progress/me`, {
          credentials: "include"
        });
        
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setProgress(progressData);
          setIsCompleted(progressData.completed_articles?.includes(articleId));
        }
      } catch (error) {
        console.error("Error fetching article:", error);
        toast.error("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [articleId, navigate]);

  const handleComplete = async () => {
    if (isCompleted) return;
    
    setCompleting(true);
    try {
      const res = await fetch(`${API_URL}/api/articles/${articleId}/complete`, {
        method: "POST",
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setIsCompleted(true);
        if (data.points_awarded > 0) {
          toast.success(`+${data.points_awarded} points gagnés !`);
        } else {
          toast.info("Article déjà complété");
        }
      } else {
        const error = await res.json();
        toast.error(error.detail || "Erreur");
      }
    } catch (error) {
      toast.error("Erreur lors de la validation");
    } finally {
      setCompleting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié !");
    }
  };

  if (loading) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!article) {
    return null;
  }

  const isLocked = article.is_premium && !isPremium;

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <button 
          onClick={() => navigate("/learn")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
          data-testid="back-to-learn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Retour aux formations</span>
        </button>
        
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{article.category}</Badge>
              {article.is_premium && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              )}
              {isCompleted && (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complété
                </Badge>
              )}
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-900" data-testid="article-title">
              {article.title}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{article.description}</p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="shrink-0"
            data-testid="share-article-btn"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          {article.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.duration}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500" />
            +{article.points} pts
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {article.views || 0} vues
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Locked state for premium content */}
        {isLocked ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-heading text-xl font-bold text-gray-900 mb-2">Contenu Premium</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Ce contenu est réservé aux membres Premium. Passez à Premium pour accéder à toutes les formations et booster votre carrière de créateur.
            </p>
            <Button 
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={() => navigate("/billing")}
              data-testid="upgrade-premium-btn"
            >
              <Crown className="w-4 h-4 mr-2" />
              Passer Premium
            </Button>
          </div>
        ) : (
          <>
            {/* Banner/Video */}
            {(article.banner_url || article.video_url) && (
              <div className="mb-6 rounded-xl overflow-hidden bg-gray-100" data-testid="article-media">
                {article.banner_type === "video" && article.video_url ? (
                  <video 
                    src={article.video_url}
                    controls
                    className="w-full aspect-video object-cover"
                    poster={article.banner_url}
                  />
                ) : article.banner_url ? (
                  <img 
                    src={article.banner_url} 
                    alt={article.title}
                    className="w-full aspect-video object-cover"
                  />
                ) : null}
              </div>
            )}

            {/* Article Content */}
            <article 
              className="prose prose-gray max-w-none mb-8"
              data-testid="article-content"
            >
              <div 
                dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
              />
            </article>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {article.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Complete button */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 text-center">
              {isCompleted ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-medium">Formation complétée !</span>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    Vous avez terminé cette formation ? Validez pour gagner vos points !
                  </p>
                  <Button
                    onClick={handleComplete}
                    disabled={completing}
                    className="bg-primary hover:bg-primary-hover"
                    data-testid="complete-article-btn"
                  >
                    {completing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Validation...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marquer comme terminé (+{article.points} pts)
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

// Helper function to format content (basic markdown-like support)
function formatContent(content) {
  if (!content) return "";
  
  // Convert markdown-style formatting to HTML
  let html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br/>');
  
  // Wrap in paragraphs
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }
  
  // Wrap consecutive li tags in ul
  html = html.replace(/(<li>.*<\/li>)+/gim, '<ul>$&</ul>');
  
  return html;
}

export default ArticlePage;
