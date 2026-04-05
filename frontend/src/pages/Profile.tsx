import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const INTEREST_OPTIONS = [
    'Technology', 'Science', 'Mathematics', 'Medicine', 'Arts', 'Design',
    'Business', 'Commerce', 'Agriculture', 'Education', 'Sports', 'Music',
    'Writing', 'Social Work', 'Environment', 'Engineering',
];

const STREAM_OPTIONS = ['Science-PCM', 'Science-PCB', 'Commerce', 'Arts / Humanities', 'Vocational'];

export default function Profile() {
    const { user, logoutUser, refreshUser } = useAuth();
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        grade: user?.profile?.grade || '12',
        stream: user?.profile?.stream || '',
        board: user?.profile?.board || '',
        academicScore: user?.profile?.academicScore || '',
        interests: user?.profile?.interests || [] as string[],
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
            });
            await refreshUser(); // Sync updated profile into AuthContext immediately
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F6F9FC]">
            {/* Navbar */}
            <nav className="bg-[#0A2540] text-white px-6 py-4 sticky top-0 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <Link to="/" className="text-xl font-extrabold"><span className="text-[#00D4FF]">N</span>HETIS</Link>
                    <div className="hidden md:flex items-center gap-6 text-sm">
                        <Link to="/dashboard" className="hover:text-[#00D4FF] transition">Dashboard</Link>
                        <Link to="/careers" className="hover:text-[#00D4FF] transition">Careers</Link>
                        <Link to="/colleges" className="hover:text-[#00D4FF] transition">Colleges</Link>
                        <Link to="/insights" className="hover:text-[#00D4FF] transition">Insights</Link>
                        <Link to="/profile" className="text-[#00D4FF] font-semibold">Profile</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden md:block text-sm text-gray-300">{user?.name}</span>
                        <button onClick={logoutUser} className="bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-white/20 transition">Logout</button>
                    </div>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-[#0A2540]">Your Profile</h1>
                    <p className="text-gray-500 mt-2">Update your information to get better career matches</p>
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
                            ✅ Profile saved successfully!
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-[#0A2540] mb-5">Basic Information</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
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
                        <h3 className="text-lg font-bold text-[#0A2540] mb-5">Academic Information</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Grade</label>
                                <select
                                    value={form.grade}
                                    onChange={e => setForm({ ...form, grade: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                >
                                    <option value="10">Class 10</option>
                                    <option value="12">Class 12</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stream (for Class 12)</label>
                                <select
                                    value={form.stream}
                                    onChange={e => setForm({ ...form, stream: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                >
                                    <option value="">Not selected</option>
                                    {STREAM_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Board</label>
                                <input
                                    type="text"
                                    value={form.board}
                                    onChange={e => setForm({ ...form, board: e.target.value })}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Academic Score (%)</label>
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

                    {/* Interests */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-[#0A2540] mb-2">Your Interests</h3>
                        <p className="text-gray-500 text-sm mb-5">Select all that apply — these improve your career recommendations</p>
                        <div className="flex flex-wrap gap-2">
                            {INTEREST_OPTIONS.map(interest => (
                                <button
                                    key={interest}
                                    type="button"
                                    onClick={() => toggleInterest(interest)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${form.interests.includes(interest)
                                        ? 'bg-[#0A2540] text-white shadow-lg'
                                        : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#0A2540]'
                                        }`}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-3">{form.interests.length} selected</p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-[#0A2540] text-white py-4 rounded-2xl font-bold hover:bg-[#1a3d66] transition disabled:opacity-60 flex items-center justify-center gap-2 text-base"
                    >
                        {saving ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div> Saving...</> : '💾 Save Profile'}
                    </button>

                    <div className="text-center mt-6">
                        <Link to="/dashboard" className="text-sm text-[#635BFF] hover:underline font-medium">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </form>
            </main>
        </div>
    );
}
