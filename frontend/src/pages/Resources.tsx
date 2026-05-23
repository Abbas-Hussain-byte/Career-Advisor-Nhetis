import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import { useLanguage } from '../context/LanguageContext';
import SharedNavbar from '../components/SharedNavbar';

export default function Resources() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [personalized, setPersonalized] = useState(false);

    const TYPE_LABELS: Record<string, string> = {
        course: t('resource.types.course'),
        article: t('resource.types.article'),
        video: t('resource.types.video'),
        ebook: t('resource.types.ebook'),
        tool: t('resource.types.tool'),
        'exam-prep': t('resource.types.exam-prep'),
        exam: t('resource.types.exam'),
    };

    const TYPE_ICONS: Record<string, string> = {
        course: '📚',
        article: '📰',
        video: '🎥',
        ebook: '📖',
        tool: '🔧',
        'exam-prep': '📝',
        exam: '🎯',
    };

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
            <SharedNavbar activePage="resources" />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">{t('resource.title')}</h1>
                    <p className="text-gray-500 mt-2 max-w-xl mx-auto">
                        {t('resource.subtitle')}
                    </p>
                </motion.div>

                {/* Filters */}
                <div className="glass rounded-2xl p-5 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <button
                            onClick={() => setPersonalized(!personalized)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition border-2 ${personalized ? 'bg-[#635BFF] text-white border-[#635BFF]' : 'border-gray-200 text-gray-600 hover:border-[#635BFF]'}`}
                        >
                            {personalized ? t('scholarship.personalized') : t('scholarship.showPersonalized')}
                        </button>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#635BFF] outline-none bg-white text-gray-900"
                            disabled={personalized}
                        >
                            <option value="">{t('career.allCategories')}</option>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{TYPE_ICONS[k]} {v}</option>
                            ))}
                        </select>
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('resource.searchPlaceholder')}
                                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-[#635BFF] outline-none bg-white text-gray-900"
                                disabled={personalized}
                            />
                            <button type="submit" className="bg-[#0A2540] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#1a3d66] transition" disabled={personalized}>
                                {t('common.search')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="text-center py-16">
                        <div className="spinner mx-auto mb-4" />
                        <p className="text-gray-500">{t('scholarship.loading')}</p>
                    </div>
                ) : resources.length === 0 ? (
                    <div className="text-center py-16 glass rounded-2xl">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="text-gray-500">{t('resource.noResources')}</p>
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
                                            className="glass rounded-2xl p-5 card-hover stable-card block group"
                                        >
                                            <div className="stable-card-body">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="text-base font-bold text-[#0A2540] leading-tight group-hover:text-[#635BFF] transition pr-2 min-h-[48px]">
                                                        {r.title}
                                                    </h3>
                                                    {r.type === 'exam' ? (
                                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{t('resource.liveUpdate')}</span>
                                                    ) : r.free && (
                                                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{t('resource.free')}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#635BFF] font-semibold mb-2 min-h-[16px]">{r.provider}</p>
                                                <p className="text-gray-500 text-xs mb-3 leading-relaxed min-h-[60px]">{r.description}</p>

                                                <div className="flex flex-wrap gap-1">
                                                    {r.subject && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded">{r.subject}</span>}
                                                    {(r.stream || []).filter((s: string) => s !== 'All').slice(0, 2).map((s: string) => (
                                                        <span key={s} className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded">{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="stable-card-footer text-[#635BFF] text-xs font-semibold mt-3 group-hover:underline">{t('common.viewDetails')} →</p>
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
