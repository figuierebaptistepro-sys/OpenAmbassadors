import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Euro, Zap, ChevronRight, ChevronLeft,
  TrendingUp, Target, Building2, Globe, Hash,
  AtSign, Link2, AlertCircle, Instagram, Youtube, Info
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { apiPost } from "../lib/api";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// TikTok icon component
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const PACKAGES = [
  {
    value: 5000,
    budget: "5 000€",
    power: "Petit pool",
    description: "Idéal pour démarrer",
    color: "from-blue-500 to-cyan-500",
    icon: "🚀"
  },
  {
    value: 15000,
    budget: "15 000€",
    power: "Pool moyen",
    description: "Visibilité significative",
    color: "from-purple-500 to-pink-500",
    popular: true,
    icon: "⚡"
  },
  {
    value: 25000,
    budget: "25 000€",
    power: "Grand pool",
    description: "Impact maximal",
    color: "from-orange-500 to-red-500",
    icon: "🔥"
  }
];

const PLATFORMS = [
  { value: "TIKTOK", name: "TikTok", icon: <TikTokIcon className="w-5 h-5" />, cpmSuggestion: 2.50 },
  { value: "INSTAGRAM_REELS", name: "Instagram Reels", icon: <Instagram className="w-5 h-5" />, cpmSuggestion: 3.00 },
  { value: "YOUTUBE_SHORTS", name: "YouTube Shorts", icon: <Youtube className="w-5 h-5" />, cpmSuggestion: 2.80 }
];

const MAX_PAYOUT_SUGGESTIONS = [50, 100, 150, 200, 250, 300, 400, 500];

const CreatePoolPage = ({ user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Package & Mode
    package: null,
    mode: "CPM",
    cpm_rate: "",
    has_max_payout: false,
    max_payout_per_creator: "",
    
    // Step 2: Platforms & Duration
    platforms: [],
    country: "FR",
    language: "fr",
    duration_days: 30,
    
    // Step 3: Brand Info
    brand: {
      name: user?.company_name || "",
      industry: "",
      website: "",
      social_handles: []
    },
    
    // Step 4: Brief
    brief: {
      offer_description: "",
      key_message: "",
      cta: "",
      landing_url: "",
      mandatory_hashtags: [],
      mandatory_mentions: [],
      content_format: "",
      examples_links: [],
      brand_guidelines: [],
      things_to_avoid: []
    }
  });

  // Temp inputs for array fields
  const [tempHashtag, setTempHashtag] = useState("");
  const [tempMention, setTempMention] = useState("");
  const [tempExample, setTempExample] = useState("");
  const [tempAvoid, setTempAvoid] = useState("");
  const [tempHandle, setTempHandle] = useState("");

  const updateBrand = (field, value) => {
    setFormData(prev => ({
      ...prev,
      brand: { ...prev.brand, [field]: value }
    }));
  };

  const updateBrief = (field, value) => {
    setFormData(prev => ({
      ...prev,
      brief: { ...prev.brief, [field]: value }
    }));
  };

  const addToArray = (field, value, setTemp) => {
    if (!value.trim()) return;
    updateBrief(field, [...formData.brief[field], value.trim()]);
    setTemp("");
  };

  const removeFromArray = (field, index) => {
    updateBrief(field, formData.brief[field].filter((_, i) => i !== index));
  };

  const togglePlatform = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        if (!formData.package) return false;
        if (formData.mode === "CPM" && !formData.cpm_rate) return false;
        if (formData.has_max_payout && !formData.max_payout_per_creator) return false;
        return true;
      case 2:
        return formData.platforms.length > 0 && formData.duration_days >= 7;
      case 3:
        return formData.brand.name && formData.brand.industry;
      case 4:
        return formData.brief.offer_description && formData.brief.key_message && formData.brief.cta;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        cpm_rate: formData.mode === "CPM" ? parseFloat(formData.cpm_rate) : null,
        max_payout_per_creator: formData.has_max_payout ? parseFloat(formData.max_payout_per_creator) : null
      };

      // Use the safe API helper to avoid body stream issues
      const result = await apiPost("/api/stripe/pool-checkout", {
        pool_data: payload,
        origin_url: window.location.origin
      });

      if (result.isHtml) {
        toast.error("Erreur: HTML reçu au lieu de JSON (proxy /api mal configuré)");
        return;
      }

      if (result.ok && result.data.checkout_url) {
        window.location.href = result.data.checkout_url;
      } else {
        toast.error(result.data?.detail || "Erreur lors de la création");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const selectedPackage = PACKAGES.find(p => p.value === formData.package);

  return (
    <AppLayout user={user}>
      {/* Progress Header */}
      <div className="bg-white border-b sticky top-14 lg:top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => step > 1 ? setStep(step - 1) : navigate("/business")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              Retour
            </button>
            <span className="text-sm text-gray-500">Étape {step}/4</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        {/* Step 1: Package & Mode */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Budget & Rémunération
              </h1>
              <p className="text-gray-500">
                Définissez votre budget et comment rémunérer les créateurs
              </p>
            </div>

            {/* Package Selection */}
            <div className="grid md:grid-cols-3 gap-4">
              {PACKAGES.map((pkg) => (
                <Card 
                  key={pkg.value}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    formData.package === pkg.value 
                      ? "ring-2 ring-primary shadow-lg" 
                      : ""
                  } ${pkg.popular ? "relative" : ""}`}
                  onClick={() => setFormData({ ...formData, package: pkg.value })}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-white">Populaire</Badge>
                    </div>
                  )}
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.color} flex items-center justify-center mx-auto mb-4`}>
                      <span className="text-2xl">{pkg.icon}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{pkg.budget}</div>
                    <div className="text-primary font-semibold mb-1">{pkg.power}</div>
                    <div className="text-sm text-gray-500">{pkg.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Mode Selection */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Mode de rémunération</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.mode === "CPM" 
                        ? "border-primary bg-primary/5" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setFormData({ ...formData, mode: "CPM" })}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="font-semibold">CPM</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Vous définissez le prix pour 1000 vues
                    </p>
                  </div>
                  <div 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.mode === "POOL" 
                        ? "border-primary bg-primary/5" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setFormData({ ...formData, mode: "POOL" })}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Pool</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Budget réparti selon les vues de chaque créateur
                    </p>
                  </div>
                </div>

                {/* CPM Rate Input */}
                {formData.mode === "CPM" && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <Label className="mb-2 block">Votre CPM (€ pour 1000 vues) *</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        placeholder="Ex: 2.50"
                        value={formData.cpm_rate}
                        onChange={(e) => setFormData({ ...formData, cpm_rate: e.target.value })}
                        className="w-32"
                      />
                      <span className="text-gray-500">€</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <Info className="w-4 h-4" />
                      <span>Suggestion : TikTok ~2.50€, Instagram ~3€, YouTube ~2.80€</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Max Payout Option */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Plafond par créateur</Label>
                    <p className="text-sm text-gray-500">Limiter le gain maximum par créateur</p>
                  </div>
                  <Switch
                    checked={formData.has_max_payout}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_max_payout: checked })}
                  />
                </div>

                {formData.has_max_payout && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <Label className="mb-2 block">Gain maximum par créateur *</Label>
                    <div className="flex gap-2 items-center mb-3">
                      <Input
                        type="number"
                        min="10"
                        placeholder="Ex: 100"
                        value={formData.max_payout_per_creator}
                        onChange={(e) => setFormData({ ...formData, max_payout_per_creator: e.target.value })}
                        className="w-32"
                      />
                      <span className="text-gray-500">€</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-500">Suggestions :</span>
                      {MAX_PAYOUT_SUGGESTIONS.map((amount) => (
                        <Badge 
                          key={amount}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                          onClick={() => setFormData({ ...formData, max_payout_per_creator: amount.toString() })}
                        >
                          {amount}€
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Platforms & Duration */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Plateformes et durée
              </h1>
              <p className="text-gray-500">
                Où voulez-vous que les créateurs publient ?
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Plateformes *</CardTitle>
                <CardDescription>Sélectionnez au moins une plateforme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  {PLATFORMS.map((platform) => (
                    <div 
                      key={platform.value}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        formData.platforms.includes(platform.value)
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => togglePlatform(platform.value)}
                    >
                      <Checkbox checked={formData.platforms.includes(platform.value)} />
                      {platform.icon}
                      <span className="font-medium">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Durée de la campagne</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de jours *</Label>
                  <Select
                    value={formData.duration_days.toString()}
                    onValueChange={(value) => setFormData({ ...formData, duration_days: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="14">14 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="45">45 jours</SelectItem>
                      <SelectItem value="60">60 jours</SelectItem>
                      <SelectItem value="90">90 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pays cible</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="BE">Belgique</SelectItem>
                        <SelectItem value="CH">Suisse</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Langue</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => setFormData({ ...formData, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">Anglais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Brand Info */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Votre marque
              </h1>
              <p className="text-gray-500">
                Ces informations seront visibles par les créateurs
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Nom de la marque *</Label>
                  <Input
                    placeholder="Ex: OpenAmbassadors"
                    value={formData.brand.name}
                    onChange={(e) => updateBrand("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Secteur d'activité *</Label>
                  <Select
                    value={formData.brand.industry}
                    onValueChange={(value) => updateBrand("industry", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un secteur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Tech / SaaS</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="fashion">Mode / Beauté</SelectItem>
                      <SelectItem value="food">Food / Boisson</SelectItem>
                      <SelectItem value="finance">Finance / Assurance</SelectItem>
                      <SelectItem value="health">Santé / Bien-être</SelectItem>
                      <SelectItem value="travel">Voyage / Tourisme</SelectItem>
                      <SelectItem value="gaming">Gaming / Divertissement</SelectItem>
                      <SelectItem value="education">Éducation</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Site web</Label>
                  <Input
                    placeholder="https://..."
                    value={formData.brand.website}
                    onChange={(e) => updateBrand("website", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Réseaux sociaux</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="@votrecompte"
                      value={tempHandle}
                      onChange={(e) => setTempHandle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (tempHandle.trim()) {
                            updateBrand("social_handles", [...formData.brand.social_handles, tempHandle.trim()]);
                            setTempHandle("");
                          }
                        }
                      }}
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (tempHandle.trim()) {
                          updateBrand("social_handles", [...formData.brand.social_handles, tempHandle.trim()]);
                          setTempHandle("");
                        }
                      }}
                    >
                      Ajouter
                    </Button>
                  </div>
                  {formData.brand.social_handles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.brand.social_handles.map((handle, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => updateBrand("social_handles", formData.brand.social_handles.filter((_, j) => j !== i))}
                        >
                          {handle} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Brief */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Brief créatif
              </h1>
              <p className="text-gray-500">
                Donnez aux créateurs toutes les informations pour réussir
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informations essentielles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Description de l'offre *</Label>
                  <Textarea
                    placeholder="Décrivez votre produit/service..."
                    value={formData.brief.offer_description}
                    onChange={(e) => updateBrief("offer_description", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message clé *</Label>
                  <Input
                    placeholder="Le message principal à transmettre"
                    value={formData.brief.key_message}
                    onChange={(e) => updateBrief("key_message", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Call to Action *</Label>
                  <Input
                    placeholder="Ex: Téléchargez l'app, Découvrez notre offre..."
                    value={formData.brief.cta}
                    onChange={(e) => updateBrief("cta", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL de destination</Label>
                  <Input
                    placeholder="https://..."
                    value={formData.brief.landing_url}
                    onChange={(e) => updateBrief("landing_url", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exigences (optionnel)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Hashtags obligatoires</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="#votrehashtag"
                      value={tempHashtag}
                      onChange={(e) => setTempHashtag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("mandatory_hashtags", tempHashtag, setTempHashtag))}
                    />
                    <Button type="button" variant="outline" onClick={() => addToArray("mandatory_hashtags", tempHashtag, setTempHashtag)}>
                      Ajouter
                    </Button>
                  </div>
                  {formData.brief.mandatory_hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.brief.mandatory_hashtags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray("mandatory_hashtags", i)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Mentions obligatoires</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="@votrecompte"
                      value={tempMention}
                      onChange={(e) => setTempMention(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("mandatory_mentions", tempMention, setTempMention))}
                    />
                    <Button type="button" variant="outline" onClick={() => addToArray("mandatory_mentions", tempMention, setTempMention)}>
                      Ajouter
                    </Button>
                  </div>
                  {formData.brief.mandatory_mentions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.brief.mandatory_mentions.map((mention, i) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray("mandatory_mentions", i)}>
                          {mention} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>À éviter</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ce que les créateurs ne doivent pas faire"
                      value={tempAvoid}
                      onChange={(e) => setTempAvoid(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("things_to_avoid", tempAvoid, setTempAvoid))}
                    />
                    <Button type="button" variant="outline" onClick={() => addToArray("things_to_avoid", tempAvoid, setTempAvoid)}>
                      Ajouter
                    </Button>
                  </div>
                  {formData.brief.things_to_avoid.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.brief.things_to_avoid.map((item, i) => (
                        <Badge key={i} variant="destructive" className="cursor-pointer" onClick={() => removeFromArray("things_to_avoid", i)}>
                          {item} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedPackage && (
              <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
                <CardHeader>
                  <CardTitle>Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Budget</p>
                      <p className="font-semibold">{selectedPackage.budget} - {selectedPackage.power}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Mode</p>
                      <p className="font-semibold">
                        {formData.mode === "CPM" ? `CPM ${formData.cpm_rate}€` : "Pool (répartition par vues)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Durée</p>
                      <p className="font-semibold">{formData.duration_days} jours</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Plafond créateur</p>
                      <p className="font-semibold">
                        {formData.has_max_payout ? `${formData.max_payout_per_creator}€ max` : "Aucun"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}
          <div className="ml-auto">
            {step < 4 ? (
              <Button 
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="bg-primary hover:bg-primary-hover"
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Lancer la campagne
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CreatePoolPage;
