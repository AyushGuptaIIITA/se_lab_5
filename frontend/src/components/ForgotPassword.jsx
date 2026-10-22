import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      alert(`Token generated: ${res.data.resetToken} (In production, this would be emailed)`);
    } catch (err) {
      alert('Error processing request.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-center mb-4">Reset Password</h2>
        <input type="email" placeholder="Enter your email" required className="w-full px-4 py-2 mb-4 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className="w-full py-2 text-white bg-red-500 rounded">Send Reset Link</button>
        <Link to="/" className="block mt-4 text-center text-blue-500 text-sm hover:underline">Back to Login</Link>
      </form>
    </div>
  );
}