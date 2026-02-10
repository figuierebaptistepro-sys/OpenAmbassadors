import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Share2, Sparkles, Eye, Copy, QrCode, 
  TrendingUp, Users, MousePointerClick, ArrowUpRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import AppLayout from "../components/AppLayout";
import CreatorCardManager from "../components/CreatorCardManager";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CreatorCardManagePage = ({ user, onUserUpdate }) => {
  const [cardData, setCardData] = useState(null);

  const copyCardUrl = () => {
    if (user?.username) {
      const url = `${window.location.origin}/@${user.username}`;
      navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papiers !");
    } else {
      toast.error("Définissez d'abord votre nom d'utilisateur");
    }
  };

  const previewCard = () => {
    if (user?.username) {
      window.open(`/@${user.username}`, "_blank");
    } else {
      toast.error("Définissez d'abord votre nom d'utilisateur");
    }
  };

  return (
    <AppLayout user={user} onUserUpdate={onUserUpdate}>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                Creator Card
              </h1>
              <p className="text-gray-600 mt-2">
                Votre page publique professionnelle type "lien en bio"
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={copyCardUrl}
                className="gap-2"
                data-testid="header-copy-btn"
              >
                <Copy className="w-4 h-4" />
                Copier le lien
              </Button>
              <Button 
                onClick={previewCard}
                className="gap-2 bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90"
                data-testid="header-preview-btn"
              >
                <Eye className="w-4 h-4" />
                Voir ma carte
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards - Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">--</p>
                  <p className="text-xs text-gray-500">Vues</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <MousePointerClick className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">--</p>
                  <p className="text-xs text-gray-500">Clics</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">--</p>
                  <p className="text-xs text-gray-500">Demandes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">--</p>
                  <p className="text-xs text-gray-500">Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tips Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/10 via-pink-50 to-purple-50 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Optimisez votre Creator Card
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center gap-2">
                      <ArrowUpRight className="w-3 h-3 text-primary" />
                      Ajoutez une photo de profil professionnelle
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowUpRight className="w-3 h-3 text-primary" />
                      Décrivez clairement vos offres et tarifs
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowUpRight className="w-3 h-3 text-primary" />
                      Partagez votre lien sur vos réseaux sociaux
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content - Creator Card Manager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CreatorCardManager user={user} />
        </motion.div>

        {/* Premium Upsell for non-premium users */}
        {!user?.is_premium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 via-white to-pink-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-lg font-bold text-gray-900">
                      Passez Premium
                    </h3>
                    <p className="text-sm text-gray-600">
                      Offres illimitées, liens illimités, statistiques avancées et plus encore !
                    </p>
                  </div>
                  <Button 
                    className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 shadow-lg shadow-primary/20"
                    data-testid="upgrade-premium-btn"
                  >
                    Upgrade - 49€/mois
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default CreatorCardManagePage;
