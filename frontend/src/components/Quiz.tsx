import React, { useState, useEffect } from 'react';
import API from '../api';
import { motion, AnimatePresence } from 'framer-motion';

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

// Fallback questions if backend is offline (5 minimum to avoid empty quiz)
const FALLBACK_QUESTIONS = [
    {
        id: 1, question: 'Your school science fair is coming up. Which role excites you most?', category: 'technical', type: 'scenario',
        options: [
            { text: 'Build and program a robot or device', score: 1.0 },
            { text: 'Run a biology or chemistry experiment', score: 0.7 },
            { text: 'Design the display and visual materials', score: 0.4 },
            { text: 'Present our project to judges', score: 0.2 },
            { text: 'Coordinate the whole team', score: 0.3 },
        ]
    },
    {
        id: 2, question: 'Which challenge would you most want to solve professionally?', category: 'logic', type: 'scenario',
        options: [
            { text: 'Build AI tech to fight climate change', score: 1.0 },
            { text: 'Develop a vaccine for a new disease', score: 0.8 },
            { text: 'Write a bestselling novel', score: 0.4 },
            { text: 'Design infrastructure for a city', score: 0.7 },
            { text: 'Win a landmark court case', score: 0.5 },
        ]
    },
    {
        id: 3, question: 'You have free time to create anything. You choose to:', category: 'creativity', type: 'scenario',
        options: [
            { text: 'Write a short story or song', score: 1.0 },
            { text: 'Design a logo or digital artwork', score: 0.9 },
            { text: 'Build a small game or app', score: 0.6 },
            { text: 'Analyse data on a topic I love', score: 0.4 },
            { text: 'Sketch architectural plans', score: 0.7 },
        ]
    },
    {
        id: 4, question: 'A friend is going through a tough time. You naturally:', category: 'social', type: 'scenario',
        options: [
            { text: 'Listen patiently and offer support', score: 1.0 },
            { text: 'Give practical advice on what to do', score: 0.6 },
            { text: 'Connect them with a professional', score: 0.7 },
            { text: 'Distract them with fun activities', score: 0.4 },
            { text: 'I prefer logical problems to emotional ones', score: 0.0 },
        ]
    },
    {
        id: 5, question: 'In a group project, which role do you naturally fall into?', category: 'leadership', type: 'scenario',
        options: [
            { text: 'The leader who sets direction', score: 1.0 },
            { text: 'The researcher who gathers data', score: 0.6 },
            { text: 'The creative who designs outputs', score: 0.5 },
            { text: 'The fixer when things go wrong', score: 0.7 },
            { text: 'The mediator who keeps harmony', score: 0.8 },
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

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2 — Skills Self-Rating Grid
// ═══════════════════════════════════════════════════════════════════════════════
const SkillRating = ({ onComplete }: { onComplete: (ratings: Record<string, number>) => void }) => {
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);

    const setRating = (skillId: string, val: number) =>
        setRatings(prev => ({ ...prev, [skillId]: val }));

    const allRated = SKILL_ITEMS.every(s => ratings[s.id] !== undefined);

    const handleSubmit = () => {
        if (!allRated) return;
        setSubmitting(true);
        // Normalise: rating is 0–4, convert to 0–1 and attach category
        onComplete(ratings);
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                <div className="inline-block bg-gradient-to-r from-[#0A2540] to-[#00D4FF] text-white text-xs font-bold px-4 py-1.5 rounded-full mb-3 tracking-widest uppercase">
                    Stage 2 of 2 — Skills Rating
                </div>
                <h2 className="text-2xl font-extrabold text-[#0A2540] leading-snug">
                    Rate your current skill level
                </h2>
                <p className="text-sm text-gray-500 mt-2">Be honest — this helps us find your best career matches and skill gaps.</p>
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
                            <span className="font-semibold text-[#0A2540] text-sm">{skill.label}</span>
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
                        ? '✅ All skills rated! Ready to see your results.'
                        : `Rate ${SKILL_ITEMS.length - Object.keys(ratings).length} more skill(s) to continue`}
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
                    {submitting ? 'Analysing...' : '🎯 Get My Career Matches'}
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

    useEffect(() => {
        API.get('/aptitude')
            .then(res => {
                const qs = Array.isArray(res.data) && res.data.length > 0 ? res.data : FALLBACK_QUESTIONS;
                setQuestions(qs);
            })
            .catch(() => setQuestions(FALLBACK_QUESTIONS))
            .finally(() => setLoading(false));
    }, []);

    const handleAnswer = (score: number, category: string) => {
        const updatedScores = {
            ...scores,
            [category]: [...(scores[category] || []), score],
        };
        setScores(updatedScores);

        if (currentStep < questions.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            // Normalise scenario scores
            const normalised: Record<string, number> = {};
            Object.entries(updatedScores).forEach(([cat, vals]) => {
                normalised[cat] = vals.reduce((a, b) => a + b, 0) / vals.length;
            });
            setScenarioScores(normalised);
            setStage('skills'); // → Move to Stage 2
        }
    };

    const handleSkillsComplete = (skillRatings: Record<string, number>) => {
        // Merge skill ratings (0-4 → 0-1) with scenario scores
        const skillVector: Record<string, number> = {};
        SKILL_ITEMS.forEach(s => {
            const raw = skillRatings[s.id] ?? 0;
            const normalised = raw / 4; // 0–4 → 0–1
            // Add to corresponding aptitude category
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

        // Pass enriched scores along with raw skill ratings for skill-gap analysis
        onComplete({ ...finalScores, _skillRatings: skillRatings });
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
        return <SkillRating onComplete={handleSkillsComplete} />;
    }

    const question = questions[currentStep];
    const progress = (currentStep / questions.length) * 100;
    const categoryIcon = CATEGORY_ICONS[question?.category] || '❓';

    return (
        <div className="max-w-2xl mx-auto">
            {/* Stage badge */}
            <div className="text-center mb-4">
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
                                onClick={() => handleAnswer(opt.score, question.category)}
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
