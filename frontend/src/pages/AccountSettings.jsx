import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Bell, Lock, Camera, Trash2, ImagePlus, Shield, Globe, Moon, Sun, Upload, Star } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import ReviewsSection from "../components/ReviewsSection";
import InviteExternalReview from "../components/InviteExternalReview";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AccountSettings = ({ user, onUserUpdate }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  const pictureInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [notifications, setNotifications] = useState({ email_missions: true, email_messages: true, email_updates: false, push_enabled: true });
  const [preferences, setPreferences] = useState({ language: "fr", theme: "light" });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      toast.success("Profil mis à jour !");
    } finally {
      setLoading(false);
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Sélectionnez une image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/api/upload/profile-picture`, { method: "POST", credentials: "include", body: formData });
      if (response.ok) {
        const data = await response.json();
        toast.success("Photo mise à jour !");
        onUserUpdate?.({ ...user, picture: data.picture_url });
      }
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Sélectionnez une image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/api/upload/banner`, { method: "POST", credentials: "include", body: formData });
      if (response.ok) {
        const data = await response.json();
        toast.success("Bannière mise à jour !");
        onUserUpdate?.({ ...user, banner: data.banner_url });
      }
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setUploadingBanner(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const tabs = [
    { id: "profile", label: "Profil", icon: User },
    { id: "notifications", label: "Notifs", icon: Bell },
    { id: "security", label: "Sécurité", icon: Shield },
    { id: "preferences", label: "Préf.", icon: Globe },
    ...(user?.user_type === "creator" ? [{ id: "reviews", label: "Avis", icon: Star }] : []),
  ];

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="font-heading text-lg sm:text-xl font-bold text-gray-900">Paramètres</h1>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm overflow-hidden">
              {/* Banner */}
              <div className="relative h-28 sm:h-36 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5">
                {user?.banner && <img src={getImageUrl(user.banner)} alt="" className="w-full h-full object-cover" />}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                  <input type="file" ref={bannerInputRef} onChange={handleBannerUpload} accept="image/*" className="hidden" />
                  <Button
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    size="sm"
                    className="bg-white/90 text-gray-900 hover:bg-white text-xs"
                  >
                    {uploadingBanner ? "..." : <><ImagePlus className="w-4 h-4 mr-1" />Bannière</>}
                  </Button>
                </div>
              </div>

              <CardContent className="p-4 relative">
                {/* Avatar */}
                <div className="flex items-end gap-4 -mt-10 sm:-mt-12 mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl shadow-lg border-2 border-white flex items-center justify-center overflow-hidden">
                      {user?.picture ? (
                        <img src={getImageUrl(user.picture)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <input type="file" ref={pictureInputRef} onChange={handlePictureUpload} accept="image/*" className="hidden" />
                    <button 
                      onClick={() => pictureInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover disabled:opacity-50"
                    >
                      {uploadingPicture ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="pb-1">
                    <p className="text-gray-900 font-semibold text-sm sm:text-base">{user?.name || "Utilisateur"}</p>
                    <Badge className={user?.user_type === "creator" ? "bg-primary text-xs" : "bg-gray-600 text-xs"}>
                      {user?.user_type === "creator" ? "Créateur" : "Entreprise"}
                    </Badge>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs sm:text-sm">Nom</Label>
                    <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="bg-gray-50 border-gray-200 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Email</Label>
                    <Input value={profileForm.email} disabled className="bg-gray-100 border-gray-200 mt-1" />
                    <p className="text-gray-400 text-xs mt-1">Non modifiable</p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={loading} className="mt-4 bg-primary hover:bg-primary-hover text-sm">
                  {loading ? "..." : "Enregistrer"}
                </Button>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-0 shadow-sm bg-primary/5">
              <CardContent className="p-3 sm:p-4">
                <div className="flex gap-2">
                  <Upload className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium text-xs sm:text-sm">Conseils images</p>
                    <p className="text-gray-600 text-xs mt-1">Photo: carré 200x200px • Bannière: 1500x500px • Max 5MB</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4 pb-2">
              <CardTitle className="text-gray-900 text-sm sm:text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="px-4 space-y-3">
              {[
                { key: "email_missions", label: "Nouvelles missions", desc: "Email pour les nouvelles missions" },
                { key: "email_messages", label: "Messages", desc: "Notifications messages" },
                { key: "email_updates", label: "Mises à jour", desc: "Newsletter" },
                { key: "push_enabled", label: "Push", desc: "Notifications navigateur" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-gray-900 font-medium text-sm">{item.label}</p>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                  <Switch checked={notifications[item.key]} onCheckedChange={(c) => setNotifications({ ...notifications, [item.key]: c })} />
                </div>
              ))}
              <Button className="bg-primary hover:bg-primary-hover text-sm">Enregistrer</Button>
            </CardContent>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4 pb-2">
              <CardTitle className="text-gray-900 text-sm sm:text-base">Sécurité</CardTitle>
            </CardHeader>
            <CardContent className="px-4 space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-green-800 font-medium text-sm">Compte sécurisé</p>
                  <p className="text-green-700 text-xs">Authentification Google ou OTP</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-gray-900 font-medium text-sm">2FA</p>
                  <p className="text-gray-500 text-xs">Double authentification</p>
                </div>
                <Badge className="bg-green-100 text-green-700 text-xs">Activé</Badge>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-red-600 font-medium text-sm mb-2">Zone danger</p>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 text-xs">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer compte
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4 pb-2">
              <CardTitle className="text-gray-900 text-sm sm:text-base">Préférences</CardTitle>
            </CardHeader>
            <CardContent className="px-4 space-y-4">
              <div>
                <Label className="text-sm">Langue</Label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 mt-1 text-sm"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {preferences.theme === "light" ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
                  <div>
                    <p className="text-gray-900 font-medium text-sm">Thème</p>
                    <p className="text-gray-500 text-xs">Mode clair/sombre</p>
                  </div>
                </div>
                <select
                  value={preferences.theme}
                  onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                  className="h-9 px-3 rounded-lg bg-white border border-gray-200 text-sm"
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                </select>
              </div>

              <Button className="bg-primary hover:bg-primary-hover text-sm">Enregistrer</Button>
            </CardContent>
          </Card>
        )}

        {/* Reviews Tab (Creators only) */}
        {activeTab === "reviews" && user?.user_type === "creator" && (
          <div className="space-y-6">
            {/* My Reviews */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <ReviewsSection userId={user.user_id} showTitle={true} />
              </CardContent>
            </Card>

            {/* Invite External Reviews */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <InviteExternalReview />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AccountSettings;
