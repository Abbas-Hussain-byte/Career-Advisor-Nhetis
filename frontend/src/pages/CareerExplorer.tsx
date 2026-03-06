import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const CATEGORIES = ['All', 'Technology', 'Medical', 'Engineering', 'Commerce', 'Arts & Design', 'Education', 'Agriculture', 'Business', 'Media'];

const streamColors: Record<string, string> = {
    Technology: 'bg-blue-100 text-blue-800',
    Medical: 'bg-green-100 text-green-800',
    Engineering: 'bg-yellow-100 text-yellow-800',
    Commerce: 'bg-purple-100 text-purple-800',
    'Arts & Design': 'bg-pink-100 text-pink-800',
    Education: 'bg-orange-100 text-orange-800',
    Agriculture: 'bg-lime-100 text-lime-800',
    Business: 'bg-indigo-100 text-indigo-800',
    Media: 'bg-red-100 text-red-800',
};

export default function CareerExplorer() {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logoutUser();
        navigate('/');
    };
    const [careers, setCareers] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any | null>(null);

    useEffect(() => {
        API.get('/careers')
            .then(({ data }) => {
                setCareers(data);
                setFiltered(data);
            })
            .catch(() => {
                // Fallback demo data if backend not running
                const demo = [
                    { _id: '1', title: 'Software Engineer', category: 'Technology', description: 'Build software systems.', skills: ['JavaScript', 'Python', 'Algorithms'], salary: { min: 600000, max: 3000000 }, requiredStream: 'Science-PCM', roadmap: [{ step: 'Complete B.Tech CS', duration: '4 years' }] },
                    { _id: '2', title: 'Doctor (MBBS)', category: 'Medical', description: 'Treat patients nationwide.', skills: ['Biology', 'Empathy', 'Chemistry'], salary: { min: 500000, max: 2000000 }, requiredStream: 'Science-PCB', roadmap: [{ step: 'MBBS + NEET', duration: '5.5 years' }] },
                ];
                setCareers(demo);
                setFiltered(demo);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        let data = careers;
        if (category !== 'All') data = data.filter(c => c.category === category);
        if (search) data = data.filter(c =>
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.description?.toLowerCase().includes(search.toLowerCase())
        );
        setFiltered(data);
    }, [category, search, careers]);

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            {/* Navbar */}
            <nav className="bg-[#0A2540] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-xl font-extrabold"><span className="text-[#00D4FF]">N</span>HETIS</Link>
                    <div className="hidden md:flex items-center gap-6 text-sm">
                        <Link to="/dashboard" className="hover:text-[#00D4FF] transition">Dashboard</Link>
                        <Link to="/careers" className="text-[#00D4FF] font-semibold">Careers</Link>
                        <Link to="/colleges" className="hover:text-[#00D4FF] transition">Colleges</Link>
                        <Link to="/profile" className="hover:text-[#00D4FF] transition">Profile</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden md:block text-sm text-gray-300">{user?.name}</span>
                        <button onClick={handleLogout} className="bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-white/20 transition">Logout</button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">Career Explorer</h1>
                    <p className="text-gray-500 mt-2">Browse {careers.length} career paths with roadmaps and salary data</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        placeholder="Search careers..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition flex-1"
                    />
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${category === cat
                                    ? 'bg-[#0A2540] text-white'
                                    : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#0A2540]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="spinner mx-auto mb-3"></div>
                        <p className="text-gray-500">Loading careers...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-lg">No careers found. Try different filters.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((career, i) => (
                            <motion.div
                                key={career._id || i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="glass rounded-2xl p-6 card-hover cursor-pointer"
                                onClick={() => setSelected(selected?._id === career._id ? null : career)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-bold text-[#0A2540] leading-tight">{career.title}</h3>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ml-2 whitespace-nowrap ${streamColors[career.category] || 'bg-gray-100 text-gray-700'}`}>
                                        {career.category}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{career.description}</p>

                                {/* Skills */}
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {career.skills?.slice(0, 4).map((s: string) => (
                                        <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{s}</span>
                                    ))}
                                </div>

                                {/* Salary */}
                                <div className="flex justify-between items-center border-t pt-3">
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Annual Salary</p>
                                        <p className="text-green-600 font-bold text-sm">
                                            ₹{(career.salary?.min / 100000).toFixed(0)}L – ₹{(career.salary?.max / 100000).toFixed(0)}L
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-400">{career.requiredStream}</span>
                                </div>

                                {/* Expandable Roadmap */}
                                {selected?._id === career._id && career.roadmap?.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 border-t pt-4"
                                    >
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Career Roadmap</p>
                                        <div className="space-y-2">
                                            {career.roadmap.map((step: any, idx: number) => (
                                                <div key={idx} className="flex gap-3 items-start">
                                                    <span className="bg-[#00D4FF] text-[#0A2540] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#0A2540]">{step.step}</p>
                                                        <p className="text-xs text-gray-400">{step.duration}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {career.outcome && (
                                            <div className="mt-3 bg-green-50 rounded-lg p-3">
                                                <p className="text-xs font-bold text-green-700">Outcome: {career.outcome}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                <p className="text-xs text-[#635BFF] mt-3 font-medium text-center">
                                    {selected?._id === career._id ? '▲ Hide roadmap' : '▼ View roadmap'}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
