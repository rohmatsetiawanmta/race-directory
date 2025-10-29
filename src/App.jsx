import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient.js";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import toast from "react-hot-toast";

// --- Import Halaman Admin Baru ---
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import MasterDataPage from "./pages/admin/MasterDataPage.jsx";
import SeriesAndEventManagementPage from "./pages/admin/EventManagementPage.jsx";

// --- Import Halaman Publik Baru ---
import EventDirectoryPage from "./pages/EventDirectoryPage.jsx";
import EventDetailPage from "./pages/EventDetailPage.jsx";

// --- Import Placeholder Components ---
const MainPage = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold text-gray-800">
      Selamat Datang di Runmate Directory
    </h1>
    <p className="mt-4 text-gray-600">Jelajahi event lari di Indonesia!</p>
    {/* Tautan untuk melihat event di Modul Publik */}
    <a
      href="/events"
      className="mt-4 inline-block text-blue-600 hover:underline"
    >
      Mulai Cari Event Sekarang
    </a>
  </div>
);
const ComingSoon = ({ title }) => (
  <div className="container mx-auto px-4 py-8">
    <div className="flex justify-center items-center h-48 bg-gray-100 rounded-xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        <p className="mt-2 text-gray-600 italic">
          Halaman ini akan segera tersedia. Terima kasih!
        </p>
      </div>
    </div>
  </div>
);
// Hapus placeholder MasterDataPage (diganti dengan import di atas)

const ModerationPage = () => <ComingSoon title="Admin: Moderasi Event User" />;
const UserManagementPage = () => (
  <ComingSoon title="Admin: Manajemen Pengguna" />
);
const UserDashboardPage = () => <ComingSoon title="Dashboard Pengguna" />;
const UserBookmarksPage = () => <ComingSoon title="Event Favorit" />;

// --- Logika Protected Route ---
const ProtectedRoute = ({ children, userRole, isLoading }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect ke halaman login jika tidak sedang memuat dan peran bukan admin
    if (!isLoading && userRole !== "admin") {
      // Tampilkan pesan error hanya jika pengguna mencoba mengakses dan tidak memiliki akses
      if (userRole !== null) {
        // Memperbaiki logika cek role
        toast.error("Anda tidak memiliki akses ke halaman admin.");
      }
      navigate("/login", { replace: true });
    }
    // Jika sedang memuat atau userRole adalah "admin", biarkan children ditampilkan
  }, [isLoading, userRole, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Memuat...
      </div>
    );
  }

  // Hanya render children jika userRole adalah admin (karena redirect sudah dihandle di useEffect)
  return userRole === "admin" ? children : null;
};

function App() {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Efek untuk memuat sesi awal dan mendengarkan perubahan Auth
  useEffect(() => {
    const fetchUserRole = async (userId) => {
      // Mengambil peran dari tabel 'users'
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      // Jika terjadi error fetching role, asumsikan bukan admin
      setUserRole(error ? "basic" : data.role);
    };

    const handleAuthChange = async (session) => {
      if (session) {
        await fetchUserRole(session.user.id);
      } else {
        setUserRole("public"); // Set sebagai public jika tidak ada sesi
      }
      setIsLoading(false);
    };

    // Panggil sekali saat start untuk mendapatkan sesi awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    // Pasang listener untuk perubahan status autentikasi
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "USER_UPDATED"
        ) {
          handleAuthChange(session);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar otomatis mendapatkan status session dari listener di dalamnya */}
      <Navbar />

      <Routes>
        {/* Rute Utama dan Publik */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/events" element={<EventDirectoryPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />

        <Route
          path="/guide"
          element={<ComingSoon title="Panduan Mendaftar" />}
        />
        <Route
          path="/submit"
          element={<ComingSoon title="Submit Event Lari" />}
        />

        {/* Rute User Terdaftar (Perlu dicek di fase berikutnya) */}
        <Route path="/dashboard" element={<UserDashboardPage />} />
        <Route path="/bookmarks" element={<UserBookmarksPage />} />

        {/* Rute Admin yang Dilindungi */}
        <Route
          path="/admin/*"
          element={
            // userRole === "admin" di sini merujuk pada hasil fetch role, bukan status login
            <ProtectedRoute userRole={userRole} isLoading={isLoading}>
              <Routes>
                {/* 1. Dashboard Utama Admin */}
                <Route path="/" element={<AdminDashboard />} />

                {/* 2. Manajemen Master Data */}
                <Route path="master" element={<MasterDataPage />} />

                {/* 3. CRUD Series & Event */}
                <Route
                  path="events"
                  element={<SeriesAndEventManagementPage />}
                />

                {/* 4. Moderasi Event User (FR-A03) - Placeholder */}
                <Route path="moderation" element={<ModerationPage />} />

                {/* 5. Manajemen Pengguna/Peran (FR-A05) - Placeholder */}
                <Route path="users" element={<UserManagementPage />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
