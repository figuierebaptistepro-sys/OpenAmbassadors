import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, ArrowRight, ArrowLeft, Building2, MapPin, Target,
  DollarSign, CheckCircle, Sparkles
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = location.state?.user;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    company_name: user?.name || "",
    business_type: "",
    city: "",
    monthly_budget: "",
    objectives: [],
    industry: "",
  });

  const objectives = [
    { id: "visibility", label: "Visibilité locale", icon: "👁️" },
    { id: "product_launch", label: "Lancement produit", icon: "🚀" },
    { id: "ads", label: "Publicités", icon: "📢" },
    { id: "social", label: "Réseaux sociaux", icon: "📱" },
    { id: "ugc_mass", label: "UGC en masse", icon: "🎬" },
  ];

  const industries = [
    "Beauté & Cosmétiques", "Mode & Accessoires", "Food & Boissons",
    "Tech & Apps", "Sport & Fitness", "Maison & Déco",
    "Santé & Bien-être", "Finance & Assurance", "Immobilier",
    "E-commerce", "Services B2B", "Autre"
  ];

  const budgets = [
    { id: "<1000", label: "Moins de 1 000€" },
    { id: "1000-3000", label: "1 000€ - 3 000€" },
    { id: "3000-6000", label: "3 000€ - 6 000€" },
    { id: "6000+", label: "Plus de 6 000€" },
  ];

  const toggleObjective = (id) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.includes(id)
        ? prev.objectives.filter(o => o !== id)
        : [...prev.objectives, id]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/business/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Profil configuré !");
        navigate("/business/dashboard", { state: { user } });
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.company_name && formData.business_type;
      case 2: return formData.objectives.length > 0;
      case 3: return formData.monthly_budget;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="font-heading text-2xl font-bold text-slate-900 mb-2">
                Parlez-nous de votre entreprise
              </h2>
              <p className="text-slate-600">
                Ces informations nous aident à vous proposer les meilleurs créateurs
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de l'entreprise</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Ma Super Entreprise"
                  data-testid="company-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Type d'activité</Label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: "physical", label: "Commerce physique", desc: "Boutique, restaurant, etc." },
                    { id: "online", label: "E-commerce", desc: "Vente en ligne" },
                    { id: "both", label: "Les deux", desc: "Physique et en ligne" },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFormData({ ...formData, business_type: type.id })}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.business_type === type.id
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      data-testid={`business-type-${type.id}`}
                    >
                      <p className="font-medium text-slate-900">{type.label}</p>
                      <p className="text-sm text-slate-500">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ville (optionnel)</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Paris"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="font-heading text-2xl font-bold text-slate-900 mb-2">
                Quels sont vos objectifs ?
              </h2>
              <p className="text-slate-600">
                Sélectionnez un ou plusieurs objectifs
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {objectives.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => toggleObjective(obj.id)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    formData.objectives.includes(obj.id)
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  data-testid={`objective-${obj.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{obj.icon}</span>
                    <span className="font-medium text-slate-900">{obj.label}</span>
                    {formData.objectives.includes(obj.id) && (
                      <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-4">
              <Label>Secteur d'activité</Label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                data-testid="industry-select"
              >
                <option value="">Sélectionnez un secteur</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="font-heading text-2xl font-bold text-slate-900 mb-2">
                Quel est votre budget mensuel ?
              </h2>
              <p className="text-slate-600">
                Cela nous aide à vous proposer les packs adaptés
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {budgets.map((budget) => (
                <button
                  key={budget.id}
                  onClick={() => setFormData({ ...formData, monthly_budget: budget.id })}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    formData.monthly_budget === budget.id
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  data-testid={`budget-${budget.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{budget.label}</span>
                    {formData.monthly_budget === budget.id && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-secondary-foreground" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-slate-900 mb-4">
              Parfait, vous êtes prêt !
            </h2>
            <p className="text-slate-600 mb-8">
              Votre profil est configuré. Vous pouvez maintenant explorer les créateurs
              et lancer vos premières campagnes.
            </p>

            <Card className="text-left mb-6">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-medium">{formData.company_name}</span>
                </div>
                {formData.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>{formData.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary" />
                  <div className="flex flex-wrap gap-2">
                    {formData.objectives.map((obj) => (
                      <Badge key={obj} variant="secondary">{obj}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span>{budgets.find(b => b.id === formData.monthly_budget)?.label}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Étape {step} sur 4</span>
            <button
              onClick={() => navigate("/business/dashboard", { state: { user } })}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Passer
            </button>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <Card>
            <CardContent className="p-8">
              {renderStep()}

              <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                {step > 1 ? (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className="bg-primary hover:bg-primary-hover"
                    data-testid="next-step-btn"
                  >
                    Continuer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-primary hover:bg-primary-hover"
                    data-testid="finish-onboarding-btn"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Accéder au dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
