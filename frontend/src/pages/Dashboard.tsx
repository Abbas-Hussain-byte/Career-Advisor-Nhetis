import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';
import Quiz from '../components/Quiz';
import CollegeMap from '../components/CollegeMap';
import SharedNavbar from '../components/SharedNavbar';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
    const { t } = useLanguage();
    const { user, logoutUser, refreshUser } = useAuth();
    const [view, setView] = useState<'home' | 'quiz' | 'results'>('home');
    const [recommendations, setRecommendations] = useState<any>(null);
    const [streamRec, setStreamRec] = useState<any>(null);
    const [loadingResults, setLoadingResults] = useState(false);
    const [error, setError] = useState('');
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

    // Fetch upcoming timeline events on mount
    useEffect(() => {
        API.get('/timeline/upcoming')
            .then(res => setUpcomingEvents(res.data?.slice(0, 5) || []))
            .catch(() => {});
    }, []);

    const handleQuizComplete = async (scores: any) => {
        setLoadingResults(true);
        setError('');
        try {
            const locationData = { lat: 17.3850, lng: 78.4867 }; // Default Hyderabad; can be overridden by geolocation
            if (navigator.geolocation) {
                await new Promise<void>((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            locationData.lat = pos.coords.latitude;
                            locationData.lng = pos.coords.longitude;
                            resolve();
                        },
                        () => resolve(), // fail silently
                        { timeout: 3000 }
                    );
                });
            }

            const { data } = await API.post('/careers/recommend', {
                quizScores: scores,
                interests: user?.profile?.interests || [],
                stream: user?.profile?.stream || '',
                academicScore: user?.profile?.academicScore || null,
                location: locationData,
                careerCategoryScores: scores._careerCategoryScores || {},
                longTermGoal: user?.profile?.longTermGoal || '',
                aspirationTrack: user?.profile?.aspirationTrack || 'Undecided',
                coreValues: user?.profile?.coreValues || [],
                constraints: user?.profile?.constraints || {},
            });
            setRecommendations(data);
            setView('results');

            // Also get stream recommendation (critical for Class 10 students)
            let streamRecommendations: any[] = [];
            try {
                const { data: streamData } = await API.post('/careers/recommend-stream', {
                    careerCategoryScores: scores._careerCategoryScores || {},
                    quizScores: scores,
                    interests: user?.profile?.interests || [],
                    grade: user?.profile?.grade || '12',
                });
                setStreamRec(streamData);
                streamRecommendations = streamData?.recommendations?.slice(0, 3) || [];
            } catch {
                // Stream recommendation is supplementary; don't break the flow
            }

            // Persist assessment to MongoDB so Insights + other pages can use it
            try {
                await API.put('/users/assessment', {
                    vector: data.userVector || scores,
                    results: (data.recommendedCareers || []).slice(0, 5).map((c: any) => ({
                        careerTitle: c.title,
                        score: c.score,
                        category: c.category,
                        skills: c.skills || [],
                    })),
                    recommendedStreams: streamRecommendations.map((s: any) => ({
                        stream: s.stream,
                        confidence: s.confidence,
                        reasoning: s.reasoning,
                    })),
                    studentSignals: {
                        longTermGoal: user?.profile?.longTermGoal || '',
                        aspirationTrack: user?.profile?.aspirationTrack || 'Undecided',
                        coreValues: user?.profile?.coreValues || [],
                        constraints: user?.profile?.constraints || {},
                    },
                });
                await refreshUser(); // Update AuthContext so Insights sees new assessment immediately
            } catch {
                // Non-critical: assessment save failure doesn't break the quiz flow
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to get recommendations. Please try again.');
            setView('home');
        } finally {
            setLoadingResults(false);
        }
    };

    const renderHome = () => (
        <div>
            <div className="text-center py-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-5xl font-extrabold text-[#0A2540] leading-tight">
                        {t('dashboard.welcome')} <span className="text-[#00D4FF]">{user?.name?.split(' ')[0]}</span>! 👋
                    </h2>
                    <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto">
                        {t('dashboard.subtitle')}
                    </p>
                </motion.div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6 max-w-2xl mx-auto">
                    {error}
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {/* Start Quiz */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-2xl p-8 card-hover text-center col-span-1 md:col-span-2 lg:col-span-1"
                >
                    <div className="text-5xl mb-4">🧠</div>
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">{t('dashboard.discoverPath')}</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        {t('dashboard.discoverDesc')}
                    </p>
                    <button
                        onClick={() => setView('quiz')}
                        className="w-full bg-[#0A2540] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1a3d66] transition"
                    >
                        {t('dashboard.startQuiz')}
                    </button>
                </motion.div>

                {/* Explore Careers */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-2xl p-8 card-hover text-center"
                >
                    <div className="text-5xl mb-4">🚀</div>
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">{t('dashboard.careerExplorer')}</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        {t('dashboard.careerDesc')}
                    </p>
                    <Link
                        to="/careers"
                        className="block w-full bg-[#635BFF] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#564fe5] transition text-center"
                    >
                        {t('dashboard.exploreCareers')}
                    </Link>
                </motion.div>

                {/* College Map */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass rounded-2xl p-8 card-hover text-center"
                >
                    <div className="text-5xl mb-4">🗺️</div>
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">{t('dashboard.findColleges')}</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        {t('dashboard.collegeDesc')}
                    </p>
                    <Link
                        to="/colleges"
                        className="block w-full bg-[#00D4FF] text-[#0A2540] py-3 rounded-xl font-bold text-sm hover:brightness-110 transition text-center"
                    >
                        {t('dashboard.openMap')}
                    </Link>
                </motion.div>

                {/* Scholarships */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass rounded-2xl p-8 card-hover text-center"
                >
                    <div className="text-5xl mb-4">🎓</div>
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">{t('dashboard.scholarships')}</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        {t('dashboard.scholarshipDesc')}
                    </p>
                    <Link
                        to="/scholarships"
                        className="block w-full bg-[#635BFF] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#564fe5] transition text-center"
                    >
                        {t('dashboard.findScholarships')}
                    </Link>
                </motion.div>

                {/* Resources */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass rounded-2xl p-8 card-hover text-center"
                >
                    <div className="text-5xl mb-4">📖</div>
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">{t('dashboard.resources')}</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        {t('dashboard.resourceDesc')}
                    </p>
                    <Link
                        to="/resources"
                        className="block w-full bg-[#0A2540] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1a3d66] transition text-center"
                    >
                        {t('dashboard.exploreResources')}
                    </Link>
                </motion.div>
            </div>

            {/* Profile quick info */}
            {user?.profile && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8 glass rounded-2xl p-6"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-[#0A2540]">{t('dashboard.yourProfile')}</h3>
                        <Link to="/profile" className="text-sm text-[#635BFF] font-semibold hover:underline">{t('dashboard.edit')}</Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 text-xs">{t('dashboard.grade')}</p>
                            <p className="font-bold text-[#0A2540]">{t('dashboard.class')} {user.profile.grade || t('dashboard.notSet')}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">{t('dashboard.stream')}</p>
                            <p className="font-bold text-[#0A2540]">{user.profile.stream || t('dashboard.notSet')}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">{t('dashboard.phone')}</p>
                            <p className="font-bold text-[#0A2540]">{user.phone}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">{t('dashboard.role')}</p>
                            <p className="font-bold text-[#0A2540] capitalize">{user.role}</p>
                        </div>
                    </div>
                    {user.profile.interests?.length > 0 && (
                        <div className="mt-4">
                            <p className="text-gray-500 text-xs mb-2">Interests</p>
                            <div className="flex flex-wrap gap-2">
                                {user.profile.interests.map((i: string) => (
                                    <span key={i} className="bg-[#0A2540]/10 text-[#0A2540] text-xs px-3 py-1 rounded-full font-medium">
                                        {i}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
                )}

            {/* Upcoming Deadlines */}
            {upcomingEvents.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 glass rounded-2xl p-6"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-[#0A2540]">📅 Upcoming Deadlines</h3>
                        <span className="text-xs text-gray-400">Next 60 days</span>
                    </div>
                    <div className="space-y-3">
                        {upcomingEvents.map((evt: any, i: number) => {
                            const typeIcons: Record<string, string> = { exam: '📝', admission: '🏫', scholarship: '🎓', counseling: '📋', result: '📊' };
                            return (
                                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${evt.important ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                                    <span className="text-xl">{typeIcons[evt.type] || '📌'}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm font-bold ${evt.important ? 'text-red-700' : 'text-[#0A2540]'}`}>{evt.title}</p>
                                            {evt.important && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">IMPORTANT</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{evt.date}{evt.endDate ? ` — ${evt.endDate}` : ''}</p>
                                        {evt.source && <span className="text-[10px] text-gray-400 mt-1 inline-block">Source: {evt.source}</span>}
                                    </div>
                                    {evt.url && (
                                        <a href={evt.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#635BFF] font-semibold hover:underline shrink-0">Details →</a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

        </div>
    );

    const renderResults = () => (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#0A2540]">{t('dashboard.resultsTitle')}</h2>
                    <p className="text-gray-500 text-sm mt-1">{t('dashboard.resultsSubtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/insights"
                        className="bg-gradient-to-r from-[#635BFF] to-[#00D4FF] text-white px-5 py-2 rounded-xl text-sm font-bold hover:shadow-lg transition"
                    >
                        🔍 {t('dashboard.viewInsights')}
                    </Link>
                    <button
                        onClick={() => setView('home')}
                        className="border-2 border-[#0A2540] text-[#0A2540] px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#0A2540] hover:text-white transition"
                    >
                        {t('dashboard.newAssessment')}
                    </button>
                </div>
            </div>

            {/* ══════ STREAM RECOMMENDATION (Most prominent for Class 10) ══════ */}
            {streamRec && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-6 border-l-4 border-l-[#635BFF]"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">🎯</span>
                        <div>
                            <h3 className="text-xl font-extrabold text-[#0A2540]">
                                {streamRec.isClass10 ? 'Your Recommended Stream' : 'Stream Compatibility'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {streamRec.isClass10
                                    ? 'Based on your aptitude, here\'s which stream you should choose after Class 10'
                                    : 'How well your current stream matches your aptitude'}
                            </p>
                        </div>
                    </div>

                    {/* Class 12 compatibility message */}
                    {streamRec.compatibility && (
                        <div className={`rounded-xl px-4 py-3 text-sm mb-4 ${
                            streamRec.compatibility.isOptimal
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : 'bg-amber-50 border border-amber-200 text-amber-700'
                        }`}>
                            <p className="font-semibold">
                                {streamRec.compatibility.isOptimal ? '✅' : '💡'} {streamRec.compatibility.message}
                            </p>
                        </div>
                    )}

                    {/* Stream recommendation cards */}
                    <div className={`grid gap-4 ${streamRec.isClass10 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                        {(streamRec.recommendations || []).slice(0, streamRec.isClass10 ? 7 : 7).map((rec: any, idx: number) => {
                            const isTop = idx === 0;
                            const isRecommended = idx < 3 && streamRec.isClass10;
                            const STREAM_COLORS: Record<string, string> = {
                                'Science-PCM': '#3b82f6',
                                'Science-PCB': '#10b981',
                                'Commerce': '#8b5cf6',
                                'Arts / Humanities': '#f59e0b',
                                'Diploma / Polytechnic': '#f97316',
                                'ITI / Skill Training': '#ef4444',
                                'Paramedical / Nursing Diploma': '#06b6d4',
                            };
                            const color = STREAM_COLORS[rec.stream] || '#635BFF';
                            return (
                                <motion.div
                                    key={rec.stream}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`rounded-xl p-4 border-2 transition ${
                                        isTop && streamRec.isClass10
                                            ? 'border-[#635BFF] bg-gradient-to-br from-[#0A2540] to-[#1a3d66] text-white shadow-lg'
                                            : isRecommended
                                                ? 'border-[#635BFF]/40 bg-white'
                                                : 'border-gray-200 bg-white opacity-80'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            {isTop && streamRec.isClass10 && (
                                                <span className="text-[10px] bg-[#00D4FF] text-[#0A2540] font-bold px-2 py-0.5 rounded-full mb-1 inline-block">
                                                    ⭐ BEST MATCH
                                                </span>
                                            )}
                                            {!isTop && isRecommended && (
                                                <span className="text-[10px] bg-[#635BFF]/10 text-[#635BFF] font-bold px-2 py-0.5 rounded-full mb-1 inline-block">
                                                    RECOMMENDED
                                                </span>
                                            )}
                                            {!isRecommended && streamRec.isClass10 && (
                                                <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full mb-1 inline-block">
                                                    ALTERNATIVE
                                                </span>
                                            )}
                                            <h4 className={`font-bold text-sm ${isTop && streamRec.isClass10 ? 'text-white' : 'text-[#0A2540]'}`}>
                                                {rec.label || rec.stream}
                                            </h4>
                                        </div>
                                        <span
                                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                                            style={{
                                                background: isTop && streamRec.isClass10 ? '#00D4FF' : `${color}20`,
                                                color: isTop && streamRec.isClass10 ? '#0A2540' : color,
                                            }}
                                        >
                                            {rec.confidence}%
                                        </span>
                                    </div>
                                    {/* Confidence bar */}
                                    <div className={`h-1.5 rounded-full overflow-hidden mb-2 ${isTop && streamRec.isClass10 ? 'bg-white/20' : 'bg-gray-100'}`}>
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${rec.confidence}%`, background: color }}
                                        />
                                    </div>
                                    <p className={`text-xs leading-relaxed mb-2 ${isTop && streamRec.isClass10 ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {rec.reasoning}
                                    </p>

                                    {/* Pathway info */}
                                    {rec.info && (
                                        <div className={`text-[11px] rounded-lg p-2 mt-1 space-y-0.5 ${
                                            isTop && streamRec.isClass10 ? 'bg-white/10 text-gray-200' : 'bg-gray-50 text-gray-600'
                                        }`}>
                                            <p><strong>⏱ Duration:</strong> {rec.info.duration}</p>
                                            <p><strong>📋 After this:</strong> {rec.info.after}</p>
                                            <p><strong>🏫 Where:</strong> {rec.info.institutions}</p>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Career Cards */}
            <div>
                <h3 className="text-lg font-bold text-[#0A2540] mb-4">🚀 {t('dashboard.topCareers')}</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {recommendations?.recommendedCareers?.map((career: any, idx: number) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className="glass rounded-2xl p-6 card-hover border-l-4 border-l-[#00D4FF]"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="text-lg font-bold text-[#0A2540]">{career.title}</h4>
                                <span className="bg-[#00D4FF]/10 text-[#0A2540] text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                                    {career.score}% match
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm mb-4 leading-relaxed">{career.description}</p>
                            {!!career.reasoningTags?.length && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {career.reasoningTags.map((tag: string) => (
                                        <span key={tag} className="bg-[#635BFF]/10 text-[#635BFF] text-[11px] px-2 py-0.5 rounded-full font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1 mb-4">
                                {career.skills?.slice(0, 3).map((s: string) => (
                                    <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                                        {s}
                                    </span>
                                ))}
                            </div>
                            <div className="border-t pt-3">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Salary Range</p>
                                <p className="text-green-600 font-bold text-sm mt-0.5">
                                    ₹{((career.salary?.min || 0) / 100000).toFixed(1)}L – ₹{((career.salary?.max || 0) / 100000).toFixed(1)}L /yr
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* College Map */}
            {recommendations?.nearbyColleges?.length > 0 && (() => {
                // Build the set of relevant programs from recommended career categories
                const CATEGORY_PROGRAMS_MAP: Record<string, string[]> = {
                    'Technology': ['B.Tech', 'BE', 'BCA', 'MCA', 'M.Tech', 'BSc IT', 'Diploma in CS', 'Diploma in ECE', 'B.Sc (Research)'],
                    'Engineering': ['B.Tech', 'BE', 'M.Tech', 'ME', 'Diploma in Mechanical', 'Diploma in Civil', 'BArch'],
                    'Medical': ['MBBS', 'MD', 'MS', 'BDS', 'B.Pharm', 'B.Sc Nursing', 'DM', 'BAMS', 'BHMS'],
                    'Agriculture': ['BSc Agriculture', 'MSc Agriculture', 'B.Tech Food Tech', 'BTech Agri Engineering', 'Veterinary'],
                    'Commerce': ['B.Com', 'BMS', 'BAF', 'MBA', 'M.Com', 'B.A. (H) Economics', 'B.Com (H)', 'B.Com (Banking)'],
                    'Business': ['MBA', 'BBA', 'B.Com', 'M.Com', 'Executive MBA'],
                    'Arts & Design': ['BFA', 'B.Des', 'M.Des', 'MFA', 'BMus', 'BArch', 'Diploma in Design'],
                    'Media': ['BA', 'MA', 'BFA', 'BMus'],
                    'Education': ['BA', 'MA', 'BSc', 'MSc', 'M.Phil', 'PhD'],
                    'Law': ['BA LLB', 'LLB', 'BBA LLB', 'LLM', 'MBA (Law)'],
                };
                const relevantPrograms = new Set<string>();
                (recommendations.recommendedCareers || []).forEach((c: any) => {
                    (CATEGORY_PROGRAMS_MAP[c.category] || []).forEach((p: string) => relevantPrograms.add(p));
                });

                return (
                    <div>
                        <div className="flex items-baseline gap-3 mb-4">
                            <h3 className="text-lg font-bold text-[#0A2540]">🗺️ {t('dashboard.collegesTitle')}</h3>
                            <span className="text-xs text-gray-400">{t('dashboard.collegesSubtitle')}</span>
                        </div>
                        <CollegeMap colleges={recommendations.nearbyColleges} />
                        <div className="grid md:grid-cols-3 gap-4 mt-4">
                            {recommendations.nearbyColleges.slice(0, 6).map((c: any, i: number) => {
                                const matchingPrograms = (c.programs || []).filter((p: string) => relevantPrograms.has(p));
                                const hasMatch = matchingPrograms.length > 0;
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className={`glass rounded-xl p-4 text-sm border-l-4 ${hasMatch ? 'border-l-[#00D4FF]' : 'border-l-gray-200'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-bold text-[#0A2540] leading-tight">{c.name}</p>
                                            {hasMatch && (
                                                <span className="ml-2 shrink-0 text-[10px] bg-[#00D4FF]/15 text-[#0A5080] px-1.5 py-0.5 rounded font-semibold">
                                                    ✓ Matches
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-xs mb-2">{c.state} · {c.type}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {/* Show matching programs first, highlighted */}
                                            {matchingPrograms.slice(0, 2).map((p: string) => (
                                                <span key={p} className="bg-[#00D4FF]/15 text-[#0A5080] text-[10px] px-2 py-0.5 rounded font-medium">{p}</span>
                                            ))}
                                            {/* Then show other programs */}
                                            {(c.programs || []).filter((p: string) => !relevantPrograms.has(p)).slice(0, 1).map((p: string) => (
                                                <span key={p} className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded">{p}</span>
                                            ))}
                                            {(c.programs || []).length > 3 && (
                                                <span className="text-gray-400 text-[10px] px-1 py-0.5">+{(c.programs || []).length - 3} more</span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            <SharedNavbar activePage="dashboard" />

            <main className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">
                    {view === 'home' && (
                        <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {renderHome()}
                        </motion.div>
                    )}

                    {view === 'quiz' && (
                        <motion.div key="quiz" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                            <div className="py-4">
                                <button
                                    onClick={() => setView('home')}
                                    className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
                                >
                                    {t('dashboard.cancelAssessment')}
                                </button>
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-extrabold text-[#0A2540]">{t('dashboard.assessmentTitle')}</h2>
                                    <p className="text-gray-500 mt-2">{t('dashboard.assessmentDesc')}</p>
                                </div>
                                {loadingResults ? (
                                    <div className="text-center py-20">
                                        <div className="spinner mx-auto mb-4"></div>
                                        <p className="text-gray-600 font-medium">{t('dashboard.analyzingResponses')}</p>
                                        <p className="text-gray-400 text-sm mt-1">{t('dashboard.findingBest')}</p>
                                    </div>
                                ) : (
                                    <Quiz onComplete={handleQuizComplete} />
                                )}
                            </div>
                        </motion.div>
                    )}

                    {view === 'results' && (
                        <motion.div key="results" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                            {renderResults()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
