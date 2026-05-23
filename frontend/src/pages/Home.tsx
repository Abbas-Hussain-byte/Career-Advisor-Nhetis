import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
};

export default function Home() {
    const { t, language, setLanguage } = useLanguage();

    const features = [
        {
            icon: '🧠',
            title: t('home.featureAptitude'),
            desc: t('home.featureAptitudeDesc'),
        },
        {
            icon: '🗺️',
            title: t('home.featureCollege'),
            desc: t('home.featureCollegeDesc'),
        },
        {
            icon: '🚀',
            title: t('home.featureCareer'),
            desc: t('home.featureCareerDesc'),
        },
        {
            icon: '📶',
            title: t('home.featureOffline'),
            desc: t('home.featureOfflineDesc'),
        },
    ];

    const stats = [
        { value: '10+', label: t('nav.careers') },
        { value: '8', label: t('nav.colleges') },
        { value: '10', label: t('home.statsQuestions') },
        { value: '100%', label: t('home.statsFree') },
    ];

    return (
        <div className="min-h-screen bg-[#F6F9FC] font-sans">
            <nav className="bg-[#0A2540] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-2xl font-extrabold tracking-tight">
                        <span className="text-[#00D4FF]">N</span>HETIS
                    </Link>
                    <div className="flex items-center gap-4">
                        <LanguageSelector />

                        <Link to="/login" className="text-sm text-gray-300 hover:text-white transition">
                            {t('home.login')}
                        </Link>
                        <Link
                            to="/register"
                            className="bg-[#00D4FF] text-[#0A2540] px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition"
                        >
                            {t('home.getStarted')}
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
                            {t('home.heroTag')}
                        </span>
                        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
                            {language === 'en' ? (
                                <>
                                    Find Your <br />
                                    <span className="text-[#00D4FF]">Perfect Career</span> Path
                                </>
                            ) : (
                                <span className="text-[#00D4FF] leading-[1.2] block py-2">{t('home.heroTitle')}</span>
                            )}
                        </h1>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
                            {t('home.heroSubtitle')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/register"
                                className="bg-[#00D4FF] text-[#0A2540] px-8 py-4 rounded-xl text-lg font-bold hover:brightness-110 transition transform hover:scale-105 shadow-xl shadow-[#00D4FF]/20"
                            >
                                {t('home.startFree')}
                            </Link>
                            <Link
                                to="/login"
                                className="border-2 border-white/30 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition"
                            >
                                {t('home.alreadyAccount')}
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
                        <h2 className="text-4xl font-extrabold text-[#0A2540]">{t('home.everythingTitle')}</h2>
                        <p className="text-gray-500 mt-3 text-lg">
                            {t('home.everythingSubtitle')}
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
                        {t('home.howTitle')}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: '01', title: t('home.step1Title'), desc: t('home.step1Desc') },
                            { step: '02', title: t('home.step2Title'), desc: t('home.step2Desc') },
                            { step: '03', title: t('home.step3Title'), desc: t('home.step3Desc') },
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
                        {t('home.readyTitle')}
                    </h2>
                    <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
                        {t('home.readySubtitle')}
                    </p>
                    <Link
                        to="/register"
                        className="inline-block bg-[#0A2540] text-white px-10 py-4 rounded-xl text-lg font-bold hover:bg-[#1a3d66] transition transform hover:scale-105 shadow-xl"
                    >
                        {t('home.getStartedFree')}
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="bg-[#0A2540] text-gray-400 py-8 px-6 text-center text-sm">
                <p className="font-bold text-white text-lg mb-2">
                    <span className="text-[#00D4FF]">N</span>HETIS {t('chat.title').includes('Advisor') ? 'Career Advisor' : ''}
                </p>
                <p>{t('home.empowering')}</p>
                <p className="mt-2 text-xs text-gray-600">© 2026 NHETIS • {t('home.guidance')}</p>
            </footer>
        </div>
    );
}
