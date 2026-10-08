import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRightIcon, LockIcon, ShieldIcon } from '../components/icons';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid email or password');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Brand panel */}
            <aside className="relative hidden w-1/2 overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,#312e81_0%,transparent_60%)]"
                />
                <Link to="/" className="relative flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                        <ShieldIcon className="h-5 w-5" />
                    </span>
                    <span className="leading-tight">
                        <span className="block text-sm font-bold text-white">
                            RiskShield AI
                        </span>
                        <span className="block text-xs text-slate-400">
                            Enterprise Risk Intelligence
                        </span>
                    </span>
                </Link>

                <div className="relative max-w-md">
                    <h1 className="text-3xl font-bold leading-snug text-white">
                        Real-time risk scoring your analysts can actually trust.
                    </h1>
                    <p className="mt-4 text-sm leading-relaxed text-slate-400">
                        Hybrid rules + ML scoring, behavioural baselines, SHAP
                        explanations and an AI investigation agent — all in one
                        audited console.
                    </p>
                    <ul className="mt-8 space-y-3">
                        {[
                            'Explainable scores for every transaction',
                            'Live alerts over Socket.IO',
                            'Role-based access for Admin, Analyst & Auditor',
                        ].map((item) => (
                            <li
                                key={item}
                                className="flex items-center gap-3 text-sm text-slate-300"
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-slate-500">
                    © {new Date().getFullYear()} RiskShield AI. All rights reserved.
                </p>
            </aside>
            {/* Form panel */}
            <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
                <div className="w-full max-w-md animate-rise">
                    <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-brand-300">
                            <ShieldIcon className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                            RiskShield AI
                        </span>
                    </Link>

                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Sign in to access the risk intelligence console.
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                        <div>
                            <label className="field-label" htmlFor="email">
                                Email address
                            </label>
                            <input
                                type="email"
                                id="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="you@company.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="field-label" htmlFor="password">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary w-full !py-3"
                        >
                            {submitting ? 'Signing in…' : 'Sign in'}
                            {!submitting && <ArrowRightIcon className="h-4 w-4" />}
                        </button>
                    </form>

                    <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-500">
                        <LockIcon className="h-4 w-4 text-slate-400" />
                        Protected by role-based access control
                    </p>

                    <p className="mt-4 text-center text-sm text-slate-600">
                        Don&apos;t have an account?{' '}
                        <Link
                            to="/register"
                            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                        >
                            Create one
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Login;

