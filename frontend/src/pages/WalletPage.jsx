import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wallet, Euro, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle,
  XCircle, Building2, CreditCard, AlertCircle, Info, ExternalLink
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const WalletPage = ({ user }) => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    method: "bank_transfer",
  });

  const [bankForm, setBankForm] = useState({
    bank_iban: "",
    bank_bic: "",
    bank_holder_name: "",
  });

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await fetch(`${API_URL}/api/wallet`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setWallet(data);
        setBankForm({
          bank_iban: data.payment_methods?.bank_iban || "",
          bank_bic: data.payment_methods?.bank_bic || "",
          bank_holder_name: data.payment_methods?.bank_holder_name || "",
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBank = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/wallet/payment-methods`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bankForm),
      });
      if (response.ok) {
        toast.success("Coordonnées bancaires enregistrées !");
        setBankDialogOpen(false);
        fetchWallet();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur");
      }
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount < 10) {
      toast.error("Montant minimum: 10€");
      return;
    }

    const available = (wallet?.balance || 0) - (wallet?.pending_amount || 0);
    if (amount > available) {
      toast.error(`Solde insuffisant. Disponible: ${available.toFixed(2)}€`);
      return;
    }

    if (!wallet?.payment_methods?.bank_iban) {
      toast.error("Ajoutez vos coordonnées bancaires d'abord");
      setBankDialogOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/wallet/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: amount,
          method: withdrawForm.method,
        }),
      });
      if (response.ok) {
        toast.success("Demande de retrait envoyée !");
        setWithdrawDialogOpen(false);
        setWithdrawForm({ amount: "", method: "bank_transfer" });
        fetchWallet();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur");
      }
    } catch (error) {
      toast.error("Erreur lors de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Validé</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 text-xs"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 text-xs"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 text-xs">{status}</Badge>;
    }
  };

  const availableBalance = (wallet?.balance || 0) - (wallet?.pending_amount || 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7FB]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Ma Cagnotte</h1>
            <p className="text-gray-500 text-xs sm:text-sm">Gérez vos revenus et retraits</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary to-primary-hover text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm">Solde disponible</span>
                  <Euro className="w-5 h-5 text-white/60" />
                </div>
                <p className="font-heading text-2xl sm:text-3xl font-bold">{availableBalance.toFixed(2)}€</p>
                {wallet?.pending_amount > 0 && (
                  <p className="text-white/70 text-xs mt-1">
                    {wallet.pending_amount.toFixed(2)}€ en attente de validation
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Total gagné</span>
                  <ArrowDownCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="font-heading text-2xl font-bold text-gray-900">{(wallet?.total_earned || 0).toFixed(2)}€</p>
                <p className="text-gray-400 text-xs mt-1">
                  {wallet?.is_premium ? "Sans frais (Premium)" : "Net après frais (15%)"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm">Total retiré</span>
                  <ArrowUpCircle className="w-5 h-5 text-blue-500" />
                </div>
                <p className="font-heading text-2xl font-bold text-gray-900">{(wallet?.total_withdrawn || 0).toFixed(2)}€</p>
                <p className="text-gray-400 text-xs mt-1">Virements effectués</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Fee Notice */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {wallet?.is_premium ? (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 text-sm">Membre Premium : 0% de frais !</p>
                  <p className="text-green-700 text-xs mt-1">
                    En tant que membre Premium, vous ne payez aucun frais sur vos revenus. 
                    Les retraits sont validés manuellement sous 2-5 jours ouvrés.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 text-sm">Frais de plateforme : 15%</p>
                  <p className="text-blue-700 text-xs mt-1">
                    Les frais de 15% sont automatiquement déduits de chaque paiement reçu. 
                    <span className="font-medium"> Les membres Premium bénéficient de 0% de frais.</span>
                    {" "}Les retraits sont validés manuellement sous 2-5 jours ouvrés.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-900 text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setWithdrawDialogOpen(true)}
                  className="w-full bg-primary hover:bg-primary-hover justify-start"
                  disabled={availableBalance < 10}
                  data-testid="withdraw-btn"
                >
                  <ArrowUpCircle className="w-5 h-5 mr-3" />
                  Demander un retrait
                  {availableBalance < 10 && (
                    <span className="ml-auto text-xs opacity-70">(Min. 10€)</span>
                  )}
                </Button>

                <Button
                  onClick={() => setBankDialogOpen(true)}
                  variant="outline"
                  className="w-full border-gray-200 justify-start"
                  data-testid="bank-settings-btn"
                >
                  <Building2 className="w-5 h-5 mr-3 text-gray-500" />
                  {wallet?.payment_methods?.bank_iban ? "Modifier mon RIB" : "Ajouter mon RIB"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-gray-200 justify-start opacity-60 cursor-not-allowed"
                  disabled
                >
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00457C">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.773.773 0 0 1 .762-.647h6.58c2.182 0 3.695.568 4.5 1.688.35.49.563 1.026.64 1.643.082.653.025 1.427-.17 2.364l-.008.036v.319l.248.14c.21.11.377.24.51.396.225.262.37.588.44.978.07.4.057.87-.04 1.397-.11.602-.29 1.129-.537 1.568-.227.404-.516.75-.863 1.033-.33.27-.72.48-1.165.62-.43.136-.914.205-1.444.205h-3.14a.64.64 0 0 0-.633.545l-.04.246-1.072 6.814-.03.178a.641.641 0 0 1-.634.545z"/>
                    </svg>
                    Connecter PayPal
                  </div>
                  <Badge className="bg-gray-100 text-gray-600 text-xs ml-auto">Soon</Badge>
                </Button>
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-900 text-base">Historique des transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {wallet?.transactions?.length > 0 ? (
                  <div className="space-y-3">
                    {wallet.transactions.map((tx) => (
                      <div
                        key={tx.transaction_id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          tx.transaction_type === "earning" ? "bg-green-100" : "bg-blue-100"
                        }`}>
                          {tx.transaction_type === "earning" ? (
                            <ArrowDownCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <ArrowUpCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {tx.transaction_type === "earning" ? "Paiement reçu" : "Retrait"}
                            </p>
                            {getStatusBadge(tx.status)}
                          </div>
                          <p className="text-gray-500 text-xs">{tx.description}</p>
                          <p className="text-gray-400 text-xs">{formatDate(tx.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            tx.transaction_type === "earning" ? "text-green-600" : "text-blue-600"
                          }`}>
                            {tx.transaction_type === "earning" ? "+" : "-"}{tx.net_amount?.toFixed(2) || tx.amount?.toFixed(2)}€
                          </p>
                          {tx.transaction_type === "earning" && tx.fee_amount > 0 && (
                            <p className="text-gray-400 text-xs">
                              Frais: {tx.fee_amount?.toFixed(2)}€
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium text-sm mb-1">Aucune transaction</p>
                    <p className="text-gray-500 text-xs">Vos revenus apparaîtront ici</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Payment Methods */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  Méthodes de paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Bank */}
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 text-sm">Virement bancaire</span>
                    {wallet?.payment_methods?.bank_iban && (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                  </div>
                  {wallet?.payment_methods?.bank_iban ? (
                    <p className="text-gray-500 text-xs">
                      IBAN: ****{wallet.payment_methods.bank_iban.slice(-4)}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-xs">Non configuré</p>
                  )}
                </div>

                {/* PayPal */}
                <div className="p-3 bg-gray-50 rounded-xl opacity-60">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00457C">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.773.773 0 0 1 .762-.647h6.58c2.182 0 3.695.568 4.5 1.688.35.49.563 1.026.64 1.643.082.653.025 1.427-.17 2.364l-.008.036v.319l.248.14c.21.11.377.24.51.396.225.262.37.588.44.978.07.4.057.87-.04 1.397-.11.602-.29 1.129-.537 1.568-.227.404-.516.75-.863 1.033-.33.27-.72.48-1.165.62-.43.136-.914.205-1.444.205h-3.14a.64.64 0 0 0-.633.545l-.04.246-1.072 6.814-.03.178a.641.641 0 0 1-.634.545z"/>
                    </svg>
                    <span className="font-medium text-gray-900 text-sm">PayPal</span>
                    <Badge className="bg-gray-200 text-gray-600 text-xs ml-auto">Soon</Badge>
                  </div>
                  <p className="text-gray-400 text-xs">Bientôt disponible</p>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card className="border-0 shadow-sm bg-gray-900 text-white">
              <CardContent className="p-4">
                <AlertCircle className="w-6 h-6 text-yellow-400 mb-2" />
                <h4 className="font-heading font-bold text-sm mb-1">Comment ça marche ?</h4>
                <ul className="text-gray-400 text-xs space-y-1.5 mb-3">
                  <li>• Les paiements sont validés manuellement</li>
                  <li>• 15% de frais sur chaque mission</li>
                  <li>• Retrait minimum : 10€</li>
                  <li>• Délai : 2-5 jours ouvrés</li>
                </ul>
                <Button size="sm" className="w-full bg-white text-gray-900 hover:bg-gray-100 text-xs" onClick={() => navigate("/support")}>
                  Aide
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Demander un retrait</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-gray-500 text-xs mb-1">Solde disponible</p>
              <p className="font-heading text-xl font-bold text-gray-900">{availableBalance.toFixed(2)}€</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Montant à retirer (€)</Label>
              <Input
                type="number"
                min={10}
                max={availableBalance}
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                placeholder="Minimum 10€"
                className="bg-gray-50 border-gray-200"
                data-testid="withdraw-amount"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Méthode de retrait</Label>
              <div className="space-y-2">
                <button
                  onClick={() => setWithdrawForm({ ...withdrawForm, method: "bank_transfer" })}
                  className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    withdrawForm.method === "bank_transfer"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Building2 className="w-5 h-5 text-gray-500" />
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900 text-sm">Virement bancaire</p>
                    <p className="text-gray-500 text-xs">2-5 jours ouvrés</p>
                  </div>
                  {withdrawForm.method === "bank_transfer" && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </button>

                <button
                  disabled
                  className="w-full p-3 rounded-xl border-2 border-gray-200 flex items-center gap-3 opacity-50 cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#00457C">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.773.773 0 0 1 .762-.647h6.58c2.182 0 3.695.568 4.5 1.688.35.49.563 1.026.64 1.643.082.653.025 1.427-.17 2.364l-.008.036v.319l.248.14c.21.11.377.24.51.396.225.262.37.588.44.978.07.4.057.87-.04 1.397-.11.602-.29 1.129-.537 1.568-.227.404-.516.75-.863 1.033-.33.27-.72.48-1.165.62-.43.136-.914.205-1.444.205h-3.14a.64.64 0 0 0-.633.545l-.04.246-1.072 6.814-.03.178a.641.641 0 0 1-.634.545z"/>
                  </svg>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900 text-sm">PayPal</p>
                    <p className="text-gray-500 text-xs">Bientôt disponible</p>
                  </div>
                  <Badge className="bg-gray-200 text-gray-600 text-xs">Soon</Badge>
                </button>
              </div>
            </div>

            {!wallet?.payment_methods?.bank_iban && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Ajoutez vos coordonnées bancaires pour retirer
                </p>
              </div>
            )}

            <Button
              onClick={handleWithdraw}
              disabled={submitting || !withdrawForm.amount || parseFloat(withdrawForm.amount) < 10}
              className="w-full bg-primary hover:bg-primary-hover"
              data-testid="confirm-withdraw-btn"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <ArrowUpCircle className="w-5 h-5 mr-2" />
              )}
              Demander le retrait
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Settings Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="bg-white border-0 shadow-xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-400" />
              Coordonnées bancaires
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Titulaire du compte</Label>
              <Input
                value={bankForm.bank_holder_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_holder_name: e.target.value })}
                placeholder="Prénom NOM"
                className="bg-gray-50 border-gray-200"
                data-testid="bank-holder-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">IBAN</Label>
              <Input
                value={bankForm.bank_iban}
                onChange={(e) => setBankForm({ ...bankForm, bank_iban: e.target.value.toUpperCase() })}
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                className="bg-gray-50 border-gray-200 font-mono"
                data-testid="bank-iban"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">BIC / SWIFT</Label>
              <Input
                value={bankForm.bank_bic}
                onChange={(e) => setBankForm({ ...bankForm, bank_bic: e.target.value.toUpperCase() })}
                placeholder="BNPAFRPP"
                className="bg-gray-50 border-gray-200 font-mono"
                data-testid="bank-bic"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-blue-700 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Vos coordonnées sont stockées de manière sécurisée et utilisées uniquement pour vos retraits.
              </p>
            </div>

            <Button
              onClick={handleSaveBank}
              disabled={submitting || !bankForm.bank_iban}
              className="w-full bg-primary hover:bg-primary-hover"
              data-testid="save-bank-btn"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default WalletPage;
