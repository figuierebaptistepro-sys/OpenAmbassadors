import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, HelpCircle, ChevronDown, ChevronUp, MessageCircle, FileText, ExternalLink, Mail } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";

const FAQ_DATA = [
  { category: "Profil", questions: [
    { q: "Comment compléter mon profil ?", a: "Allez dans Paramètres > Profil et remplissez toutes les informations. Un profil complet augmente votre visibilité." },
    { q: "Comment ajouter des vidéos ?", a: "Dans votre dashboard, cliquez sur 'Ajouter vidéo' et collez le lien de votre vidéo TikTok, Instagram ou YouTube." },
  ]},
  { category: "Premium", questions: [
    { q: "Qu'est-ce que l'abonnement Premium ?", a: "L'abonnement Premium (49€/mois) vous donne accès aux missions exclusives, formations avancées et une visibilité boostée." },
    { q: "Comment annuler mon abonnement ?", a: "Allez dans Paramètres > Abonnement et cliquez sur 'Annuler'. Votre accès reste actif jusqu'à la fin de la période." },
  ]},
  { category: "Missions", questions: [
    { q: "Comment postuler à une mission ?", a: "Parcourez les missions disponibles et cliquez sur 'Postuler'. Rédigez une proposition personnalisée pour augmenter vos chances." },
    { q: "Comment suis-je payé ?", a: "Les paiements sont effectués via la plateforme. Une fois la mission validée, le montant est viré sous 3-5 jours." },
  ]},
  { category: "Entreprise", questions: [
    { q: "Comment créer un projet ?", a: "Depuis votre dashboard, cliquez sur 'Nouveau projet' et décrivez votre besoin. Les créateurs pourront ensuite postuler." },
    { q: "Comment choisir un créateur ?", a: "Consultez les profils, portfolios et avis des créateurs. Vous pouvez les contacter via la messagerie avant de décider." },
  ]},
];

const SupportPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategory, setOpenCategory] = useState("Profil");
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleQuestion = (category, index) => {
    const key = `${category}-${index}`;
    setOpenQuestions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredFAQ = FAQ_DATA.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Support & Guides</h1>
        <p className="text-gray-500 text-xs sm:text-sm">Comment pouvons-nous vous aider ?</p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher dans l'aide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FAQ */}
          <div className="lg:col-span-2 space-y-4">
            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {FAQ_DATA.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => setOpenCategory(cat.category)}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    openCategory === cat.category
                      ? "bg-primary text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {cat.category}
                </button>
              ))}
            </div>

            {/* Questions */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0 divide-y divide-gray-100">
                {(searchQuery ? filteredFAQ : FAQ_DATA.filter(c => c.category === openCategory)).map((cat) =>
                  cat.questions.map((item, index) => {
                    const key = `${cat.category}-${index}`;
                    const isOpen = openQuestions[key];
                    
                    return (
                      <div key={key}>
                        <button
                          onClick={() => toggleQuestion(cat.category, index)}
                          className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-gray-900 font-medium text-sm pr-4">{item.q}</span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-0">
                            <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-4 pb-2">
                <CardTitle className="text-gray-900 text-sm">Besoin d'aide ?</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pt-0">
                <p className="text-gray-500 text-xs mb-3">Notre équipe répond sous 24h</p>
                <Button className="w-full bg-primary hover:bg-primary-hover text-sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contacter
                </Button>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="px-4 pb-2">
                <CardTitle className="text-gray-900 text-sm">Ressources</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pt-0 space-y-2">
                {[
                  { icon: FileText, label: "Conditions d'utilisation" },
                  { icon: FileText, label: "Politique de confidentialité" },
                  { icon: ExternalLink, label: "Communauté Discord" },
                ].map((item, i) => (
                  <button key={i} className="w-full flex items-center gap-2 p-2 text-left text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors text-sm">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Email */}
            <Card className="border-0 shadow-sm bg-gray-900 text-white">
              <CardContent className="p-4">
                <Mail className="w-6 h-6 mb-2" />
                <p className="font-medium text-sm mb-1">Email direct</p>
                <p className="text-gray-400 text-xs mb-2">support@incubateur.com</p>
                <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100 text-xs">
                  Envoyer un email
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SupportPage;
