import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, Building2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SelectTypePage = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const handleSelectType = async (type) => {
    setSelectedType(type);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/set-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_type: type }),
      });

      if (!response.ok) {
        throw new Error("Erreur");
      }

      const updatedUser = { ...user, user_type: type };
      
      if (type === "creator") {
        navigate("/dashboard", { state: { user: updatedUser } });
      } else {
        navigate("/business", { state: { user: updatedUser } });
      }
    } catch (error) {
      toast.error("Erreur lors de la sélection");
      setSelectedType(null);
    } finally {
      setLoading(false);
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
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-secondary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white mb-2">
            Bienvenue {user?.name?.split(" ")[0]} !
          </h1>
          <p className="text-slate-400">
            Vous êtes...
          </p>
        </div>

        <div className="space-y-4">
          {/* Creator Option */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className={`cursor-pointer border-2 transition-all ${
                selectedType === "creator"
                  ? "border-secondary bg-secondary/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              }`}
              onClick={() => !loading && handleSelectType("creator")}
              data-testid="select-creator-btn"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    selectedType === "creator" ? "bg-secondary" : "bg-slate-700"
                  }`}>
                    <Video className={`w-7 h-7 ${
                      selectedType === "creator" ? "text-secondary-foreground" : "text-slate-300"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold text-white mb-1">
                      Créateur
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Je crée du contenu et cherche des missions
                    </p>
                  </div>
                  {selectedType === "creator" && loading ? (
                    <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-6 h-6 text-slate-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Business Option */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className={`cursor-pointer border-2 transition-all ${
                selectedType === "business"
                  ? "border-primary bg-primary/10"
                  : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
              }`}
              onClick={() => !loading && handleSelectType("business")}
              data-testid="select-business-btn"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    selectedType === "business" ? "bg-primary" : "bg-slate-700"
                  }`}>
                    <Building2 className={`w-7 h-7 ${
                      selectedType === "business" ? "text-white" : "text-slate-300"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold text-white mb-1">
                      Entreprise
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Je cherche des créateurs pour mes projets
                    </p>
                  </div>
                  {selectedType === "business" && loading ? (
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-6 h-6 text-slate-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          Seule information obligatoire avec votre email
        </p>
      </motion.div>
    </div>
  );
};

export default SelectTypePage;
