import React from 'react';
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
                        className="bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-white/20 transition"
                    >
                        {t('nav.logout')}
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default SharedNavbar;
