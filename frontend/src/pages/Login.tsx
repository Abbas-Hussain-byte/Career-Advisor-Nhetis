import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { loginUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ phone: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.phone || !form.password) {
            setError('Please enter your phone number and password.');
            return;
        }
        setLoading(true);
        try {
            await loginUser(form);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
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
                    Welcome back! <br />Let's build your future.
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed">
                    Your personalized career guidance is just a login away. Discover paths, explore colleges, and never lose your progress.
                </p>
                <div className="mt-10 grid grid-cols-2 gap-4">
                    {['🧠 Aptitude Quiz', '🗺️ College Map', '🚀 Career Paths', '📶 Offline Mode'].map(f => (
                        <div key={f} className="glass rounded-xl p-3 text-sm font-medium text-[#00D4FF]">{f}</div>
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
                        <div className="text-4xl mb-3">👋</div>
                        <h1 className="text-2xl font-extrabold text-[#0A2540]">Sign In</h1>
                        <p className="text-gray-500 text-sm mt-1">Use your phone number to login</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                            <input
                                name="phone"
                                type="tel"
                                value={form.phone}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00D4FF] transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
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
                            className="w-full bg-[#0A2540] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#1a3d66] transition disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div> Signing in...</> : 'Sign In →'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-[#635BFF] font-semibold hover:underline">
                            Register for free
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
