import { useState, useEffect } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, GoogleAuthProvider } from "firebase/auth";
import { auth, provider } from '../firebase';
import Sidebar from './components/Sidebar';
import TopAppBar from './components/TopAppBar';
import Dashboard from './components/Dashboard';
import InsightsView from './components/InsightsView';
import SettingsView from './components/SettingsView';
import StickyActions from './components/StickyActions';
import { ACTIVITIES } from './data/mockData';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [activities, setActivities] = useState(ACTIVITIES);
  const [toast, setToast] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Listen for login status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) localStorage.setItem("google_fit_token", token);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("google_fit_token");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // If checking auth state, show a blank screen or spinner
  if (isAuthChecking) return <div className="h-screen bg-white" />;

  // If not logged in, show the Login Screen
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white p-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">CutCarbon</h1>
        <p className="text-gray-600 mb-8">Track your footprint effortlessly.</p>
        <button 
          onClick={handleLogin}
          className="w-full max-w-sm bg-gray-900 text-white py-4 rounded-full font-bold text-lg"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleDelete(id) {
    setActivities(prev => prev.filter(a => a.id !== id));
  }
  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopAppBar activeView={activeView} onNavigate={setActiveView} onLogout={handleLogout} />

        <main
          id="main-content"
          className="flex-1 px-5 md:px-8 py-8 pb-28 overflow-auto"
          aria-label={`${activeView} view`}
        >
          {activeView === 'dashboard' && (
            <Dashboard activities={activities} onDelete={handleDelete} />
          )}
          {activeView === 'insights'  && <InsightsView />}
          {activeView === 'settings'  && <SettingsView user={user} />}
        </main>
      </div>

      {/* Global sticky CTA buttons */}
      <StickyActions onAction={showToast} user={user} />

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 text-white text-sm rounded-full whitespace-nowrap z-50"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
