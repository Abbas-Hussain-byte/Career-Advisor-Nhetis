import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Cell
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import SharedNavbar from '../components/SharedNavbar';

// ── Color palette ──────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
    Technology: '#00D4FF',
    Engineering: '#635BFF',
    Medical: '#10b981',
    'Arts & Design': '#f59e0b',
    Business: '#f97316',
    Agriculture: '#84cc16',
    Media: '#ec4899',
    Commerce: '#8b5cf6',
    Law: '#0ea5e9',
    Education: '#14b8a6',
};

const COLORS = Object.values(CATEGORY_COLORS);

// CATEGORY_COLORS and CustomTooltip remain — JOB_DEMAND map removed (now reads from DB career.jobDemand)

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0A2540] text-white text-xs rounded-xl px-4 py-2 shadow-xl">
            <p className="font-bold mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color || '#00D4FF' }}>
                    {p.name}: {typeof p.value === 'number' && p.value > 1000
                        ? p.value.toLocaleString()
                        : p.value}
                </p>
            ))}
        </div>
    );
};

const Section = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8"
    >
        <h2 className="text-xl font-extrabold text-[#0A2540] mb-1">{title}</h2>
        <p className="text-sm text-gray-400 mb-6">{subtitle}</p>
        {children}
    </motion.div>
);

export default function Insights() {
    const { user, logoutUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [allCareers, setAllCareers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [jobTrends, setJobTrends] = useState<{ skills: any[]; sectors: any[]; topJobs: any[]; cached: boolean } | null>(null);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [marketData, setMarketData] = useState<any>(null);
    const [marketLoading, setMarketLoading] = useState(false);
    const [selectedCareer, setSelectedCareer] = useState('');

    // ── Derived from saved assessment ─
    const assessment = user?.assessment;
    const hasAssessment = !!(assessment?.results?.length);
    const profile = user?.profile || {};

    useEffect(() => {
        API.get('/careers')
            .then(({ data }) => setAllCareers(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Fetch Remotive trending skills (public)
    useEffect(() => {
        API.get('/jobs/trending')
            .then(res => { if (res.data) setJobTrends(res.data); })
            .catch(console.warn)
            .finally(() => setJobsLoading(false));
    }, []);

    const handleLogout = () => { logoutUser(); navigate('/'); };

    // ── Personalise: matched careers for this student ─────────────
    // Priority: saved assessment results > stream/interest filtered careers
    const matchedCareers: any[] = React.useMemo(() => {
        if (hasAssessment && allCareers.length > 0) {
            // Map saved results to full career objects (with all fields)
            const resultTitles = (assessment.results || []).map((r: any) => r.careerTitle);
            const matched = resultTitles
                .map((t: string) => allCareers.find(c => c.title === t))
                .filter(Boolean);
            // If some careers not found in DB for any reason, supplement with interest filter
            if (matched.length >= 2) return matched;
        }
        // Fallback: filter by stream + interests
        const streamMap: Record<string, string[]> = {
            'Science-PCM': ['Technology', 'Engineering'],
            'Science-PCB': ['Medical', 'Agriculture'],
            'Commerce': ['Commerce', 'Business'],
            'Arts / Humanities': ['Arts & Design', 'Media', 'Education', 'Law'],
            'Vocational': ['Engineering', 'Agriculture'],
        };
        const streamCats = streamMap[profile.stream] || [];
        const interestCats = new Set<string>();
        const catMap: Record<string, string[]> = {
            Technology: ['Technology'], Science: ['Technology', 'Medical', 'Agriculture'],
            Mathematics: ['Technology', 'Engineering', 'Commerce'], Medicine: ['Medical'],
            Arts: ['Arts & Design', 'Media'], Design: ['Arts & Design'],
            Business: ['Business', 'Commerce'], Commerce: ['Commerce', 'Business'],
            Agriculture: ['Agriculture'], Education: ['Education'], Sports: ['Education'],
            Writing: ['Media', 'Education'], Engineering: ['Engineering', 'Technology'],
            Law: ['Law'],
        };
        (profile.interests || []).forEach((interest: string) => {
            (catMap[interest] || []).forEach(c => interestCats.add(c));
        });

        // Score each career based on stream (1pt) and interest (2pts)
        const scored = allCareers.map(c => {
            let s = 0;
            if (streamCats.includes(c.category)) s += 1;
            if (interestCats.has(c.category)) s += 2;
            return { ...c, _s: s };
        });

        // Sort by score (desc), then by title length (to avoid tech bias from seed order)
        const sorted = scored
            .filter(c => c._s > 0)
            .sort((a, b) => {
                if (b._s !== a._s) return b._s - a._s;
                return (a.title?.length || 0) - (b.title?.length || 0);
            });

        return sorted.slice(0, 6);
    }, [allCareers, hasAssessment, assessment, profile]);

    // Auto-select top matched career and fetch Adzuna market data when careers load
    useEffect(() => {
        if (matchedCareers.length > 0) {
            // Only auto-select if nothing selected OR if current selection is not in matched list
            if (!selectedCareer || !matchedCareers.find(c => c.title === selectedCareer)) {
                setSelectedCareer(matchedCareers[0]?.title);
            }
        }
    }, [matchedCareers]);

    useEffect(() => {
        if (!selectedCareer) return;
        setMarketLoading(true);
        API.get(`/jobs/market?career=${encodeURIComponent(selectedCareer)}`)
            .then(res => { if (res.data && !res.data.error) setMarketData(res.data); else setMarketData(null); })
            .catch(console.warn)
            .finally(() => setMarketLoading(false));
    }, [selectedCareer]);

    // ── Aptitude radar data ────────────────────────────────────────
    const radarData = React.useMemo(() => {
        // Use actual quiz vector if available, otherwise derive from interests
        const vec = assessment?.vector;
        if (vec && (vec.logic || vec.creativity || vec.technical || vec.social)) {
            return [
                { dim: t('insights.logic'), value: Math.round(vec.logic * 100), fullMark: 100 },
                { dim: t('insights.creativity'), value: Math.round(vec.creativity * 100), fullMark: 100 },
                { dim: t('insights.technical'), value: Math.round(vec.technical * 100), fullMark: 100 },
                { dim: t('insights.social'), value: Math.round(vec.social * 100), fullMark: 100 },
            ];
        }
        // Estimate from profile stream
        const estimates: Record<string, number[]> = {
            'Science-PCM': [80, 40, 85, 35],
            'Science-PCB': [65, 40, 60, 75],
            'Commerce': [75, 35, 50, 55],
            'Arts / Humanities': [45, 80, 30, 80],
            'Vocational': [60, 60, 75, 50],
        };
        const [l, cr, t_val, s] = estimates[profile.stream] || [50, 50, 50, 50];
        return [
            { dim: t('insights.logic'), value: l, fullMark: 100 },
            { dim: t('insights.creativity'), value: cr, fullMark: 100 },
            { dim: t('insights.technical'), value: t_val, fullMark: 100 },
            { dim: t('insights.social'), value: s, fullMark: 100 },
        ];
    }, [assessment, profile.stream, t]);

    // ── Skills gap: skills needed by matched careers vs. what user has ──
    const skillsGap = React.useMemo(() => {
        const needed = new Map<string, number>();
        matchedCareers.forEach(c => {
            (c.skills || []).forEach((skill: string) => {
                needed.set(skill, (needed.get(skill) || 0) + 1);
            });
        });
        const userSkills = new Set(
            (profile.interests || []).map((i: string) => i.toLowerCase())
        );
        return Array.from(needed.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([skill, count]) => ({
                skill,
                count,
                have: userSkills.has(skill.toLowerCase()),
            }));
    }, [matchedCareers, profile.interests]);

    // ── Demand + salary data scoped to matched careers (from live DB fields) ──
    const demandData = matchedCareers.map(c => ({
        name: c.title?.length > 18 ? c.title.slice(0, 18) + '…' : c.title,
        fullName: c.title,
        openings: c.jobDemand ?? Math.round((c.salary?.min || 50000) / 500), // DB value or estimate
        growth: c.growthRate ?? 0,
        category: c.category,
    })).sort((a, b) => b.openings - a.openings);

    const salaryData = matchedCareers.map(c => ({
        name: c.title?.length > 16 ? c.title.slice(0, 16) + '…' : c.title,
        fullName: c.title,
        Min: Math.round((c.salary?.min || 0) / 100000),
        Max: Math.round((c.salary?.max || 0) / 100000),
        category: c.category,
    }));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F6F9FC]">
                <div className="text-center">
                    <div className="spinner mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">{t('insights.fetching')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            <SharedNavbar activePage="insights" />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">
                        {t('insights.title').split('Insights')[0]} <span className="text-[#00D4FF]">{t('insights.title').includes('Insights') ? 'Insights' : ''}</span>
                    </h1>
                    <p className="text-gray-500 mt-2 max-w-xl">
                        {t('insights.personalizedFor', { name: user?.name || '' })}
                        {profile.stream ? ` · ${profile.stream}` : ''}
                        {profile.grade ? ` · Grade ${profile.grade}` : ''}
                    </p>
                </motion.div>

                {/* Assessment prompt banner — only shown if quiz not taken */}
                {!hasAssessment && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-[#635BFF] to-[#00D4FF] text-white rounded-2xl px-6 py-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4"
                    >
                        <div>
                            <h3 className="font-bold text-lg">🧠 {t('insights.takeAssessment')}</h3>
                            <p className="text-sm text-white/80 mt-1">
                                {t('insights.assessmentSubtitle')}
                            </p>
                        </div>
                        <Link to="/dashboard" className="shrink-0 bg-white text-[#635BFF] font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition">
                            {t('insights.startQuiz')}
                        </Link>
                    </motion.div>
                )}

                {/* Assessment summary chips */}
                {hasAssessment && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-3 mb-8">
                        <span className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-1.5 rounded-full font-medium">
                            ✅ {t('insights.completedOn', { date: assessment.takenAt ? new Date(assessment.takenAt).toLocaleDateString() : '' })}
                        </span>
                        {(assessment.results || []).slice(0, 3).map((r: any) => (
                            <span key={r.careerTitle}
                                className="text-sm px-3 py-1.5 rounded-full font-medium border"
                                style={{ background: CATEGORY_COLORS[r.category] + '18', borderColor: CATEGORY_COLORS[r.category] + '55', color: CATEGORY_COLORS[r.category] }}>
                                {r.careerTitle} · {r.score}%
                            </span>
                        ))}
                    </motion.div>
                )}

                {/* ── 1. YOUR APTITUDE PROFILE (RADAR) ─────────────── */}
                <Section
                    title={`🎯 ${t('insights.aptitudeTitle')}`}
                    subtitle={hasAssessment
                        ? t('insights.aptitudeSubtitle')
                        : t('insights.aptitudeEstimated', { stream: profile.stream || 'not set' })}
                >
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="w-full md:w-1/2" style={{ height: 280 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 13, fontWeight: 600, fill: '#0A2540' }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Radar name={user?.name} dataKey="value"
                                        stroke={hasAssessment ? '#635BFF' : '#00D4FF'}
                                        fill={hasAssessment ? '#635BFF' : '#00D4FF'}
                                        fillOpacity={0.35} strokeWidth={2} />
                                    <Tooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 space-y-3">
                            <h3 className="font-bold text-[#0A2540]">{t('insights.whatThisMeans')}</h3>
                            {radarData.map(d => (
                                <div key={d.dim}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600 font-medium">{d.dim}</span>
                                        <span className="font-bold text-[#0A2540]">{d.value}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${d.value}%`,
                                                background: hasAssessment ? '#635BFF' : '#00D4FF'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* ── 2. CAREERS MATCHED TO YOU ─────────────────────── */}
                <Section
                    title={`⭐ ${t('insights.matchedTitle')}`}
                    subtitle={hasAssessment
                        ? t('insights.matchedSubtitleAssessment', { n: matchedCareers.length })
                        : t('insights.matchedSubtitleStream', { stream: profile.stream || '' })}
                >
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {matchedCareers.map((career, idx) => {
                            const savedResult = (assessment?.results || []).find((r: any) => r.careerTitle === career.title);
                            return (<div key={career._id || idx}
                                className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition"
                                style={{ borderLeftColor: CATEGORY_COLORS[career.category] || '#00D4FF', borderLeftWidth: 4 }}>
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-bold text-[#0A2540] text-sm leading-snug">{career.title}</h4>
                                    {savedResult && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white ml-2 shrink-0"
                                            style={{ background: CATEGORY_COLORS[career.category] || '#635BFF' }}>
                                            {savedResult.score}%
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400">{career.category}</span>
                                <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{career.description}</p>
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {(career.skills || []).slice(0, 3).map((s: string) => (
                                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s}</span>
                                    ))}
                                </div>
                                {career.topRecruiters?.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        🏢 {career.topRecruiters.slice(0, 3).join(', ')}
                                    </p>
                                )}
                                {career.requiredExam && (
                                    <p className="text-xs text-blue-500 mt-1">📋 {career.requiredExam}</p>
                                )}
                                <div className="flex items-center justify-between mt-3">
                                    <p className="text-xs text-gray-400">
                                        💰 ₹{Math.round((career.salary?.min || 0) / 100000)}L – ₹{Math.round((career.salary?.max || 0) / 100000)}L / yr
                                    </p>
                                    {career.growthRate && (
                                        <span className="text-xs font-bold text-green-600">↑ {career.growthRate}% growth</span>
                                    )}
                                </div>
                            </div>);
                        })}
                    </div>
                    {matchedCareers.length === 0 && (
                        <p className="text-center text-gray-400 py-8">
                            {t('insights.noMatches')}
                        </p>
                    )}
                </Section>

                {/* ── 3. SKILLS GAP ANALYSIS ───────────────────────── */}
                <Section
                    title={`🛠️ ${t('insights.skillsGapTitle')}`}
                    subtitle={t('insights.skillsGapSubtitle')}
                >
                    <div className="flex flex-wrap gap-3">
                        {skillsGap.map(({ skill, count, have }) => (
                            <div key={skill}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${have
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                <span>{have ? '✅' : '✨'}</span>
                                <span>{skill}</span>
                                <span className={`text-xs rounded-full px-1.5 ${have ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                                    {count} career{count > 1 ? 's' : ''}
                                </span>
                            </div>
                        ))}
                        {skillsGap.length === 0 && (
                            <p className="text-gray-400 text-sm">Add interests in your profile to see skill gap analysis.</p>
                        )}
                    </div>
                    {skillsGap.some(s => !s.have) && (
                        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-600">
                            💡 {t('insights.skillsNote')}
                        </div>
                    )}
                </Section>

                {/* ── 4. JOB DEMAND (YOUR MATCHED CAREERS) ─────────── */}
                {demandData.length > 0 && (
                    <Section
                        title={`📈 ${t('insights.demandTitle')}`}
                        subtitle={t('insights.demandSubtitle')}
                    >
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={demandData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
                                <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    label={{ value: t('insights.openings'), angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8', dx: -5 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="openings" name={t('insights.openings')} radius={[6, 6, 0, 0]}>
                                    {demandData.map((entry, idx) => (
                                        <Cell key={idx} fill={CATEGORY_COLORS[entry.category] || COLORS[idx % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-gray-400 mt-2 text-center">* Data sourced from NASSCOM, NAUKRI, LinkedIn India reports (2024)</p>
                    </Section>
                )}

                {/* ── 5. SALARY COMPARISON (YOUR MATCHED CAREERS) ─── */}
                {salaryData.length > 0 && (
                    <Section
                        title={`💰 ${t('insights.salaryTitle')}`}
                        subtitle={t('insights.salarySubtitle')}
                    >
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salaryData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
                                <YAxis tickFormatter={v => `₹${v}L`} tick={{ fontSize: 11, fill: '#64748b' }}
                                    label={{ value: '₹ Lakhs/yr', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8', dx: -5 }} />
                                <Tooltip content={<CustomTooltip />} formatter={(v: any) => `₹${v}L / yr`} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="Min" name={t('insights.minSalary')} fill="#00D4FF" opacity={0.75} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Max" name={t('insights.maxSalary')} fill="#635BFF" opacity={0.85} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Section>
                )}
                {/* ── 6. LIVE MARKET TRENDS (Real jobs from Remotive) ── */}
                <Section
                    title={`🌐 ${t('insights.liveTrendsTitle')}`}
                    subtitle={t('insights.liveTrendsSubtitle')}
                >
                    {jobsLoading ? (
                        <div className="flex items-center justify-center py-10 gap-3">
                            <div className="spinner" />
                            <p className="text-gray-400 text-sm">Fetching live job listings…</p>
                        </div>
                    ) : jobTrends ? (
                        <div className="space-y-8">
                            {/* Skill demand bar chart */}
                            <div>
                                <h3 className="font-bold text-[#0A2540] text-sm mb-4">🔥 {t('insights.liveSkillsTitle')}</h3>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={jobTrends.skills.slice(0, 12)} layout="vertical" margin={{ left: 80, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                                        <YAxis type="category" dataKey="skill" tick={{ fontSize: 11, fill: '#0A2540', fontWeight: 600 }} width={80} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" name="Job listings" radius={[0, 6, 6, 0]}>
                                            {jobTrends.skills.slice(0, 12).map((_: any, idx: number) => (
                                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Sector distribution */}
                            <div>
                                <h3 className="font-bold text-[#0A2540] text-sm mb-3">🏢 {t('insights.liveSectorsTitle')}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {jobTrends.sectors.map((s: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white"
                                            style={{ background: COLORS[i % COLORS.length] }}>
                                            <span>{s.sector}</span>
                                            <span className="bg-white/25 rounded-full px-2 py-0.5 text-xs font-bold">{s.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top live job listings */}
                            {jobTrends.topJobs?.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-[#0A2540] text-sm mb-3">📋 {t('insights.liveJobsTitle')}</h3>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {jobTrends.topJobs.slice(0, 6).map((job: any, i: number) => (
                                            <a key={i} href={job.url} target="_blank" rel="noopener noreferrer"
                                                className="border border-gray-100 rounded-xl p-3 hover:border-[#00D4FF] hover:shadow-sm transition group">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="font-semibold text-[#0A2540] text-sm leading-snug group-hover:text-[#635BFF] transition">{job.title}</p>
                                                    <span className="text-[10px] bg-[#00D4FF]/10 text-[#0A5080] px-2 py-0.5 rounded shrink-0 font-medium">{job.source}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{job.company} · {job.location}</p>
                                                {job.salary && <p className="text-xs text-green-600 font-semibold mt-1">{job.salary}</p>}
                                            </a>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3 text-center">
                                        Live listings from Remotive · Click any card to view full job
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-400 text-sm">{t('insights.unavailable')}</p>
                        </div>
                    )}
                </Section>

                {/* ── 7. ADZUNA MARKET INTELLIGENCE (4 charts) ── */}
                <Section
                    title={`📊 ${t('insights.marketIntelTitle')}`}
                    subtitle={t('insights.marketIntelSubtitle')}
                >
                    {/* Career selector pills */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <span className="text-sm font-semibold text-gray-500">{t('insights.showingDataFor')}:</span>
                        <div className="flex flex-wrap gap-2">
                            {(matchedCareers.length > 0 ? matchedCareers : allCareers.slice(0, 5)).map((c: any) => (
                                <button
                                    key={c.title}
                                    onClick={() => setSelectedCareer(c.title)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${selectedCareer === c.title
                                        ? 'bg-[#0A2540] text-white border-[#0A2540]'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#00D4FF]'
                                        }`}
                                >
                                    {c.title}
                                </button>
                            ))}
                        </div>
                        {marketData?.cached && (
                            <span className="text-[10px] text-gray-400 ml-auto">Cached · refreshes in 6h</span>
                        )}
                    </div>

                    {marketLoading ? (
                        <div className="flex items-center justify-center py-12 gap-3">
                            <div className="spinner" />
                            <p className="text-gray-400 text-sm">Fetching Adzuna market data for “{selectedCareer}”…</p>
                        </div>
                    ) : !marketData ? (
                        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔑</div>
                            <h4 className="text-lg font-bold text-[#0A2540] mb-2">{t('insights.marketIntelTitle')} — Simulation Mode</h4>
                            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                                Live Adzuna integration requires API credentials. To unlock real-time demand charts, salary distribution, and hiring trends for <span className="font-bold text-[#635BFF]">{selectedCareer}</span>, please configure your keys.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-xs font-mono text-gray-400">ADZUNA_APP_ID missing</span>
                                </div>
                                <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-xs font-mono text-gray-400">ADZUNA_APP_KEY missing</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-10">

                            {/* Chart 1: Historical Demand Trend (Line chart) */}
                            {marketData.history?.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-[#0A2540] text-sm mb-1">📈 {t('insights.demandTrendTitle')}</h3>
                                    <p className="text-xs text-gray-400 mb-4">{t('insights.demandTrendSubtitle', { career: selectedCareer })}</p>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <LineChart data={marketData.history} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="count" name="Job postings" stroke="#635BFF" strokeWidth={2.5} dot={{ r: 3, fill: '#635BFF' }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Chart 2: Salary Histogram (Bar chart) */}
                            {marketData.histogram?.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-[#0A2540] text-sm mb-1">💰 {t('insights.salaryDistTitle')}</h3>
                                    <p className="text-xs text-gray-400 mb-4">{t('insights.salaryDistSubtitle')}</p>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={marketData.histogram} margin={{ left: 10, right: 20, bottom: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748b' }} angle={-30} textAnchor="end" interval={0} />
                                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="count" name="Job listings" radius={[4, 4, 0, 0]}>
                                                {marketData.histogram.map((_: any, i: number) => (
                                                    <Cell key={i} fill={`hsl(${220 + i * 12}, 75%, ${55 + i * 2}%)`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Chart 3: Regional / Top Cities (Horizontal bar) */}
                            {marketData.regional?.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-[#0A2540] text-sm mb-1">🇳🇮 {t('insights.topCitiesTitle')}</h3>
                                    <p className="text-xs text-gray-400 mb-4">{t('insights.topCitiesSubtitle', { career: selectedCareer })}</p>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={marketData.regional} layout="vertical" margin={{ left: 100, right: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <YAxis type="category" dataKey="city" tick={{ fontSize: 11, fill: '#0A2540', fontWeight: 600 }} width={100} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="count" name="Job postings" radius={[0, 6, 6, 0]}>
                                                {marketData.regional.map((_: any, i: number) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Chart 4: Top Companies (Grid of company pills) */}
                            {marketData.topCompanies?.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-[#0A2540] text-sm mb-1">🏢 {t('insights.topCompaniesTitle')}</h3>
                                    <p className="text-xs text-gray-400 mb-4">{t('insights.topCompaniesSubtitle', { career: selectedCareer })}</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {marketData.topCompanies.map((co: any, i: number) => (
                                            <div key={i}
                                                className="flex flex-col items-center text-center p-3 rounded-xl border border-gray-100 hover:border-[#635BFF] hover:shadow-sm transition"
                                                style={{ borderLeftColor: COLORS[i % COLORS.length], borderLeftWidth: 3 }}
                                            >
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2"
                                                    style={{ background: COLORS[i % COLORS.length] }}>
                                                    {co.name?.charAt(0) || '?'}
                                                </div>
                                                <p className="text-xs font-bold text-[#0A2540] leading-tight">{co.name}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{co.count} postings</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </Section>

            </main>
        </div>
    );
}
