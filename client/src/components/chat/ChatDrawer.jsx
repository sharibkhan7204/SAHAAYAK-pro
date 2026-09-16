import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Image, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function ChatDrawer({ bookingId, workerName, customerName, onClose }) {
  const { user } = useAuth();
  const { socket, joinBookingRoom } = useSocket();
  const { addToast } = useToast();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (bookingId) {
      joinBookingRoom(bookingId);
      loadMessages();
    }
  }, [bookingId]);

  useEffect(() => {
    if (socket) {
      const handleIncomingMessage = (msg) => {
        if (msg.booking_id === bookingId) {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
        }
      };

      socket.on('chat:message', handleIncomingMessage);
      return () => {
        socket.off('chat:message', handleIncomingMessage);
      };
    }
  }, [socket, bookingId]);

  const loadMessages = async () => {
    try {
      const res = await api.get(`/messages/${bookingId}`);
      setMessages(res.data.messages || []);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      setSending(true);
      const res = await api.post(`/messages/${bookingId}`, {
        messageText: inputText.trim()
      });
      setInputText('');
      scrollToBottom();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const otherPersonName = user?.role === 'customer' ? workerName : customerName;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Chat Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
            {otherPersonName ? otherPersonName.charAt(0) : 'S'}
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{otherPersonName || 'Service Partner'}</h3>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live In-App Chat
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Safety banner */}
      <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200 text-[10px] text-amber-900 font-medium text-center">
        🔒 For your security, never share bank OTPs or UPI PINs. Chat is monitored for safety.
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p>No messages yet. Send a greeting to coordinate arrival!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_user_id === user?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-brand-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}
                >
                  <p>{m.message_text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          placeholder="Type message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
