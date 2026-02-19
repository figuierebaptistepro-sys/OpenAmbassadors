import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, Users, Clock, Euro, Zap, ChevronRight, ChevronLeft,
  Play, TrendingUp, Target, Sparkles, Building2, Globe, Hash,
  AtSign, FileText, Link2, AlertCircle, CheckCircle, Instagram, Youtube
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

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
    name: "Starter",
    budget: "5 000€",
    description: "Idéal pour tester l'influence marketing",
    maxGain: "100€",
    estimation: "50 à 200 publications",
    color: "from-blue-500 to-cyan-500"
  },
  {
    value: 15000,
    name: "Growth",
    budget: "15 000€",
    description: "Pour une visibilité significative",
    maxGain: "250€",
    estimation: "200 à 800 publications",
    color: "from-purple-500 to-pink-500",
    popular: true
  },
  {
    value: 25000,
    name: "Scale",
    budget: "25 000€",
    description: "Campagne massive et impact maximal",
    maxGain: "400€",
    estimation: "500 à 2000 publications",
    color: "from-orange-500 to-red-500"
  }
];

const PLATFORMS = [
  { value: "TIKTOK", name: "TikTok", icon: <TikTokIcon className="w-5 h-5" /> },
  { value: "INSTAGRAM_REELS", name: "Instagram Reels", icon: <Instagram className="w-5 h-5" /> },
  { value: "YOUTUBE_SHORTS", name: "YouTube Shorts", icon: <Youtube className="w-5 h-5" /> }
];

const CreatePoolPage = ({ user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Package
    package: null,
    mode: "CPM",
    
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
  const [tempGuideline, setTempGuideline] = useState("");
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
        return formData.package !== null;
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
      const response = await fetch(`${API_URL}/api/pools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const pool = await response.json();
        toast.success("🎉 Campagne créée avec succès !");
        navigate(`/business/pools/${pool.pool_id}`);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
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
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        {/* Step 1: Package Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Choisissez votre package
              </h1>
              <p className="text-gray-500">
                Plus le budget est élevé, plus le pool de créateurs est large
              </p>
            </div>

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
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.color} flex items-center justify-center mb-3`}>
                      <Euro className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle>{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold text-gray-900">{pkg.budget}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4 text-primary" />
                        {pkg.estimation}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Trophy className="w-4 h-4 text-primary" />
                        Gain max: {pkg.maxGain}/créateur
                      </div>
                    </div>
                    {formData.package === pkg.value && (
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="w-5 h-5" />
                        Sélectionné
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Mode Selection */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Mode de rémunération</CardTitle>
                <CardDescription>Comment les créateurs seront-ils payés ?</CardDescription>
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
                      Paiement basé sur le nombre de vues. Plus de vues = plus de gains.
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
                      Budget réparti selon la performance relative de chaque créateur.
                    </p>
                  </div>
                </div>
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
                Informations sur votre marque
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
                  <Label>Réseaux sociaux de la marque</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="@votrecompte"
                      value={tempHandle}
                      onChange={(e) => setTempHandle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("social_handles", tempHandle, setTempHandle))}
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

            {/* Essential info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations essentielles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Description de l'offre *</Label>
                  <Textarea
                    placeholder="Décrivez votre produit/service et ce que vous proposez..."
                    value={formData.brief.offer_description}
                    onChange={(e) => updateBrief("offer_description", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message clé *</Label>
                  <Input
                    placeholder="Le message principal que les créateurs doivent transmettre"
                    value={formData.brief.key_message}
                    onChange={(e) => updateBrief("key_message", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Call to Action (CTA) *</Label>
                  <Input
                    placeholder="Ex: Découvrez notre offre, Téléchargez l'app..."
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

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Exigences</CardTitle>
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
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => addToArray("mandatory_hashtags", tempHashtag, setTempHashtag)}
                    >
                      Ajouter
                    </Button>
                  </div>
                  {formData.brief.mandatory_hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.brief.mandatory_hashtags.map((tag, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeFromArray("mandatory_hashtags", i)}
                        >
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
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => addToArray("mandatory_mentions", tempMention, setTempMention)}
                    >
                      Ajouter
                    </Button>
                  </div>
                  {formData.brief.mandatory_mentions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.brief.mandatory_mentions.map((mention, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeFromArray("mandatory_mentions", i)}
                        >
                          {mention} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Format de contenu souhaité</Label>
                  <Input
                    placeholder="Ex: Vidéo de 15-30 secondes, format vertical"
                    value={formData.brief.content_format}
                    onChange={(e) => updateBrief("content_format", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Exemples d'inspiration (liens)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={tempExample}
                      onChange={(e) => setTempExample(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("examples_links", tempExample, setTempExample))}
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => addToArray("examples_links", tempExample, setTempExample)}
                    >
                      Ajouter
                    </Button>
                  </div>
                  {formData.brief.examples_links.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {formData.brief.examples_links.map((link, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Link2 className="w-4 h-4 text-gray-400" />
                          <span className="flex-1 truncate">{link}</span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeFromArray("examples_links", i)}
                          >
                            ×
                          </Button>
                        </div>
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
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => addToArray("things_to_avoid", tempAvoid, setTempAvoid)}
                    >
                      Ajouter
                    </Button>
                  </div>
                  {formData.brief.things_to_avoid.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.brief.things_to_avoid.map((item, i) => (
                        <Badge 
                          key={i} 
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => removeFromArray("things_to_avoid", i)}
                        >
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
                      <p className="text-sm text-gray-500">Package</p>
                      <p className="font-semibold">{selectedPackage.name} - {selectedPackage.budget}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Mode</p>
                      <p className="font-semibold">{formData.mode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Durée</p>
                      <p className="font-semibold">{formData.duration_days} jours</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Plateformes</p>
                      <p className="font-semibold">{formData.platforms.length} sélectionnées</p>
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
