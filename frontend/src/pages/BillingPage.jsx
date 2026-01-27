import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CreditCard, Check, Crown, Clock, Download, ExternalLink,
  ArrowRight, Zap, Users, Video, Star, Shield, FileText
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import UserMenu from "../components/UserMenu";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BillingPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "plan");
  const [stats, setStats] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
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
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const currentPack = packs.find(p => p.pack_id === stats?.selected_pack);

  // Mock invoice data
  const invoices = [
    { id: "INV-001", date: "15 Jan 2025", amount: 299, status: "paid", plan: "Local Impact" },
    { id: "INV-002", date: "15 Déc 2024", amount: 299, status: "paid", plan: "Local Impact" },
  ];

  const tabs = [
    { id: "plan", label: "Mon plan" },
    { id: "invoices", label: "Factures" },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType={user?.user_type} isPremium={user?.is_premium} onLogout={handleLogout} />

      <div className="lg:ml-64 pt-16 lg:pt-0">
        {/* Header */}
        <header className="sticky top-16 lg:top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-lg lg:text-xl font-bold text-gray-900">Abonnement & Facturation</h1>
              <p className="text-gray-500 text-xs lg:text-sm">Gérez votre plan et consultez vos factures</p>
            </div>
            <UserMenu user={user} currentPlan={currentPack?.name} />
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 lg:mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "plan" && (
              <div className="space-y-6 lg:space-y-8">
                {/* Current Plan Section */}
                <Card className="border-0 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-primary-hover p-4 lg:p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/80 text-xs lg:text-sm mb-1">Plan actuel</p>
                        <h2 className="font-heading text-xl lg:text-2xl font-bold">
                          {currentPack?.name || "Aucun plan"}
                        </h2>
                      </div>
                      <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white/20 rounded-xl lg:rounded-2xl flex items-center justify-center">
                        <Crown className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 lg:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                      <div>
                        <p className="text-gray-500 text-xs lg:text-sm mb-1">Statut</p>
                        <Badge className="bg-green-100 text-green-700">Actif</Badge>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs lg:text-sm mb-1">Prochain renouvellement</p>
                        <p className="font-medium text-gray-900 text-sm lg:text-base">15 Février 2025</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs lg:text-sm mb-1">Montant</p>
                        <p className="font-heading text-xl lg:text-2xl font-bold text-gray-900">
                          {currentPack?.price || 0}€<span className="text-gray-500 text-xs lg:text-sm font-normal">/mois</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-100 flex flex-wrap gap-2 lg:gap-3">
                      <Button variant="outline" className="border-gray-200 text-xs lg:text-sm" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Gérer l'abonnement
                      </Button>
                      <Button variant="outline" className="border-gray-200 text-red-600 hover:bg-red-50 text-xs lg:text-sm" size="sm">
                        Annuler le plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Comparison */}
                <div>
                  <h3 className="font-heading text-base lg:text-lg font-bold text-gray-900 mb-4">Comparer les plans</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {packs.slice(0, 3).map((pack) => {
                      const isCurrentPlan = stats?.selected_pack === pack.pack_id;
                      const benefits = [
                        `${pack.creators_count} créateurs`,
                        `${pack.videos_count} vidéos`,
                        `Livraison ${pack.delivery_days} jours`,
                        pack.pack_id === "pack_starter" ? "Support email" : "Support prioritaire",
                        pack.pack_id === "pack_visibilite" ? "Account manager dédié" : null,
                      ].filter(Boolean);

                      return (
                        <Card 
                          key={pack.pack_id}
                          className={`border-0 shadow-md relative overflow-hidden ${
                            isCurrentPlan ? "ring-2 ring-primary" : ""
                          }`}
                        >
                          {pack.popular && (
                            <div className="absolute top-0 left-0 right-0 bg-primary text-white text-center text-xs py-1 font-medium">
                              ⭐ Plus populaire
                            </div>
                          )}
                          {isCurrentPlan && (
                            <div className="absolute top-0 right-0 bg-primary text-white text-xs px-2 lg:px-3 py-1 rounded-bl-lg font-medium">
                              Actuel
                            </div>
                          )}
                          <CardContent className={`p-4 lg:p-6 ${pack.popular ? "pt-8 lg:pt-10" : ""}`}>
                            <div className="text-center mb-4 lg:mb-6">
                              <span className="text-2xl lg:text-3xl mb-2 block">{pack.icon}</span>
                              <h4 className="font-heading font-bold text-gray-900 text-sm lg:text-lg">{pack.name}</h4>
                              <p className="text-gray-500 text-xs lg:text-sm mt-1 line-clamp-2">{pack.description}</p>
                            </div>
                            
                            <div className="text-center mb-4 lg:mb-6">
                              <span className="font-heading text-2xl lg:text-4xl font-bold text-gray-900">{pack.price}€</span>
                              <span className="text-gray-500 text-xs lg:text-sm">/mois</span>
                            </div>

                            <ul className="space-y-2 lg:space-y-3 mb-4 lg:mb-6">
                              {benefits.map((benefit, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs lg:text-sm text-gray-600">
                                  <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary flex-shrink-0" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>

                            <Button
                              onClick={() => handleSelectPack(pack.pack_id)}
                              disabled={isCurrentPlan}
                              className={`w-full text-xs lg:text-sm ${
                                isCurrentPlan 
                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed" 
                                  : pack.popular 
                                    ? "bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                                    : "bg-gray-900 hover:bg-gray-800"
                              }`}
                              size="sm"
                              data-testid={`select-pack-${pack.pack_id}`}
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
                <Card className="border-0 shadow-md bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                  <CardContent className="p-4 lg:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <Badge className="bg-white/20 text-white mb-2 lg:mb-3">Enterprise</Badge>
                        <h3 className="font-heading text-lg lg:text-xl font-bold mb-2">Massive Content</h3>
                        <p className="text-gray-300 text-xs lg:text-sm max-w-md">
                          Pour les grandes entreprises avec des besoins de production à grande échelle.
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xl lg:text-3xl font-heading font-bold mb-2">Sur devis</p>
                        <Button className="bg-white text-gray-900 hover:bg-gray-100 text-xs lg:text-sm" size="sm">
                          Contacter les ventes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "invoices" && (
              <Card className="border-0 shadow-md">
                <CardHeader className="px-4 lg:px-6">
                  <CardTitle className="text-gray-900 text-sm lg:text-base">Historique des factures</CardTitle>
                </CardHeader>
                <CardContent className="px-4 lg:px-6">
                  {invoices.length > 0 ? (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div 
                          key={invoice.id}
                          className="flex items-center justify-between p-3 lg:p-4 bg-gray-50 rounded-xl gap-3"
                        >
                          <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                              <FileText className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm lg:text-base">{invoice.id}</p>
                              <p className="text-gray-500 text-xs lg:text-sm truncate">{invoice.date} • {invoice.plan}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="font-medium text-gray-900 text-sm lg:text-base">{invoice.amount}€</p>
                              <Badge className="bg-green-100 text-green-700 text-xs">Payée</Badge>
                            </div>
                            <span className="sm:hidden font-medium text-gray-900 text-sm">{invoice.amount}€</span>
                            <Button variant="outline" size="sm" className="border-gray-200 p-2">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 lg:py-12">
                      <FileText className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 mx-auto mb-3 lg:mb-4" />
                      <p className="text-gray-500 text-sm">Aucune facture pour le moment</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default BillingPage;
