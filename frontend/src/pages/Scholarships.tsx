import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'merit', label: '🏆 Merit-Based' },
    { value: 'need', label: '💰 Need-Based' },
    { value: 'minority', label: '🕌 Minority' },
    { value: 'sc-st', label: 'SC/ST' },
    { value: 'obc', label: 'OBC' },
    { value: 'girl-child', label: '👩 Girl Child' },
    { value: 'central', label: '🏛️ Central Govt.' },
    { value: 'disability', label: '♿ Disability' },
];

const Navbar = ({ user, logoutUser }: any) => {
    const navigate = useNavigate();
    return (
        <nav className="bg-[#0A2540] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Link to="/" className="text-xl font-extrabold">
                    <span className="text-[#00D4FF]">N</span>HETIS
                </Link>
                <div className="hidden md:flex items-center gap-6 text-sm">
                    <Link to="/dashboard" className="hover:text-[#00D4FF] transition font-medium">Dashboard</Link>
                    <Link to="/careers" className="hover:text-[#00D4FF] transition font-medium">Careers</Link>
                    <Link to="/colleges" className="hover:text-[#00D4FF] transition font-medium">Colleges</Link>
                    <Link to="/scholarships" className="text-[#00D4FF] font-bold">Scholarships</Link>
                    <Link to="/resources" className="hover:text-[#00D4FF] transition font-medium">Resources</Link>
                    <Link to="/insights" className="hover:text-[#00D4FF] transition font-medium">Insights</Link>
                    <Link to="/profile" className="hover:text-[#00D4FF] transition font-medium">Profile</Link>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden md:block text-sm text-gray-300">{user?.name}</span>
                    <button onClick={() => { logoutUser(); navigate('/'); }} className="bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-white/20 transition">Logout</button>
                </div>
            </div>
        </nav>
    );
};

export default function Scholarships() {
    const { user, logoutUser } = useAuth();
    const [scholarships, setScholarships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('');
    const [search, setSearch] = useState('');
    const [personalized, setPersonalized] = useState(false);

    useEffect(() => {
        fetchScholarships();
    }, [category, personalized]);

    const fetchScholarships = async () => {
        setLoading(true);
        try {
            if (personalized) {
                const { data } = await API.get('/scholarships/personalized');
                setScholarships(data);
            } else {
                const params: any = {};
                if (category) params.category = category;
                if (search) params.search = search;
                const { data } = await API.get('/scholarships', { params });
                setScholarships(data);
            }
        } catch {
            setScholarships([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchScholarships();
    };

    const CATEGORY_COLORS: Record<string, string> = {
        merit: 'bg-yellow-100 text-yellow-800',
        need: 'bg-blue-100 text-blue-800',
        minority: 'bg-purple-100 text-purple-800',
        'sc-st': 'bg-green-100 text-green-800',
        obc: 'bg-orange-100 text-orange-800',
        'girl-child': 'bg-pink-100 text-pink-800',
        central: 'bg-indigo-100 text-indigo-800',
        disability: 'bg-teal-100 text-teal-800',
    };

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            <Navbar user={user} logoutUser={logoutUser} />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">🎓 Scholarship Finder</h1>
                    <p className="text-gray-500 mt-2 max-w-xl mx-auto">
                        Verified government scholarships from NSP, AICTE, DST, and more — personalized for your profile
                    </p>
                </motion.div>

                {/* Filters */}
                <div className="glass rounded-2xl p-5 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Personalized toggle */}
                        <button
                            onClick={() => setPersonalized(!personalized)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition border-2 ${personalized ? 'bg-[#635BFF] text-white border-[#635BFF]' : 'border-gray-200 text-gray-600 hover:border-[#635BFF]'}`}
                        >
                            {personalized ? '✓ Personalized for me' : '🎯 Show personalized'}
                        </button>

                        {/* Category filter */}
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#635BFF] outline-none"
                            disabled={personalized}
                        >
                            {CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>

                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search scholarships..."
                                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#635BFF] outline-none"
                                disabled={personalized}
                            />
                            <button type="submit" className="bg-[#0A2540] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#1a3d66] transition" disabled={personalized}>
                                Search
                            </button>
                        </form>
                    </div>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="text-center py-16">
                        <div className="spinner mx-auto mb-4" />
                        <p className="text-gray-500">Loading scholarships...</p>
                    </div>
                ) : scholarships.length === 0 ? (
                    <div className="text-center py-16 glass rounded-2xl">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="text-gray-500">No scholarships found matching your criteria</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-5">
                        {scholarships.map((s, i) => (
                            <motion.div
                                key={s._id || i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass rounded-2xl p-6 card-hover"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-bold text-[#0A2540] leading-tight pr-2">{s.name}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORY_COLORS[s.category] || 'bg-gray-100 text-gray-700'}`}>
                                        {s.category?.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-xs text-[#635BFF] font-semibold mb-2">{s.provider}</p>
                                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{s.description}</p>

                                {/* Details grid */}
                                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                                    <div className="bg-green-50 rounded-lg p-2">
                                        <p className="text-gray-500">Amount</p>
                                        <p className="font-bold text-green-700">{s.amount}</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-lg p-2">
                                        <p className="text-gray-500">Deadline</p>
                                        <p className="font-bold text-amber-700">{s.deadline || 'Check portal'}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-2">
                                        <p className="text-gray-500">Income Limit</p>
                                        <p className="font-bold text-blue-700">{s.incomeLimit || 'No limit'}</p>
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-2">
                                        <p className="text-gray-500">For Grade</p>
                                        <p className="font-bold text-purple-700">{(s.targetGrade || []).join(', ')}</p>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 mb-3"><strong>Eligibility:</strong> {s.eligibility}</p>

                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Source: {s.source}</span>
                                    {s.applicationUrl && (
                                        <a
                                            href={s.applicationUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-[#0A2540] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1a3d66] transition"
                                        >
                                            Apply Now →
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
