import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient.js";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import toast from "react-hot-toast";

// --- Import Placeholder Components ---
const MainPage = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold text-gray-800">
      Selamat Datang di Runmate Directory
    </h1>
    <p className="mt-4 text-gray-600">Jelajahi event lari di Indonesia!</p>
  </div>
);
const ComingSoon = ({ title }) => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
    <p className="mt-4 text-gray-600">Halaman ini akan segera tersedia.</p>
  </div>
);
const EventManagementPage = () => <ComingSoon title="Admin: Kelola Event" />;
const AdminPage = () => <ComingSoon title="Panel Admin" />;
const UserDashboardPage = () => <ComingSoon title="Dashboard Pengguna" />;
const UserBookmarksPage = () => <ComingSoon title="Event Favorit" />;

// --- Logika Protected Route ---
const ProtectedRoute = ({ children, userRole, isLoading }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && userRole !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [isLoading, userRole, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Memuat...
      </div>
    );
  }

  return userRole === "admin" ? children : null;
};

function App() {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Efek untuk memuat sesi awal dan mendengarkan perubahan Auth
  useEffect(() => {
    const fetchUserRole = async (userId) => {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();
      setUserRole(error ? null : data.role);
    };

    const handleAuthChange = async (session) => {
      if (session) {
        await fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
      setIsLoading(false);
    };

    // Panggil sekali saat start
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    // Pasang listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Hanya atur isLoading ke false saat pertama kali
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          handleAuthChange(session);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar otomatis mendapatkan status session dari listener di dalamnya */}
      <Navbar />

      <Routes>
        {/* Rute Utama dan Publik */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/events"
          element={<ComingSoon title="Direktori Event" />}
        />
        <Route
          path="/guide"
          element={<ComingSoon title="Panduan Mendaftar" />}
        />
        <Route
          path="/submit"
          element={<ComingSoon title="Submit Event Lari" />}
        />

        {/* Rute User Terdaftar */}
        <Route path="/dashboard" element={<UserDashboardPage />} />
        <Route path="/bookmarks" element={<UserBookmarksPage />} />

        {/* Rute Admin yang Dilindungi */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute userRole={userRole} isLoading={isLoading}>
              <Routes>
                <Route path="/" element={<AdminPage />} />
                <Route path="events" element={<EventManagementPage />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
