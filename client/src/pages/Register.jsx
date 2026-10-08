import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRightIcon, CheckCircleIcon, ShieldIcon } from '../components/icons';

const Register = () => {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const validateForm = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      return 'Name must contain at least 2 characters';
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return 'A valid email is required';
    }

    if (!password || password.length < 8) {
      return 'Password must contain at least 8 characters';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });

      // AuthContext already logs the user in after registration.
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Brand panel */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,#312e81_0%,transparent_60%)]"
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
            Stand up a modern risk operation this afternoon.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            One console for scoring, alerting, behavioural analytics and
            investigations — with a full audit trail from day one.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Guided onboarding — no credit card',
              'Analyst, Admin and Auditor roles',
              'Explainable AI on every decision',
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-slate-300"
              >
                <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-400" />
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
            <span className="text-sm font-bold text-slate-900">RiskShield AI</span>
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Start monitoring risk in minutes.
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
            {/* Name */}
            <div>
              <label className="field-label" htmlFor="name">
                Full name
              </label>
              <input
                type="text"
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Jane Analyst"
                minLength={2}
                required
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="field-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Repeat your password"
                minLength={8}
                required
              />
            </div>

            {/* Register button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3"
            >
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRightIcon className="h-4 w-4" />}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Register;