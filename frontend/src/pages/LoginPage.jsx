import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState("main"); // main, email, otp
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Entrez un email valide");
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
        toast.success("Code envoyé à votre email !");
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

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success("Nouveau code envoyé !");
        if (data.debug_code) {
          toast.info(`Code: ${data.debug_code}`, { duration: 10000 });
        }
      }
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200/40 to-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-200/30 to-purple-200/30 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl shadow-lg shadow-pink-500/30 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Creator Incubator</h1>
          <p className="text-gray-500 text-sm mt-1">Connectez-vous ou créez un compte</p>
        </motion.div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 border border-white/50 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === "main" && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-4"
              >
                {/* Google Button */}
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-200 shadow-sm rounded-xl transition-all hover:shadow-md"
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

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-gray-400 text-sm">ou</span>
                  </div>
                </div>

                {/* Email Button */}
                <Button
                  onClick={() => setStep("email")}
                  className="w-full h-12 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/30"
                  data-testid="email-login-btn"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Continuer avec Email
                </Button>

                {/* Info */}
                <p className="text-center text-xs text-gray-400 pt-2">
                  Créez un compte ou connectez-vous en un clic
                </p>
              </motion.div>
            )}

            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-5"
              >
                <button
                  onClick={() => setStep("main")}
                  className="flex items-center text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour
                </button>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-pink-100 rounded-full mb-3">
                    <Mail className="w-6 h-6 text-pink-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Entrez votre email</h2>
                  <p className="text-gray-500 text-sm">Nous vous enverrons un code de connexion</p>
                </div>

                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-gray-50/50 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-pink-500/20"
                    onKeyDown={(e) => e.key === "Enter" && handleRequestOTP()}
                    autoFocus
                    data-testid="email-input"
                  />
                  <Button
                    onClick={handleRequestOTP}
                    disabled={loading || !email}
                    className="w-full h-12 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-pink-500/25 disabled:opacity-50"
                    data-testid="request-otp-btn"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Envoyer le code
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-5"
              >
                <button
                  onClick={() => { setStep("email"); setOtpCode(""); }}
                  className="flex items-center text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Changer d'email
                </button>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                    <KeyRound className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Vérifiez votre email</h2>
                  <p className="text-gray-500 text-sm">
                    Code envoyé à <span className="font-medium text-gray-700">{email}</span>
                  </p>
                </div>

                <div className="space-y-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 text-center text-2xl tracking-[0.5em] bg-gray-50/50 border-gray-200 rounded-xl font-mono focus:border-pink-500"
                    maxLength={6}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                    autoFocus
                    data-testid="otp-input"
                  />
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={loading || otpCode.length !== 6}
                    className="w-full h-12 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-pink-500/25 disabled:opacity-50"
                    data-testid="verify-otp-btn"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </div>

                <button
                  onClick={handleResendCode}
                  disabled={loading}
                  className="w-full text-center text-sm text-gray-500 hover:text-pink-600 transition-colors"
                >
                  Renvoyer le code
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          En continuant, vous acceptez nos conditions d'utilisation
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
