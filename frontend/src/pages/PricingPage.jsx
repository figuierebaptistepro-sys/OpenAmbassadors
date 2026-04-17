import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Crown, Check, Sparkles, Zap, Star, Users, 
  MessageCircle, TrendingUp, Shield, Loader2,
  ArrowRight, X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import AppLayout from "../components/AppLayout";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Package configurations
const CREATOR_PACKAGES = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "",
    description: "Pour commencer",
    features: [
      "1 offre sur Creator Card",
      "3 liens maximum",
      "Profil basique",
      "Accès aux missions"
    ],
    cta: "Plan actuel",
    disabled: true
  },
  {
    id: "creator_premium",
    name: "Premium",
    price: 19.99,
    period: "/mois",
    description: "Pour les créateurs sérieux",
    popular: true,
    features: [
      "Offres illimitées",
      "Liens illimités",
      "Statistiques avancées",
      "Badge Premium vérifié",
      "Priorité dans les recherches",
      "Support prioritaire"
    ],
    cta: "Passer Premium"
  }
];

const BUSINESS_PACKAGES = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "",
    description: "Pour découvrir",
    features: [
      "Parcourir les créateurs",
      "1 proposition/mois",
      "Messagerie limitée"
    ],
    cta: "Plan actuel",
    disabled: true
  },
  {
    id: "business_pro",
    name: "Pro",
    price: 29.99,
    period: "/mois",
    description: "Pour les PME",
    features: [
      "Accès complet aux créateurs",
      "10 propositions/mois",
      "Messagerie illimitée",
      "Support prioritaire",
      "Filtres avancés"
    ],
    cta: "Choisir Pro"
  },
  {
    id: "business_enterprise",
    name: "Enterprise",
    price: 49.99,
    period: "/mois",
    description: "Pour les grandes entreprises",
    popular: true,
    features: [
      "Tout du plan Pro",
      "Propositions illimitées",
      "Account manager dédié",
      "API access",
      "Rapports personnalisés",
      "Onboarding dédié"
    ],
    cta: "Choisir Enterprise"
  }
];

const PricingPage = ({ user, onUserUpdate }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  const packages = user?.user_type === "business" ? BUSINESS_PACKAGES : CREATOR_PACKAGES;

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/subscription`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data);
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
    }
  };

  const handleSelectPackage = async (pkg) => {
    if (pkg.disabled || pkg.id === "free") return;
    
    if (currentSubscription?.has_subscription) {
      toast.error("Vous avez déjà un abonnement actif");
      return;
    }

    setSelectedPackage(pkg.id);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          package_id: pkg.id,
          origin_url: window.location.origin
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Erreur lors du paiement");
      }

      const data = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
      
    } catch (err) {
      toast.error(err.message);
      setSelectedPackage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout user={user} onUserUpdate={onUserUpdate}>
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-pink-100 text-primary font-medium text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Choisissez votre plan
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Passez au niveau supérieur
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {user?.user_type === "business" 
              ? "Accédez aux meilleurs créateurs et développez vos campagnes"
              : "Débloquez tout le potentiel de votre Creator Card et boostez votre visibilité"
            }
          </p>
        </motion.div>

        {/* Current Plan Badge */}
        {currentSubscription?.has_subscription && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl max-w-md mx-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Abonnement actif</p>
                <p className="text-sm text-green-600">{currentSubscription.plan_name}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className={`grid gap-6 ${packages.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative h-full border-2 transition-all duration-300 ${
                pkg.popular 
                  ? 'border-primary shadow-xl shadow-primary/10' 
                  : 'border-gray-100 hover:border-gray-200'
              } ${currentSubscription?.plan === pkg.id ? 'ring-2 ring-green-500' : ''}`}>
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-primary to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
                      POPULAIRE
                    </span>
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{pkg.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{pkg.description}</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-lg font-semibold text-gray-500">
                        {pkg.price === 0 ? "Gratuit" : "Sur devis"}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          pkg.popular ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPackage(pkg)}
                    disabled={pkg.disabled || loading || currentSubscription?.plan === pkg.id}
                    className={`w-full ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white'
                        : pkg.disabled
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                    data-testid={`select-${pkg.id}`}
                  >
                    {loading && selectedPackage === pkg.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : currentSubscription?.plan === pkg.id ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Plan actuel
                      </>
                    ) : (
                      <>
                        {pkg.cta}
                        {!pkg.disabled && <ArrowRight className="w-4 h-4 ml-2" />}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="flex items-center justify-center gap-6 flex-wrap text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              Paiement sécurisé
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Activation instantanée
            </div>
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-gray-400" />
              Annulation à tout moment
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

// Payment Success Page
export const PaymentSuccessPage = ({ user, onUserUpdate }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [paymentData, setPaymentData] = useState(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus("timeout");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/payments/status/${sessionId}`, {
        credentials: "include"
      });

      if (!response.ok) throw new Error("Failed to check status");

      const data = await response.json();
      setPaymentData(data);

      if (data.payment_status === "paid") {
        setStatus("success");
        // Refresh user data
        if (onUserUpdate) {
          const userResponse = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            onUserUpdate(userData);
          }
        }
        return;
      } else if (data.status === "expired") {
        setStatus("expired");
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
    } catch (error) {
      console.error("Error checking payment:", error);
      setStatus("error");
    }
  };

  return (
    <AppLayout user={user} onUserUpdate={onUserUpdate}>
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          {status === "checking" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Vérification du paiement...
              </h1>
              <p className="text-gray-500">
                Merci de patienter quelques instants
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Paiement réussi !
              </h1>
              <p className="text-gray-500 mb-6">
                Votre abonnement est maintenant actif. Profitez de toutes les fonctionnalités premium !
              </p>
              <Button
                onClick={() => navigate(user?.user_type === "business" ? "/business" : "/dashboard")}
                className="bg-gradient-to-r from-primary to-pink-500"
              >
                Accéder au dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {(status === "error" || status === "timeout" || status === "expired") && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {status === "expired" ? "Session expirée" : "Erreur de vérification"}
              </h1>
              <p className="text-gray-500 mb-6">
                {status === "expired" 
                  ? "La session de paiement a expiré. Veuillez réessayer."
                  : "Impossible de vérifier le paiement. Contactez le support si le problème persiste."
                }
              </p>
              <Button onClick={() => navigate("/pricing")} variant="outline">
                Retour aux tarifs
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

// Payment Cancel Page
export const PaymentCancelPage = ({ user, onUserUpdate }) => {
  const navigate = useNavigate();

  return (
    <AppLayout user={user} onUserUpdate={onUserUpdate}>
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Paiement annulé
          </h1>
          <p className="text-gray-500 mb-6">
            Vous avez annulé le paiement. Aucun montant n'a été débité.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/pricing")} variant="outline">
              Voir les tarifs
            </Button>
            <Button 
              onClick={() => navigate(user?.user_type === "business" ? "/business" : "/dashboard")}
            >
              Retour au dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default PricingPage;
