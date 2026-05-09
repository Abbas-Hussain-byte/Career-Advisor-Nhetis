import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const languages = [
    { code: 'en', label: 'English', native: 'English', icon: '🌐' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी', icon: '🇮🇳' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు', icon: '🇮🇳' },
];

const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLang = languages.find((l) => l.code === language) || languages[0];

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-300 border backdrop-blur-md shadow-lg ${
                    isOpen 
                    ? 'bg-[#00D4FF] border-[#00D4FF] text-[#0A2540] shadow-[#00D4FF]/20' 
                    : 'bg-white/10 border-[#00D4FF]/30 text-white hover:bg-white/20 hover:border-[#00D4FF] hover:shadow-[#00D4FF]/20'
                }`}
                aria-label="Select Language"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">🌐</span>
                    <span className="text-[13px] font-bold uppercase tracking-wider">
                        {currentLang.native}
                    </span>
                </div>
                <div className="h-4 w-px bg-current opacity-20 mx-0.5"></div>
                <svg
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-48 bg-[#0A2540] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] backdrop-blur-xl"
                    >
                        <div className="p-2 space-y-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code as any);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                                        language === lang.code
                                            ? 'bg-[#00D4FF] text-[#0A2540]'
                                            : 'hover:bg-white/10 text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{lang.icon}</span>
                                        <div className="flex flex-col items-start">
                                            <span className="text-sm font-bold leading-none">{lang.native}</span>
                                            <span className={`text-[10px] opacity-60 ${language === lang.code ? 'text-[#0A2540]' : 'text-gray-400'}`}>
                                                {lang.label}
                                            </span>
                                        </div>
                                    </div>
                                    {language === lang.code && (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageSelector;
