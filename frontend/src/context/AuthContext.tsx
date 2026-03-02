import React, { createContext, useContext, useState, useEffect } from 'react';
import { login, register, fetchProfile } from '../api/index';

interface AuthContextType {
    user: any;
    loading: boolean;
    loginUser: (data: any) => Promise<void>;
    registerUser: (data: any) => Promise<void>;
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

    const logoutUser = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginUser, registerUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
