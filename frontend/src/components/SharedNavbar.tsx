import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

interface SharedNavbarProps {
    activePage?: string;
}

const SharedNavbar: React.FC<SharedNavbarProps> = ({ activePage }) => {
    const { user, logoutUser } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logoutUser();
        navigate('/');
    };

    const navLinks = [
        { name: t('nav.dashboard'), path: '/dashboard', id: 'dashboard' },
        { name: t('nav.careers'), path: '/careers', id: 'careers' },
        { name: t('nav.colleges'), path: '/colleges', id: 'colleges' },
        { name: t('nav.scholarships'), path: '/scholarships', id: 'scholarships' },
        { name: t('nav.resources'), path: '/resources', id: 'resources' },
        { name: t('nav.insights'), path: '/insights', id: 'insights' },
        { name: t('nav.profile'), path: '/profile', id: 'profile' },
    ];

    return (
        <nav className="bg-[#0A2540] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Link to="/" className="text-xl font-extrabold flex items-center gap-1">
                    <span className="text-[#00D4FF]">N</span>HETIS
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                    {navLinks.map((link) => (
                        <Link 
                            key={link.path} 
                            to={link.path} 
                            className={`transition font-medium ${
                                activePage === link.id ? 'text-[#00D4FF]' : 'hover:text-[#00D4FF]'
                            }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSelector />

                    <div className="h-6 w-px bg-white/10 hidden md:block"></div>

                    <span className="hidden md:block text-sm text-gray-300 font-medium">
                        {user?.name?.split(' ')[0]}
                    </span>
                    
                    <button
                        onClick={handleLogout}
                        className="hidden md:block bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-white/20 transition"
                    >
                        {t('nav.logout')}
                    </button>

                    {/* Mobile hamburger button */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition"
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile menu drawer */}
            {mobileOpen && (
                <div className="md:hidden mt-4 pb-2 border-t border-white/10 pt-4 space-y-1 animate-[fadeIn_0.15s_ease-out]">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setMobileOpen(false)}
                            className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                activePage === link.id
                                    ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="border-t border-white/10 mt-2 pt-3 px-4 flex items-center justify-between">
                        <span className="text-sm text-gray-400">{user?.name?.split(' ')[0]}</span>
                        <button
                            onClick={() => { handleLogout(); setMobileOpen(false); }}
                            className="bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-white/20 transition"
                        >
                            {t('nav.logout')}
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default SharedNavbar;
