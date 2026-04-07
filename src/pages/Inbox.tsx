import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Send, 
  CheckCheck, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Tag, 
  MessageSquare, 
  Sparkles,
  Edit3,
  ChevronRight,
  Info,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { PageHeader, StatusBadge, LoadingState, EmptyState } from '../components/ui/Common';
import { Conversation, ConversationMessage, FAQAnswer } from '../types';
import { cn } from '../lib/utils';

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [faqs, setFaqs] = useState<FAQAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, f] = await Promise.all([
          api.getConversations(),
          api.getFAQs()
        ]);
        setConversations(c);
        setFaqs(f);
        if (c.length > 0) {
          handleSelectConversation(c[0]);
        }
      } catch (error) {
        console.error('Error fetching inbox data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    try {
      const msgs = await api.getConversationMessages(conv.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedConv) return;
    const newMsg: ConversationMessage = {
      id: Math.random().toString(),
      conversation_id: selectedConv.id,
      text: replyText,
      sender_type: 'admin',
      created_at: new Date().toISOString(),
      status: 'sent'
    };
    setMessages(prev => [...prev, newMsg]);
    setReplyText('');
    setShowSuggestions(false);
  };

  const filteredConversations = conversations.filter(c => 
    c.business_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  if (isLoading) return <LoadingState />;

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
      {/* Left Panel: Conversation List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-50 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Inbox</h2>
            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 focus-within:border-blue-200 transition-all">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-900"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map((conv) => (
            <button 
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-3xl transition-all group relative",
                selectedConv?.id === conv.id 
                  ? "bg-blue-50/50 border border-blue-100 shadow-sm" 
                  : "hover:bg-slate-50 border border-transparent"
              )}
            >
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-black text-lg shrink-0 overflow-hidden">
                <img src={`https://picsum.photos/seed/${conv.id}/100/100`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-black text-slate-900 truncate tracking-tight">{conv.business_name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate leading-none mb-2">{conv.last_message_snippet}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={conv.status} className="text-[9px] px-1.5 py-0" />
                  {conv.detected_language && (
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{conv.detected_language}</span>
                  )}
                </div>
              </div>
              {conv.unread_count > 0 && (
                <div className="absolute top-4 right-4 w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {conv.unread_count}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Middle Panel: Chat Thread */}
      <div className="flex-1 flex flex-col bg-slate-50/30 min-w-0">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="h-20 bg-white border-b border-slate-50 flex items-center justify-between px-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black shrink-0 overflow-hidden">
                  <img src={`https://picsum.photos/seed/${selectedConv.id}/100/100`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{selectedConv.business_name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest leading-none">Online</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((msg) => {
                const isAdmin = msg.sender_type === 'admin';
                return (
                  <div key={msg.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] p-4 rounded-3xl relative shadow-sm",
                      isAdmin 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                    )}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      <div className={cn(
                        "flex items-center gap-2 mt-2",
                        isAdmin ? "justify-end" : "justify-start"
                      )}>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest", isAdmin ? "text-blue-100" : "text-slate-400")}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isAdmin && (
                          <CheckCheck className="w-3 h-3 text-blue-100" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Area */}
            <div className="p-6 bg-white border-t border-slate-50 space-y-4">
              {showSuggestions && (
                <div className="flex gap-3 overflow-x-auto pb-2 animate-in slide-in-from-bottom-4 duration-300">
                  {faqs.map(faq => (
                    <button 
                      key={faq.id}
                      onClick={() => setReplyText(faq.short_answer)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100 whitespace-nowrap transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-3 h-3" />
                      {faq.intent_key.replace(/_/g, ' ')}
                    </button>
                  ))}
                  <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-100 whitespace-nowrap transition-all flex items-center gap-2">
                    <Edit3 className="w-3 h-3" />
                    Edit Suggestion
                  </button>
                </div>
              )}

              <div className="flex items-end gap-4">
                <div className="flex-1 bg-slate-50 rounded-[2rem] border border-slate-100 p-2 flex flex-col">
                  <textarea 
                    placeholder="Type your reply..." 
                    className="w-full bg-transparent border-none outline-none text-sm font-medium p-3 min-h-[44px] max-h-32 resize-none"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className={cn(
                      "p-3 rounded-2xl transition-all",
                      showSuggestions ? "bg-indigo-100 text-indigo-600" : "bg-slate-50 text-slate-400 hover:text-slate-900"
                    )}
                    title="Suggested Replies"
                  >
                    <Sparkles className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <EmptyState 
            title="No conversation selected" 
            description="Select a chat from the list to start messaging."
            icon={<MessageSquare className="w-12 h-12" />}
          />
        )}
      </div>

      {/* Right Panel: Business Details (Desktop Only) */}
      {selectedConv && (
        <div className="hidden lg:flex w-80 border-l border-slate-50 flex-col p-8 space-y-8 overflow-y-auto shrink-0">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-slate-100 rounded-[2rem] mx-auto flex items-center justify-center text-slate-500 font-black text-3xl overflow-hidden shadow-xl border-4 border-white">
              <img src={`https://picsum.photos/seed/${selectedConv.id}/200/200`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">{selectedConv.business_name}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedConv.phone}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detected Insights</h4>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {selectedConv.detected_intent?.replace(/_/g, ' ') || 'General Query'}
                </div>
                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Baghdad
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Info</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Category</p>
                    <p className="text-xs font-bold text-slate-900">Cafe & Restaurant</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Location</p>
                    <p className="text-xs font-bold text-slate-900">Mansour, Baghdad</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Suggested FAQ</h5>
              </div>
              <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                The business is asking about pricing. Suggested reply: "Our basic plan starts at $50/month..."
              </p>
              <button className="w-full py-2 bg-white text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-200 hover:bg-blue-50 transition-all">
                Apply Suggestion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
