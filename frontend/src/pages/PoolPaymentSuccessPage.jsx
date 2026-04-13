import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle, ArrowRight } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PoolPaymentSuccessPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [poolId, setPoolId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    } else {
      setStatus("error");
      setError("Session de paiement non trouvée");
    }
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stripe/pool-status/${sessionId}`, {
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.payment_status === "paid" && data.pool_id) {
          setPoolId(data.pool_id);
          setStatus("success");
        } else if (data.payment_status === "paid") {
          // Payment ok but pool creation pending
          setTimeout(checkPaymentStatus, 2000);
        } else {
          setStatus("error");
          setError("Le paiement n'a pas été complété");
        }
      } else {
        const errorData = await response.json();
        setStatus("error");
        setError(errorData.detail || "Erreur lors de la vérification");
      }
    } catch (err) {
      setStatus("error");
      setError("Erreur de connexion");
    }
  };

  return (
    <AppLayout user={user}>
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="border-0 shadow-lg max-w-md w-full">
          <CardContent className="p-8 text-center">
            {status === "loading" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h2 className="text-xl font-heading font-bold text-gray-900 mb-2">
                  Vérification du paiement...
                </h2>
                <p className="text-gray-500 text-sm">
                  Veuillez patienter pendant que nous créons votre campagne
                </p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-heading font-bold text-gray-900 mb-2">
                  Paiement réussi !
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Votre campagne Pool a été créée avec succès
                </p>
                <Button
                  onClick={() => navigate(`/business/pools/${poolId}`)}
                  className="w-full bg-primary hover:bg-primary-hover"
                >
                  Voir ma campagne <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-heading font-bold text-gray-900 mb-2">
                  Erreur
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  {error}
                </p>
                <Button
                  onClick={() => navigate("/business/pools/new")}
                  variant="outline"
                  className="w-full"
                >
                  Réessayer
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PoolPaymentSuccessPage;
