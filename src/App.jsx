import { useState, useEffect, lazy, Suspense } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, GoogleAuthProvider } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { auth, db, provider } from '../firebase';
import Sidebar from './components/Sidebar';
import TopAppBar from './components/TopAppBar';
const Dashboard    = lazy(() => import('./components/Dashboard'));
const InsightsView = lazy(() => import('./components/InsightsView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
import StickyActions from './components/StickyActions';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [activities, setActivities] = useState([]);
  const [settings, setSettings] = useState({});
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

  // Real-time Firestore listener — only runs when a user is signed in
  useEffect(() => {
    if (!user) {
      setActivities([]);
      return;
    }

    // Only fetch the last 7 days of data
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const q = query(
      collection(db, 'users', user.uid, 'logs'),
      where('timestamp', '>=', Timestamp.fromDate(oneWeekAgo)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          // Spread all Firestore fields first so nothing is silently lost
          ...data,
          id: docSnap.id,

          // Normalised display fields (override raw values where needed)
          description: data.description ??
            (data.items?.length
              ? `${data.items.length} grocery item${data.items.length > 1 ? 's' : ''}`
              : 'Grocery analysis'),

          // Legacy `co2` field for components that haven't migrated yet
          co2: data.co2_score_kg ?? data.co2 ?? 0,

          category:  data.category  ?? 'Groceries',
          icon:      data.icon      ?? '🛒',
          // item_name is the strict grouping key — read only the dedicated field,
          // never fall through to description which may contain duration strings.
          item_name: data.item_name ?? null,

          // Resolve Firestore Timestamp → ISO string for cross-component compatibility
          timestamp: data.timestamp?.toDate?.().toISOString() ?? new Date().toISOString(),
        };
      });
      setActivities(docs);
    }, (error) => {
      console.error('Firestore listener error:', error);
    });

    // Cleanup: detach listener when user changes or component unmounts
    return () => unsubscribe();
  }, [user]);

  // Real-time listener for the user's root document (settings, preferences)
  useEffect(() => {
    if (!user) {
      setSettings({});
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().settings) {
        setSettings(docSnap.data().settings);
      }
    }, (error) => {
      console.error('User doc listener error:', error);
    });

    return () => unsubscribe();
  }, [user]);

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

  async function handleDelete(id) {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'logs', id));
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Could not delete — please try again.');
    }
  }

  // Optimistic patch: update a single activity in local state immediately
  // after a TransitSwap Firestore write, before onSnapshot fires.
  function handleEntryUpdate(id, patch) {
    setActivities(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              ...patch,
              // Keep the legacy `co2` alias in sync too
              co2: patch.co2_score_kg ?? a.co2,
            }
          : a,
      ),
    );
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
          <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
            {activeView === 'dashboard' && (
              <Dashboard activities={activities} onDelete={handleDelete} onEntryUpdate={handleEntryUpdate} user={user} settings={settings} />
            )}
            {activeView === 'insights'  && <InsightsView activities={activities} settings={settings} />}
            {activeView === 'settings'  && <SettingsView user={user} settings={settings} />}
          </Suspense>
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
