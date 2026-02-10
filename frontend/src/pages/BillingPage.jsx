import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Check, Crown, Download, ExternalLink, FileText, MessageCircle, Loader2 } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BillingPage = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "plan");
  const [stats, setStats] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  // Check if user came from contact attempt
  const contactReason = location.state?.reason === "contact_creator";
  const creatorName = location.state?.creatorName;

  // Check payment status from Stripe redirect
  const checkPaymentStatus = useCallback(async (sessionId) => {
    setCheckingPayment(true);
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 2000;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setCheckingPayment(false);
        toast.info("Vérification du paiement en cours. Veuillez rafraîchir la page.");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/stripe/status/${sessionId}`, {
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.payment_status === "paid") {
            setCheckingPayment(false);
            toast.success("🎉 Paiement réussi ! Vous êtes maintenant Premium !");
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            // Refresh page to update premium status
            window.location.reload();
            return;
          } else if (data.status === "expired") {
            setCheckingPayment(false);
            toast.error("Session de paiement expirée. Veuillez réessayer.");
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }
        
        // Continue polling
        attempts++;
        setTimeout(poll, pollInterval);
      } catch (error) {
        console.error("Payment status check error:", error);
        attempts++;
        setTimeout(poll, pollInterval);
      }
    };

    poll();
  }, []);

  useEffect(() => {
    // Check if returning from Stripe
    const sessionId = searchParams.get("session_id");
    const status = searchParams.get("status");
    
    if (sessionId && status === "success") {
      checkPaymentStatus(sessionId);
    } else if (status === "cancelled") {
      toast.info("Paiement annulé");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, checkPaymentStatus]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, packsRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/business`, { credentials: "include" }),
        fetch(`${API_URL}/api/packs`)
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (packsRes.ok) setPacks(await packsRes.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPack = async (packId) => {
    try {
      const response = await fetch(`${API_URL}/api/business/select-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pack_id: packId }),
      });
      if (response.ok) {
        toast.success("Plan mis à jour !");
        fetchData();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const currentPack = packs.find(p => p.pack_id === stats?.selected_pack);
  const invoices = [
    { id: "INV-001", date: "15 Jan 2025", amount: 299, plan: "Local Impact" },
    { id: "INV-002", date: "15 Déc 2024", amount: 299, plan: "Local Impact" },
  ];

  // Show loading state while checking payment
  if (checkingPayment) {
    return (
      <AppLayout user={user} currentPlan={currentPack?.name}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Vérification du paiement en cours...</p>
            <p className="text-gray-400 text-sm mt-2">Veuillez patienter quelques instants</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user} currentPlan={currentPack?.name}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Abonnement & Facturation</h1>
        <p className="text-gray-500 text-xs sm:text-sm">Gérez votre plan et vos factures</p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Contact Creator Banner */}
        {contactReason && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-pink-100 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Abonnement requis pour contacter les créateurs</h3>
                <p className="text-gray-600 text-sm mt-1">
                  {creatorName 
                    ? `Pour contacter ${creatorName} et les autres créateurs directement, choisissez un abonnement ci-dessous.`
                    : "Pour contacter les créateurs directement, choisissez un abonnement ci-dessous."
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{ id: "plan", label: "Mon plan" }, { id: "invoices", label: "Factures" }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "plan" && (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary-hover p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs mb-1">Plan actuel</p>
                    <h2 className="font-heading text-xl font-bold">{currentPack?.name || "Aucun"}</h2>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Statut</p>
                    <Badge className="bg-green-100 text-green-700">Actif</Badge>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Renouvellement</p>
                    <p className="font-medium text-gray-900 text-sm">15 Fév 2025</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Montant</p>
                    <p className="font-heading text-xl font-bold text-gray-900">
                      {currentPack?.price || 0}€<span className="text-gray-500 text-xs font-normal">/mois</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="border-gray-200 text-xs">
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Gérer
                  </Button>
                  <Button variant="outline" size="sm" className="border-gray-200 text-red-600 hover:bg-red-50 text-xs">
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Plans */}
            <div>
              <h3 className="font-heading font-bold text-gray-900 mb-4 text-sm sm:text-base">Comparer les plans</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packs.slice(0, 3).map((pack) => {
                  const isCurrentPlan = stats?.selected_pack === pack.pack_id;
                  const benefits = [
                    `${pack.creators_count} créateurs`,
                    `${pack.videos_count} vidéos`,
                    `${pack.delivery_days}j livraison`,
                  ];

                  return (
                    <Card key={pack.pack_id} className={`border-0 shadow-sm relative overflow-hidden ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}>
                      {pack.popular && (
                        <div className="absolute top-0 left-0 right-0 bg-primary text-white text-center text-xs py-1">⭐ Populaire</div>
                      )}
                      {isCurrentPlan && (
                        <div className="absolute top-0 right-0 bg-primary text-white text-xs px-2 py-1 rounded-bl-lg">Actuel</div>
                      )}
                      <CardContent className={`p-4 ${pack.popular ? "pt-8" : ""}`}>
                        <div className="text-center mb-4">
                          <span className="text-2xl block mb-1">{pack.icon}</span>
                          <h4 className="font-heading font-bold text-gray-900 text-sm">{pack.name}</h4>
                        </div>
                        <div className="text-center mb-4">
                          <span className="font-heading text-2xl font-bold text-gray-900">{pack.price}€</span>
                          <span className="text-gray-500 text-xs">/mois</span>
                        </div>
                        <ul className="space-y-2 mb-4">
                          {benefits.map((b, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                        <Button
                          onClick={() => handleSelectPack(pack.pack_id)}
                          disabled={isCurrentPlan}
                          size="sm"
                          className={`w-full text-xs ${
                            isCurrentPlan ? "bg-gray-100 text-gray-500" : 
                            pack.popular ? "bg-primary hover:bg-primary-hover" : "bg-gray-900 hover:bg-gray-800"
                          }`}
                        >
                          {isCurrentPlan ? "Plan actuel" : "Choisir"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Enterprise */}
            <Card className="border-0 shadow-sm bg-gray-900 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <Badge className="bg-white/20 text-white mb-2">Enterprise</Badge>
                    <h3 className="font-heading font-bold text-lg">Massive Content</h3>
                    <p className="text-gray-400 text-xs sm:text-sm">Production à grande échelle</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xl font-heading font-bold mb-2">Sur devis</p>
                    <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100 text-xs">
                      Contacter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "invoices" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4">
              <CardTitle className="text-gray-900 text-sm sm:text-base">Historique des factures</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                          <FileText className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{inv.id}</p>
                          <p className="text-gray-500 text-xs truncate">{inv.date} • {inv.plan}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-medium text-gray-900 text-sm">{inv.amount}€</span>
                        <Button variant="outline" size="sm" className="border-gray-200 p-2">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Aucune facture</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default BillingPage;
