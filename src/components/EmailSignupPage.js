import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpUser } from '../services/authService';

const EmailSignupPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) return 'Please enter your email.';
    // Basic email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const result = await signUpUser(email.trim(), password, '');
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Sign up failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0B0E14' }}>
      <div className="w-full max-w-md rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <h1 className="text-xl font-semibold mb-4" style={{ color: 'white' }}>Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#cbd5e1' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: '#cbd5e1' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: '#cbd5e1' }}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="text-sm" style={{ color: '#F28B82' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl font-semibold transition-all duration-300"
            style={{ background: '#8BC34A', color: '#0B0E14', padding: '10px 12px', opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="w-full rounded-2xl font-semibold transition-all duration-300"
            style={{ background: 'transparent', color: 'white', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmailSignupPage;


