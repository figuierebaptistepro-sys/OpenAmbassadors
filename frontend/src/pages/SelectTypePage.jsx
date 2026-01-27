import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, Building2, ArrowRight, Sparkles } from "lucide-react";
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

      if (!response.ok) throw new Error("Erreur");

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
    <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary-soft to-transparent rounded-full opacity-60 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
            Bienvenue {user?.name?.split(" ")[0]} !
          </h1>
          <p className="text-gray-500">
            Vous êtes...
          </p>
        </div>

        <div className="space-y-4">
          {/* Creator Option */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className={`cursor-pointer border-2 transition-all shadow-lg ${
                selectedType === "creator"
                  ? "border-primary bg-primary-soft"
                  : "border-transparent bg-white hover:border-gray-200"
              }`}
              onClick={() => !loading && handleSelectType("creator")}
              data-testid="select-creator-btn"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    selectedType === "creator" ? "bg-primary" : "bg-primary-soft"
                  }`}>
                    <Video className={`w-7 h-7 ${
                      selectedType === "creator" ? "text-white" : "text-primary"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold text-gray-900 mb-1">
                      Créateur
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Je crée du contenu et cherche des missions
                    </p>
                  </div>
                  {selectedType === "creator" && loading ? (
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Business Option */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className={`cursor-pointer border-2 transition-all shadow-lg ${
                selectedType === "business"
                  ? "border-primary bg-primary-soft"
                  : "border-transparent bg-white hover:border-gray-200"
              }`}
              onClick={() => !loading && handleSelectType("business")}
              data-testid="select-business-btn"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    selectedType === "business" ? "bg-primary" : "bg-gray-100"
                  }`}>
                    <Building2 className={`w-7 h-7 ${
                      selectedType === "business" ? "text-white" : "text-gray-600"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-semibold text-gray-900 mb-1">
                      Entreprise
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Je cherche des créateurs pour mes projets
                    </p>
                  </div>
                  {selectedType === "business" && loading ? (
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          Seule information obligatoire avec votre email
        </p>
      </motion.div>
    </div>
  );
};

export default SelectTypePage;
