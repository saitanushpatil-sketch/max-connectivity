import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const JARVIS_SYSTEM = `You are JARVIS — the AI assistant embedded in MAX Connectivity, a real-time chat app with an Iron Man HUD aesthetic. You know everything about the app:
- Features: messaging, voice/video calls, GIFs, voice notes, games (2048, Reaction Test, Desi Quiz, Tic Tac Toe, Car Racer, Space Shooter), friend system with close friends, vibe status, disappearing messages, chat themes
- Design: JARVIS HUD aesthetic, cyan (#00F5FF) primary color, dark background (#0A0A0F)
- Help users with: how to use features, troubleshooting, tips and tricks
- Personality: Efficient, helpful, slightly formal like the real JARVIS. Use "Sir/Ma'am" occasionally. Keep responses concise and actionable.
- If asked about technical errors, suggest: restart app, check internet connection, re-login`;

export default function JARVISAssistant({ currentUser, currentPage }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `JARVIS online. How can I assist you today, ${currentUser?.username || 'Operator'}?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
      if (!apiKey) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'API key not configured. Please set NEXT_PUBLIC_GEMINI_KEY.' },
        ]);
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: JARVIS_SYSTEM + `\nCurrent page: ${currentPage}\nUser: ${currentUser?.username}` }] },
              ...messages.map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
              { role: 'user', parts: [{ text: input.trim() }] },
            ],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
          }),
        }
      );

      const data = await res.json();
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'Systems temporarily unavailable, Sir.';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Connection error. Please check your network, Sir.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, currentUser, currentPage]);

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00F5FF22, #FF006E22)',
          border: '2px solid #00F5FF',
          color: '#00F5FF',
          fontSize: 22,
          cursor: 'pointer',
          boxShadow: '0 0 20px #00F5FF44, 0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Open JARVIS assistant"
      >
        🤖
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: 144,
              right: 16,
              zIndex: 1001,
              width: 320,
              height: 440,
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(10,10,15,0.97)',
              border: '1px solid #00F5FF33',
              borderRadius: 20,
              overflow: 'hidden',
              backdropFilter: 'blur(24px)',
              boxShadow:
                '0 0 40px #00F5FF11, 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(0,245,255,0.05)',
                borderBottom: '1px solid #00F5FF22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    color: '#00F5FF',
                    fontFamily: 'Rajdhani, sans-serif',
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: 2,
                  }}
                >
                  JARVIS
                </div>
                <div
                  style={{
                    color: '#6B6B8A',
                    fontSize: 10,
                    letterSpacing: 1,
                  }}
                >
                  AI ASSISTANT • ONLINE
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#06D6A0',
                  }}
                />
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6B6B8A',
                    fontSize: 18,
                    cursor: 'pointer',
                  }}
                  aria-label="Close JARVIS"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    alignSelf:
                      m.role === 'user' ? 'flex-end' : 'flex-start',
                    background:
                      m.role === 'user'
                        ? 'rgba(0,245,255,0.1)'
                        : 'rgba(255,0,110,0.08)',
                    border: `1px solid ${
                      m.role === 'user' ? '#00F5FF22' : '#FF006E22'
                    }`,
                    borderRadius: 12,
                    padding: '8px 12px',
                    maxWidth: '85%',
                    color: '#E8E8FF',
                    fontSize: 13,
                    fontFamily: "'Exo 2', sans-serif",
                    lineHeight: 1.5,
                  }}
                >
                  {m.content}
                </motion.div>
              ))}
              {loading && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    color: '#6B6B8A',
                    fontSize: 12,
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                >
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    Processing...
                  </motion.span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding: 12,
                borderTop: '1px solid #252535',
                display: 'flex',
                gap: 8,
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask JARVIS..."
                style={{
                  flex: 1,
                  background: 'rgba(37,37,53,0.8)',
                  border: '1px solid #252535',
                  borderRadius: 10,
                  padding: '8px 12px',
                  color: '#E8E8FF',
                  fontFamily: "'Exo 2', sans-serif",
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={send}
                disabled={loading}
                style={{
                  background: '#00F5FF22',
                  border: '1px solid #00F5FF',
                  borderRadius: 10,
                  padding: '8px 12px',
                  color: '#00F5FF',
                  cursor: 'pointer',
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                }}
              >
                ▶
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
