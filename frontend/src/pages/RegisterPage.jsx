import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Mail, Lock, User, Eye, EyeOff, ArrowRight, Building2, Video } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RegisterPage = ({ userType: initialUserType }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(initialUserType ? 2 : 1);
  const [userType, setUserType] = useState(initialUserType || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name, user_type: userType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erreur lors de l'inscription");
      }

      toast.success("Compte créé avec succès !");
      
      // Navigate to onboarding or dashboard
      if (userType === "creator") {
        navigate("/creator/dashboard", { state: { user: data } });
      } else {
        navigate("/onboarding", { state: { user: data } });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleSignup = () => {
    const redirectUrl = window.location.origin + "/creator/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900">
        <div className="absolute inset-0">
          <img
            src={userType === "business" 
              ? "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80"
              : "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=80"
            }
            alt="Content creation"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-slate-900/90" />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-12">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Play className="w-6 h-6 text-primary fill-primary" />
            </div>
            <span className="font-heading font-bold text-2xl text-white">UGC Machine</span>
          </Link>
          <h1 className="font-heading text-4xl font-bold text-white mb-6">
            {userType === "business" 
              ? "Trouvez vos créateurs"
              : userType === "creator"
              ? "Rejoignez la communauté"
              : "Rejoignez-nous"
            }
          </h1>
          <p className="text-xl text-white/80 max-w-md">
            {userType === "business"
              ? "Accédez à des centaines de créateurs qualifiés pour produire du contenu performant."
              : userType === "creator"
              ? "Développez votre activité avec des marques qui vous correspondent."
              : "Une plateforme pour connecter entreprises et créateurs de contenu."
            }
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-heading font-bold text-xl text-slate-900">UGC Machine</span>
          </Link>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-heading text-2xl">Créer un compte</CardTitle>
              <CardDescription>
                {step === 1 ? "Choisissez votre profil" : "Complétez vos informations"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {step === 1 ? (
                /* Step 1: Choose User Type */
                <div className="space-y-4">
                  <button
                    onClick={() => { setUserType("business"); setStep(2); }}
                    className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                    data-testid="choose-business-btn"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Building2 className="w-7 h-7 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-heading font-semibold text-lg text-slate-900">Je suis une entreprise</h3>
                        <p className="text-sm text-slate-500">Je cherche des créateurs de contenu</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setUserType("creator"); setStep(2); }}
                    className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-secondary hover:bg-secondary/5 transition-all group"
                    data-testid="choose-creator-btn"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-secondary/20 rounded-xl flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
                        <Video className="w-7 h-7 text-secondary-foreground" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-heading font-semibold text-lg text-slate-900">Je suis créateur</h3>
                        <p className="text-sm text-slate-500">Je propose mes services de création</p>
                      </div>
                    </div>
                  </button>

                  <div className="mt-6 text-center">
                    <p className="text-slate-600">
                      Déjà un compte ?{" "}
                      <Link to="/login" className="text-primary font-semibold hover:underline">
                        Se connecter
                      </Link>
                    </p>
                  </div>
                </div>
              ) : (
                /* Step 2: Registration Form */
                <>
                  {/* Google Signup */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mb-6 h-12 border-slate-200 hover:bg-slate-50"
                    onClick={handleGoogleSignup}
                    data-testid="google-signup-btn"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuer avec Google
                  </Button>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-500">ou</span>
                    </div>
                  </div>

                  {/* Registration Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        {userType === "business" ? "Nom de l'entreprise" : "Nom complet"}
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          id="name"
                          type="text"
                          placeholder={userType === "business" ? "Ma Société" : "Jean Dupont"}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10 h-12"
                          required
                          data-testid="name-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="vous@exemple.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12"
                          required
                          data-testid="email-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-12"
                          required
                          minLength={6}
                          data-testid="password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold"
                      disabled={loading}
                      data-testid="register-submit-btn"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Créer mon compte
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 space-y-4">
                    <button
                      onClick={() => { setStep(1); setUserType(""); }}
                      className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
                    >
                      ← Changer de profil
                    </button>
                    <p className="text-center text-slate-600">
                      Déjà un compte ?{" "}
                      <Link to="/login" className="text-primary font-semibold hover:underline">
                        Se connecter
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
