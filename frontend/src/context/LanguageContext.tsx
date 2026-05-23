import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { translations, Language } from '../i18n/translations';
import { useAuth } from './AuthContext';
import API from '../api';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (path: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    // Default to 'en' or saved preference
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('nhetis_lang');
        return (saved as Language) || 'en';
    });
    const [isInitialized, setIsInitialized] = useState(false);

    // Update backend when language changes
    const updateLanguage = async (lang: Language) => {
        if (!user) return;
        try {
            await API.put('/users/language', { preferredLanguage: lang });
        } catch (err) {
            console.error('Failed to sync language to backend', err);
        }
    };

    // Sync FROM user profile only once on initial load
    useEffect(() => {
        if (user?.preferredLanguage && !isInitialized) {
            setLanguageState(user.preferredLanguage as Language);
            localStorage.setItem('nhetis_lang', user.preferredLanguage);
            setIsInitialized(true);
        }
    }, [user, isInitialized]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('nhetis_lang', lang);
        document.documentElement.lang = lang;
        updateLanguage(lang);
    };

    // Simple translation helper
    const t = (path: string, params?: Record<string, any>): string => {
        const keys = path.split('.');
        let result: any = translations[language];

        for (const key of keys) {
            if (result[key] === undefined) return path; // fallback to key name
            result = result[key];
        }

        if (typeof result !== 'string') return path;

        // Handle params like {name}
        if (params) {
            Object.entries(params).forEach(([key, val]) => {
                result = result.replace(`{${key}}`, val);
            });
        }

        return result;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
