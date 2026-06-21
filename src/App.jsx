import { useState, useEffect, lazy, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import TopAppBar from "./components/TopAppBar";
import Dashboard from "./components/Dashboard";
import LoginScreen from "./components/LoginScreen";
const InsightsView = lazy(() => import("./components/InsightsView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
import StickyActions from "./components/StickyActions";

/**
 * Main application component responsible for state routing, Firebase Auth state sync,
 * real-time Firestore listeners, and layout structure.
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [activities, setActivities] = useState([]);
  const [settings, setSettings] = useState({});
  const [toast, setToast] = useState(null);

  // Defer Firebase initialisation: runs after the first paint so it does
  // not block the Login screen from appearing immediately.
  useEffect(() => {
    let unsubscribe = () => {};
    // Both imports are cached by the module system after the first call
    Promise.all([import("../firebase"), import("firebase/auth")]).then(
      ([{ auth }, { onAuthStateChanged }]) => {
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
        });
      },
    );
    return () => unsubscribe();
  }, []);

  // Real-time Firestore listener — deferred, only runs once a user is signed in
  useEffect(() => {
    if (!user) {
      setActivities([]);
      return;
    }

    let unsubscribe = () => {};

    // Dynamic import keeps Firestore off the critical path
    Promise.all([import("../firebase"), import("firebase/firestore")]).then(
      ([
        { db },
        { collection, query, where, orderBy, onSnapshot, Timestamp },
      ]) => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const q = query(
          collection(db, "users", user.uid, "logs"),
          where("timestamp", ">=", Timestamp.fromDate(oneWeekAgo)),
          orderBy("timestamp", "desc"),
        );

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const docs = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                ...data,
                id: docSnap.id,
                description:
                  data.description ??
                  (data.items?.length
                    ? `${data.items.length} grocery item${data.items.length > 1 ? "s" : ""}`
                    : "Grocery analysis"),
                co2: data.co2_score_kg ?? data.co2 ?? 0,
                category: data.category ?? "Groceries",
                icon: data.icon ?? "🛒",
                item_name: data.item_name ?? null,
                timestamp:
                  data.timestamp?.toDate?.().toISOString() ??
                  new Date().toISOString(),
              };
            });
            setActivities(docs);
          },
          (error) => {
            console.error("Firestore listener error:", error);
          },
        );
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for the user's root document (settings, preferences)
  useEffect(() => {
    if (!user) {
      setSettings({});
      return;
    }

    let unsubscribe = () => {};

    Promise.all([import("../firebase"), import("firebase/firestore")]).then(
      ([{ db }, { doc, onSnapshot }]) => {
        const userDocRef = doc(db, "users", user.uid);
        unsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists() && docSnap.data().settings) {
              setSettings(docSnap.data().settings);
            }
          },
          (error) => {
            console.error("User doc listener error:", error);
          },
        );
      },
    );

    return () => unsubscribe();
  }, [user]);

  /**
   * Triggers the Google Sign-In pop-up flow using Firebase Authentication.
   */
  const handleLogin = async () => {
    try {
      const { auth, provider } = await import("../firebase");
      const { signInWithPopup, GoogleAuthProvider } =
        await import("firebase/auth");
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) localStorage.setItem("google_fit_token", token);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  /**
   * Triggers the Sign-Out flow using Firebase Authentication and cleans tokens.
   */
  const handleLogout = async () => {
    try {
      const { auth } = await import("../firebase");
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      localStorage.removeItem("google_fit_token");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Auth state is resolved asynchronously; no blocking blank-screen guard needed.

  // If not logged in, show the Login Screen
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  /**
   * Renders a temporary floating toast message to the user.
   *
   * @param {string} msg - The text to display in the toast notification.
   */
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  /**
   * Deletes a log entry from Firestore.
   *
   * @param {string} id - The Firestore document identifier for the log.
   */
  async function handleDelete(id) {
    try {
      const { db } = await import("../firebase");
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "users", user.uid, "logs", id));
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("Could not delete — please try again.");
    }
  }

  // Optimistic patch: update a single activity in local state immediately
  // after a TransitSwap Firestore write, before onSnapshot fires.
  /**
   * Optimistically updates a single activity log entry's fields in local state.
   *
   * @param {string} id - The document ID of the activity log.
   * @param {Object} patch - The values to merge into the activity object.
   */
  function handleEntryUpdate(id, patch) {
    setActivities((prev) =>
      prev.map((a) =>
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
        <TopAppBar
          activeView={activeView}
          onNavigate={setActiveView}
          onLogout={handleLogout}
        />

        <main
          id="main-content"
          className="flex-1 px-5 md:px-8 py-8 pb-28 overflow-auto"
          aria-label={`${activeView} view`}
        >
          <Suspense
            fallback={<div className="text-center p-4">Loading...</div>}
          >
            {activeView === "dashboard" && (
              <Dashboard
                activities={activities}
                onDelete={handleDelete}
                onEntryUpdate={handleEntryUpdate}
                user={user}
                settings={settings}
              />
            )}
            {activeView === "insights" && (
              <InsightsView activities={activities} settings={settings} />
            )}
            {activeView === "settings" && (
              <SettingsView user={user} settings={settings} />
            )}
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
