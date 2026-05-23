import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { useLanguage } from '../context/LanguageContext';
import SharedNavbar from '../components/SharedNavbar';

const CATEGORIES = ['All', 'Technology', 'Medical', 'Engineering', 'Commerce', 'Arts & Design', 'Education', 'Agriculture', 'Business', 'Media', 'Law'];

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
    Law: 'bg-cyan-100 text-cyan-800',
};

export default function CareerExplorer() {
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const profile = user?.profile || {};
    const assessment = user?.assessment;

    const [careers, setCareers] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any | null>(null);
    const [compareList, setCompareList] = useState<any[]>([]);
    const [showCompare, setShowCompare] = useState(false);
    const [showAssessment, setShowAssessment] = useState(false);

    const toggleCompare = (career: any) => {
        setCompareList(prev => {
            const exists = prev.find(c => c._id === career._id);
            if (exists) return prev.filter(c => c._id !== career._id);
            if (prev.length >= 3) return prev; // Max 3
            return [...prev, career];
        });
    };

    // ── Personalised recommendations for this student ──
    const recommended = useMemo(() => {
        if (!careers.length) return [];

        // PRIORITY 1: If quiz taken, match saved assessment results by title
        if (assessment?.results?.length) {
            const resultTitles = (assessment.results || []).map((r: any) => r.careerTitle.toLowerCase().trim());
            const matched = careers.filter(c => resultTitles.includes(c.title.toLowerCase().trim()));

            // If we got good matches by title, use those (with score order preserved)
            if (matched.length > 0) {
                // Sort matched careers by their assessment score (highest first)
                matched.sort((a, b) => {
                    const scoreA = (assessment.results || []).find((r: any) => r.careerTitle.toLowerCase().trim() === a.title.toLowerCase().trim())?.score || 0;
                    const scoreB = (assessment.results || []).find((r: any) => r.careerTitle.toLowerCase().trim() === b.title.toLowerCase().trim())?.score || 0;
                    return scoreB - scoreA;
                });
                return matched.slice(0, 4);
            }

            // PRIORITY 2: Title match failed — use assessment CATEGORIES to find similar careers
            // This is the key fix: use assessment category data, NOT profile stream/interests
            const assessmentCategories = new Set<string>(
                (assessment.results || []).map((r: any) => r.category).filter(Boolean)
            );
            if (assessmentCategories.size > 0) {
                const categoryMatched = careers.filter(c => assessmentCategories.has(c.category));
                return categoryMatched.slice(0, 4);
            }
        }

        // PRIORITY 3 (LAST RESORT): No assessment at all — filter by stream + interests
        const streamMap: Record<string, string[]> = {
            'Science-PCM': ['Technology', 'Engineering'],
            'Science-PCB': ['Medical', 'Agriculture'],
            'Commerce': ['Commerce', 'Business'],
            'Arts / Humanities': ['Arts & Design', 'Media', 'Education', 'Law'],
            'Vocational': ['Engineering', 'Agriculture'],
        };
        const cats = new Set<string>(streamMap[profile.stream] || []);
        (profile.interests || []).forEach((interest: string) => {
            const catMap: Record<string, string[]> = {
                Technology: ['Technology'], Science: ['Technology', 'Medical'],
                Medicine: ['Medical'], Arts: ['Arts & Design'], Design: ['Arts & Design'],
                Business: ['Business', 'Commerce'], Commerce: ['Commerce'],
                Agriculture: ['Agriculture'], Education: ['Education'],
                Engineering: ['Engineering', 'Technology'], Law: ['Law'],
            };
            (catMap[interest] || []).forEach(c => cats.add(c));
        });
        const filtered = cats.size > 0 ? careers.filter(c => cats.has(c.category)) : [];
        return filtered.slice(0, 4);
    }, [careers, assessment, profile]);

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
            <SharedNavbar activePage="careers" />

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">{t('career.title')}</h1>
                    <p className="text-gray-500 mt-2">{t('career.subtitle', { n: careers.length })}</p>
                </div>

                {/* ══ Assessment Bookmark — collapsible summary ══ */}
                {assessment?.recommendedStreams?.length > 0 && (() => {
                    const STREAM_COLORS: Record<string, string> = {
                        'Science-PCM': '#3b82f6', 'Science-PCB': '#10b981',
                        'Commerce': '#8b5cf6', 'Arts / Humanities': '#f59e0b',
                        'Diploma / Polytechnic': '#f97316', 'ITI / Skill Training': '#ef4444',
                        'Paramedical / Nursing Diploma': '#06b6d4',
                    };
                    return (
                        <div className="mb-6 relative">
                            {/* Bookmark button — always visible */}
                            <button
                                onClick={() => setShowAssessment(prev => !prev)}
                                className="flex items-center gap-2.5 bg-gradient-to-r from-[#0A2540] to-[#1a3d66] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                            >
                                <span>🎯</span>
                                <span>Your Assessment Results</span>
                                <span className="text-[10px] bg-[#00D4FF] text-[#0A2540] font-bold px-2 py-0.5 rounded-full">
                                    ✅ {assessment.recommendedStreams[0]?.stream}
                                </span>
                                <span className={`text-xs transition-transform duration-200 ${showAssessment ? 'rotate-180' : ''}`}>▼</span>
                            </button>

                            {/* Expandable panel */}
                            <AnimatePresence>
                                {showAssessment && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, height: 0 }}
                                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                                        exit={{ opacity: 0, y: -8, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-2 bg-gradient-to-r from-[#0A2540] to-[#1a3d66] text-white rounded-2xl p-5 shadow-xl">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs text-gray-300">
                                                    {assessment.takenAt
                                                        ? `Assessment taken on ${new Date(assessment.takenAt).toLocaleDateString()}`
                                                        : 'Based on your aptitude assessment'}
                                                </p>
                                                <Link
                                                    to="/dashboard"
                                                    className="shrink-0 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                                >
                                                    🔄 Retake
                                                </Link>
                                            </div>

                                            {/* Stream chips */}
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Recommended Streams</p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {assessment.recommendedStreams.slice(0, 4).map((s: any, idx: number) => {
                                                    const color = STREAM_COLORS[s.stream] || '#635BFF';
                                                    return (
                                                        <div key={s.stream}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                                            style={{ background: `${color}30`, borderColor: `${color}60`, borderWidth: 1 }}
                                                        >
                                                            {idx === 0 && <span className="text-[10px]">⭐</span>}
                                                            <span>{s.stream}</span>
                                                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">{s.confidence}%</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Top career matches */}
                                            {assessment.results?.length > 0 && (
                                                <>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Top Career Matches</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {assessment.results.slice(0, 3).map((r: any) => (
                                                            <span key={r.careerTitle}
                                                                className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white font-medium"
                                                            >
                                                                {r.careerTitle} · {r.score}%
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })()}

                {/* Recommended for You */}
                {recommended.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-[#0A2540] mb-3">
                            ⭐ {t('career.recommended')}
                            <span className="ml-2 text-xs font-normal text-gray-400">
                                {assessment?.results?.length ? t('career.basedOnQuiz') : t('career.basedOnStream')}
                            </span>
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {recommended.map((career, i) => {
                                const savedResult = (assessment?.results || []).find((r: any) => r.careerTitle === career.title);
                                return (
                                    <motion.div
                                        key={career._id || i}
                                        initial={{ opacity: 0, y: 16 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-20px" }}
                                        transition={{ delay: i * 0.08 }}
                                        className="bg-gradient-to-br from-[#0A2540] to-[#1a3d66] text-white rounded-2xl p-5 cursor-pointer hover:shadow-xl transition"
                                        onClick={() => setSelected(selected?._id === career._id ? null : career)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-sm leading-snug">{career.title}</h3>
                                            {savedResult && (
                                                <span className="text-xs bg-[#00D4FF] text-[#0A2540] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0">
                                                    {savedResult.score}%
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-300 mb-3 leading-relaxed line-clamp-2">{career.description}</p>
                                        <p className="text-xs text-[#00D4FF] font-semibold">
                                            ₹{Math.round((career.salary?.min || 0) / 100000)}L – ₹{Math.round((career.salary?.max || 0) / 100000)}L / yr
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">{selected?._id === career._id ? t('career.hideRoadmap') : t('career.viewRoadmap')}</p>
                                        {selected?._id === career._id && career.roadmap?.length > 0 && (
                                            <div className="mt-4 border-t border-white/20 pt-3 space-y-2">
                                                {career.roadmap.map((step: any, idx: number) => (
                                                    <div key={idx} className="flex gap-2 items-start text-xs">
                                                        <span className="bg-[#00D4FF] text-[#0A2540] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                                                        <span className="text-gray-200">{step.step} <span className="text-gray-400">· {step.duration}</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!recommended.length && !loading && (
                    <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
                        💡 {t('career.setProfile')} <Link to="/profile" className="font-bold underline">Profile</Link>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        placeholder={t('career.searchPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition flex-1 bg-white text-gray-900"
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
                                {t(`career.categories.${cat}` as any)}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="spinner mx-auto mb-3"></div>
                        <p className="text-gray-500">{t('career.loading')}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-lg">{t('career.noCareers')}</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((career, i) => (
                            <motion.div
                                key={career._id || i}
                                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
                                className="glass rounded-2xl p-6 card-hover cursor-pointer min-h-[280px] flex flex-col"
                                onClick={() => setSelected(selected?._id === career._id ? null : career)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-bold text-[#0A2540] leading-tight">{career.title}</h3>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ml-2 whitespace-nowrap ${streamColors[career.category] || 'bg-gray-100 text-gray-700'}`}>
                                        {t(`career.categories.${career.category}` as any)}
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
                                        <p className="text-xs text-gray-400 font-medium">{t('career.annualSalary')}</p>
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
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{t('career.roadmap')}</p>
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
                                                <p className="text-xs font-bold text-green-700">{t('career.outcome')}: {career.outcome}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Compare toggle + Roadmap toggle */}
                                <div className="flex items-center justify-between mt-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleCompare(career); }}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition ${
                                            compareList.find(c => c._id === career._id)
                                                ? 'bg-[#635BFF] text-white border-[#635BFF]'
                                                : 'border-gray-200 text-gray-500 hover:border-[#635BFF] hover:text-[#635BFF]'
                                        }`}
                                    >
                                        {compareList.find(c => c._id === career._id) ? t('career.inCompare') : t('career.compare')}
                                    </button>
                                    <p className="text-xs text-[#635BFF] font-medium">
                                        {selected?._id === career._id ? t('career.hideRoadmap') : t('career.viewRoadmap')}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Floating compare bar */}
                <AnimatePresence>
                    {compareList.length >= 2 && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0A2540] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50"
                        >
                            <span className="text-sm font-medium">{t('career.selectedCount', { n: compareList.length })}</span>
                            <button
                                onClick={() => setShowCompare(true)}
                                className="bg-[#00D4FF] text-[#0A2540] font-bold px-5 py-2 rounded-xl text-sm hover:brightness-110 transition"
                            >
                                {t('career.compareNow')}
                            </button>
                            <button
                                onClick={() => setCompareList([])}
                                className="text-xs text-gray-400 hover:text-white transition"
                            >
                                {t('career.clear')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Comparison Modal */}
                <AnimatePresence>
                    {showCompare && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                            onClick={() => setShowCompare(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-6"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-extrabold text-[#0A2540]">{t('career.comparisonTitle')}</h2>
                                    <button onClick={() => setShowCompare(false)} className="text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-gray-100">
                                                <th className="text-left py-3 pr-4 text-gray-500 font-semibold w-32">{t('career.criteria')}</th>
                                                {compareList.map(c => (
                                                    <th key={c._id} className="text-left py-3 px-3">
                                                        <span className="font-bold text-[#0A2540]">{c.title}</span>
                                                        <br />
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${streamColors[c.category] || 'bg-gray-100 text-gray-700'}`}>
                                                            {c.category}
                                                        </span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Salary Range */}
                                            <tr className="border-b border-gray-50">
                                                <td className="py-3 pr-4 text-gray-500 font-medium">💰 {t('career.salary')}</td>
                                                {compareList.map(c => {
                                                    const minL = Math.round((c.salary?.min || 0) / 100000);
                                                    const maxL = Math.round((c.salary?.max || 0) / 100000);
                                                    const maxSalary = Math.max(...compareList.map(x => x.salary?.max || 0));
                                                    const widthPct = maxSalary > 0 ? ((c.salary?.max || 0) / maxSalary) * 100 : 0;
                                                    return (
                                                        <td key={c._id} className="py-3 px-3">
                                                            <p className="font-bold text-green-600">₹{minL}L – ₹{maxL}L / yr</p>
                                                            <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                                <div className="h-full bg-green-400 rounded-full" style={{ width: `${widthPct}%` }} />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            {/* Required Stream */}
                                            <tr className="border-b border-gray-50">
                                                <td className="py-3 pr-4 text-gray-500 font-medium">🎓 {t('career.stream')}</td>
                                                {compareList.map(c => (
                                                    <td key={c._id} className="py-3 px-3 font-semibold text-[#0A2540]">{c.requiredStream || 'Any'}</td>
                                                ))}
                                            </tr>
                                            {/* Skills */}
                                            <tr className="border-b border-gray-50">
                                                <td className="py-3 pr-4 text-gray-500 font-medium">🛠️ {t('career.skills')}</td>
                                                {compareList.map(c => (
                                                    <td key={c._id} className="py-3 px-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(c.skills || []).map((s: string) => (
                                                                <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{s}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            {/* Roadmap */}
                                            <tr className="border-b border-gray-50">
                                                <td className="py-3 pr-4 text-gray-500 font-medium align-top">📍 {t('career.roadmap')}</td>
                                                {compareList.map(c => (
                                                    <td key={c._id} className="py-3 px-3">
                                                        <div className="space-y-1">
                                                            {(c.roadmap || []).map((step: any, idx: number) => (
                                                                <div key={idx} className="flex gap-1 text-xs">
                                                                    <span className="text-[#00D4FF] font-bold">{idx + 1}.</span>
                                                                    <span className="text-gray-600">{step.step} <span className="text-gray-400">({step.duration})</span></span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            {/* Outcome */}
                                            <tr className="border-b border-gray-50">
                                                <td className="py-3 pr-4 text-gray-500 font-medium">🎯 {t('career.outcome')}</td>
                                                {compareList.map(c => (
                                                    <td key={c._id} className="py-3 px-3 text-green-700 font-medium">{c.outcome || '—'}</td>
                                                ))}
                                            </tr>
                                            {/* Required Exam */}
                                            {compareList.some(c => c.requiredExam) && (
                                                <tr className="border-b border-gray-50">
                                                    <td className="py-3 pr-4 text-gray-500 font-medium">📝 {t('career.exam')}</td>
                                                    {compareList.map(c => (
                                                        <td key={c._id} className="py-3 px-3 text-blue-600 font-medium">{c.requiredExam || 'None required'}</td>
                                                    ))}
                                                </tr>
                                            )}
                                            {/* Match Score (if assessment taken) */}
                                            {assessment?.results?.length > 0 && (
                                                <tr>
                                                    <td className="py-3 pr-4 text-gray-500 font-medium">⭐ Your Match</td>
                                                    {compareList.map(c => {
                                                        const result = (assessment.results || []).find((r: any) => r.careerTitle === c.title);
                                                        return (
                                                            <td key={c._id} className="py-3 px-3">
                                                                {result ? (
                                                                    <span className="bg-[#635BFF] text-white font-bold px-3 py-1 rounded-full text-xs">{result.score}% match</span>
                                                                ) : (
                                                                    <span className="text-gray-400 text-xs">{t('career.matchNote')}</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
