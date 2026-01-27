import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Sparkles, Lock, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState("email"); // email, otp
  const [loading, setLoading] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessForm, setAccessForm] = useState({ name: "", email: "", reason: "" });

  const handleRequestOTP = async () => {
    if (!email) {
      toast.error("Entrez votre email");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Code envoyé à votre email");
        // For MVP: show debug code
        if (data.debug_code) {
          toast.info(`Code de test: ${data.debug_code}`, { duration: 10000 });
        }
        setStep("otp");
      } else {
        throw new Error("Erreur");
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Entrez le code à 6 chiffres");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code: otpCode }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Code invalide");
      }

      toast.success("Connexion réussie !");
      
      // Navigate based on user type
      if (!data.user_type) {
        navigate("/select-type", { state: { user: data } });
      } else if (data.user_type === "creator") {
        navigate("/dashboard", { state: { user: data } });
      } else {
        navigate("/business", { state: { user: data } });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleRequestAccess = async () => {
    if (!accessForm.email) {
      toast.error("Email requis");
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/auth/request-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accessForm),
      });

      if (response.ok) {
        toast.success("Demande envoyée ! Nous vous contacterons bientôt.");
        setAccessDialogOpen(false);
        setAccessForm({ name: "", email: "", reason: "" });
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-secondary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white mb-2">
            Incubateur des Créateurs
          </h1>
          <p className="text-slate-400">
            Réseau privé de créateurs et d'entreprises
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-800/50 backdrop-blur">
          <CardContent className="p-8">
            {step === "email" ? (
              <div className="space-y-6">
                {/* Google Login */}
                <Button
                  type="button"
                  className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-medium"
                  onClick={handleGoogleLogin}
                  data-testid="google-login-btn"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-800/50 text-slate-500">ou</span>
                  </div>
                </div>

                {/* Email OTP Login */}
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      onKeyDown={(e) => e.key === "Enter" && handleRequestOTP()}
                      data-testid="email-input"
                    />
                  </div>
                  <Button
                    onClick={handleRequestOTP}
                    disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-primary-hover text-white font-medium"
                    data-testid="request-otp-btn"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Recevoir un code
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-white font-medium">Code envoyé à</p>
                  <p className="text-slate-400 text-sm">{email}</p>
                </div>

                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 text-center text-2xl tracking-widest bg-slate-900 border-slate-700 text-white font-mono"
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                    data-testid="otp-input"
                  />
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={loading || otpCode.length !== 6}
                    className="w-full h-12 bg-secondary hover:bg-secondary-hover text-secondary-foreground font-medium"
                    data-testid="verify-otp-btn"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Vérifier
                        <CheckCircle className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                <button
                  onClick={() => { setStep("email"); setOtpCode(""); }}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-300"
                >
                  ← Changer d'email
                </button>
              </div>
            )}

            {/* Request Access */}
            <div className="mt-8 pt-6 border-t border-slate-700 text-center">
              <p className="text-slate-500 text-sm mb-3">Pas encore membre ?</p>
              <Button
                variant="outline"
                onClick={() => setAccessDialogOpen(true)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                data-testid="request-access-btn"
              >
                Demander un accès
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Access Request Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Demander un accès</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Votre nom"
              value={accessForm.name}
              onChange={(e) => setAccessForm({ ...accessForm, name: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Input
              type="email"
              placeholder="Votre email"
              value={accessForm.email}
              onChange={(e) => setAccessForm({ ...accessForm, email: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <textarea
              placeholder="Pourquoi souhaitez-vous rejoindre ?"
              value={accessForm.reason}
              onChange={(e) => setAccessForm({ ...accessForm, reason: e.target.value })}
              className="w-full h-24 px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 resize-none"
            />
            <Button
              onClick={handleRequestAccess}
              className="w-full bg-primary hover:bg-primary-hover"
            >
              Envoyer la demande
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
