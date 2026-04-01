import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={
            !isAuthenticated ? 
            <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} /> : 
            <Navigate to="/dashboard" />
          } />
          <Route path="/register" element={
            !isAuthenticated ? 
            <Register setIsAuthenticated={setIsAuthenticated} setUser={setUser} /> : 
            <Navigate to="/dashboard" />
          } />
          <Route path="/dashboard" element={
            isAuthenticated ? 
            <Dashboard user={user} setUser={setUser} /> : 
            <Navigate to="/login" />
          } />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;