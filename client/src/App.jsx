import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import AnnotationTool from './components/AnnotationTool';

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'annotation'
  const [streamUrl, setStreamUrl] = useState('http://192.168.1.101/stream'); // Lifted state

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('last_activity');
  }, []);

  const resetTimer = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem('last_activity', Date.now().toString());
    }
  }, [isAuthenticated]);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const lastActivity = localStorage.getItem('last_activity');
    
    if (token && lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceLastActivity < SESSION_TIMEOUT) {
        setIsAuthenticated(true);
      } else {
        logout();
      }
    } else {
      // No token, ensure we are logged out
      logout();
    }
    setIsLoading(false);
  }, [logout]);

  // Activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Interval to check for timeout periodically
    const intervalId = setInterval(() => {
      const lastActivity = localStorage.getItem('last_activity');
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceLastActivity >= SESSION_TIMEOUT) {
          logout();
        }
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(intervalId);
    };
  }, [isAuthenticated, logout, resetTimer]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('auth_token', 'dummy_token');
    localStorage.setItem('last_activity', Date.now().toString());
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  return (
    <>
      {isAuthenticated ? (
        currentView === 'dashboard' ? (
          <Dashboard 
            onNavigate={(view) => setCurrentView(view)} 
            streamUrl={streamUrl}
            setStreamUrl={setStreamUrl}
          />
        ) : (
          <AnnotationTool 
            onBack={() => setCurrentView('dashboard')} 
            streamUrl={streamUrl}
          />
        )
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
