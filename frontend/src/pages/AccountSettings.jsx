import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Bell, Search, Mail, Lock, Camera, Trash2, 
  Shield, CreditCard, Globe, Moon, Sun
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AccountSettings = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [notifications, setNotifications] = useState({
    email_missions: true,
    email_messages: true,
    email_updates: false,
    push_enabled: true,
  });

  const [preferences, setPreferences] = useState({
    language: "fr",
    theme: "light",
  });

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Mock save - would update user profile
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success("Profil mis à jour !");
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success("Préférences de notification mises à jour !");
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Sécurité", icon: Shield },
    { id: "preferences", label: "Préférences", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7FB]">
      <Sidebar userType={user?.user_type} isPremium={user?.is_premium} onLogout={handleLogout} />

      <div className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-xl font-bold text-gray-900">Account Settings</h1>
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
          <div className="max-w-4xl">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900">Informations du profil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        {user?.picture ? (
                          <img src={user.picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium">{user?.name}</p>
                      <p className="text-gray-500 text-sm">{user?.email}</p>
                      <Badge className={user?.user_type === "creator" ? "bg-primary mt-2" : "bg-gray-600 mt-2"}>
                        {user?.user_type === "creator" ? "Créateur" : "Entreprise"}
                      </Badge>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Nom complet</Label>
                      <Input
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="bg-gray-50 border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="bg-gray-50 border-gray-200"
                        disabled
                      />
                      <p className="text-gray-400 text-xs">L'email ne peut pas être modifié</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={loading}
                    className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                  >
                    {loading ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900">Préférences de notification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-gray-900 font-medium">Nouvelles missions</p>
                        <p className="text-gray-500 text-sm">Recevoir un email pour les nouvelles missions</p>
                      </div>
                      <Switch
                        checked={notifications.email_missions}
                        onCheckedChange={(c) => setNotifications({ ...notifications, email_missions: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-gray-900 font-medium">Messages</p>
                        <p className="text-gray-500 text-sm">Notifications pour les nouveaux messages</p>
                      </div>
                      <Switch
                        checked={notifications.email_messages}
                        onCheckedChange={(c) => setNotifications({ ...notifications, email_messages: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-gray-900 font-medium">Mises à jour</p>
                        <p className="text-gray-500 text-sm">Newsletter et actualités de la plateforme</p>
                      </div>
                      <Switch
                        checked={notifications.email_updates}
                        onCheckedChange={(c) => setNotifications({ ...notifications, email_updates: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-gray-900 font-medium">Notifications push</p>
                        <p className="text-gray-500 text-sm">Activer les notifications dans le navigateur</p>
                      </div>
                      <Switch
                        checked={notifications.push_enabled}
                        onCheckedChange={(c) => setNotifications({ ...notifications, push_enabled: c })}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveNotifications}
                    disabled={loading}
                    className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20"
                  >
                    {loading ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900">Sécurité du compte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-green-800 font-medium">Compte sécurisé</p>
                      <p className="text-green-700 text-sm">Votre compte est protégé par l'authentification Google ou OTP</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-gray-900 font-medium">Authentification à deux facteurs</p>
                        <p className="text-gray-500 text-sm">Ajouter une couche de sécurité supplémentaire</p>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Activé via OTP</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-gray-900 font-medium">Sessions actives</p>
                        <p className="text-gray-500 text-sm">Gérer les appareils connectés</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-gray-200">
                        Voir
                      </Button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-red-600 font-medium mb-4">Zone de danger</h3>
                    <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer mon compte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-gray-900">Préférences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Langue</Label>
                      <select
                        value={preferences.language}
                        onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {preferences.theme === "light" ? (
                          <Sun className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <Moon className="w-5 h-5 text-blue-500" />
                        )}
                        <div>
                          <p className="text-gray-900 font-medium">Thème</p>
                          <p className="text-gray-500 text-sm">Mode clair ou sombre</p>
                        </div>
                      </div>
                      <select
                        value={preferences.theme}
                        onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                        className="h-10 px-3 rounded-lg bg-white border border-gray-200"
                      >
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                      </select>
                    </div>
                  </div>

                  <Button className="bg-primary hover:bg-primary-hover shadow-md shadow-primary/20">
                    Enregistrer
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AccountSettings;
