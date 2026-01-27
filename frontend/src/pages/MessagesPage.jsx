import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, ArrowLeft, Send, User, Search, Check, CheckCheck
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MessagesPage = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Auto-start conversation if coming from creator profile
  const contactUserId = location.state?.contactUserId;
  const contactName = location.state?.contactName;

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        
        // If coming from creator profile, create/find conversation
        if (contactUserId) {
          const existingConv = data.find(c => 
            c.participants.includes(contactUserId)
          );
          if (existingConv) {
            setSelectedConversation(existingConv);
            fetchMessages(existingConv.conversation_id);
          } else {
            // Will create conversation on first message
            setSelectedConversation({
              conversation_id: null,
              other_user: { user_id: contactUserId, name: contactName }
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const receiverId = selectedConversation?.other_user?.user_id;
    if (!receiverId) {
      toast.error("Destinataire non trouvé");
      return;
    }

    setSendingMessage(true);
    try {
      const response = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiver_id: receiverId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add message to UI
        setMessages(prev => [...prev, {
          message_id: data.message_id,
          sender_id: user.user_id,
          receiver_id: receiverId,
          content: newMessage,
          created_at: new Date().toISOString(),
          read: false,
        }]);
        
        setNewMessage("");
        
        // Update conversation ID if new
        if (!selectedConversation.conversation_id) {
          setSelectedConversation(prev => ({
            ...prev,
            conversation_id: data.conversation_id,
          }));
          fetchConversations();
        }
      } else {
        throw new Error("Failed to send");
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingMessage(false);
    }
  };

  const selectConversation = (conv) => {
    setSelectedConversation(conv);
    if (conv.conversation_id) {
      fetchMessages(conv.conversation_id);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-heading font-bold text-xl text-slate-900">UGC Machine</span>
            </Link>

            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-slate-600"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </nav>

      {/* Messages Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-[calc(100vh-160px)] flex overflow-hidden">
          {/* Conversations List */}
          <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-heading font-semibold text-lg">Messages</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    onClick={() => selectConversation(conv)}
                    className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                      selectedConversation?.conversation_id === conv.conversation_id ? 'bg-primary/5' : ''
                    }`}
                    data-testid={`conversation-${conv.conversation_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {conv.other_user?.picture ? (
                          <img src={conv.other_user.picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900 truncate">
                            {conv.other_user?.name || "Utilisateur"}
                          </p>
                          {conv.last_message_at && (
                            <span className="text-xs text-slate-400">
                              {formatDate(conv.last_message_at)}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-sm text-slate-500 truncate">{conv.last_message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500">Aucune conversation</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                    {selectedConversation.other_user?.picture ? (
                      <img src={selectedConversation.other_user.picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {selectedConversation.other_user?.name || "Utilisateur"}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user.user_id;
                    return (
                      <motion.div
                        key={msg.message_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwn ? 'order-2' : ''}`}>
                          <div className={`px-4 py-2 rounded-2xl ${
                            isOwn 
                              ? 'bg-primary text-white rounded-br-md' 
                              : 'bg-slate-100 text-slate-900 rounded-bl-md'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                            <span className="text-xs text-slate-400">
                              {formatTime(msg.created_at)}
                            </span>
                            {isOwn && (
                              msg.read 
                                ? <CheckCheck className="w-3 h-3 text-blue-500" />
                                : <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-200">
                  <div className="flex gap-3">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Écrivez votre message..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      data-testid="message-input"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-primary hover:bg-primary-hover"
                      data-testid="send-message-btn"
                    >
                      {sendingMessage ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Sélectionnez une conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
