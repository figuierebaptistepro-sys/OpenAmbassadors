import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, ArrowLeft, CheckCircle, Package, ArrowRight,
  Users, Video, Clock, Shield, Zap, Star
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PacksPage = () => {
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    company_name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const packs = [
    {
      id: "pack_local_impact",
      name: "Local Impact",
      icon: "🔥",
      description: "Pour commerces physiques - Boostez votre visibilité locale",
      target: "Commerces physiques",
      price_min: 1500,
      price_max: 3000,
      creators_count: 5,
      videos_count: 10,
      delivery_days: 14,
      includes: [
        "5 créateurs locaux qualifiés",
        "10 vidéos UGC haute qualité",
        "1 micro-trottoir authentique",
        "Publication + diffusion incluse",
        "Droits d'utilisation 1 an",
        "Support dédié",
      ],
      benefits: [
        "Augmentez votre visibilité locale",
        "Attirez plus de clients en magasin",
        "Contenu authentique et local",
      ],
      popular: true,
      color: "from-orange-500 to-red-500",
    },
    {
      id: "pack_digital_visibility",
      name: "Visibilité Digitale",
      icon: "🚀",
      description: "Pour e-commerce - Multipliez vos conversions avec du contenu performant",
      target: "E-commerce",
      price_min: 3000,
      price_max: 6000,
      creators_count: 10,
      videos_count: 30,
      delivery_days: 21,
      includes: [
        "10 créateurs sélectionnés",
        "30 vidéos UGC optimisées",
        "Droits publicitaires complets",
        "Hook testing inclus",
        "A/B testing créatif",
        "Optimisation continue",
      ],
      benefits: [
        "Multipliez vos conversions",
        "Testez différents angles",
        "Optimisez vos ads",
      ],
      popular: false,
      color: "from-blue-500 to-indigo-500",
    },
    {
      id: "pack_massive_content",
      name: "Massive Content",
      icon: "💣",
      description: "Volume massif - Dominez votre marché avec une stratégie de contenu aggressive",
      target: "Grandes marques",
      price_min: 10000,
      price_max: 25000,
      creators_count: 50,
      videos_count: 200,
      delivery_days: 45,
      includes: [
        "50 créateurs mobilisés",
        "200+ vidéos livrées",
        "Stratégie multi-comptes",
        "Diffusion orchestrée",
        "Account manager dédié",
        "Reporting avancé",
        "Support prioritaire 24/7",
      ],
      benefits: [
        "Dominez votre marché",
        "Saturez les réseaux",
        "ROI garanti",
      ],
      popular: false,
      color: "from-purple-500 to-pink-500",
    },
  ];

  const handleQuoteSubmit = async () => {
    if (!quoteForm.email || !quoteForm.company_name) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/quote-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quoteForm,
          pack_id: selectedPack?.id,
        }),
      });

      if (response.ok) {
        toast.success("Demande envoyée ! Nous vous recontactons sous 24h.");
        setQuoteDialogOpen(false);
        setQuoteForm({ company_name: "", email: "", phone: "", message: "" });
      } else {
        throw new Error("Erreur");
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-heading font-bold text-xl text-slate-900">UGC Machine</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/creators" className="text-slate-600 hover:text-primary font-medium hidden md:block">
                Créateurs
              </Link>
              <Link to="/login">
                <Button variant="outline">Connexion</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="bg-secondary text-secondary-foreground mb-6">
              <Package className="w-4 h-4 mr-2" />
              Packs clé en main
            </Badge>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              Choisissez votre pack
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              Des solutions packagées pour tous vos besoins en contenu.
              Du commerce local à l'e-commerce, nous avons la formule qu'il vous faut.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Shield, text: "Satisfaction garantie" },
              { icon: Clock, text: "Délais respectés" },
              { icon: Users, text: "Créateurs certifiés" },
              { icon: Zap, text: "Résultats mesurables" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-600">
                <item.icon className="w-5 h-5 text-primary" />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packs Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {packs.map((pack, index) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative h-full overflow-hidden border-slate-200 hover:shadow-xl transition-all ${pack.popular ? 'ring-2 ring-primary' : ''}`}>
                  {pack.popular && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-white text-center py-2 text-sm font-semibold">
                      ⭐ Le plus populaire
                    </div>
                  )}
                  <CardContent className={`p-8 ${pack.popular ? 'pt-14' : ''}`}>
                    <div className="text-5xl mb-4">{pack.icon}</div>
                    <h3 className="font-heading text-2xl font-bold text-slate-900 mb-2">{pack.name}</h3>
                    <p className="text-slate-500 mb-2">{pack.target}</p>
                    <p className="text-slate-600 text-sm mb-6">{pack.description}</p>
                    
                    <div className="mb-6">
                      <p className="font-heading text-4xl font-bold text-primary">
                        {pack.price_min.toLocaleString()}€
                        <span className="text-lg text-slate-400 font-normal"> - {pack.price_max.toLocaleString()}€</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-y border-slate-100">
                      <div className="text-center">
                        <p className="font-heading text-2xl font-bold text-slate-900">{pack.creators_count}</p>
                        <p className="text-xs text-slate-500">Créateurs</p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading text-2xl font-bold text-slate-900">{pack.videos_count}</p>
                        <p className="text-xs text-slate-500">Vidéos</p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading text-2xl font-bold text-slate-900">{pack.delivery_days}</p>
                        <p className="text-xs text-slate-500">Jours</p>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {pack.includes.slice(0, 6).map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-600 text-sm">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => { setSelectedPack(pack); setQuoteDialogOpen(true); }}
                      className={`w-full rounded-full ${pack.popular ? 'bg-primary hover:bg-primary-hover' : 'bg-slate-900 hover:bg-slate-800'}`}
                      data-testid={`pack-${pack.id}-btn`}
                    >
                      Demander un devis
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Pack CTA */}
      <section className="py-16 md:py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
            Besoin d'un pack sur mesure ?
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Nous créons des solutions personnalisées pour répondre à vos besoins spécifiques.
            Contactez-nous pour discuter de votre projet.
          </p>
          <Button
            onClick={() => { setSelectedPack(null); setQuoteDialogOpen(true); }}
            size="lg"
            className="bg-secondary hover:bg-secondary-hover text-secondary-foreground rounded-full px-10"
          >
            Demander un devis personnalisé
          </Button>
        </div>
      </section>

      {/* Quote Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              {selectedPack ? `Devis - ${selectedPack.name}` : "Demande de devis"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPack && (
              <div className="p-4 bg-slate-50 rounded-lg mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedPack.icon}</span>
                  <div>
                    <p className="font-heading font-semibold">{selectedPack.name}</p>
                    <p className="text-sm text-slate-500">
                      {selectedPack.price_min.toLocaleString()}€ - {selectedPack.price_max.toLocaleString()}€
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nom de l'entreprise *</Label>
              <Input
                value={quoteForm.company_name}
                onChange={(e) => setQuoteForm({ ...quoteForm, company_name: e.target.value })}
                placeholder="Ma Société"
                data-testid="quote-company-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={quoteForm.email}
                onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                placeholder="contact@masociete.fr"
                data-testid="quote-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={quoteForm.phone}
                onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                placeholder="06 12 34 56 78"
              />
            </div>
            <div className="space-y-2">
              <Label>Message (optionnel)</Label>
              <Textarea
                value={quoteForm.message}
                onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                placeholder="Décrivez votre projet..."
                rows={3}
              />
            </div>
            <Button
              onClick={handleQuoteSubmit}
              className="w-full bg-primary hover:bg-primary-hover"
              disabled={submitting}
              data-testid="submit-quote-btn"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Envoyer la demande"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PacksPage;
