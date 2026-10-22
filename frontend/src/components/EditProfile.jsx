import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function EditProfile() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.put('http://localhost:5000/api/user/profile/edit', 
        { username, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Profile updated successfully!');
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to update profile.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleUpdate} className="w-full max-w-md p-8 bg-white rounded-lg shadow-md space-y-4">
        <h2 className="text-2xl font-bold text-center text-green-600">Edit Profile</h2>
        <input type="text" placeholder="New Username" className="w-full px-4 py-2 border rounded" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="email" placeholder="New Email" className="w-full px-4 py-2 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit" className="w-full py-2 text-white bg-green-600 rounded">Save Changes</button>
        <button type="button" onClick={() => navigate('/dashboard')} className="w-full py-2 text-gray-700 bg-gray-200 rounded">Cancel</button>
      </form>
    </div>
  );
}