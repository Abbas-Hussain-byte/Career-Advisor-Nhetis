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
        confirmPassword: '',
        grade: '12',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Phone: allow only digits, max 10
        if (name === 'phone') {
            const digits = value.replace(/\D/g, '').slice(0, 10);
            setForm({ ...form, phone: digits });
        } else {
            setForm({ ...form, [name]: value });
        }
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim() || !form.phone || !form.password) {
            setError('Name, phone number, and password are required.');
            return;
        }
        if (form.phone.length !== 10) {
            setError('Enter a valid 10-digit phone number.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match. Please re-enter.');
            return;
        }

        setLoading(true);
        try {
            await registerUser({
                name: form.name.trim(),
                phone: form.phone,
                email: form.email.trim() || undefined,
                password: form.password,
                grade: form.grade,
            });
            navigate('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const EyeIcon = ({ show }: { show: boolean }) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {show ? (
                <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                </>
            ) : (
                <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            )}
        </svg>
    );

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
                        '✅ No email required — just phone number',
                        '✅ Personalized career recommendations in minutes',
                        '✅ Find top government colleges near you',
                        '✅ Aptitude assessment to find your strengths',
                    ].map(f => (
                        <p key={f} className="text-gray-300 text-sm">{f}</p>
                    ))}
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center px-6 py-8">
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
                >
                    <div className="text-center mb-7">
                        <div className="text-4xl mb-3">🎓</div>
                        <h1 className="text-2xl font-extrabold text-[#0A2540]">Create Account</h1>
                        <p className="text-gray-500 text-sm mt-1">Free • Takes 30 seconds</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-2"
                        >
                            <span className="mt-0.5 shrink-0">⚠️</span>
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="name"
                                type="text"
                                value={form.name}
                                onChange={handleChange}
                                autoComplete="name"
                                placeholder="e.g. Rahul Sharma"
                                className="w-full bg-white text-gray-900 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition focus:bg-white"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">+91</span>
                                <input
                                    name="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="10-digit mobile number"
                                    className="w-full bg-white text-gray-900 border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition focus:bg-white"
                                />
                                {form.phone.length === 10 && (
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                                )}
                            </div>
                        </div>

                        {/* Email (optional) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Email <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                            </label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                autoComplete="email"
                                placeholder="you@example.com"
                                className="w-full bg-white text-gray-900 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition focus:bg-white"
                            />
                        </div>

                        {/* Grade */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Current Grade <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="grade"
                                value={form.grade}
                                onChange={handleChange}
                                className="w-full bg-white text-gray-900 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition"
                            >
                                <option value="10">Class 10</option>
                                <option value="12">Class 12</option>
                            </select>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Password <span className="text-red-500">*</span>
                                <span className="text-gray-400 font-normal text-xs ml-1">(min 6 chars)</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    placeholder="Create a strong password"
                                    className="w-full bg-white text-gray-900 border-2 border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-[#00D4FF] transition focus:bg-white"
                                />
                                <button
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                                    aria-label="Toggle password visibility"
                                >
                                    <EyeIcon show={showPassword} />
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="confirmPassword"
                                    type={showConfirm ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    placeholder="Re-enter your password"
                                    className={`w-full bg-white text-gray-900 border-2 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:bg-white transition ${form.confirmPassword && form.password !== form.confirmPassword
                                            ? 'border-red-300 focus:border-red-400'
                                            : form.confirmPassword && form.password === form.confirmPassword
                                                ? 'border-green-300 focus:border-green-400'
                                                : 'border-gray-200 focus:border-[#00D4FF]'
                                        }`}
                                />
                                <button
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => setShowConfirm(p => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                                    aria-label="Toggle confirm password visibility"
                                >
                                    <EyeIcon show={showConfirm} />
                                </button>
                                {form.confirmPassword && (
                                    <span className={`absolute right-10 top-1/2 -translate-y-1/2 text-sm ${form.password === form.confirmPassword ? 'text-green-500' : 'text-red-400'
                                        }`}>
                                        {form.password === form.confirmPassword ? '✓' : '✗'}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#0A2540] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#1a3d66] transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading
                                ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account...</>
                                : 'Create Account & Start →'
                            }
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-5">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#635BFF] font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                    <p className="text-center mt-3">
                        <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Back to Home</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
