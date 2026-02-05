import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Play, Clock, Star, Crown, Lock, Award, Eye, CheckCircle, Plus, Image, Video, Youtube, ExternalLink, Pencil, Trash2, MoreVertical, Upload, Link, X } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ADMIN_EMAILS = ["figuierebaptistepro@gmail.com"];
const DEFAULT_CATEGORIES = ["Fondamentaux", "Spécialisation", "Avancé", "Business", "Technique"];

const LearnPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  
  // Admin state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageInputMode, setImageInputMode] = useState("upload"); // "upload" or "url"
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const [newArticle, setNewArticle] = useState({
    title: "",
    description: "",
    content: "",
    category: "Fondamentaux",
    duration: "",
    points: 5,
    is_premium: false,
    is_published: true,
    banner_type: "image",
    banner_url: "",
    video_url: "",
    youtube_url: "",
    tags: ""
  });

  const isPremium = user?.is_premium;
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG, WebP ou GIF");
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 10 MB)");
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Clear selected file
  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload file to server
  const uploadFile = async (articleId) => {
    if (!selectedFile) return null;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const res = await fetch(`${API_URL}/api/admin/articles/${articleId}/banner`, {
        method: "POST",
        credentials: "include",
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.url;
      } else {
        const error = await res.json();
        toast.error(error.detail || "Erreur lors de l'upload");
        return null;
      }
    } catch (error) {
      toast.error("Erreur lors de l'upload de l'image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Helper: Extract YouTube video ID from various URL formats
  const getYoutubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Get YouTube thumbnail
  const getYoutubeThumbnail = (url) => {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };

  // Fetch articles and progress
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch articles
        const articlesRes = await fetch(
          `${API_URL}/api/articles?category=${activeCategory === "Tous" ? "" : activeCategory}&search=${searchQuery}`,
          { credentials: "include" }
        );
        
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticles(data.articles || []);
          
          // Build category list with "Tous" first
          const fetchedCategories = data.categories || [];
          setCategories(fetchedCategories);
        }

        // Fetch user progress
        const progressRes = await fetch(`${API_URL}/api/articles/progress/me`, {
          credentials: "include"
        });
        
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setProgress(progressData);
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeCategory, searchQuery]);

  const handleCreateArticle = async () => {
    if (!newArticle.title || !newArticle.description || !newArticle.content) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...newArticle,
        tags: newArticle.tags ? newArticle.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        // Store YouTube URL in video_url if banner_type is youtube
        video_url: newArticle.banner_type === "youtube" ? newArticle.youtube_url : newArticle.video_url
      };

      // First create the article
      const res = await fetch(`${API_URL}/api/admin/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        let created = await res.json();
        
        // If there's a file to upload, upload it now
        if (selectedFile && newArticle.banner_type === "image") {
          const uploadedUrl = await uploadFile(created.article_id);
          if (uploadedUrl) {
            created.banner_url = uploadedUrl;
            // Update article in list with new banner URL
            setArticles(prev => [created, ...prev]);
          } else {
            setArticles(prev => [created, ...prev]);
          }
        } else {
          setArticles(prev => [created, ...prev]);
        }
        
        setShowCreateDialog(false);
        clearFile();
        setImageInputMode("upload");
        setNewArticle({
          title: "",
          description: "",
          content: "",
          category: "Fondamentaux",
          duration: "",
          points: 5,
          is_premium: false,
          is_published: true,
          banner_type: "image",
          banner_url: "",
          video_url: "",
          youtube_url: "",
          tags: ""
        });
        toast.success("Article créé avec succès !");
      } else {
        const error = await res.json();
        toast.error(error.detail || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  // Open edit dialog with article data
  const handleEditClick = (article, e) => {
    e.stopPropagation();
    setSelectedArticle(article);
    setImageInputMode(article.banner_url ? "url" : "upload");
    setNewArticle({
      title: article.title,
      description: article.description,
      content: article.content,
      category: article.category,
      duration: article.duration || "",
      points: article.points,
      is_premium: article.is_premium,
      is_published: article.is_published,
      banner_type: article.banner_type || "image",
      banner_url: article.banner_url || "",
      video_url: article.banner_type === "youtube" ? "" : (article.video_url || ""),
      youtube_url: article.banner_type === "youtube" ? (article.video_url || "") : "",
      tags: article.tags ? article.tags.join(", ") : ""
    });
    setShowEditDialog(true);
  };

  // Update article
  const handleUpdateArticle = async () => {
    if (!newArticle.title || !newArticle.description || !newArticle.content) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...newArticle,
        tags: newArticle.tags ? newArticle.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        video_url: newArticle.banner_type === "youtube" ? newArticle.youtube_url : newArticle.video_url
      };

      const res = await fetch(`${API_URL}/api/admin/articles/${selectedArticle.article_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        let updated = await res.json();
        
        // If there's a new file to upload
        if (selectedFile && newArticle.banner_type === "image") {
          const uploadedUrl = await uploadFile(selectedArticle.article_id);
          if (uploadedUrl) {
            updated.banner_url = uploadedUrl;
          }
        }
        
        setArticles(prev => prev.map(a => a.article_id === updated.article_id ? updated : a));
        setShowEditDialog(false);
        setSelectedArticle(null);
        clearFile();
        toast.success("Article modifié avec succès !");
      } else {
        const error = await res.json();
        toast.error(error.detail || "Erreur lors de la modification");
      }
    } catch (error) {
      toast.error("Erreur lors de la modification");
    } finally {
      setCreating(false);
    }
  };

  // Delete article
  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/articles/${selectedArticle.article_id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        setArticles(prev => prev.filter(a => a.article_id !== selectedArticle.article_id));
        setShowDeleteDialog(false);
        setSelectedArticle(null);
        toast.success("Article supprimé !");
      } else {
        const error = await res.json();
        toast.error(error.detail || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (article, e) => {
    e.stopPropagation();
    setSelectedArticle(article);
    setShowDeleteDialog(true);
  };

  // Reset form when closing dialogs
  const resetForm = () => {
    setNewArticle({
      title: "",
      description: "",
      content: "",
      category: "Fondamentaux",
      duration: "",
      points: 5,
      is_premium: false,
      is_published: true,
      banner_type: "image",
      banner_url: "",
      video_url: "",
      youtube_url: "",
      tags: ""
    });
    setSelectedArticle(null);
    clearFile();
    setImageInputMode("upload");
  };

  const completedIds = progress?.completed_articles || [];
  const allCategories = ["Tous", ...DEFAULT_CATEGORIES];

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Learn</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Formez-vous et gagnez des points</p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary-hover"
              data-testid="create-article-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel article
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Points Banner */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-primary to-primary-hover text-white mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="font-heading font-bold text-sm sm:text-base">
                  {progress ? `${progress.total_points || 0} points gagnés` : "Gagnez des points"}
                </p>
                <p className="text-white/80 text-xs">
                  {progress ? `${progress.total_completed || 0} formations complétées` : "Complétez des formations pour booster votre score"}
                </p>
              </div>
            </div>
            {!isPremium && (
              <Badge className="bg-white/20 text-white text-xs hidden sm:inline-flex">
                <Crown className="w-3 h-3 mr-1" />
                Premium: accès illimité
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
              data-testid="search-articles"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
                data-testid={`category-${cat.toLowerCase()}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : articles.length > 0 ? (
          /* Articles Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="articles-grid">
            {articles.map((article) => {
              const isLocked = article.is_premium && !isPremium;
              const isComplete = completedIds.includes(article.article_id);
              
              return (
                <Card 
                  key={article.article_id} 
                  className={`border-0 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all ${isLocked ? "opacity-75" : ""}`}
                  onClick={() => navigate(`/learn/${article.article_id}`)}
                  data-testid={`article-card-${article.article_id}`}
                >
                  {/* Banner/Video Preview */}
                  <div className="h-32 sm:h-36 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center relative overflow-hidden">
                    {/* YouTube video thumbnail */}
                    {article.banner_type === "youtube" && article.video_url ? (
                      <img 
                        src={`https://img.youtube.com/vi/${getYoutubeId(article.video_url)}/hqdefault.jpg`}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : article.banner_url ? (
                      <img 
                        src={article.banner_url} 
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    ) : article.video_url ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <Play className="w-10 h-10 text-white/80" />
                      </div>
                    ) : (
                      <BookOpen className="w-10 h-10 text-gray-300" />
                    )}
                    
                    {/* Play overlay for YouTube */}
                    {article.banner_type === "youtube" && article.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                          <Play className="w-5 h-5 text-white ml-1" fill="white" />
                        </div>
                      </div>
                    )}
                    
                    {/* Badges overlay */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {article.is_premium && (
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                      {!article.is_premium && (
                        <Badge className="bg-green-100 text-green-700 text-xs">Gratuit</Badge>
                      )}
                    </div>
                    
                    {/* Completed badge */}
                    {isComplete && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-500 text-white text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complété
                        </Badge>
                      </div>
                    )}
                    
                    {/* Video indicator */}
                    {(article.banner_type === "video" || article.banner_type === "youtube") && (
                      <div className="absolute bottom-2 left-2">
                        <Badge className={`text-xs ${article.banner_type === "youtube" ? "bg-red-600 text-white" : "bg-black/60 text-white"}`}>
                          {article.banner_type === "youtube" ? (
                            <><Youtube className="w-3 h-3 mr-1" />YouTube</>
                          ) : (
                            <><Video className="w-3 h-3 mr-1" />Vidéo</>
                          )}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      {article.duration && (
                        <>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {article.duration}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        +{article.points} pts
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.views || 0}
                      </span>
                    </div>
                    
                    <h3 className="font-heading font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{article.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {article.category}
                      </Badge>
                      
                      {/* Admin actions menu */}
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEditClick(article, e)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDeleteClick(article, e)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Aucun article trouvé</p>
            {isAdmin && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer le premier article
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Article Dialog (Admin only) */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un nouvel article</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={newArticle.title}
                onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Les bases du contenu UGC"
                data-testid="article-title-input"
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description courte *</Label>
              <Input
                id="description"
                value={newArticle.description}
                onChange={(e) => setNewArticle(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Une phrase d'accroche"
                data-testid="article-description-input"
              />
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Contenu *</Label>
              <Textarea
                id="content"
                value={newArticle.content}
                onChange={(e) => setNewArticle(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Le contenu complet de l'article. Supporte le markdown basique (# ## ### pour les titres, **gras**, *italique*, - pour les listes)"
                rows={10}
                data-testid="article-content-input"
              />
            </div>
            
            {/* Category & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select 
                  value={newArticle.category} 
                  onValueChange={(v) => setNewArticle(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger data-testid="article-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Durée (optionnel)</Label>
                <Input
                  id="duration"
                  value={newArticle.duration}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="Ex: 30 min, 1h"
                />
              </div>
            </div>
            
            {/* Points & Premium */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min={1}
                  value={newArticle.points}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, points: parseInt(e.target.value) || 5 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={newArticle.is_premium}
                      onCheckedChange={(v) => setNewArticle(prev => ({ ...prev, is_premium: v }))}
                    />
                    Premium
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={newArticle.is_published}
                      onCheckedChange={(v) => setNewArticle(prev => ({ ...prev, is_published: v }))}
                    />
                    Publié
                  </label>
                </div>
              </div>
            </div>
            
            {/* Banner Type */}
            <div className="space-y-2">
              <Label>Type de média</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={newArticle.banner_type === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewArticle(prev => ({ ...prev, banner_type: "image" }))}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Image
                </Button>
                <Button
                  type="button"
                  variant={newArticle.banner_type === "video" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewArticle(prev => ({ ...prev, banner_type: "video" }))}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Vidéo
                </Button>
                <Button
                  type="button"
                  variant={newArticle.banner_type === "youtube" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewArticle(prev => ({ ...prev, banner_type: "youtube" }))}
                  className={newArticle.banner_type === "youtube" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <Youtube className="w-4 h-4 mr-2" />
                  YouTube
                </Button>
              </div>
            </div>
            
            {/* Image - Upload or URL */}
            {newArticle.banner_type === "image" && (
              <div className="space-y-3">
                <Label>Image de couverture</Label>
                
                {/* Toggle between upload and URL */}
                <Tabs value={imageInputMode} onValueChange={setImageInputMode} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Depuis ma galerie
                    </TabsTrigger>
                    <TabsTrigger value="url" className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      URL externe
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {/* Upload mode */}
                {imageInputMode === "upload" && (
                  <div className="space-y-3">
                    {/* File preview */}
                    {filePreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={filePreview} 
                          alt="Preview" 
                          className="w-full h-40 object-cover"
                        />
                        <button
                          type="button"
                          onClick={clearFile}
                          className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          {selectedFile?.name}
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700">Cliquer pour choisir une image</p>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP ou GIF (max 10 MB)</p>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {selectedFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Changer l'image
                      </Button>
                    )}
                  </div>
                )}
                
                {/* URL mode */}
                {imageInputMode === "url" && (
                  <div className="space-y-2">
                    <Input
                      value={newArticle.banner_url}
                      onChange={(e) => setNewArticle(prev => ({ ...prev, banner_url: e.target.value }))}
                      placeholder="https://images.unsplash.com/..."
                    />
                    {newArticle.banner_url && (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={newArticle.banner_url} 
                          alt="Preview" 
                          className="w-full h-40 object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Video URL */}
            {newArticle.banner_type === "video" && (
              <div className="space-y-2">
                <Label htmlFor="video_url">URL de la vidéo (MP4, WebM)</Label>
                <Input
                  id="video_url"
                  value={newArticle.video_url}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            )}
            
            {/* YouTube URL with Preview */}
            {newArticle.banner_type === "youtube" && (
              <div className="space-y-2">
                <Label htmlFor="youtube_url">Lien YouTube</Label>
                <Input
                  id="youtube_url"
                  value={newArticle.youtube_url}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, youtube_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                />
                <p className="text-xs text-gray-500">
                  Formats acceptés : youtube.com/watch?v=..., youtu.be/..., ou juste l'ID de la vidéo
                </p>
                
                {/* YouTube Preview */}
                {newArticle.youtube_url && getYoutubeId(newArticle.youtube_url) && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-sm text-gray-600">Aperçu :</Label>
                    <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
                      <div className="aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYoutubeId(newArticle.youtube_url)}`}
                          title="YouTube Preview"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Vidéo détectée ! ID: {getYoutubeId(newArticle.youtube_url)}
                    </div>
                  </div>
                )}
                
                {newArticle.youtube_url && !getYoutubeId(newArticle.youtube_url) && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ URL YouTube invalide. Vérifiez le format du lien.
                  </p>
                )}
              </div>
            )}
            
            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input
                id="tags"
                value={newArticle.tags}
                onChange={(e) => setNewArticle(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="ugc, débutant, tips"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateArticle}
              disabled={creating}
              className="bg-primary hover:bg-primary-hover"
              data-testid="submit-article-btn"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Création...
                </>
              ) : (
                "Créer l'article"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Article Dialog (Admin only) */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'article</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input
                id="edit-title"
                value={newArticle.title}
                onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description courte *</Label>
              <Input
                id="edit-description"
                value={newArticle.description}
                onChange={(e) => setNewArticle(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="edit-content">Contenu *</Label>
              <Textarea
                id="edit-content"
                value={newArticle.content}
                onChange={(e) => setNewArticle(prev => ({ ...prev, content: e.target.value }))}
                rows={10}
              />
            </div>
            
            {/* Category & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select 
                  value={newArticle.category} 
                  onValueChange={(v) => setNewArticle(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-duration">Durée</Label>
                <Input
                  id="edit-duration"
                  value={newArticle.duration}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="Ex: 30 min, 1h"
                />
              </div>
            </div>
            
            {/* Points & Premium */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-points">Points</Label>
                <Input
                  id="edit-points"
                  type="number"
                  min={1}
                  value={newArticle.points}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, points: parseInt(e.target.value) || 5 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={newArticle.is_premium}
                      onCheckedChange={(v) => setNewArticle(prev => ({ ...prev, is_premium: v }))}
                    />
                    Premium
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={newArticle.is_published}
                      onCheckedChange={(v) => setNewArticle(prev => ({ ...prev, is_published: v }))}
                    />
                    Publié
                  </label>
                </div>
              </div>
            </div>
            
            {/* Banner Type */}
            <div className="space-y-2">
              <Label>Type de média</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={newArticle.banner_type === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewArticle(prev => ({ ...prev, banner_type: "image" }))}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Image
                </Button>
                <Button
                  type="button"
                  variant={newArticle.banner_type === "video" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewArticle(prev => ({ ...prev, banner_type: "video" }))}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Vidéo
                </Button>
                <Button
                  type="button"
                  variant={newArticle.banner_type === "youtube" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewArticle(prev => ({ ...prev, banner_type: "youtube" }))}
                  className={newArticle.banner_type === "youtube" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <Youtube className="w-4 h-4 mr-2" />
                  YouTube
                </Button>
              </div>
            </div>
            
            {/* Image - Upload or URL (Edit mode) */}
            {newArticle.banner_type === "image" && (
              <div className="space-y-3">
                <Label>Image de couverture</Label>
                
                <Tabs value={imageInputMode} onValueChange={setImageInputMode} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Depuis ma galerie
                    </TabsTrigger>
                    <TabsTrigger value="url" className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      URL externe
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {imageInputMode === "upload" && (
                  <div className="space-y-3">
                    {filePreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img src={filePreview} alt="Preview" className="w-full h-40 object-cover" />
                        <button
                          type="button"
                          onClick={clearFile}
                          className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          {selectedFile?.name}
                        </div>
                      </div>
                    ) : newArticle.banner_url ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img src={newArticle.banner_url} alt="Current" className="w-full h-40 object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          Image actuelle
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-700">Cliquer pour choisir une image</p>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP ou GIF (max 10 MB)</p>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {filePreview || newArticle.banner_url ? "Changer l'image" : "Choisir une image"}
                    </Button>
                  </div>
                )}
                
                {imageInputMode === "url" && (
                  <div className="space-y-2">
                    <Input
                      value={newArticle.banner_url}
                      onChange={(e) => setNewArticle(prev => ({ ...prev, banner_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    {newArticle.banner_url && (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img src={newArticle.banner_url} alt="Preview" className="w-full h-40 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {newArticle.banner_type === "video" && (
              <div className="space-y-2">
                <Label>URL de la vidéo</Label>
                <Input
                  value={newArticle.video_url}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            )}
            
            {newArticle.banner_type === "youtube" && (
              <div className="space-y-2">
                <Label>Lien YouTube</Label>
                <Input
                  value={newArticle.youtube_url}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, youtube_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {newArticle.youtube_url && getYoutubeId(newArticle.youtube_url) && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-black aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYoutubeId(newArticle.youtube_url)}`}
                      title="YouTube Preview"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (séparés par des virgules)</Label>
              <Input
                value={newArticle.tags}
                onChange={(e) => setNewArticle(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="ugc, débutant, tips"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateArticle}
              disabled={creating}
              className="bg-primary hover:bg-primary-hover"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "<strong>{selectedArticle?.title}</strong>" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteDialog(false); setSelectedArticle(null); }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArticle}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default LearnPage;
