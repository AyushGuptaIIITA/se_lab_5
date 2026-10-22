import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/');
    
    axios.get('http://localhost:5000/api/user/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setData(res.data)).catch(() => navigate('/'));
  }, [navigate]);

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className={`p-6 text-white ${role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}`}>
          <h1 className="text-3xl font-bold">{role === 'admin' ? 'Admin Dashboard' : 'User Dashboard'}</h1>
          <p className="mt-2 text-sm">{data?.message}</p>
        </div>
        <div className="p-6 space-y-4">
          <p><strong>Username:</strong> {data?.user?.username}</p>
          <p><strong>Email:</strong> {data?.user?.email}</p>
          <div className="mt-6 flex space-x-4">
            <Link to="/edit-profile" className="px-4 py-2 bg-green-500 text-white rounded">Edit Profile</Link>
            <button onClick={() => { localStorage.clear(); navigate('/'); }} className="px-4 py-2 bg-gray-500 text-white rounded">Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}