import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'user' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register', formData);
      alert('Registration successful! Please login.');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Error registering');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Register</h2>
        <input type="text" placeholder="Username" required className="w-full px-4 py-2 border rounded" onChange={e => setFormData({...formData, username: e.target.value})} />
        <input type="email" placeholder="Email" required className="w-full px-4 py-2 border rounded" onChange={e => setFormData({...formData, email: e.target.value})} />
        <input type="password" placeholder="Password" required minLength="6" className="w-full px-4 py-2 border rounded" onChange={e => setFormData({...formData, password: e.target.value})} />
        <select className="w-full px-4 py-2 border rounded" onChange={e => setFormData({...formData, role: e.target.value})}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="w-full py-2 text-white bg-blue-600 rounded">Register</button>
        <Link to="/" className="block text-center text-blue-500 text-sm hover:underline">Already have an account?</Link>
      </form>
    </div>
  );
}