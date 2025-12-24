import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppCtx } from '../store/useAppCtx';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatMaxProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExecutionMode = 'assisté' | 'auto' | 'conseil';

export function ChatMax({ isOpen, onClose }: ChatMaxProps) {
  const { apiBase } = useAppCtx();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Bonjour ! Je suis M.A.X., votre assistant IA pour l'automatisation CRM. Comment puis-je vous aider aujourd'hui ?",
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [executionMode] = useState<ExecutionMode>('assisté'); // Mode Assisté par défaut
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Utiliser la nouvelle API /api/chat avec Mode Assisté
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          message: userMessage.text,
          mode: executionMode
        })
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Erreur serveur');
      }

      // Stocker sessionId si nouvelle session
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || 'Désolé, je n\'ai pas pu traiter votre demande.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat MAX error:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Erreur de connexion. Veuillez réessayer.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Chat Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[600px] z-50"
          >
            <div className="card h-full flex flex-col shadow-2xl">
              {/* Header */}
              <div className="card-header border-b border-stroke">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center transition-all duration-300 ${loading ? 'scale-110 shadow-lg shadow-accent-cyan/50' : ''}`}>
                        <span className="text-white font-bold text-base">M</span>
                      </div>
                      {/* Spinning rings pendant le loading */}
                      {loading && (
                        <>
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-cyan animate-spin"></div>
                          <div className="absolute -inset-1 rounded-full border-2 border-transparent border-r-accent-purple animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
                        </>
                      )}
                    </div>
                    <div>
                      <h3 className="card-title">M.A.X. Assistant</h3>
                      <p className="text-xs text-muted">
                        {loading ? (
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan"></span>
                            </span>
                            <span className="text-accent-cyan font-medium">Exécution en cours...</span>
                          </span>
                        ) : (
                          'En ligne • Prêt à aider'
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-accent-cyan to-accent-purple text-white'
                            : 'bg-bg-secondary text-text'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.text}</p>
                        <p className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-white/70' : 'text-muted'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {/* Loader message - intégré dans le fil de conversation */}
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-bg-secondary text-text">
                        <div className="flex items-center gap-3">
                          {/* Spinning loader icon */}
                          <div className="relative w-5 h-5 flex-shrink-0">
                            <div className="absolute inset-0 border-2 border-accent-cyan/30 rounded-full"></div>
                            <div className="absolute inset-0 border-2 border-transparent border-t-accent-cyan rounded-full animate-spin"></div>
                          </div>

                          {/* Bouncing dots */}
                          <div className="flex space-x-1.5">
                            <div className="w-2 h-2 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                            <div className="w-2 h-2 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                          </div>

                          {/* Text indicator */}
                          <span className="text-sm text-accent-cyan font-medium">
                            M.A.X. analyse votre demande...
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-stroke">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Posez votre question à M.A.X...."
                    className="flex-1 px-4 py-3 rounded-xl border border-stroke bg-bg-primary text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent-cyan transition-all"
                    disabled={loading}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}