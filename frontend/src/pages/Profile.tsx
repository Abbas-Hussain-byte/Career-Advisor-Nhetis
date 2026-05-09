import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';

import { useLanguage } from '../context/LanguageContext';
import SharedNavbar from '../components/SharedNavbar';

const INTEREST_OPTIONS = [
    'Technology', 'Science', 'Mathematics', 'Medicine', 'Arts', 'Design',
    'Business', 'Commerce', 'Agriculture', 'Education', 'Sports', 'Music',
    'Writing', 'Social Work', 'Environment', 'Engineering',
];

const STREAM_OPTIONS = ['Science-PCM', 'Science-PCB', 'Commerce', 'Arts / Humanities', 'Vocational'];
const ASPIRATION_TRACKS = ['Higher Studies', 'Job Ready', 'Government Exams', 'Entrepreneurship', 'Vocational Skills', 'Undecided'];
const CORE_VALUE_OPTIONS = ['Stability', 'Impact', 'Creativity', 'Income', 'Service'];

export default function Profile() {
    const { user, logoutUser, refreshUser } = useAuth();
    const { t } = useLanguage();
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        grade: user?.profile?.grade || '12',
        stream: user?.profile?.stream || '',
        board: user?.profile?.board || '',
        academicScore: user?.profile?.academicScore || '',
        interests: user?.profile?.interests || [] as string[],
        longTermGoal: user?.profile?.longTermGoal || '',
        aspirationTrack: user?.profile?.aspirationTrack || 'Undecided',
        coreValues: user?.profile?.coreValues || [] as string[],
        budgetLevel: user?.profile?.constraints?.budgetLevel || 'moderate',
        mobility: user?.profile?.constraints?.mobility || 'within-state',
        preferredLearningMode: user?.profile?.constraints?.preferredLearningMode || 'blended',
        languageComfort: user?.profile?.constraints?.languageComfort || '',
    });
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const toggleInterest = (interest: string) => {
        setForm(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest],
        }));
    };

    const toggleCoreValue = (value: string) => {
        setForm(prev => ({
            ...prev,
            coreValues: prev.coreValues.includes(value)
                ? prev.coreValues.filter(v => v !== value)
                : [...prev.coreValues, value],
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            await API.put('/users/profile', {
                name: form.name,
                email: form.email,
                grade: form.grade,
                stream: form.stream,
                board: form.board,
                academicScore: form.academicScore ? Number(form.academicScore) : undefined,
                interests: form.interests,
                longTermGoal: form.longTermGoal,
                aspirationTrack: form.aspirationTrack,
                coreValues: form.coreValues,
                constraints: {
                    budgetLevel: form.budgetLevel,
                    mobility: form.mobility,
                    preferredLearningMode: form.preferredLearningMode,
                    languageComfort: form.languageComfort,
                },
            });
            await refreshUser(); // Sync updated profile into AuthContext immediately
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err?.response?.data?.message || t('profile.saveError'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            {/* Navbar */}
            <SharedNavbar activePage="profile" />

            <main className="max-w-3xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">{t('profile.title')}</h1>
                    <p className="text-gray-500 mt-2">{t('profile.subtitle')}</p>
                </div>

                {/* Avatar / info card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-6 mb-8 flex items-center gap-5"
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A2540] to-[#00D4FF] flex items-center justify-center text-2xl font-extrabold text-white">
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#0A2540]">{user?.name}</h2>
                        <p className="text-gray-500 text-sm">{user?.phone}</p>
                        <span className="inline-block mt-1 bg-[#0A2540]/10 text-[#0A2540] text-xs px-3 py-0.5 rounded-full font-semibold capitalize">
                            {user?.role} · Class {user?.profile?.grade || '?'}
                        </span>
                    </div>
                </motion.div>

                <form onSubmit={handleSave}>
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-6">
                            ✅ {t('profile.saveSuccess')}
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-[#0A2540] mb-5">{t('profile.basicInfo')}</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.fullName')}</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.email')}</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Academic Info */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-[#0A2540] mb-5">{t('profile.academicInfo')}</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.grade')}</label>
                                <select
                                    value={form.grade}
                                    onChange={e => setForm({ ...form, grade: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                >
                                    <option value="10">{t('profile.options.grade10')}</option>
                                    <option value="12">{t('profile.options.grade12')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.stream')}</label>
                                <select
                                    value={form.stream}
                                    onChange={e => setForm({ ...form, stream: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                >
                                    <option value="">{t('profile.options.notSelected')}</option>
                                    {STREAM_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.board')}</label>
                                <input
                                    type="text"
                                    value={form.board}
                                    onChange={e => setForm({ ...form, board: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.score')}</label>
                                <input
                                    type="number"
                                    value={form.academicScore}
                                    onChange={e => setForm({ ...form, academicScore: e.target.value })}
                                    min="0"
                                    max="100"
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Aspirations and constraints */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-[#0A2540] mb-5">{t('profile.aspirations')}</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.track')}</label>
                                <select
                                    value={form.aspirationTrack}
                                    onChange={e => setForm({ ...form, aspirationTrack: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                >
                                    {ASPIRATION_TRACKS.map(tr => (
                                        <option key={tr} value={tr}>{t(`profile.tracks.${tr}`)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.goal')}</label>
                                <input
                                    type="text"
                                    value={form.longTermGoal}
                                    onChange={e => setForm({ ...form, longTermGoal: e.target.value })}
                                    placeholder={t('profile.goalPlaceholder')}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.budget')}</label>
                                <select
                                    value={form.budgetLevel}
                                    onChange={e => setForm({ ...form, budgetLevel: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                >
                                    <option value="high-support-needed">{t('profile.options.budgetHigh')}</option>
                                    <option value="moderate">{t('profile.options.budgetModerate')}</option>
                                    <option value="flexible">{t('profile.options.budgetFlexible')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.mobility')}</label>
                                <select
                                    value={form.mobility}
                                    onChange={e => setForm({ ...form, mobility: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                >
                                    <option value="near-home">{t('profile.options.mobilityNear')}</option>
                                    <option value="within-state">{t('profile.options.mobilityState')}</option>
                                    <option value="anywhere">{t('profile.options.mobilityAnywhere')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.learningMode')}</label>
                                <select
                                    value={form.preferredLearningMode}
                                    onChange={e => setForm({ ...form, preferredLearningMode: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                >
                                    <option value="offline">{t('profile.options.modeOffline')}</option>
                                    <option value="online">{t('profile.options.modeOnline')}</option>
                                    <option value="blended">{t('profile.options.modeBlended')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('profile.langComfort')}</label>
                                <input
                                    type="text"
                                    value={form.languageComfort}
                                    onChange={e => setForm({ ...form, languageComfort: e.target.value })}
                                    placeholder={t('profile.langPlaceholder')}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                />
                            </div>
                        </div>
                        <div className="mt-5">
                            <p className="text-sm font-semibold text-gray-700 mb-2">{t('profile.valuesLabel')}</p>
                            <div className="flex flex-wrap gap-2">
                                {CORE_VALUE_OPTIONS.map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => toggleCoreValue(val)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${form.coreValues.includes(val)
                                            ? 'bg-[#635BFF] text-white shadow-lg'
                                            : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#635BFF]'
                                            }`}
                                    >
                                        {t(`profile.values.${val}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Interests */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-[#0A2540] mb-2">{t('profile.interestsLabel')}</h3>
                        <p className="text-gray-500 text-sm mb-5">{t('profile.interestsSubtitle')}</p>
                        <div className="flex flex-wrap gap-2">
                            {INTEREST_OPTIONS.map(int => (
                                <button
                                    key={int}
                                    type="button"
                                    onClick={() => toggleInterest(int)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${form.interests.includes(int)
                                        ? 'bg-[#0A2540] text-white shadow-lg'
                                        : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#0A2540]'
                                        }`}
                                >
                                    {t(`profile.interests.${int}`)}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-3">{t('profile.selectedCount', { n: form.interests.length })}</p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-[#0A2540] text-white py-4 rounded-2xl font-bold hover:bg-[#1a3d66] transition disabled:opacity-60 flex items-center justify-center gap-2 text-base"
                    >
                        {saving ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> {t('profile.saving')}</> : `💾 ${t('profile.saveBtn')}`}
                    </button>

                    <div className="text-center mt-6">
                        <Link to="/dashboard" className="text-sm text-[#635BFF] hover:underline font-medium">
                            ← {t('profile.backToDashboard')}
                        </Link>
                    </div>
                </form>
            </main>
        </div>
    );
}
