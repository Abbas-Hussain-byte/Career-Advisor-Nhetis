import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api';
import { useAuth } from '../context/AuthContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatWidget() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
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

    // Add welcome message on first open
    useEffect(() => {
        if (open && messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your AI career counsellor. I know about your profile, assessment results, and interests. Ask me anything about:\n\n• Which career suits you best\n• How to prepare for entrance exams\n• College suggestions\n• Skill development tips\n• Career path roadmaps\n\nWhat would you like to know?`,
            }]);
        }
    }, [open]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const { data } = await API.post('/chat', {
                message: userMsg.content,
                history: messages.map(m => ({
                    role: m.role,
                    parts: [{ text: m.content }],
                })),
            });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply || 'Sorry, I could not generate a response.',
            }]);
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

    // Simple markdown-like formatting for assistant messages
    const formatMessage = (text: string) => {
        return text.split('\n').map((line, i) => {
            if (line.startsWith('• ') || line.startsWith('- ')) {
                return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>;
            }
            if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-bold text-sm">{line.slice(2, -2)}</p>;
            }
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="text-sm">{line}</p>;
        });
    };

    return (
        <>
            {/* Floating chat button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(!open)}
                className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl z-50 transition-colors ${
                    open ? 'bg-[#0A2540] text-white' : 'bg-gradient-to-br from-[#635BFF] to-[#00D4FF] text-white'
                }`}
            >
                {open ? '✕' : '💬'}
            </motion.button>

            {/* Chat panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#0A2540] to-[#1a3d66] text-white px-5 py-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#00D4FF] flex items-center justify-center text-lg">🤖</div>
                            <div>
                                <h3 className="font-bold text-sm">NHETIS Career Advisor</h3>
                                <p className="text-[10px] text-gray-300">Powered by Gemini AI • Personalized for you</p>
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
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-[#0A2540] text-white rounded-br-md'
                                            : 'bg-white text-gray-700 border border-gray-100 rounded-bl-md shadow-sm'
                                    }`}>
                                        {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
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

                        {/* Input */}
                        <div className="border-t border-gray-100 px-4 py-3 bg-white">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about careers, colleges, exams..."
                                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#635BFF] transition"
                                    disabled={loading}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || loading}
                                    className="bg-[#0A2540] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1a3d66] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
