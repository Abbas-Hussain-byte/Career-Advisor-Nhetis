import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [showAssessment, setShowAssessment] = useState(false);

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



    // ── Personalise: matched careers for this student ─────────────────
    // Priority: saved assessment results > assessment categories > stream/interest filtered careers
    const matchedCareers: any[] = React.useMemo(() => {
        if (hasAssessment && allCareers.length > 0) {
            // PRIORITY 1: Map saved results to full career objects (with all fields)
            const resultTitles = (assessment.results || []).map((r: any) => r.careerTitle);
            const matched = resultTitles
                .map((t: string) => allCareers.find(c => c.title === t))
                .filter(Boolean);
            if (matched.length >= 2) return matched;

            // PRIORITY 2: Use assessment categories to find careers from the same fields
            // This is the key fix: when title match fails, use category data from assessment
            const assessmentCategories = new Set<string>(
                (assessment.results || []).map((r: any) => r.category).filter(Boolean)
            );
            if (assessmentCategories.size > 0) {
                const categoryMatched = allCareers.filter(c => assessmentCategories.has(c.category));
                // Merge any title-matched ones at the front
                const combined = [
                    ...matched,
                    ...categoryMatched.filter(c => !matched.find((m: any) => m._id === c._id)),
                ];
                return combined.slice(0, 6);
            }

            // If we got at least 1 title match, pad with category matches
            if (matched.length > 0) return matched.slice(0, 6);
        }

        // PRIORITY 3 (LAST RESORT): No assessment at all — filter by stream + interests
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

        // Build "have" set from BOTH profile interests AND assessment skill ratings
        const userSkills = new Set(
            (profile.interests || []).map((i: string) => i.toLowerCase())
        );

        // Add skills the user rated ≥3 (Proficient/Expert) in the assessment
        const skillRatings = assessment?.vector?._skillRatings;
        if (skillRatings) {
            const SKILL_LABELS: Record<string, string[]> = {
                math: ['math', 'mathematics', 'logic', 'statistics'],
                coding: ['programming', 'coding', 'python', 'java', 'javascript'],
                science: ['physics', 'chemistry', 'science'],
                biology: ['biology', 'life sciences'],
                design: ['drawing', 'design', 'creativity', 'adobe photoshop', 'illustrator', 'figma'],
                writing: ['writing', 'communication', 'content'],
                leadership: ['leadership', 'team management', 'team work'],
                problemSolve: ['problem solving', 'algorithms', 'critical thinking'],
                empathy: ['empathy', 'counselling', 'patient care'],
                business: ['business', 'finance', 'financial modeling', 'accounting'],
                research: ['research', 'analysis', 'data handling'],
                speaking: ['public speaking', 'communication', 'argumentation'],
                languages: ['languages', 'literature'],
                mechanical: ['mechanics', 'electronics', 'electrical basics', 'cad/cam'],
                sports: ['sports', 'physical training', 'fitness'],
            };
            Object.entries(skillRatings).forEach(([skillId, rating]) => {
                if ((rating as number) >= 3) {
                    const labels = SKILL_LABELS[skillId] || [skillId];
                    labels.forEach(l => userSkills.add(l.toLowerCase()));
                }
            });
        }

        return Array.from(needed.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([skill, count]) => ({
                skill,
                count,
                have: userSkills.has(skill.toLowerCase()),
            }));
    }, [matchedCareers, profile.interests, assessment]);

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

    // ── Export & Share handlers ─────────────────────────────────────
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#F6F9FC' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.setFontSize(16);
            pdf.setTextColor(10, 37, 64);
            pdf.text(`NHETIS Career Report - ${user?.name || 'Student'}`, 14, 14);
            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Generated ${new Date().toLocaleDateString('en-IN')}`, 14, 21);
            pdf.addImage(imgData, 'PNG', 0, 26, pdfWidth, pdfHeight);
            pdf.save(`NHETIS_Report_${user?.name?.replace(/\s+/g, '_') || 'Student'}.pdf`);
        } catch (err) {
            console.error('PDF export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleWhatsAppShare = () => {
        // Pull scored results directly from assessment (where scores actually live)
        const results = assessment?.results || [];
        const top3 = results.slice(0, 3);

        // Build a rich, informative share message
        const careerLines = top3.length > 0
            ? top3.map((r: any) => `  - ${r.careerTitle} (${r.score}% match)`).join('\n')
            : matchedCareers.slice(0, 3).map((c: any) => `  - ${c.title}`).join('\n');

        const skillsNeeded = matchedCareers.slice(0, 2)
            .flatMap((c: any) => (c.skills || []).slice(0, 2))
            .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i)
            .slice(0, 4)
            .join(', ');

        const text = [
            `*NHETIS Career Assessment Result*`,
            `Student: ${user?.name || 'Student'} | Stream: ${profile.stream || 'General'}`,
            ``,
            `Top Career Matches:`,
            careerLines,
            ``,
            skillsNeeded ? `Key Skills to Build: ${skillsNeeded}` : '',
            ``,
            `Discover your career path with NHETIS - India's AI Career Advisor for students.`,
            `Take the free assessment at https://career-advisor-nhetis.vercel.app`,
        ].filter(Boolean).join('\n');

        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

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
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-[#0A2540]">
                            {t('insights.title').split('Insights')[0]} <span className="text-[#00D4FF]">{t('insights.title').includes('Insights') ? 'Insights' : ''}</span>
                        </h1>
                        <p className="text-gray-500 mt-2 max-w-xl">
                            {t('insights.personalizedFor', { name: user?.name || '' })}
                            {profile.stream ? ` · ${profile.stream}` : ''}
                            {profile.grade ? ` · Grade ${profile.grade}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-2 bg-[#0A2540] text-white px-4 py-2.5 rounded-xl font-bold shadow hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
                        >
                            🧠 {t('insights.retakeQuiz')}
                        </Link>
                        <button
                            onClick={handleWhatsAppShare}
                            title="Share your results on WhatsApp"
                            className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-bold shadow hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            Share
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            title="Download your career report as PDF"
                            className="flex items-center gap-2 bg-white border-2 border-gray-200 text-[#0A2540] px-4 py-2.5 rounded-xl font-bold shadow hover:border-[#635BFF] hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting
                                ? <div className="w-4 h-4 border-2 border-gray-300 border-t-[#635BFF] rounded-full animate-spin" />
                                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            }
                            {isExporting ? 'Exporting…' : 'Download PDF'}
                        </button>
                    </div>
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

                {/* ── 1. YOUR APTITUDE PROFILE (RADAR) ─────────────── */}
                <div ref={reportRef}>
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
                                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📊</div>
                                <h4 className="text-lg font-bold text-[#0A2540] mb-2">{t('insights.marketIntelTitle')} — {t('insights.noDataAvailable')}</h4>
                                <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                                    {t('insights.noMarketDataDesc', { career: selectedCareer })}
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-xs text-gray-500">{t('insights.tryDifferentCareer')}</span>
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
                                        <h3 className="font-bold text-[#0A2540] text-sm mb-1">🇮🇳 {t('insights.topCitiesTitle')}</h3>
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
                </div>{/* end reportRef */}

            </main>
        </div>
    );
}
