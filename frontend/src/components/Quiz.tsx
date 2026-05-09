import React, { useState, useEffect } from 'react';
import API from '../api';
import { motion, AnimatePresence } from 'framer-motion';

// ── Career categories used for weight mapping ────────────────────────────────
// ── Career categories used for weight mapping ────────────────────────────────
const CAREER_CATEGORIES = [
    'Technology', 'Engineering', 'Medical', 'Agriculture',
    'Commerce', 'Business', 'Arts & Design', 'Media', 'Education', 'Law',
] as const;

// ── Skill → Career-category boost map (Balanced: Sum of weights per skill = 5) ──
const SKILL_CAREER_MAP: Record<string, Record<string, number>> = {
    math: { Technology: 2, Engineering: 2, Commerce: 1 },
    coding: { Technology: 4, Engineering: 1 },
    science: { Technology: 1, Engineering: 1, Medical: 2, Agriculture: 1 },
    biology: { Medical: 3, Agriculture: 2 },
    design: { 'Arts & Design': 4, Media: 1 },
    writing: { Media: 2, Education: 1, Law: 1, 'Arts & Design': 1 },
    leadership: { Business: 3, Commerce: 1, Law: 1 },
    problemSolve: { Engineering: 2, Technology: 1, Law: 1, Medical: 1 },
    empathy: { Medical: 2, Education: 2, Social: 1 }, // Note: added Social as internal proxy for empathy heavy
    business: { Business: 3, Commerce: 2 },
    research: { Education: 2, Medical: 1, Technology: 1, Law: 1 },
    speaking: { Media: 2, Law: 2, Business: 1 },
    languages: { Media: 2, Education: 2, 'Arts & Design': 1 },
    mechanical: { Engineering: 4, Technology: 1 },
    sports: { Medical: 2, Education: 2, Media: 1 }, // Sports rehab, coaching, broadcasting
};

// ── Skills for the self-rating grid (Stage 2) ────────────────────────────────
const SKILL_ITEMS = [
    { id: 'math', label: 'Mathematics / Logic', icon: '🔢', category: 'logic' },
    { id: 'coding', label: 'Programming / Coding', icon: '💻', category: 'technical' },
    { id: 'science', label: 'Physics / Chemistry', icon: '⚗️', category: 'technical' },
    { id: 'biology', label: 'Biology / Life Sciences', icon: '🧬', category: 'technical' },
    { id: 'design', label: 'Drawing / Design', icon: '🎨', category: 'creativity' },
    { id: 'writing', label: 'Writing / Communication', icon: '✍️', category: 'creativity' },
    { id: 'leadership', label: 'Leadership / Team Work', icon: '👥', category: 'leadership' },
    { id: 'problemSolve', label: 'Problem Solving', icon: '🧩', category: 'logic' },
    { id: 'empathy', label: 'Empathy / Counselling', icon: '🤝', category: 'social' },
    { id: 'business', label: 'Business / Finance', icon: '📈', category: 'logic' },
    { id: 'research', label: 'Research / Analysis', icon: '🔬', category: 'logic' },
    { id: 'speaking', label: 'Public Speaking', icon: '🎤', category: 'social' },
    { id: 'languages', label: 'Languages / Literature', icon: '📚', category: 'creativity' },
    { id: 'mechanical', label: 'Mechanics / Electronics', icon: '⚙️', category: 'technical' },
    { id: 'sports', label: 'Sports / Physical Training', icon: '🏃', category: 'social' },
];

const RATING_LABELS = ['Beginner', 'Basic', 'Intermediate', 'Proficient', 'Expert'];
const RATING_COLORS = ['#e2e8f0', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6'];

// Fallback questions (Balanced careerWeights)
const FALLBACK_QUESTIONS = [
    {
        id: 1, question: 'Your school science fair is coming up. Which role excites you most?', category: 'technical', type: 'scenario',
        options: [
            { text: 'Build and program a robot or device', score: 1.0, careerWeights: { Technology: 3, Engineering: 2 } },
            { text: 'Run a biology or chemistry experiment', score: 0.7, careerWeights: { Medical: 3, Agriculture: 2 } },
            { text: 'Design the display and visual materials', score: 0.4, careerWeights: { 'Arts & Design': 3, Media: 2 } },
            { text: 'Present our project to judges', score: 0.2, careerWeights: { Media: 3, Law: 2 } },
            { text: 'Coordinate the whole team', score: 0.3, careerWeights: { Business: 3, Commerce: 2 } },
        ]
    },
    {
        id: 2, question: 'Which challenge would you most want to solve professionally?', category: 'logic', type: 'scenario',
        options: [
            { text: 'Build AI tech to fight climate change', score: 1.0, careerWeights: { Technology: 5 } },
            { text: 'Develop a vaccine for a new disease', score: 0.8, careerWeights: { Medical: 5 } },
            { text: 'Write a bestselling novel or script', score: 0.4, careerWeights: { Media: 5 } },
            { text: 'Design infrastructure for a city', score: 0.7, careerWeights: { Engineering: 5 } },
            { text: 'Win a landmark court case', score: 0.5, careerWeights: { Law: 5 } },
        ]
    },
    {
        id: 3, question: 'You have free time to create anything. You choose to:', category: 'creativity', type: 'scenario',
        options: [
            { text: 'Write a short story or song', score: 1.0, careerWeights: { Media: 3, Education: 2 } },
            { text: 'Design a logo or digital artwork', score: 0.9, careerWeights: { 'Arts & Design': 5 } },
            { text: 'Build a small game or app', score: 0.6, careerWeights: { Technology: 4, Business: 1 } },
            { text: 'Analyse data on a topic I love', score: 0.4, careerWeights: { Commerce: 3, Business: 2 } },
            { text: 'Sketch architectural plans', score: 0.7, careerWeights: { Engineering: 3, 'Arts & Design': 2 } },
        ]
    },
    {
        id: 4, question: 'A friend is going through a tough time. You naturally:', category: 'social', type: 'scenario',
        options: [
            { text: 'Listen patiently and offer support', score: 1.0, careerWeights: { Education: 3, Medical: 2 } },
            { text: 'Give practical advice on what to do', score: 0.6, careerWeights: { Law: 3, Business: 2 } },
            { text: 'Connect them with a professional', score: 0.7, careerWeights: { Commerce: 2, Education: 3 } },
            { text: 'Distract them with fun activities', score: 0.4, careerWeights: { Media: 3, 'Arts & Design': 2 } },
            { text: 'I prefer logical problems to emotional ones', score: 0.0, careerWeights: { Technology: 2, Engineering: 3 } },
        ]
    },
    {
        id: 5, question: 'In a group project, which role do you naturally fall into?', category: 'leadership', type: 'scenario',
        options: [
            { text: 'The leader who sets direction', score: 1.0, careerWeights: { Business: 3, Commerce: 2 } },
            { text: 'The researcher who gathers data', score: 0.6, careerWeights: { Education: 2, Technology: 2, Law: 1 } },
            { text: 'The creative who designs outputs', score: 0.5, careerWeights: { 'Arts & Design': 3, Media: 2 } },
            { text: 'The fixer when things go wrong', score: 0.7, careerWeights: { Engineering: 3, Technology: 2 } },
            { text: 'The mediator who keeps harmony', score: 0.8, careerWeights: { Law: 2, Education: 3 } },
        ]
    },
];


// ── CATEGORY ICONS ───────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
    technical: '⚙️',
    logic: '🧠',
    creativity: '🎨',
    social: '🤝',
    leadership: '🏆',
};

import { useLanguage } from '../context/LanguageContext';

const SkillRating = ({ onComplete, onBack }: { onComplete: (ratings: Record<string, number>) => void, onBack: () => void }) => {
    const { t } = useLanguage();
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);

    const setRating = (skillId: string, val: number) =>
        setRatings(prev => ({ ...prev, [skillId]: val }));

    const allRated = SKILL_ITEMS.every(s => ratings[s.id] !== undefined);

    const handleSubmit = () => {
        if (!allRated) return;
        setSubmitting(true);
        onComplete(ratings);
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-3">
                    <button onClick={onBack} className="text-gray-400 hover:text-[#0A2540] text-sm font-bold flex items-center gap-1">
                        ← {t('quiz.back')}
                    </button>
                    <div className="inline-block bg-gradient-to-r from-[#0A2540] to-[#00D4FF] text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase">
                        {t('quiz.stage2Label')}
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold text-[#0A2540] leading-snug">
                    {t('quiz.rateTitle')}
                </h2>
                <p className="text-sm text-gray-500 mt-2">{t('quiz.rateDesc')}</p>
            </motion.div>

            {/* Skills grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {SKILL_ITEMS.map((skill, si) => (
                    <motion.div
                        key={skill.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: si * 0.04 }}
                        className="glass rounded-2xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{skill.icon}</span>
                            <span className="font-semibold text-[#0A2540] text-sm">{t(`skills.${skill.id}`)}</span>
                        </div>
                        {/* Rating buttons 0–4 */}
                        <div className="flex gap-1.5">
                            {[0, 1, 2, 3, 4].map(val => {
                                const selected = ratings[skill.id] === val;
                                return (
                                    <button
                                        key={val}
                                        onClick={() => setRating(skill.id, val)}
                                        title={RATING_LABELS[val]}
                                        className={`flex-1 rounded-lg py-2 text-[10px] font-bold transition-all duration-150 border-2 ${selected
                                            ? 'border-[#0A2540] text-[#0A2540] scale-105 shadow-sm'
                                            : 'border-gray-200 text-gray-400 hover:border-gray-400'
                                            }`}
                                        style={selected ? { background: RATING_COLORS[val] } : {}}
                                    >
                                        {val + 1}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-1 px-0.5">
                            <span className="text-[9px] text-gray-400">{RATING_LABELS[0]}</span>
                            <span className="text-[9px] text-gray-400">{RATING_LABELS[4]}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Submit button */}
            <div className="text-center">
                <p className="text-xs text-gray-400 mb-4">
                    {allRated
                        ? `✅ ${t('quiz.allRated')}`
                        : t('quiz.rateMore', { n: SKILL_ITEMS.length - Object.keys(ratings).length })}
                </p>
                <motion.button
                    whileHover={allRated ? { scale: 1.03 } : {}}
                    whileTap={allRated ? { scale: 0.97 } : {}}
                    onClick={handleSubmit}
                    disabled={!allRated || submitting}
                    className={`px-10 py-3.5 rounded-2xl font-bold text-white text-base transition-all shadow-lg ${allRated && !submitting
                        ? 'bg-gradient-to-r from-[#0A2540] to-[#635BFF] hover:shadow-xl cursor-pointer'
                        : 'bg-gray-300 cursor-not-allowed'
                        }`}
                >
                    {submitting ? t('quiz.analyzing') : `🎯 ${t('quiz.getMatches')}`}
                </motion.button>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1 — Scenario MCQ Questions
// ═══════════════════════════════════════════════════════════════════════════════
const Quiz = ({ onComplete }: { onComplete: (scores: any) => void }) => {
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [scores, setScores] = useState<Record<string, number[]>>({});
    const [loading, setLoading] = useState(true);
    const [stage, setStage] = useState<'scenarios' | 'skills'>('scenarios');
    const [scenarioScores, setScenarioScores] = useState<Record<string, number>>({});
    // ── NEW: Accumulated career-category weights from scenario answers ──
    const [careerCategoryScores, setCareerCategoryScores] = useState<Record<string, number>>({});
    // ── NEW: History stack for "Back" button functionality ──
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        API.get('/aptitude')
            .then(res => {
                const qs = Array.isArray(res.data) && res.data.length > 0 ? res.data : FALLBACK_QUESTIONS;
                setQuestions(qs);
            })
            .catch(() => setQuestions(FALLBACK_QUESTIONS))
            .finally(() => setLoading(false));
    }, []);

    const handleBack = () => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        setScores(lastState.scores);
        setCareerCategoryScores(lastState.careerCategoryScores);
        setCurrentStep(lastState.currentStep);
        setHistory(prev => prev.slice(0, -1));
    };

    const handleAnswer = (score: number, category: string, option: any) => {
        // Save current state to history before updating
        setHistory(prev => [...prev, {
            currentStep,
            scores,
            careerCategoryScores,
        }]);

        const updatedScores = {
            ...scores,
            [category]: [...(scores[category] || []), score],
        };
        setScores(updatedScores);

        // ── Accumulate careerWeights from this option ──
        const weights = option.careerWeights || {};
        setCareerCategoryScores(prev => {
            const updated = { ...prev };
            for (const [cat, w] of Object.entries(weights)) {
                updated[cat] = (updated[cat] || 0) + (w as number);
            }
            return updated;
        });

        if (currentStep < questions.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            // Normalise scenario scores (aptitude vector)
            const normalised: Record<string, number> = {};
            Object.entries(updatedScores).forEach(([cat, vals]) => {
                normalised[cat] = vals.reduce((a, b) => a + b, 0) / vals.length;
            });
            setScenarioScores(normalised);
            setStage('skills'); // → Move to Stage 2
        }
    };

    const handleSkillsComplete = (skillRatings: Record<string, number>) => {
        // Merge skill ratings (0-4 → 0-1) with scenario scores for aptitude vector
        const skillVector: Record<string, number> = {};
        SKILL_ITEMS.forEach(s => {
            const raw = skillRatings[s.id] ?? 0;
            const normalised = raw / 4; // 0–4 → 0–1
            if (!skillVector[s.category]) skillVector[s.category] = 0;
            skillVector[s.category] = Math.max(skillVector[s.category], normalised);
        });

        // Merge: scenario aptitudes weighted 70%, skill self-rating 30%
        const finalScores: Record<string, number> = {};
        const allCategories = new Set([
            ...Object.keys(scenarioScores),
            ...Object.keys(skillVector),
        ]);
        allCategories.forEach(cat => {
            const scenario = scenarioScores[cat] || 0;
            const skill = skillVector[cat] || 0;
            finalScores[cat] = Math.round((scenario * 0.7 + skill * 0.3) * 100) / 100;
        });

        // ── Merge skill ratings into career-category scores ──
        // High skill rating (3-4) in coding → boosts Technology career category, etc.
        const mergedCareerScores = { ...careerCategoryScores };
        SKILL_ITEMS.forEach(s => {
            const rating = skillRatings[s.id] ?? 0;
            if (rating >= 2) { // only count intermediate+ skills
                const careerMap = SKILL_CAREER_MAP[s.id] || {};
                const factor = rating / 4; // 0-1 normalized
                for (const [cat, w] of Object.entries(careerMap)) {
                    mergedCareerScores[cat] = (mergedCareerScores[cat] || 0) + (w as number) * factor;
                }
            }
        });

        // Pass enriched scores + career category weights + raw skill ratings
        onComplete({
            ...finalScores,
            _skillRatings: skillRatings,
            _careerCategoryScores: mergedCareerScores,
        });
    };

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="spinner mx-auto mb-4" />
                <p className="text-gray-500">Loading your assessment...</p>
            </div>
        );
    }

    if (stage === 'skills') {
        return <SkillRating onComplete={handleSkillsComplete} onBack={() => setStage('scenarios')} />;
    }

    const question = questions[currentStep];
    const progress = (currentStep / questions.length) * 100;
    const categoryIcon = CATEGORY_ICONS[question?.category] || '❓';

    return (
        <div className="max-w-2xl mx-auto">
            {/* Stage badge */}
            <div className="flex items-center justify-center gap-4 mb-4">
                {currentStep > 0 && (
                    <button
                        onClick={handleBack}
                        className="text-gray-400 hover:text-[#0A2540] text-sm font-bold flex items-center gap-1 transition-colors"
                    >
                        ← Back
                    </button>
                )}
                <span className="inline-block bg-gradient-to-r from-[#0A2540] to-[#00D4FF] text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase">
                    Stage 1 of 2 — Scenarios
                </span>
            </div>

            {/* Progress */}
            <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Question {currentStep + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-[#0A2540] to-[#00D4FF] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -60, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="glass rounded-2xl p-8"
                >
                    <p className="text-xs font-bold text-[#00D4FF] uppercase tracking-widest mb-2">
                        {categoryIcon} {question.category}
                    </p>
                    <h2 className="text-xl font-bold text-[#0A2540] mb-7 leading-relaxed">
                        {question.question}
                    </h2>

                    <div className="space-y-3">
                        {question.options.map((opt: any, idx: number) => (
                            <motion.button
                                key={idx}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => handleAnswer(opt.score, question.category, opt)}
                                className="w-full text-left px-5 py-4 rounded-xl border-2 border-gray-200 hover:border-[#0A2540] hover:bg-[#0A2540] hover:text-white transition-all duration-200 font-medium text-gray-700 group"
                            >
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-current mr-3 text-xs font-bold shrink-0 align-middle">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                {opt.text}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default Quiz;
