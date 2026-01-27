import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, HelpCircle, MessageCircle, Book, FileText, 
  ChevronDown, ChevronRight, ExternalLink, Mail, Search
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SupportPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const faqs = [
    {
      id: 1,
      question: "Comment compléter mon profil ?",
      answer: "Rendez-vous sur votre Dashboard et cliquez sur 'Compléter mon profil'. Remplissez les différentes sections : bio, ville, spécialités, matériel, et ajoutez au moins 3 vidéos à votre portfolio pour maximiser votre visibilité.",
      category: "Profil"
    },
    {
      id: 2,
      question: "Comment fonctionne le système de score ?",
      answer: "Votre score est composé de 3 éléments : Score de complétion (basé sur les informations de votre profil), Score de fiabilité (basé sur vos missions réalisées), et Score de performance (basé sur les avis clients). Plus votre score est élevé, plus vous êtes visible.",
      category: "Profil"
    },
    {
      id: 3,
      question: "Qu'est-ce que l'Incubateur Premium ?",
      answer: "L'Incubateur Premium est notre programme d'accompagnement à 49€/mois. Il vous donne accès à : priorité dans l'algorithme de recherche, badge Premium visible, formations avancées, briefs exclusifs réservés aux membres, et support prioritaire.",
      category: "Premium"
    },
    {
      id: 4,
      question: "Comment candidater à une mission ?",
      answer: "Allez dans l'onglet 'Missions' de votre Dashboard. Parcourez les projets disponibles et cliquez sur 'Candidater' pour ceux qui vous intéressent. Certaines missions sont réservées aux membres Premium.",
      category: "Missions"
    },
    {
      id: 5,
      question: "Comment sélectionner un pack entreprise ?",
      answer: "Depuis votre Dashboard entreprise, cliquez sur 'Choisir un pack' ou rendez-vous dans la section Packs. Sélectionnez le pack adapté à vos besoins. Vous devez avoir un pack actif pour créer des projets.",
      category: "Entreprise"
    },
    {
      id: 6,
      question: "Comment trouver des créateurs ?",
      answer: "Utilisez la page 'Find Creator' accessible depuis le menu. Vous pouvez filtrer par mode (local/remote), ville, score minimum, disponibilité, et type de contenu. Les créateurs Premium apparaissent en priorité.",
      category: "Entreprise"
    },
    {
      id: 7,
      question: "Comment accéder aux formations ?",
      answer: "Les formations sont accessibles dans l'onglet 'Learn'. Certaines sont gratuites pour tous, d'autres sont réservées aux membres Premium. Compléter une formation vous donne +5 points de visibilité.",
      category: "Formations"
    },
    {
      id: 8,
      question: "Comment contacter un créateur ?",
      answer: "Pour contacter un créateur, vous devez d'abord créer un projet. Les créateurs intéressés candidateront et vous pourrez alors échanger avec eux. Il n'y a pas de messagerie directe pour garantir des échanges professionnels.",
      category: "Entreprise"
    },
  ];

  const guides = [
    {
      title: "Guide du créateur débutant",
      description: "Apprenez à optimiser votre profil et décrocher vos premières missions",
      icon: "📚",
      forCreator: true
    },
    {
      title: "Maximiser sa visibilité",
      description: "Conseils pour apparaître en tête des résultats de recherche",
      icon: "🚀",
      forCreator: true
    },
    {
      title: "Guide entreprise",
      description: "Comment trouver les meilleurs créateurs pour vos projets",
      icon: "💼",
      forCreator: false
    },
    {
      title: "Créer un brief efficace",
      description: "Les clés pour rédiger un projet qui attire les bons créateurs",
      icon: "✍️",
      forCreator: false
    },
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const relevantGuides = guides.filter(g => 
    user?.user_type === "creator" ? g.forCreator : !g.forCreator || g.forCreator
  );

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType={user?.user_type} isPremium={user?.is_premium} onLogout={handleLogout} />

      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-xl font-bold text-gray-900">Support & Guides</h1>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {user?.picture ? (
                  <img src={user.picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          {/* Search */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher dans l'aide..."
                className="pl-12 h-12 bg-white border-gray-200 shadow-md text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* FAQ */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    Questions fréquentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {filteredFaqs.map((faq) => (
                    <div key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-gray-200 text-gray-500 text-xs">
                            {faq.category}
                          </Badge>
                          <span className="text-gray-900 font-medium">{faq.question}</span>
                        </div>
                        {openFaq === faq.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      {openFaq === faq.id && (
                        <div className="px-4 pb-4 text-gray-600 leading-relaxed border-t border-gray-100 pt-3 bg-gray-50">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Guides */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Book className="w-5 h-5 text-primary" />
                    Guides
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {relevantGuides.map((guide, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/30 cursor-pointer transition-all"
                      >
                        <span className="text-2xl mb-2 block">{guide.icon}</span>
                        <h3 className="text-gray-900 font-semibold mb-1">{guide.title}</h3>
                        <p className="text-gray-500 text-sm">{guide.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900">Besoin d'aide ?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-500 text-sm">
                    Notre équipe est disponible pour répondre à vos questions.
                  </p>
                  <Button className="w-full bg-primary hover:bg-primary-hover shadow-md shadow-primary/20">
                    <Mail className="w-4 h-4 mr-2" />
                    Contacter le support
                  </Button>
                  <p className="text-gray-400 text-xs text-center">
                    Réponse sous 24h en moyenne
                  </p>
                </CardContent>
              </Card>

              {/* Resources */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900">Ressources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a href="#" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">Conditions d'utilisation</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                  <a href="#" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">Politique de confidentialité</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                  <a href="#" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">Communauté Discord</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupportPage;
