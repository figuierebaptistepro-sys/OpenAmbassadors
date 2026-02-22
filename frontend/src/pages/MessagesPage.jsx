import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Send, Paperclip, ArrowLeft, MoreVertical, Phone, Video,
  Image, FileText, X, Check, CheckCheck, Clock, AlertTriangle, Crown,
  Search, Plus, Briefcase, User, Flag
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ==================== WEBSOCKET HOOK ====================
const useWebSocket = (user, onMessage) => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!user?.token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = API_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send auth
      ws.send(JSON.stringify({ type: "auth", token: user.token }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "auth:success") {
          setConnected(true);
        } else {
          onMessage?.(data);
        }
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error("WS error:", error);
    };
  }, [user?.token, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const subscribe = useCallback((conversationId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", conversation_id: conversationId }));
    }
  }, []);

  return { connected, subscribe };
};

// ==================== INBOX PAGE ====================
export const InboxPage = ({ user }) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    
    // Poll conversations every 5 seconds for new messages
    const pollInterval = setInterval(fetchConversations, 5000);
    
    return () => clearInterval(pollInterval);
  }, []);

  // WebSocket for real-time updates
  const handleWsMessage = useCallback((data) => {
    if (data.type === "message:new" || data.type === "conversation:updated") {
      fetchConversations();
    }
  }, []);

  useWebSocket(user, handleWsMessage);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return date.toLocaleDateString("fr-FR", { weekday: "short" });
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const name = conv.other_participant?.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <AppLayout user={user}>
      <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-heading text-xl font-bold text-gray-900">Messages</h1>
              {totalUnread > 0 && (
                <p className="text-sm text-gray-500">{totalUnread} non lu{totalUnread > 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredConversations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conv) => (
                <Link
                  key={conv.conversation_id}
                  to={`/messages/${conv.conversation_id}`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden">
                      {conv.other_participant?.picture ? (
                        <img
                          src={getImageUrl(conv.other_participant.picture)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                          <span className="text-lg font-bold text-primary">
                            {(conv.other_participant?.name || "?")[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{conv.unread_count}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`font-semibold truncate ${conv.unread_count > 0 ? "text-gray-900" : "text-gray-700"}`}>
                        {conv.other_participant?.name || "Utilisateur"}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(conv.last_message_at || conv.created_at)}
                      </span>
                    </div>
                    
                    {conv.type === "mission" && conv.mission && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <Briefcase className="w-3 h-3 text-primary" />
                        <span className="text-xs text-primary truncate">{conv.mission.title}</span>
                      </div>
                    )}
                    
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                      {conv.last_message?.text || (conv.last_message?.content_type === "file" ? "📎 Fichier" : "Nouvelle conversation")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Aucune conversation</h3>
              <p className="text-gray-500 text-sm text-center">
                {user?.user_type === "business" 
                  ? "Contactez des créateurs pour démarrer une conversation"
                  : "Postulez à des missions pour discuter avec des entreprises"
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

// ==================== CONVERSATION PAGE ====================
export const ConversationPage = ({ user }) => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchConversation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations/${conversationId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setConversation(data);
      } else {
        toast.error("Conversation non trouvée");
        navigate("/messages");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations/${conversationId}/messages`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/messaging/conversations/${conversationId}/read`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  useEffect(() => {
    fetchConversation();
    fetchMessages();
    markAsRead();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling for messages (fallback when WebSocket not connected)
  useEffect(() => {
    if (!conversationId) return;
    
    const pollMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/api/messaging/conversations/${conversationId}/messages`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(prev => {
            // Only update if there are new messages
            if (data.length !== prev.length || 
                (data.length > 0 && prev.length > 0 && 
                 data[data.length - 1].message_id !== prev[prev.length - 1].message_id)) {
              return data;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Poll every 3 seconds
    const pollInterval = setInterval(pollMessages, 3000);
    
    return () => clearInterval(pollInterval);
  }, [conversationId]);

  // WebSocket for real-time messages
  const handleWsMessage = useCallback((data) => {
    if (data.type === "message:new" && data.conversation_id === conversationId) {
      setMessages((prev) => [...prev, data.message]);
      markAsRead();
    }
  }, [conversationId]);

  const { connected, subscribe } = useWebSocket(user, handleWsMessage);

  useEffect(() => {
    if (connected && conversationId) {
      subscribe(conversationId);
    }
  }, [connected, conversationId, subscribe]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`${API_URL}/api/messaging/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content_type: "text",
          text: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const msg = await response.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
      } else {
        toast.error("Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 25MB)");
      return;
    }

    setSending(true);
    try {
      // Upload file first
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`${API_URL}/api/upload/portfolio`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadResponse.json();

      // Send message with file
      const response = await fetch(`${API_URL}/api/messaging/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content_type: "file",
          file_url: uploadData.url,
          file_name: file.name,
          file_mime: file.type,
          file_size: file.size,
        }),
      });

      if (response.ok) {
        const msg = await response.json();
        setMessages((prev) => [...prev, msg]);
        toast.success("Fichier envoyé");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de l'envoi du fichier");
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCollabResponse = async (requestId, status) => {
    if (!requestId) {
      toast.error("ID de demande manquant");
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/collaboration-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const statusLabels = {
          accepted: "acceptée",
          rejected: "refusée", 
          negotiating: "en négociation"
        };
        toast.success(`Demande ${statusLabels[status] || status}`);
        fetchMessages(); // Refresh messages
      } else {
        const error = await response.json();
        toast.error(error.detail || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur de connexion");
    }
  };

  const handleReport = async (reason) => {
    try {
      const response = await fetch(`${API_URL}/api/messaging/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversation_id: conversationId,
          reason: reason,
        }),
      });

      if (response.ok) {
        toast.success("Signalement envoyé");
        setReportDialogOpen(false);
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  };

  const otherParticipant = user?.user_type === "business" ? conversation?.creator : conversation?.company;

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => navigate("/messages")} className="p-1 -ml-1">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>

        <Link to={otherParticipant ? `/creators/${otherParticipant.user_id}` : "#"} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {otherParticipant?.picture ? (
              <img src={getImageUrl(otherParticipant.picture)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                <span className="font-bold text-primary">{(otherParticipant?.name || "?")[0]}</span>
              </div>
            )}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{otherParticipant?.name || "Utilisateur"}</h2>
              {conversation?.type === "mission" && conversation?.mission && (
                <p className="text-xs text-primary truncate flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {conversation.mission.title}
                </p>
              )}
              {connected && <span className="text-xs text-green-500">En ligne</span>}
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setReportDialogOpen(true)} className="text-red-600">
                <Flag className="w-4 h-4 mr-2" />
                Signaler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1 bg-white text-gray-500 text-xs rounded-full shadow-sm">
                    {formatDate(msgs[0].created_at)}
                  </span>
                </div>
                <div className="space-y-2">
                  {msgs.map((msg) => {
                    const isMe = msg.sender_id === user?.user_id;
                    const isCollabRequest = msg.message_type === "collaboration_request";
                    const messageText = msg.text || msg.content;
                    
                    return (
                      <motion.div
                        key={msg.message_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] ${isMe ? "order-2" : ""}`}>
                          {msg.content_type === "file" ? (
                            <a
                              href={getImageUrl(msg.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block p-3 rounded-2xl ${
                                isMe ? "bg-primary text-white rounded-br-md" : "bg-white rounded-bl-md"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {msg.file_mime?.startsWith("image/") ? (
                                  <Image className="w-5 h-5" />
                                ) : (
                                  <FileText className="w-5 h-5" />
                                )}
                                <span className="text-sm truncate">{msg.file_name}</span>
                              </div>
                              {msg.file_mime?.startsWith("image/") && (
                                <img
                                  src={getImageUrl(msg.file_url)}
                                  alt=""
                                  className="mt-2 rounded-lg max-w-full"
                                />
                              )}
                            </a>
                          ) : isCollabRequest ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                              <div className="bg-gradient-to-r from-primary/10 to-pink-50 px-4 py-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-5 h-5 text-primary" />
                                  <span className="font-semibold text-gray-900">Demande de collaboration</span>
                                </div>
                              </div>
                              <div className="p-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{messageText}</p>
                              </div>
                              {/* Action buttons for creator */}
                              {!isMe && user?.user_type === "creator" && (
                                <div className="px-4 pb-4 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                    onClick={() => handleCollabResponse(msg.collaboration_request_id, "accepted")}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Accepter
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-primary text-primary hover:bg-primary/10"
                                    onClick={() => handleCollabResponse(msg.collaboration_request_id, "negotiating")}
                                  >
                                    Négocier
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => handleCollabResponse(msg.collaboration_request_id, "rejected")}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Refuser
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isMe
                                  ? "bg-primary text-white rounded-br-md"
                                  : "bg-white text-gray-900 rounded-bl-md"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{messageText}</p>
                            </div>
                          )}
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                            <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                            {isMe && <CheckCheck className="w-3.5 h-3.5 text-primary" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Blocked notice */}
        {conversation?.status === "blocked" && (
          <div className="bg-red-50 border-t border-red-200 px-4 py-3 text-center">
            <p className="text-red-600 text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Cette conversation a été bloquée par un administrateur
            </p>
          </div>
        )}

        {/* Input */}
        {conversation?.status !== "blocked" && (
          <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 p-3 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={sending}
            >
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>
            
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1 bg-gray-100 border-0"
              disabled={sending}
            />
            
            <Button
              type="submit"
              size="icon"
              className="bg-primary hover:bg-primary-hover rounded-full w-10 h-10"
              disabled={!newMessage.trim() || sending}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        )}

        {/* Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Signaler cette conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {[
                { value: "spam", label: "Spam" },
                { value: "harassment", label: "Harcèlement" },
                { value: "scam", label: "Arnaque" },
                { value: "hate", label: "Contenu haineux" },
                { value: "other", label: "Autre" },
              ].map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => handleReport(reason.value)}
                  className="w-full p-3 text-left rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default InboxPage;
