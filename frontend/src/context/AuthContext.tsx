import React, { createContext, useContext, useState, useEffect } from 'react';
import { login, register, fetchProfile } from '../api/index';

interface AuthContextType {
    user: any;
    loading: boolean;
    loginUser: (data: any) => Promise<void>;
    registerUser: (data: any) => Promise<void>;
    refreshUser: () => Promise<void>;
    logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchProfile()
                .then(({ data }) => setUser(data))
                .catch(() => {
                    localStorage.removeItem('token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const loginUser = async (formData: any) => {
        const { data } = await login(formData);
        localStorage.setItem('token', data.token);
        setUser(data);
    };

    const registerUser = async (formData: any) => {
        const { data } = await register(formData);
        localStorage.setItem('token', data.token);
        setUser(data);
    };

    // Refreshes user state from backend — call after profile updates
    const refreshUser = async () => {
        try {
            const { data } = await fetchProfile();
            setUser(data);
        } catch {
            // If token is invalid, log out gracefully
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    const logoutUser = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, registerUser, refreshUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
