import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import API from '../api';
import { useAuth } from '../context/AuthContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

import { useLanguage } from '../context/LanguageContext';

export default function ChatWidget() {
    const { user } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load history on mount or user change
    useEffect(() => {
        if (!user?._id) {
            setMessages([]);
            return;
        }
        const saved = localStorage.getItem(`chat_history_${user._id}`);
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                setMessages([]);
            }
        } else if (open) {
            // Only add welcome message if no history and chat is opened
            setMessages([{
                role: 'assistant',
                content: t('chat.welcome', { name: user?.name?.split(' ')[0] || 'there' }),
            }]);
        }
    }, [user?._id, open, language, t]);

    // Save history when messages change
    useEffect(() => {
        if (user?._id && messages.length > 0) {
            localStorage.setItem(`chat_history_${user._id}`, JSON.stringify(messages));
        }
    }, [messages, user?._id]);

    const clearChat = () => {
        if (user?._id) {
            localStorage.removeItem(`chat_history_${user._id}`);
        }
        setMessages([{
            role: 'assistant',
            content: t('chat.welcome', { name: user?.name?.split(' ')[0] || 'there' }),
        }]);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const langNames: Record<string, string> = { en: 'English', hi: 'Hindi', te: 'Telugu' };
        try {
            const { data } = await API.post('/chat', {
                message: userMsg.content,
                language: langNames[language] || 'English',
                history: messages.map(m => ({
                    role: m.role,
                    parts: [{ text: m.content }],
                })),
            });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply || 'Sorry, I could not generate a response.',
            }]);

            if (data.profileUpdated) {
                try {
                    await refreshUser();
                    // Force a reload of the component tree to fetch new careers for Insights/Explorer
                    window.location.reload();
                } catch (e) {
                    console.error("Failed to refresh user profile", e);
                }
            }
        } catch (err: any) {
            const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to get response. Please try again.';
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ ${errorMsg}`,
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Floating chat button */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                {!open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white text-[#0A2540] px-4 py-2 rounded-2xl shadow-xl border border-gray-100 text-xs font-bold flex items-center gap-2 cursor-pointer relative"
                        onClick={() => setOpen(true)}
                    >
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Chat with NHETIS!
                        <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-b border-r border-gray-100 transform rotate-45"></div>
                    </motion.div>
                )}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpen(!open)}
                    className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl transition-colors relative ${
                        open ? 'bg-[#0A2540] text-white' : 'bg-gradient-to-br from-[#635BFF] to-[#00D4FF] text-white'
                    }`}
                >
                    {open ? '✕' : '💬'}
                    {!open && (
                        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-ping"></span>
                    )}
                </motion.button>
            </div>

            {/* Chat panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`fixed bottom-24 right-6 bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
                            isExpanded 
                            ? 'w-[calc(100vw-3rem)] md:w-[800px] h-[85vh]' 
                            : 'w-[380px] max-w-[calc(100vw-3rem)] h-[550px] max-h-[calc(100vh-10rem)]'
                        }`}
                    >
                        {/* Header */}
                        <div className="bg-[#0A2540] text-white px-5 py-4 flex items-center justify-between shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#635BFF] flex items-center justify-center text-xl shadow-inner">🤖</div>
                                <div>
                                    <h3 className="font-bold text-sm tracking-tight">{t('chat.title')}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                        <p className="text-[10px] text-gray-300 font-medium">{t('chat.poweredBy')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    title={isExpanded ? "Collapse" : "Expand"}
                                    className="p-1 text-gray-400 hover:text-white transition"
                                >
                                    {isExpanded ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                        </svg>
                                    )}
                                </button>
                                <button
                                    onClick={clearChat}
                                    title="Clear Chat"
                                    className="p-1 text-gray-400 hover:text-red-400 transition"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                                <select 
                                    value={language} 
                                    onChange={(e) => setLanguage(e.target.value as any)}
                                    className="bg-white/10 text-[10px] border border-white/20 rounded px-1.5 py-0.5 outline-none hover:bg-white/20 transition cursor-pointer"
                                >
                                    <option value="en" className="text-black">EN</option>
                                    <option value="hi" className="text-black">HI</option>
                                    <option value="te" className="text-black">TE</option>
                                </select>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F6F9FC]">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm break-words overflow-hidden ${
                                         msg.role === 'user'
                                             ? 'bg-[#0A2540] text-white rounded-br-none'
                                             : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                                     }`}>
                                        {msg.role === 'assistant' ? (
                                            <div className="markdown-content">
                                                <ReactMarkdown>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('chat.placeholder')}
                                    className="w-full bg-white text-gray-900 border-2 border-gray-200 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-[#635BFF] focus:ring-4 focus:ring-[#635BFF]/5 transition-all shadow-sm"
                                    disabled={loading}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || loading}
                                    className="absolute right-2 p-2 rounded-xl bg-[#0A2540] text-white hover:bg-[#1a3d66] transition-all disabled:opacity-30 disabled:grayscale"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-[9px] text-center text-gray-400 mt-2">
                                AI may provide inaccurate info. Verify important details.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
