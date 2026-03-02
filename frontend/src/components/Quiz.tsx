import React, { useState, useEffect } from 'react';
import API from '../api';
import { motion, AnimatePresence } from 'framer-motion';

// Fallback questions if backend is offline
const FALLBACK_QUESTIONS = [
    {
        id: 1,
        question: 'I enjoy solving complex mathematical problems or logic puzzles.',
        category: 'logic',
        options: [
            { text: 'Strongly Agree', score: 1.0 },
            { text: 'Agree', score: 0.7 },
            { text: 'Neutral', score: 0.5 },
            { text: 'Disagree', score: 0.2 },
            { text: 'Strongly Disagree', score: 0.0 },
        ],
    },
    {
        id: 2,
        question: 'I love painting, drawing, or designing visual content.',
        category: 'creativity',
        options: [
            { text: 'Strongly Agree', score: 1.0 },
            { text: 'Agree', score: 0.7 },
            { text: 'Neutral', score: 0.5 },
            { text: 'Disagree', score: 0.2 },
            { text: 'Strongly Disagree', score: 0.0 },
        ],
    },
    {
        id: 3,
        question: 'I am curious about how machines, computers, or software work.',
        category: 'technical',
        options: [
            { text: 'Strongly Agree', score: 1.0 },
            { text: 'Agree', score: 0.7 },
            { text: 'Neutral', score: 0.5 },
            { text: 'Disagree', score: 0.2 },
            { text: 'Strongly Disagree', score: 0.0 },
        ],
    },
    {
        id: 4,
        question: 'I enjoy helping people and working in teams to solve social issues.',
        category: 'social',
        options: [
            { text: 'Strongly Agree', score: 1.0 },
            { text: 'Agree', score: 0.7 },
            { text: 'Neutral', score: 0.5 },
            { text: 'Disagree', score: 0.2 },
            { text: 'Strongly Disagree', score: 0.0 },
        ],
    },
    {
        id: 5,
        question: 'I like to analyze data to find trends or patterns.',
        category: 'logic',
        options: [
            { text: 'Strongly Agree', score: 1.0 },
            { text: 'Agree', score: 0.7 },
            { text: 'Neutral', score: 0.5 },
            { text: 'Disagree', score: 0.2 },
            { text: 'Strongly Disagree', score: 0.0 },
        ],
    },
];

const Quiz = ({ onComplete }: { onComplete: (scores: any) => void }) => {
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [scores, setScores] = useState<Record<string, number[]>>({});
    const [loading, setLoading] = useState(true);

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
            // Normalize scores: average per category → value between 0 and 1
            const finalScores: Record<string, number> = {};
            Object.entries(updatedScores).forEach(([cat, vals]) => {
                finalScores[cat] = vals.reduce((a, b) => a + b, 0) / vals.length;
            });
            onComplete(finalScores);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-gray-500">Loading questions...</p>
            </div>
        );
    }

    const question = questions[currentStep];
    const progress = ((currentStep) / questions.length) * 100;

    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Question {currentStep + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% complete</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-[#0A2540] to-[#00D4FF] h-2 rounded-full progress-bar"
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
                    <p className="text-xs font-bold text-[#00D4FF] uppercase tracking-widest mb-4">
                        {question.category}
                    </p>
                    <h2 className="text-2xl font-bold text-[#0A2540] mb-8 leading-relaxed">
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
                                <span className="inline-block w-6 h-6 rounded-full border-2 border-current mr-3 align-middle transition-colors"></span>
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
