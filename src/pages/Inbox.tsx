import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MoreVertical, 
  Send, 
  Phone, 
  MapPin, 
  Building2, 
  CheckCheck, 
  Clock, 
  Filter,
  ChevronLeft,
  Loader2,
  Paperclip,
  Smile,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Conversation, ConversationMessage, Business } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*, business:businesses(*)')
          .order('last_message_at', { ascending: false });

        if (error) throw error;
        setConversations(data || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();

    // Real-time updates for conversations
    const channel = supabase
      .channel('inbox-updates')
      .on('postgres_changes' as any, { event: '*', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    async function fetchMessages() {
      setMessagesLoading(true);
      try {
        const { data, error } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('conversation_id', selectedConversation.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    }

    fetchMessages();

    // Real-time updates for messages
    const channel = supabase
      .channel(`chat-${selectedConversation.id}`)
      .on('postgres_changes' as any, { 
        event: 'INSERT', 
        table: 'conversation_messages',
        filter: `conversation_id=eq.${selectedConversation.id}`
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as ConversationMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedConversation) return;

    const text = reply;
    setReply('');

    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: selectedConversation.id,
          text,
          sender_type: 'admin'
        });

      if (error) throw error;

      // Update last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      {/* Conversations Sidebar */}
      <div className={cn(
        "w-full lg:w-96 border-r border-slate-50 flex flex-col",
        selectedConversation ? "hidden lg:flex" : "flex"
      )}>
        <div className="p-6 border-b border-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Inbox</h3>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-6 animate-pulse flex gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ))
          ) : conversations.length > 0 ? (
            conversations.map((conv) => (
              <button 
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "w-full p-6 flex gap-4 text-left hover:bg-slate-50 transition-all group",
                  selectedConversation?.id === conv.id ? "bg-blue-50/50 border-l-4 border-blue-600" : "border-l-4 border-transparent"
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-sm">
                    {conv.business?.name.slice(0, 2).toUpperCase()}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 truncate">{conv.business?.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {formatDistanceToNow(new Date(conv.last_message_at))} ago
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate font-medium">
                    {conv.business?.governorate} • {conv.business?.category}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No conversations yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div className={cn(
        "flex-1 flex flex-col bg-slate-50/30",
        !selectedConversation ? "hidden lg:flex" : "flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-20 bg-white border-b border-slate-50 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl lg:hidden"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs">
                  {selectedConversation.business?.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{selectedConversation.business?.name}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_type === 'admin';
                  const showDate = i === 0 || new Date(msg.created_at).getDate() !== new Date(messages[i-1].created_at).getDate();

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex items-center justify-center">
                          <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(msg.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className={cn(
                        "flex flex-col max-w-[80%]",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}>
                        <div className={cn(
                          "px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
                          isMe 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-white text-slate-900 border border-slate-100 rounded-tl-none"
                        )}>
                          {msg.text}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && <CheckCheck className="w-3 h-3 text-blue-400" />}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Area */}
            <div className="p-6 bg-white border-t border-slate-50">
              <div className="flex items-end gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea 
                  rows={1}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  placeholder="Type your message here..." 
                  className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-slate-400 py-2 resize-none max-h-32"
                />
                <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleSendReply}
                  disabled={!reply.trim()}
                  className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl shadow-slate-100 mb-8 animate-bounce duration-[3000ms]">
              <MessageSquare className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Select a conversation</h3>
            <p className="text-slate-500 mt-2 max-w-xs font-medium">
              Choose a business from the left to start chatting and managing their outreach.
            </p>
          </div>
        )}
      </div>

      {/* Business Details Sidebar (Optional/Desktop) */}
      {selectedConversation && (
        <div className="hidden xl:flex w-80 border-l border-slate-50 flex-col p-8 space-y-8 bg-slate-50/10">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-white rounded-3xl border border-slate-100 flex items-center justify-center text-slate-400 font-black text-3xl mx-auto shadow-sm">
              {selectedConversation.business?.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">{selectedConversation.business?.name}</h4>
              <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mt-1">{selectedConversation.business?.category}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Information</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{selectedConversation.business?.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{selectedConversation.business?.governorate}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Notes</p>
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                <p className="text-xs text-orange-800 font-medium leading-relaxed italic">
                  "Interested in the Ramadan package. Prefers calls after 4 PM."
                </p>
              </div>
            </div>

            <button className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              <Building2 className="w-4 h-4" />
              View Full Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
