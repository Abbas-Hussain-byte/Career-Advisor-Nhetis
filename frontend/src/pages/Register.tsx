import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const { registerUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        grade: '12',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.phone || !form.password) {
            setError('Name, phone, and password are required.');
            return;
        }
        if (form.phone.length < 10) {
            setError('Enter a valid 10-digit phone number.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            await registerUser(form);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex animated-bg">
            {/* Left panel */}
            <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 text-white">
                <Link to="/" className="text-3xl font-extrabold mb-12">
                    <span className="text-[#00D4FF]">N</span>HETIS
                </Link>
                <h2 className="text-4xl font-extrabold leading-tight mb-4">
                    Start your journey <br />to the right career.
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed">
                    Class 10 or 12? Confused about which stream or college to choose? NHETIS uses your interests and aptitude to guide you — completely free.
                </p>
                <div className="mt-10 space-y-3">
                    {[
                        '✅ No email required — use phone number',
                        '✅ Personalized recommendations in minutes',
                        '✅ Find government colleges near you',
                        '✅ Works offline on mobile',
                    ].map(f => (
                        <p key={f} className="text-gray-300 text-sm">{f}</p>
                    ))}
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <div className="text-4xl mb-3">🎓</div>
                        <h1 className="text-2xl font-extrabold text-[#0A2540]">Create Account</h1>
                        <p className="text-gray-500 text-sm mt-1">Free • Takes 30 seconds</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                            <input
                                name="name"
                                type="text"
                                value={form.name}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                            <input
                                name="phone"
                                type="tel"
                                value={form.phone}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email (Optional)</label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Grade *</label>
                            <select
                                name="grade"
                                value={form.grade}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition bg-white"
                            >
                                <option value="10">Class 10</option>
                                <option value="12">Class 12</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
                            <input
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#0A2540] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#1a3d66] transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div> Creating account...</> : 'Create Account & Start →'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#635BFF] font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                    <p className="text-center mt-4">
                        <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Back to Home</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
