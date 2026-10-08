import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Create Account
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 rounded">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="mb-4">
          <label
            className="block text-sm font-bold mb-2"
            htmlFor="name"
          >
            Name
          </label>

          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded w-full py-2 px-3"
            placeholder="Enter your name"
            minLength={2}
            required
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label
            className="block text-sm font-bold mb-2"
            htmlFor="email"
          >
            Email
          </label>

          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded w-full py-2 px-3"
            placeholder="Enter your email"
            required
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label
            className="block text-sm font-bold mb-2"
            htmlFor="password"
          >
            Password
          </label>

          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded w-full py-2 px-3"
            placeholder="Enter your password"
            minLength={8}
            required
          />
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <label
            className="block text-sm font-bold mb-2"
            htmlFor="confirmPassword"
          >
            Confirm Password
          </label>

          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border rounded w-full py-2 px-3"
            placeholder="Confirm your password"
            minLength={8}
            required
          />
        </div>

        {/* Register button */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded py-2 px-4 w-full"
        >
          {loading ? 'Creating Account...' : 'Register'}
        </button>

        {/* Login link */}
        <p className="text-center text-sm mt-4">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:underline"
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
};

export default Register;