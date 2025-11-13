import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Chat from './Chat';
import FileManager from './FileManager';
import AdminDashboard from './AdminDashboard';
import axios from 'axios';

axios.defaults.baseURL = '/api';
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Set CSRF token
const token = document.querySelector('meta[name="csrf-token"]');
if (token) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
}

function AppContent({ user, setUser, loading, onLogin, onLogout, justLoggedIn, setJustLoggedIn }) {
    const navigate = useNavigate();

    // Redirect admin to dashboard after login (only once after login)
    useEffect(() => {
        if (user && user.role === 'admin' && justLoggedIn && window.location.pathname !== '/admin') {
            console.log('Admin detected, redirecting to dashboard...', user);
            navigate('/admin', { replace: true });
            setJustLoggedIn(false);
        }
    }, [user, navigate, justLoggedIn, setJustLoggedIn]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={<Chat user={user} onLogout={onLogout} onLogin={onLogin} />} />
            <Route 
                path="/files" 
                element={
                    user ? (
                        <FileManager user={user} onLogout={onLogout} />
                    ) : (
                        <Navigate to="/" replace />
                    )
                } 
            />
            <Route 
                path="/admin" 
                element={
                    user && user.role === 'admin' ? (
                        <AdminDashboard user={user} onLogout={onLogout} />
                    ) : (
                        <Navigate to="/" replace />
                    )
                } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [justLoggedIn, setJustLoggedIn] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
                const response = await axios.get('/user');
                setUser(response.data);
            } catch (error) {
                localStorage.removeItem('token');
                delete axios.defaults.headers.common['Authorization'];
            }
        }
        setLoading(false);
    };

    const handleLogin = (userData, token) => {
        console.log('Login handler called with userData:', userData);
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        // Set flag to trigger redirect for admin (only after login, not on page refresh)
        if (userData.role === 'admin') {
            setJustLoggedIn(true);
        }
    };

    const handleLogout = async () => {
        if (user) {
            try {
                await axios.post('/logout');
                setToast({ type: 'error', message: 'Logged out successfully!' });
                setTimeout(() => setToast(null), 3000);
            } catch (error) {
                console.error('Logout error:', error);
                setToast({ type: 'error', message: 'Error logging out. Please try again.' });
                setTimeout(() => setToast(null), 3000);
            }
        }
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <BrowserRouter>
            <AppContent 
                user={user} 
                setUser={setUser} 
                loading={loading} 
                onLogin={handleLogin} 
                onLogout={handleLogout}
                justLoggedIn={justLoggedIn}
                setJustLoggedIn={setJustLoggedIn}
            />
            
            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md ${
                        toast.type === 'success' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                    }`}>
                        {toast.type === 'success' ? (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <p className="flex-1 text-sm font-medium">{toast.message}</p>
                        <button
                            onClick={() => setToast(null)}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </BrowserRouter>
    );
}

export default App;

