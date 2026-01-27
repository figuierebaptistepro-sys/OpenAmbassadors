import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Play, Users, Building2, Video, ChevronRight, Star, 
  MapPin, Zap, Shield, Clock, CheckCircle2, ArrowRight,
  Menu, X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ creators_count: 150, businesses_count: 45, videos_count: 2500 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/stats/platform`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.1 } }
  };

  const packs = [
    {
      name: "Local Impact",
      icon: "🔥",
      description: "Pour commerces physiques",
      price: "1 500€ - 3 000€",
      features: ["5 créateurs locaux", "10 vidéos", "1 micro-trottoir", "Livraison 14 jours"],
      popular: true,
      color: "from-orange-500 to-red-500"
    },
    {
      name: "Visibilité Digitale",
      icon: "🚀",
      description: "Pour e-commerce",
      price: "3 000€ - 6 000€",
      features: ["10 créateurs", "30 vidéos UGC", "Droits ads", "Hook testing"],
      popular: false,
      color: "from-blue-500 to-indigo-500"
    },
    {
      name: "Massive Content",
      icon: "💣",
      description: "Volume massif",
      price: "10 000€ - 25 000€",
      features: ["50 créateurs", "200+ vidéos", "Multi comptes", "Account manager"],
      popular: false,
      color: "from-purple-500 to-pink-500"
    }
  ];

  const testimonials = [
    {
      name: "Marie L.",
      role: "Fondatrice, Beauté Bio",
      content: "Grâce à la plateforme, nous avons multiplié par 3 notre ROAS. Les créateurs sont pros et les délais respectés.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
    },
    {
      name: "Thomas D.",
      role: "CEO, FoodTech",
      content: "Le pack Massive Content nous a permis de saturer TikTok en 2 semaines. Résultat : +500K vues organiques.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
    },
    {
      name: "Sophie M.",
      role: "Marketing, Retail",
      content: "Les micro-trottoirs ont transformé notre image locale. Nos clients nous reconnaissent maintenant dans la rue !",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
    }
  ];

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

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/creators" className="text-slate-600 hover:text-primary font-medium transition-colors">
                Créateurs
              </Link>
              <Link to="/packs" className="text-slate-600 hover:text-primary font-medium transition-colors">
                Packs
              </Link>
              <Link to="/login" className="text-slate-600 hover:text-primary font-medium transition-colors">
                Connexion
              </Link>
              <Button 
                onClick={() => navigate("/register/business")}
                className="bg-primary hover:bg-primary-hover text-white rounded-full px-6"
                data-testid="nav-get-started-btn"
              >
                Commencer
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="md:hidden border-t border-slate-100 py-4"
            >
              <div className="flex flex-col gap-4">
                <Link to="/creators" className="text-slate-600 font-medium py-2">Créateurs</Link>
                <Link to="/packs" className="text-slate-600 font-medium py-2">Packs</Link>
                <Link to="/login" className="text-slate-600 font-medium py-2">Connexion</Link>
                <Button 
                  onClick={() => navigate("/register/business")}
                  className="bg-primary text-white rounded-full w-full"
                >
                  Commencer
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div {...fadeInUp} className="text-left">
              <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                La plateforme #1 en France
              </div>
              
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                L'endroit où les entreprises trouvent leurs{" "}
                <span className="gradient-text">créateurs</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl">
                UGC • Micro-trottoir • Vidéos virales • Créateurs locaux ou à distance.
                <span className="font-semibold text-slate-800"> Production de contenu rentable.</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  onClick={() => navigate("/register/business")}
                  size="lg"
                  className="bg-primary hover:bg-primary-hover text-white rounded-full px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                  data-testid="hero-business-btn"
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  Je suis une entreprise
                </Button>
                <Button
                  onClick={() => navigate("/register/creator")}
                  size="lg"
                  variant="outline"
                  className="border-2 border-slate-200 hover:border-primary hover:bg-primary/5 rounded-full px-8 py-6 text-lg font-semibold transition-all"
                  data-testid="hero-creator-btn"
                >
                  <Video className="w-5 h-5 mr-2" />
                  Je suis créateur
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex flex-wrap items-center gap-8">
                <div className="text-center">
                  <p className="font-heading text-3xl font-bold text-slate-900">{stats.creators_count}+</p>
                  <p className="text-sm text-slate-500">Créateurs actifs</p>
                </div>
                <div className="w-px h-12 bg-slate-200 hidden sm:block" />
                <div className="text-center">
                  <p className="font-heading text-3xl font-bold text-slate-900">{stats.businesses_count}+</p>
                  <p className="text-sm text-slate-500">Entreprises</p>
                </div>
                <div className="w-px h-12 bg-slate-200 hidden sm:block" />
                <div className="text-center">
                  <p className="font-heading text-3xl font-bold text-slate-900">{stats.videos_count}+</p>
                  <p className="text-sm text-slate-500">Vidéos produites</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=800&q=80"
                  alt="Créateur de contenu en action"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-xl p-4 shadow-lg">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-secondary-foreground fill-current" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-slate-900">+2500 vidéos livrées</p>
                      <p className="text-sm text-slate-500">Satisfaction garantie</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl p-4 hidden lg:block">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-400 border-2 border-white" />
                    ))}
                  </div>
                  <div className="flex text-yellow-400">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Shield, text: "Créateurs certifiés" },
              { icon: Clock, text: "Délais garantis" },
              { icon: CheckCircle2, text: "Satisfaction ou remboursé" },
              { icon: Zap, text: "Résultats mesurables" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-600">
                <item.icon className="w-5 h-5 text-primary" />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packs Section */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Des packs adaptés à vos objectifs
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choisissez la formule qui correspond à vos besoins. Du commerce local à l'e-commerce, nous avons la solution.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {packs.map((pack, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className={`relative h-full overflow-hidden border-slate-200 hover:border-primary/50 transition-all duration-300 hover:shadow-xl ${pack.popular ? 'ring-2 ring-primary' : ''}`}>
                  {pack.popular && (
                    <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                      Populaire
                    </div>
                  )}
                  <CardContent className="p-8">
                    <div className="text-4xl mb-4">{pack.icon}</div>
                    <h3 className="font-heading text-2xl font-bold text-slate-900 mb-2">{pack.name}</h3>
                    <p className="text-slate-500 mb-4">{pack.description}</p>
                    <p className="font-heading text-3xl font-bold text-primary mb-6">{pack.price}</p>
                    
                    <ul className="space-y-3 mb-8">
                      {pack.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-600">
                          <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      onClick={() => navigate("/register/business")}
                      className={`w-full rounded-full ${pack.popular ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                      data-testid={`pack-${index}-btn`}
                    >
                      Demander un devis
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 md:py-28 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Un processus simple et efficace pour des résultats rapides
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Choisissez votre pack", desc: "Sélectionnez la formule adaptée à vos objectifs" },
              { step: "02", title: "Briefez-nous", desc: "Partagez votre vision et vos attentes" },
              { step: "03", title: "On match les créateurs", desc: "Les meilleurs profils pour votre projet" },
              { step: "04", title: "Recevez vos vidéos", desc: "Contenus prêts à être publiés" }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-secondary text-secondary-foreground rounded-2xl flex items-center justify-center font-heading font-bold text-xl mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="font-heading text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Découvrez les résultats obtenus par nos clients
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border-slate-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-8">
                    <div className="flex text-yellow-400 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" />
                      ))}
                    </div>
                    <p className="text-slate-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                    <div className="flex items-center gap-4">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-heading font-semibold text-slate-900">{testimonial.name}</p>
                        <p className="text-sm text-slate-500">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Prêt à booster votre visibilité ?
            </h2>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Rejoignez les entreprises qui génèrent du contenu performant avec nos créateurs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/register/business")}
                size="lg"
                className="bg-white text-primary hover:bg-slate-100 rounded-full px-10 py-6 text-lg font-semibold shadow-xl"
                data-testid="cta-business-btn"
              >
                Démarrer maintenant
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => navigate("/register/creator")}
                size="lg"
                variant="outline"
                className="border-2 border-white/30 text-white hover:bg-white/10 rounded-full px-10 py-6 text-lg font-semibold"
                data-testid="cta-creator-btn"
              >
                Devenir créateur
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="font-heading font-bold text-xl">UGC Machine</span>
              </div>
              <p className="text-slate-400">
                La plateforme où les entreprises trouvent leurs créateurs de contenu.
              </p>
            </div>
            
            <div>
              <h4 className="font-heading font-semibold mb-4">Entreprises</h4>
              <ul className="space-y-3 text-slate-400">
                <li><Link to="/packs" className="hover:text-white transition-colors">Nos packs</Link></li>
                <li><Link to="/creators" className="hover:text-white transition-colors">Trouver un créateur</Link></li>
                <li><Link to="/register/business" className="hover:text-white transition-colors">S'inscrire</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-heading font-semibold mb-4">Créateurs</h4>
              <ul className="space-y-3 text-slate-400">
                <li><Link to="/register/creator" className="hover:text-white transition-colors">Rejoindre</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Se connecter</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-heading font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-slate-400">
                <li>contact@ugcmachine.fr</li>
                <li>Paris, France</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-500">
            <p>© {new Date().getFullYear()} UGC Machine. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
