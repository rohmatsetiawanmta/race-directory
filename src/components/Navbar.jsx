import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Item Navigasi utama dikosongkan
const navItems = [
  // { name: "Direktori Event", to: "/events" },
  // { name: "Cara Mendaftar", to: "/guide" },
  // { name: "Submit Event", to: "/submit" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Hapus isProfileDropdownOpen
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async (userId) => {
      // Mengambil peran (role) dari tabel 'users'
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } else {
        setUserRole(data.role);
      }
    };

    // Memeriksa sesi saat komponen di-mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      }
    });

    // Mendengarkan perubahan status otentikasi
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) {
          fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Hapus setIsProfileDropdownOpen(false);
  };

  // Hapus toggleProfileDropdown

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    // Hapus setIsProfileDropdownOpen(false);
  };

  const handleLinkClick = () => {
    // Hapus logika dropdown, hanya tutup menu mobile
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        {/* Nama Brand: Runmate Directory (Warna Biru) */}
        <Link to="/" className="text-2xl font-bold text-gray-800">
          Runmate Directory
        </Link>

        <div className="md:hidden">
          <button onClick={toggleMenu} className="focus:outline-none">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Kontainer Menu Navigasi & Profile */}
        <div
          className={`
            absolute top-16 left-0 right-0 z-10 flex-col bg-white px-4 py-2 shadow-md md:static md:flex md:flex-row md:items-center md:justify-end md:gap-x-6 md:p-0 md:shadow-none
            ${isMenuOpen ? "flex" : "hidden"}
          `}
        >
          {/* Item Navigasi Utama: Sekarang Kosong */}
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `py-2 text-lg font-medium md:py-0 ${
                  isActive
                    ? "text-blue-600 font-bold" // Warna aktif Biru
                    : "text-gray-700 hover:text-blue-600"
                }`
              }
              onClick={handleLinkClick}
            >
              {item.name}
            </NavLink>
          ))}

          {session ? (
            /* Tautan dan Tombol Logout Langsung (Jika User Login) */
            <>
              {/* Tautan Dashboard Dihapus */}
              {/* <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `py-2 text-lg font-medium md:py-0 ${
                        isActive
                          ? "text-blue-600 font-bold"
                          : "text-gray-700 hover:text-blue-600"
                      }`
                    }
                    onClick={handleLinkClick}
                  >
                    Dashboard
                </NavLink> */}

              {/* Tautan Event Favorit Dihapus */}
              {/* <NavLink
                    to="/bookmarks"
                    className={({ isActive }) =>
                      `py-2 text-lg font-medium md:py-0 ${
                        isActive
                          ? "text-blue-600 font-bold"
                          : "text-gray-700 hover:text-blue-600"
                      }`
                    }
                    onClick={handleLinkClick}
                  >
                    Event Favorit
                </NavLink> */}

              {userRole === "admin" && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `py-2 text-lg font-medium md:py-0 ${
                      isActive
                        ? "text-red-600 font-bold"
                        : "text-gray-700 hover:text-red-600"
                    }`
                  }
                  onClick={handleLinkClick}
                >
                  Admin Panel
                </NavLink>
              )}
              <button
                onClick={handleLogout}
                className="py-2 text-lg font-semibold text-red-600 hover:text-red-800 md:py-0"
              >
                Logout
              </button>
            </>
          ) : (
            /* Tombol Login (Warna Biru) */
            <Link
              to="/login"
              className="py-2 px-4 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm md:py-1"
              onClick={handleLinkClick}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
