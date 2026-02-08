import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "/logo-sun.png";

// Cookie helpers
const setCookie = (name, value, days) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState("login"); // login or register
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Capture referral code from URL or cookie (60 days)
  useEffect(() => {
    const refFromUrl = searchParams.get("ref");
    const refFromCookie = getCookie("affiliate_ref");
    
    if (refFromUrl) {
      // URL has priority - save to cookie for 60 days
      setRefCode(refFromUrl);
      setCookie("affiliate_ref", refFromUrl, 60);
      setMode("register"); // Switch to register mode if coming from affiliate link
      
      // Track the click
      fetch(`${API_URL}/api/affiliate/track-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: refFromUrl })
      }).catch(() => {});
    } else if (refFromCookie) {
      // Use cookie if no URL param
      setRefCode(refFromCookie);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      // Get ref code from state (could be from URL or cookie)
      const affiliateRef = refCode || getCookie("affiliate_ref");
      
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          ref_code: affiliateRef // Include referral code from URL or cookie
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Erreur lors de l'inscription");
      }

      // Clear affiliate cookie after successful registration
      deleteCookie("affiliate_ref");

      toast.success("🎉 Félicitations ! Votre compte a été créé. Vérifiez votre email !");
      navigate("/select-type", { state: { user: data } });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Veuillez entrer votre email");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();
      toast.success("📧 Si un compte existe, vous recevrez un email de réinitialisation.");
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Email ou mot de passe incorrect");
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

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/50 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-200/20 to-purple-200/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <img 
            src={LOGO_URL} 
            alt="OpenAmbassadors" 
            className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg object-cover"
          />
          <h1 className="text-2xl font-bold text-gray-900">OpenAmbassadors</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === "login" ? "Connectez-vous à votre compte" : "Créez votre compte"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                mode === "login" 
                  ? "text-pink-600 border-b-2 border-pink-500 bg-pink-50/50" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Se connecter
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                mode === "register" 
                  ? "text-pink-600 border-b-2 border-pink-500 bg-pink-50/50" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Créer un compte
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {/* Google Button */}
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-11 bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-200 rounded-xl transition-all hover:shadow-md mb-5"
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
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-gray-400 text-xs">ou avec email</span>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {mode === "register" && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      name="name"
                      type="text"
                      placeholder="Votre nom"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-10 h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-pink-500/20"
                      data-testid="name-input"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-pink-500/20"
                    data-testid="email-input"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-pink-500/20"
                    onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleLogin()}
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {mode === "login" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-primary hover:text-primary-hover hover:underline"
                      data-testid="forgot-password-btn"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                {mode === "register" && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirmer le mot de passe"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10 h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-pink-500/20"
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                      data-testid="confirm-password-input"
                    />
                  </div>
                )}

                <Button
                  onClick={mode === "login" ? handleLogin : handleRegister}
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl"
                  data-testid={mode === "login" ? "login-btn" : "register-btn"}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === "login" ? "Se connecter" : "Créer mon compte"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {/* Switch mode link */}
              <p className="text-center text-sm text-gray-500 mt-5">
                {mode === "login" ? (
                  <>
                    Pas encore de compte ?{" "}
                    <button onClick={switchMode} className="text-pink-600 hover:text-pink-700 font-medium">
                      Créer un compte
                    </button>
                  </>
                ) : (
                  <>
                    Déjà un compte ?{" "}
                    <button onClick={switchMode} className="text-pink-600 hover:text-pink-700 font-medium">
                      Se connecter
                    </button>
                  </>
                )}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          En continuant, vous acceptez nos{" "}
          <a 
            href="https://openambassadors.com/conditions" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            conditions d'utilisation
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
