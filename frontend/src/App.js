// App.js
import './styles.css';

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

    const handleLogin = () => setIsLoggedIn(true);
    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
    };

    return (
        <Router>
            <div>
                <nav>
                    {!isLoggedIn ? (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/register">Register</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/dashboard">Dashboard</Link>
                            <button onClick={handleLogout}>Logout</button>
                        </>
                    )}
                </nav>
                <Routes>
                    {/* Redirect root path based on login status */}
                    <Route path="/" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />} />
                    
                    {/* Conditionally render login page */}
                    <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
                    
                    <Route path="/register" element={<Register />} />
                    
                    {/* Protect dashboard route for logged-in users only */}
                    <Route path="/dashboard" element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
