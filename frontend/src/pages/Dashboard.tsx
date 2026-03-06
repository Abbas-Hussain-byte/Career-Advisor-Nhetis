import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';
import Quiz from '../components/Quiz';
import CollegeMap from '../components/CollegeMap';

const Navbar = ({ user, logoutUser }: any) => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        logoutUser();
        navigate('/');
    };

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
                    <Link to="/profile" className="hover:text-[#00D4FF] transition font-medium">Profile</Link>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden md:block text-sm text-gray-300">{user?.name}</span>
                    <button
                        onClick={handleLogout}
                        className="bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-white/20 transition"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default function Dashboard() {
    const { user, logoutUser } = useAuth();
    const [view, setView] = useState<'home' | 'quiz' | 'results'>('home');
    const [recommendations, setRecommendations] = useState<any>(null);
    const [loadingResults, setLoadingResults] = useState(false);
    const [error, setError] = useState('');

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
            });
            setRecommendations(data);
            setView('results');
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
                        Welcome back, <span className="text-[#00D4FF]">{user?.name?.split(' ')[0]}</span>! 👋
                    </h2>
                    <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto">
                        Your personalized career guidance awaits. Take the quiz to get recommendations.
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
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">Discover Your Path</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        Take our AI-powered aptitude test to find the best career streams and colleges for you.
                    </p>
                    <button
                        onClick={() => setView('quiz')}
                        className="w-full bg-[#0A2540] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1a3d66] transition"
                    >
                        Start Assessment →
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
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">Career Explorer</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        Browse all 10+ career paths with roadmaps, skills, and salary data.
                    </p>
                    <Link
                        to="/careers"
                        className="block w-full bg-[#635BFF] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#564fe5] transition text-center"
                    >
                        Explore Careers →
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
                    <h3 className="text-xl font-bold text-[#0A2540] mb-2">Find Colleges</h3>
                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                        Locate government colleges near you on an interactive map.
                    </p>
                    <Link
                        to="/colleges"
                        className="block w-full bg-[#00D4FF] text-[#0A2540] py-3 rounded-xl font-bold text-sm hover:brightness-110 transition text-center"
                    >
                        Open College Map →
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
                        <h3 className="text-lg font-bold text-[#0A2540]">Your Profile</h3>
                        <Link to="/profile" className="text-sm text-[#635BFF] font-semibold hover:underline">Edit →</Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 text-xs">Grade</p>
                            <p className="font-bold text-[#0A2540]">Class {user.profile.grade || 'Not set'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Stream</p>
                            <p className="font-bold text-[#0A2540]">{user.profile.stream || 'Not set'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Phone</p>
                            <p className="font-bold text-[#0A2540]">{user.phone}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs">Role</p>
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

        </div>
    );

    const renderResults = () => (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#0A2540]">Your Recommendations</h2>
                    <p className="text-gray-500 text-sm mt-1">Based on your aptitude profile</p>
                </div>
                <button
                    onClick={() => setView('home')}
                    className="border-2 border-[#0A2540] text-[#0A2540] px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#0A2540] hover:text-white transition"
                >
                    ← New Assessment
                </button>
            </div>

            {/* Career Cards */}
            <div>
                <h3 className="text-lg font-bold text-[#0A2540] mb-4">🚀 Top Career Matches</h3>
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
                                    ₹{(career.salary?.min / 100000).toFixed(1)}L – ₹{(career.salary?.max / 100000).toFixed(1)}L /yr
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* College Map */}
            {recommendations?.nearbyColleges?.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-[#0A2540] mb-4">🗺️ Nearby Government Colleges</h3>
                    <CollegeMap colleges={recommendations.nearbyColleges} />
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                        {recommendations.nearbyColleges.slice(0, 6).map((c: any, i: number) => (
                            <div key={i} className="glass rounded-xl p-4 text-sm">
                                <p className="font-bold text-[#0A2540]">{c.name}</p>
                                <p className="text-gray-500 text-xs mt-1">{c.state} · {c.type}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {c.programs?.slice(0, 2).map((p: string) => (
                                        <span key={p} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            <Navbar user={user} logoutUser={logoutUser} />

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
                                    ← Cancel Assessment
                                </button>
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-extrabold text-[#0A2540]">Aptitude Assessment</h2>
                                    <p className="text-gray-500 mt-2">Answer honestly — there are no right or wrong answers</p>
                                </div>
                                {loadingResults ? (
                                    <div className="text-center py-20">
                                        <div className="spinner mx-auto mb-4"></div>
                                        <p className="text-gray-600 font-medium">Analyzing your responses...</p>
                                        <p className="text-gray-400 text-sm mt-1">Finding the best careers & colleges for you</p>
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
