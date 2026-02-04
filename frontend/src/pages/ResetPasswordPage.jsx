import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (!token) {
      setError(true);
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetPassword = async () => {
    if (!formData.password || !formData.confirmPassword) {
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
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          new_password: formData.password
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Erreur lors de la réinitialisation");
      }

      setSuccess(true);
      toast.success("✅ Mot de passe modifié avec succès !");
    } catch (error) {
      toast.error(error.message);
      if (error.message.includes("expiré") || error.message.includes("invalide")) {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Error state - invalid or expired token
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide ou expiré</h1>
          <p className="text-gray-500 mb-6">
            Ce lien de réinitialisation n'est plus valide. Veuillez faire une nouvelle demande.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-xl h-11"
          >
            Retour à la connexion
          </Button>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Mot de passe modifié !</h1>
          <p className="text-gray-500 mb-6">
            Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-xl h-11"
          >
            Se connecter
          </Button>
        </motion.div>
      </div>
    );
  }

  // Reset password form
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
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 text-center border-b border-gray-100">
          <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-gray-500 text-sm mt-1">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nouveau mot de passe"
              value={formData.password}
              onChange={handleChange}
              className="pl-10 pr-10 h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-pink-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Confirmer le mot de passe"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="pl-10 h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-pink-500/20"
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
            />
          </div>

          {/* Password requirements */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Le mot de passe doit contenir :</p>
            <ul className="text-xs space-y-1">
              <li className={`flex items-center gap-2 ${formData.password.length >= 6 ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${formData.password.length >= 6 ? "bg-green-500" : "bg-gray-300"}`}></div>
                Au moins 6 caractères
              </li>
              <li className={`flex items-center gap-2 ${formData.password === formData.confirmPassword && formData.password ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${formData.password === formData.confirmPassword && formData.password ? "bg-green-500" : "bg-gray-300"}`}></div>
                Les deux mots de passe correspondent
              </li>
            </ul>
          </div>

          <Button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-pink-500/25"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Modifier mon mot de passe"
            )}
          </Button>

          <button
            onClick={() => navigate("/login")}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour à la connexion
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
