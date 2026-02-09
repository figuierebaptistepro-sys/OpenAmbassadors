import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Link as LinkIcon, Plus, Trash2, ExternalLink, Check, X, Loader2,
  Copy, Eye, GripVertical, Pencil, Share2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CreatorCardManager = ({ user }) => {
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Username
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Offers
  const [offers, setOffers] = useState([]);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerForm, setOfferForm] = useState({ title: "", description: "", price: "", external_link: "" });
  
  // Links
  const [links, setLinks] = useState([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkForm, setLinkForm] = useState({ title: "", url: "", icon: "" });

  useEffect(() => {
    fetchCardData();
  }, []);

  const fetchCardData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/creators/me/card`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setCardData(data);
        setUsername(data.username || "");
        setOffers(data.offers || []);
        setLinks(data.links || []);
      }
    } catch (err) {
      console.error("Error fetching card data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Username management
  const checkUsername = async (value) => {
    if (!value || value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setCheckingUsername(true);
    try {
      const response = await fetch(`${API_URL}/api/username/check/${value}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
      if (!data.available && data.reason) {
        toast.error(data.reason);
      }
    } catch (err) {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const saveUsername = async () => {
    if (!username || username.length < 3) {
      toast.error("Le nom d'utilisateur doit avoir au moins 3 caractères");
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/creators/me/username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username })
      });
      
      if (response.ok) {
        toast.success("Nom d'utilisateur enregistré !");
        setCardData(prev => ({ ...prev, username }));
      } else {
        const data = await response.json();
        toast.error(data.detail || "Erreur lors de l'enregistrement");
      }
    } catch (err) {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  // Offers management
  const openOfferDialog = (offer = null) => {
    if (offer) {
      setEditingOffer(offer);
      setOfferForm({
        title: offer.title || "",
        description: offer.description || "",
        price: offer.price || "",
        external_link: offer.external_link || ""
      });
    } else {
      setEditingOffer(null);
      setOfferForm({ title: "", description: "", price: "", external_link: "" });
    }
    setOfferDialogOpen(true);
  };

  const saveOffer = async () => {
    if (!offerForm.title) {
      toast.error("Le titre est requis");
      return;
    }
    
    setSaving(true);
    try {
      const url = editingOffer 
        ? `${API_URL}/api/creators/me/offers/${editingOffer.offer_id}`
        : `${API_URL}/api/creators/me/offers`;
      
      const response = await fetch(url, {
        method: editingOffer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(offerForm)
      });
      
      if (response.ok) {
        toast.success(editingOffer ? "Offre modifiée !" : "Offre ajoutée !");
        setOfferDialogOpen(false);
        fetchCardData();
      } else {
        const data = await response.json();
        toast.error(data.detail || "Erreur");
      }
    } catch (err) {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async (offerId) => {
    if (!confirm("Supprimer cette offre ?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/creators/me/offers/${offerId}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (response.ok) {
        toast.success("Offre supprimée");
        setOffers(offers.filter(o => o.offer_id !== offerId));
      }
    } catch (err) {
      toast.error("Erreur");
    }
  };

  // Links management
  const openLinkDialog = (link = null) => {
    if (link) {
      setEditingLink(link);
      setLinkForm({
        title: link.title || "",
        url: link.url || "",
        icon: link.icon || ""
      });
    } else {
      setEditingLink(null);
      setLinkForm({ title: "", url: "", icon: "" });
    }
    setLinkDialogOpen(true);
  };

  const saveLink = async () => {
    if (!linkForm.title || !linkForm.url) {
      toast.error("Le titre et l'URL sont requis");
      return;
    }
    
    // Add https if missing
    let url = linkForm.url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    setSaving(true);
    try {
      const endpoint = editingLink 
        ? `${API_URL}/api/creators/me/links/${editingLink.link_id}`
        : `${API_URL}/api/creators/me/links`;
      
      const response = await fetch(endpoint, {
        method: editingLink ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...linkForm, url })
      });
      
      if (response.ok) {
        toast.success(editingLink ? "Lien modifié !" : "Lien ajouté !");
        setLinkDialogOpen(false);
        fetchCardData();
      } else {
        const data = await response.json();
        toast.error(data.detail || "Erreur");
      }
    } catch (err) {
      toast.error("Erreur de connexion");
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (linkId) => {
    if (!confirm("Supprimer ce lien ?")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/creators/me/links/${linkId}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (response.ok) {
        toast.success("Lien supprimé");
        setLinks(links.filter(l => l.link_id !== linkId));
      }
    } catch (err) {
      toast.error("Erreur");
    }
  };

  const copyCardUrl = () => {
    if (cardData?.username) {
      const url = `${window.location.origin}/@${cardData.username}`;
      navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    }
  };

  const previewCard = () => {
    if (cardData?.username) {
      window.open(`/@${cardData.username}`, "_blank");
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const canAddOffer = user?.is_premium || offers.length < 1;
  const canAddLink = user?.is_premium || links.length < 3;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-pink-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Creator Card
              </h3>
              <p className="text-sm text-gray-600">Votre page publique type lien en bio</p>
            </div>
            {cardData?.username && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyCardUrl}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copier
                </Button>
                <Button variant="outline" size="sm" onClick={previewCard}>
                  <Eye className="w-4 h-4 mr-1" />
                  Voir
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Username Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Votre URL publique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">openambassadors.com/@</span>
            <div className="relative flex-1">
              <Input
                value={username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                  setUsername(val);
                  checkUsername(val);
                }}
                placeholder="votre-nom"
                className="pr-10"
                data-testid="username-input"
              />
              {checkingUsername && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
              {!checkingUsername && usernameAvailable === true && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
              {!checkingUsername && usernameAvailable === false && (
                <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Lettres, chiffres, _ et - uniquement (3-30 caractères)
            </p>
            <Button 
              size="sm" 
              onClick={saveUsername}
              disabled={saving || !username || username.length < 3 || usernameAvailable === false}
              data-testid="save-username-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Offers Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Mes Offres</CardTitle>
            {!user?.is_premium && (
              <Badge variant="outline" className="text-xs">
                {offers.length}/1 (gratuit)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {offers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucune offre. Ajoutez vos services !
            </p>
          ) : (
            <div className="space-y-2">
              {offers.map((offer) => (
                <div 
                  key={offer.offer_id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{offer.title}</p>
                    {offer.price && (
                      <p className="text-sm text-primary">{offer.price}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => openOfferDialog(offer)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteOffer(offer.offer_id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => openOfferDialog()}
            disabled={!canAddOffer}
            data-testid="add-offer-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            {canAddOffer ? "Ajouter une offre" : "Passez Premium pour plus d'offres"}
          </Button>
        </CardContent>
      </Card>

      {/* Links Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Mes Liens</CardTitle>
            {!user?.is_premium && (
              <Badge variant="outline" className="text-xs">
                {links.length}/3 (gratuit)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {links.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun lien. Ajoutez vos réseaux sociaux !
            </p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div 
                  key={link.link_id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                >
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{link.title}</p>
                    <p className="text-xs text-gray-500 truncate">{link.url}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => openLinkDialog(link)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteLink(link.link_id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => openLinkDialog()}
            disabled={!canAddLink}
            data-testid="add-link-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            {canAddLink ? "Ajouter un lien" : "Passez Premium pour plus de liens"}
          </Button>
        </CardContent>
      </Card>

      {/* Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Modifier l'offre" : "Nouvelle offre"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={offerForm.title}
                onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                placeholder="Ex: Création de contenu UGC"
                data-testid="offer-title-input"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={offerForm.description}
                onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                placeholder="Courte description de votre offre"
              />
            </div>
            <div>
              <Label>Prix (optionnel)</Label>
              <Input
                value={offerForm.price}
                onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })}
                placeholder="Ex: À partir de 500€"
              />
            </div>
            <div>
              <Label>Lien externe (optionnel)</Label>
              <Input
                value={offerForm.external_link}
                onChange={(e) => setOfferForm({ ...offerForm, external_link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={saveOffer} disabled={saving} data-testid="save-offer-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Modifier le lien" : "Nouveau lien"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={linkForm.title}
                onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                placeholder="Ex: Mon Instagram"
                data-testid="link-title-input"
              />
            </div>
            <div>
              <Label>URL *</Label>
              <Input
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                placeholder="https://instagram.com/..."
                data-testid="link-url-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={saveLink} disabled={saving} data-testid="save-link-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorCardManager;
