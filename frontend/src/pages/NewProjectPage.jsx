import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Upload, Image, X, Calendar, MapPin, Users, Euro,
  Clock, FileText, CheckCircle, AlertCircle, Briefcase, Sparkles,
  Globe, Building2, Crown
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CONTENT_TYPES = [
  { value: "UGC", label: "UGC", desc: "Contenu généré par les utilisateurs" },
  { value: "Face cam", label: "Face Cam", desc: "Vidéos face caméra" },
  { value: "Ads", label: "Publicités", desc: "Contenu publicitaire" },
  { value: "Micro-trottoir", label: "Micro-trottoir", desc: "Interviews de rue" },
  { value: "Review", label: "Test produit", desc: "Avis et démonstrations" },
  { value: "Tutoriel", label: "Tutoriel", desc: "Vidéos explicatives" },
];

const DURATIONS = [
  { value: "1 semaine", label: "1 semaine" },
  { value: "2 semaines", label: "2 semaines" },
  { value: "1 mois", label: "1 mois" },
  { value: "2 mois", label: "2 mois" },
  { value: "3 mois", label: "3 mois+" },
];

const DELIVERABLES = [
  "Vidéo verticale (9:16)",
  "Vidéo horizontale (16:9)",
  "Vidéo carrée (1:1)",
  "Photo produit",
  "Story Instagram",
  "Reel Instagram",
  "TikTok",
  "YouTube Short",
  "Droits publicitaires",
  "Droits réseaux sociaux",
];

const NewProjectPage = ({ user }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    brief: "",
    content_type: "UGC",
    budget: "",
    target_creators: 1,
    duration: "2 semaines",
    deadline: "",
    location: "",
    remote_ok: true,
    requirements: [],
    deliverables: [],
    incubator_only: false,
    banner_url: "",
  });
  
  const [newRequirement, setNewRequirement] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, statsRes, packsRes] = await Promise.all([
        fetch(`${API_URL}/api/business/me/profile`, { credentials: "include" }),
        fetch(`${API_URL}/api/stats/business`, { credentials: "include" }),
        fetch(`${API_URL}/api/packs`),
      ]);

      if (profileRes.ok) setProfile(await profileRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (packsRes.ok) setPacks(await packsRes.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/upload/project-banner`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setForm({ ...form, banner_url: data.banner_url });
        toast.success("Image uploadée !");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur upload");
        setPreviewUrl(null);
      }
    } catch (error) {
      toast.error("Erreur lors de l'upload");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreviewUrl(null);
    setForm({ ...form, banner_url: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setForm({ ...form, requirements: [...form.requirements, newRequirement.trim()] });
      setNewRequirement("");
    }
  };

  const removeRequirement = (index) => {
    setForm({ ...form, requirements: form.requirements.filter((_, i) => i !== index) });
  };

  const toggleDeliverable = (deliverable) => {
    if (form.deliverables.includes(deliverable)) {
      setForm({ ...form, deliverables: form.deliverables.filter(d => d !== deliverable) });
    } else {
      setForm({ ...form, deliverables: [...form.deliverables, deliverable] });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.banner_url) {
      toast.error("L'image de couverture est obligatoire");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    if (!form.description.trim()) {
      toast.error("La description est obligatoire");
      return;
    }
    if (!form.budget || parseInt(form.budget) <= 0) {
      toast.error("Le budget est obligatoire");
      return;
    }

    if (!stats?.selected_pack) {
      toast.error("Vous devez d'abord choisir un pack");
      navigate("/billing");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          pack_id: stats.selected_pack,
          budget: parseInt(form.budget) || 0,
          target_creators: parseInt(form.target_creators) || 1,
        }),
      });

      if (response.ok) {
        toast.success("Projet créé avec succès !");
        navigate("/business");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const currentPack = packs.find(p => p.pack_id === stats?.selected_pack);
  
  const isFormValid = form.banner_url && form.title && form.description && form.budget;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppLayout user={user} currentPlan={currentPack?.name}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/business")}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Nouveau projet</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Créez une mission pour les créateurs</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Banner Upload - REQUIRED */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Upload Area */}
                  <div 
                    className={`relative h-48 sm:h-64 bg-gray-100 ${!previewUrl ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}`}
                    onClick={() => !previewUrl && fileInputRef.current?.click()}
                  >
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(); }}
                          className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-medium flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Image uploadée
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        {uploading ? (
                          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-3">
                              <Image className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="font-medium text-gray-600 text-sm">Ajouter une image de couverture</p>
                            <p className="text-gray-400 text-xs mt-1">JPG, PNG, WEBP • Max 5MB</p>
                            <Badge className="mt-3 bg-primary/10 text-primary">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Obligatoire
                            </Badge>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="banner-upload"
                  />
                </div>

                {/* Business Info Preview */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center shadow-sm border border-gray-100">
                      {user?.picture ? (
                        <img src={getImageUrl(user.picture)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{profile?.company_name || "Votre entreprise"}</p>
                      <p className="text-gray-500 text-xs">{profile?.industry || "Secteur"} • {profile?.city || "Ville"}</p>
                    </div>
                    {currentPack && (
                      <Badge className="ml-auto bg-primary/10 text-primary text-xs">
                        {currentPack.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Form */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 sm:p-6 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Titre du projet <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex: Campagne TikTok beauté été 2025"
                    className="bg-gray-50 border-gray-200"
                    data-testid="project-title"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Décrivez votre projet en quelques lignes..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none text-sm"
                    data-testid="project-description"
                  />
                </div>

                {/* Brief détaillé */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    Brief détaillé pour les créateurs
                  </Label>
                  <textarea
                    value={form.brief}
                    onChange={(e) => setForm({ ...form, brief: e.target.value })}
                    placeholder="Instructions détaillées, ton souhaité, exemples de contenu, do's and don'ts..."
                    className="w-full h-32 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 resize-none text-sm"
                    data-testid="project-brief"
                  />
                </div>

                {/* Type & Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Type de contenu</Label>
                    <select
                      value={form.content_type}
                      onChange={(e) => setForm({ ...form, content_type: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                      data-testid="content-type"
                    >
                      {CONTENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-400" />
                      Budget total <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      placeholder="500"
                      className="bg-gray-50 border-gray-200"
                      data-testid="project-budget"
                    />
                  </div>
                </div>

                {/* Creators & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      Nombre de créateurs
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.target_creators}
                      onChange={(e) => setForm({ ...form, target_creators: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                      data-testid="target-creators"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      Durée estimée
                    </Label>
                    <select
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                      data-testid="project-duration"
                    >
                      {DURATIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Deadline & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Date limite (optionnel)
                    </Label>
                    <Input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      className="bg-gray-50 border-gray-200"
                      data-testid="project-deadline"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Localisation
                    </Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Ex: Paris, Lyon, Remote..."
                      className="bg-gray-50 border-gray-200"
                      data-testid="project-location"
                    />
                  </div>
                </div>

                {/* Remote OK */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Travail à distance accepté</p>
                      <p className="text-gray-500 text-xs">Les créateurs peuvent travailler de n&apos;importe où</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.remote_ok}
                    onCheckedChange={(checked) => setForm({ ...form, remote_ok: checked })}
                    data-testid="remote-toggle"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Deliverables */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Livrables attendus
                </h3>
                <p className="text-gray-500 text-sm mb-4">Sélectionnez ce que vous attendez des créateurs</p>
                
                <div className="flex flex-wrap gap-2">
                  {DELIVERABLES.map((deliverable) => (
                    <button
                      key={deliverable}
                      onClick={() => toggleDeliverable(deliverable)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.deliverables.includes(deliverable)
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      data-testid={`deliverable-${deliverable.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      {form.deliverables.includes(deliverable) && (
                        <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />
                      )}
                      {deliverable}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Requirements */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Exigences spécifiques
                </h3>
                <p className="text-gray-500 text-sm mb-4">Ajoutez des critères spécifiques pour les créateurs</p>
                
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    placeholder="Ex: Minimum 10k abonnés TikTok"
                    className="bg-gray-50 border-gray-200 flex-1"
                    onKeyPress={(e) => e.key === "Enter" && addRequirement()}
                    data-testid="requirement-input"
                  />
                  <Button onClick={addRequirement} variant="outline" className="border-gray-200">
                    Ajouter
                  </Button>
                </div>

                {form.requirements.length > 0 && (
                  <div className="space-y-2">
                    {form.requirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">{req}</span>
                        <button
                          onClick={() => removeRequirement(index)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Only */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Crown className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Réserver aux membres Incubateur</p>
                      <p className="text-gray-500 text-xs">Seuls les créateurs Premium verront cette mission</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.incubator_only}
                    onCheckedChange={(checked) => setForm({ ...form, incubator_only: checked })}
                    data-testid="premium-toggle"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Submit */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 pt-2"
          >
            <Button
              variant="outline"
              onClick={() => navigate("/business")}
              className="flex-1 sm:flex-none border-gray-200"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className="flex-1 bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
              data-testid="submit-project-btn"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              Publier le projet
            </Button>
          </motion.div>

          {/* Validation Summary */}
          {!isFormValid && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 text-sm">Champs obligatoires manquants</p>
                  <ul className="mt-1 text-yellow-700 text-xs space-y-0.5">
                    {!form.banner_url && <li>• Image de couverture</li>}
                    {!form.title && <li>• Titre du projet</li>}
                    {!form.description && <li>• Description</li>}
                    {!form.budget && <li>• Budget</li>}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default NewProjectPage;
