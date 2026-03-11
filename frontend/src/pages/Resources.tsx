import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const TYPE_ICONS: Record<string, string> = {
    course: '📚',
    article: '📰',
    video: '🎥',
    ebook: '📖',
    tool: '🔧',
    'exam-prep': '📝',
};

const TYPE_LABELS: Record<string, string> = {
    course: 'Course',
    article: 'Article',
    video: 'Video',
    ebook: 'E-Book',
    tool: 'Tool',
    'exam-prep': 'Exam Prep',
};

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
                    <Link to="/scholarships" className="hover:text-[#00D4FF] transition font-medium">Scholarships</Link>
                    <Link to="/resources" className="text-[#00D4FF] font-bold">Resources</Link>
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

export default function Resources() {
    const { user, logoutUser } = useAuth();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [personalized, setPersonalized] = useState(false);

    useEffect(() => {
        fetchResources();
    }, [typeFilter, personalized]);

    const fetchResources = async () => {
        setLoading(true);
        try {
            if (personalized) {
                const { data } = await API.get('/resources/recommended');
                setResources(data);
            } else {
                const params: any = {};
                if (typeFilter) params.type = typeFilter;
                if (search) params.search = search;
                const { data } = await API.get('/resources', { params });
                setResources(data);
            }
        } catch {
            setResources([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchResources();
    };

    // Group by type for display
    const grouped = resources.reduce<Record<string, any[]>>((acc, r) => {
        const t = r.type || 'other';
        if (!acc[t]) acc[t] = [];
        acc[t].push(r);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            <Navbar user={user} logoutUser={logoutUser} />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">📖 Study Resources</h1>
                    <p className="text-gray-500 mt-2 max-w-xl mx-auto">
                        Curated free resources from NPTEL, SWAYAM, Khan Academy, NTA & more — matched to your career path
                    </p>
                </motion.div>

                {/* Filters */}
                <div className="glass rounded-2xl p-5 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <button
                            onClick={() => setPersonalized(!personalized)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition border-2 ${personalized ? 'bg-[#635BFF] text-white border-[#635BFF]' : 'border-gray-200 text-gray-600 hover:border-[#635BFF]'}`}
                        >
                            {personalized ? '✓ Personalized for me' : '🎯 Show recommended'}
                        </button>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#635BFF] outline-none"
                            disabled={personalized}
                        >
                            <option value="">All Types</option>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{TYPE_ICONS[k]} {v}</option>
                            ))}
                        </select>
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search resources..."
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
                        <p className="text-gray-500">Loading resources...</p>
                    </div>
                ) : resources.length === 0 ? (
                    <div className="text-center py-16 glass rounded-2xl">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="text-gray-500">No resources found</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(grouped).map(([type, items]) => (
                            <div key={type}>
                                <h2 className="text-xl font-bold text-[#0A2540] mb-4 flex items-center gap-2">
                                    <span>{TYPE_ICONS[type] || '📄'}</span>
                                    <span>{TYPE_LABELS[type] || type} ({items.length})</span>
                                </h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map((r: any, i: number) => (
                                        <motion.a
                                            key={r._id || i}
                                            href={r.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="glass rounded-2xl p-5 card-hover block group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="text-base font-bold text-[#0A2540] leading-tight group-hover:text-[#635BFF] transition pr-2">
                                                    {r.title}
                                                </h3>
                                                {r.free && (
                                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">FREE</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#635BFF] font-semibold mb-2">{r.provider}</p>
                                            <p className="text-gray-500 text-xs mb-3 leading-relaxed">{r.description}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {r.subject && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded">{r.subject}</span>}
                                                {(r.stream || []).filter((s: string) => s !== 'All').slice(0, 2).map((s: string) => (
                                                    <span key={s} className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded">{s}</span>
                                                ))}
                                                {r.language && r.language !== 'English' && <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded">{r.language}</span>}
                                            </div>
                                            <p className="text-[#635BFF] text-xs font-semibold mt-3 group-hover:underline">Open Resource →</p>
                                        </motion.a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
