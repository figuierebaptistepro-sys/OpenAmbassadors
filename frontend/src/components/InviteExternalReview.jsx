import { useState, useEffect } from "react";
import { Mail, Plus, Clock, CheckCircle, XCircle, Loader2, Send, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InviteExternalReview = ({ onInviteSent }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    company_name: "",
    company_email: "",
    collaboration_description: "",
  });

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reviews/invitations`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.company_name || !formData.company_email) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`${API_URL}/api/reviews/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Invitation envoyée à ${formData.company_name} !`);
        setFormData({ company_name: "", company_email: "", collaboration_description: "" });
        setShowForm(false);
        fetchInvitations();
        onInviteSent?.();
      } else {
        const data = await response.json();
        setError(data.detail || "Erreur lors de l'envoi");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Reçu</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-500"><XCircle className="w-3 h-3 mr-1" />Expiré</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Inviter des entreprises</h3>
          <p className="text-sm text-gray-500">
            Demandez à vos anciens clients de laisser un avis
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Inviter
        </Button>
      </div>

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          {success}
        </motion.div>
      )}

      {/* Invite Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          onSubmit={handleSubmit}
          className="bg-gray-50 rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'entreprise *
              </label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Ex: Agence XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email professionnel *
              </label>
              <Input
                type="email"
                value={formData.company_email}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                placeholder="contact@entreprise.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description de la collaboration (optionnel)
            </label>
            <Textarea
              value={formData.collaboration_description}
              onChange={(e) => setFormData({ ...formData, collaboration_description: e.target.value })}
              placeholder="Décrivez brièvement votre collaboration pour aider l'entreprise à se souvenir..."
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-500">
              <ExternalLink className="w-3 h-3 inline mr-1" />
              L'avis sera marqué comme "externe"
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={sending} className="bg-primary hover:bg-primary/90">
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer l'invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.form>
      )}

      {/* Invitations List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune invitation envoyée</p>
          <p className="text-sm text-gray-400 mt-1">
            Invitez vos anciens clients à partager leur expérience
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.invitation_id}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold">
                  {(invitation.company_name || "E")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{invitation.company_name}</p>
                  <p className="text-xs text-gray-500">
                    Envoyée le {new Date(invitation.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              {getStatusBadge(invitation.status)}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 rounded-xl">
        <h4 className="font-medium text-blue-900 mb-2">💡 Comment ça marche ?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. Entrez les coordonnées d'une entreprise avec qui vous avez travaillé</li>
          <li>2. L'entreprise reçoit un email avec un lien unique (valable 7 jours)</li>
          <li>3. Elle peut laisser un avis qui apparaîtra sur votre profil</li>
          <li>4. L'avis sera marqué "externe" pour distinguer des missions OpenAmbassadors</li>
        </ul>
      </div>
    </div>
  );
};

export default InviteExternalReview;
