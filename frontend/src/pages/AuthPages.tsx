import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Droplets, Lock, User, ArrowRight, Loader2, Globe } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:8000/api/portal/auth/login/', { username, password });
      login(res.data.token, res.data.username, res.data.organization);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="logo-box">
            <Droplets size={24} color="white" />
          </div>
          <h2>Welcome Back</h2>
          <p>Access your sustainability control center</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label><User size={14} /> Username</label>
            <input 
              type="text" 
              className="form-input" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          <div className="form-group">
            <label><Lock size={14} /> Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Register Organization</Link>
        </div>
      </div>
    </div>
  );
};

export const Register = () => {
  const [formData, setFormData] = useState({ company_name: '', username: '', password: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:8000/api/portal/auth/register/', formData);
      login(res.data.token, res.data.username, res.data.organization);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="logo-box">
            <Droplets size={24} color="white" />
          </div>
          <h2>Onboard Organization</h2>
          <p>Empower your company with ESG intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label><Globe size={14} /> Company Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.company_name} 
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              required 
            />
          </div>
          <div className="form-group">
            <label><User size={14} /> Admin Username</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.username} 
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required 
            />
          </div>
          <div className="form-group">
            <label><Lock size={14} /> Secure Password</label>
            <input 
              type="password" 
              className="form-input" 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Create Account <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};
