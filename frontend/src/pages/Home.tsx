import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const features = [
    {
        icon: '🧠',
        title: 'AI Aptitude Assessment',
        desc: 'Take our 5-question psychometric quiz to discover your strengths across logic, creativity, technical, and social dimensions.',
    },
    {
        icon: '🗺️',
        title: 'College Locator Map',
        desc: 'Find government colleges near you on an interactive map. Filter by state, program, and facilities.',
    },
    {
        icon: '🚀',
        title: 'Career Path Explorer',
        desc: 'Explore 10+ career paths with step-by-step roadmaps, salary ranges, and required skills.',
    },
    {
        icon: '📶',
        title: 'Works Offline',
        desc: 'Take quizzes and browse career paths even without internet. Your responses sync when you reconnect.',
    },
];

const stats = [
    { value: '10+', label: 'Career Paths' },
    { value: '8+', label: 'Gov. Colleges' },
    { value: '5', label: 'Quiz Questions' },
    { value: '100%', label: 'Free to Use' },
];

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
};

export default function Home() {
    return (
        <div className="min-h-screen bg-[#F6F9FC] font-sans">
            {/* Navbar */}
            <nav className="bg-[#0A2540] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-2xl font-extrabold tracking-tight">
                        <span className="text-[#00D4FF]">N</span>HETIS
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm text-gray-300 hover:text-white transition">
                            Login
                        </Link>
                        <Link
                            to="/register"
                            className="bg-[#00D4FF] text-[#0A2540] px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="animated-bg text-white py-24 px-6 text-center overflow-hidden relative">
                <div className="absolute inset-0 opacity-10">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-white"
                            style={{
                                width: Math.random() * 6 + 2 + 'px',
                                height: Math.random() * 6 + 2 + 'px',
                                top: Math.random() * 100 + '%',
                                left: Math.random() * 100 + '%',
                                animation: `spin ${Math.random() * 10 + 8}s linear infinite`,
                            }}
                        />
                    ))}
                </div>
                <div className="max-w-4xl mx-auto relative">
                    <motion.div {...fadeUp} transition={{ duration: 0.6 }}>
                        <span className="inline-block bg-[#00D4FF]/20 border border-[#00D4FF]/40 text-[#00D4FF] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                            🎓 Free Career Guidance for Indian Students
                        </span>
                        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
                            Discover Your <br />
                            <span className="text-[#00D4FF]">Perfect Career</span> Path
                        </h1>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
                            Take a free aptitude assessment and get personalized career recommendations, nearby government college matches, and step-by-step roadmaps — all designed for Class 10 & 12 students.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/register"
                                className="bg-[#00D4FF] text-[#0A2540] px-8 py-4 rounded-xl text-lg font-bold hover:brightness-110 transition transform hover:scale-105 shadow-xl shadow-[#00D4FF]/20"
                            >
                                Start Free Assessment →
                            </Link>
                            <Link
                                to="/login"
                                className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition"
                            >
                                Already have account
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Stats */}
            <section className="bg-white py-12 px-6 shadow-sm">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((s, i) => (
                        <motion.div
                            key={i}
                            {...fadeUp}
                            transition={{ duration: 0.4, delay: i * 0.1 }}
                            className="text-center"
                        >
                            <div className="text-4xl font-extrabold text-[#0A2540]">{s.value}</div>
                            <div className="text-gray-500 text-sm mt-1">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-extrabold text-[#0A2540]">Everything You Need</h2>
                        <p className="text-gray-500 mt-3 text-lg">
                            One platform for career discovery, college search, and guidance
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                {...fadeUp}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="glass rounded-2xl p-6 card-hover text-center"
                            >
                                <div className="text-5xl mb-4">{f.icon}</div>
                                <h3 className="text-lg font-bold text-[#0A2540] mb-2">{f.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="bg-[#0A2540] text-white py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-extrabold text-center mb-14">
                        How It <span className="text-[#00D4FF]">Works</span>
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: '01', title: 'Register Free', desc: 'Create your account using your phone number — no email required.' },
                            { step: '02', title: 'Take the Assessment', desc: 'Answer 5 quick questions about your interests, strengths, and goals.' },
                            { step: '03', title: 'Get Recommendations', desc: 'Receive personalized career paths, nearby colleges, and roadmaps instantly.' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                {...fadeUp}
                                transition={{ delay: i * 0.15 }}
                                className="text-center"
                            >
                                <div className="text-6xl font-extrabold text-[#00D4FF]/30 mb-2">{item.step}</div>
                                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 text-center">
                <motion.div {...fadeUp} transition={{ duration: 0.6 }}>
                    <h2 className="text-4xl font-extrabold text-[#0A2540] mb-4">
                        Ready to Shape Your Future?
                    </h2>
                    <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
                        Join thousands of students using NHETIS to make informed career decisions.
                    </p>
                    <Link
                        to="/register"
                        className="inline-block bg-[#0A2540] text-white px-10 py-4 rounded-xl text-lg font-bold hover:bg-[#1a3d66] transition transform hover:scale-105 shadow-xl"
                    >
                        Get Started — It's Free 🎓
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="bg-[#0A2540] text-gray-400 py-8 px-6 text-center text-sm">
                <p className="font-bold text-white text-lg mb-2">
                    <span className="text-[#00D4FF]">N</span>HETIS Career Advisor
                </p>
                <p>Empowering Indian students to discover their ideal career path</p>
                <p className="mt-2 text-xs text-gray-600">© 2026 NHETIS • Free Career Guidance</p>
            </footer>
        </div>
    );
}
