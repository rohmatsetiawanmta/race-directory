// src/pages/AdminDashboard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { ListChecks, Settings, Users, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  // Data kartu dashboard untuk navigasi
  const adminModules = [
    {
      title: "Kelola Series & Event",
      description: "CRUD Event, termasuk data tahunan (FR-A01, FR-A02).",
      icon: <ListChecks size={24} className="text-white" />,
      to: "/admin/events",
    },
    {
      title: "Moderasi Event User",
      description:
        "Meninjau dan menyetujui event yang diajukan pengguna (FR-A03).",
      icon: <BookOpen size={24} className="text-white" />,
      to: "/admin/moderation",
      // Catatan: Rute ini belum ada di App.jsx, akan ditambahkan nanti.
    },
    {
      title: "Manajemen Data Master",
      description: "Jarak Lomba dan Tipe Lomba (FR-A04).",
      icon: <Settings size={24} className="text-white" />,
      to: "/admin/master",
    },
    {
      title: "Manajemen Pengguna",
      description: "Mengelola peran pengguna dan hak akses (FR-A05).",
      icon: <Users size={24} className="text-white" />,
      to: "/admin/users",
      // Catatan: Rute ini belum ada di App.jsx, akan ditambahkan nanti.
    },
  ];

  const handleSoonClick = (e, to) => {
    // Mencegah navigasi jika rute belum diimplementasikan
    if (
      to === "/admin/events" ||
      to === "/admin/moderation" ||
      to === "/admin/users"
    ) {
      e.preventDefault();
      toast("Modul ini masih dalam tahap pengembangan.", {
        icon: "🚧",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
        Selamat Datang, Admin!
      </h1>
      <p className="text-lg text-gray-600 mb-10">
        Pusat kontrol untuk Runmate Directory.
      </p>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((module, index) => (
          <Link
            key={index}
            to={module.to}
            onClick={(e) => handleSoonClick(e, module.to)}
            className="flex flex-col rounded-xl bg-white p-6 shadow-2xl transition duration-300 hover:scale-[1.02] hover:shadow-blue-300/50"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 mb-4`}
            >
              {module.icon}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {module.title}
            </h2>
            <p className="text-gray-600 flex-grow">{module.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
        <p className="font-semibold">Status Pengembangan:</p>
        <ul className="list-disc list-inside ml-4 mt-2 text-sm">
          <li>Manajemen Data Master (/admin/master) sudah siap dikerjakan.</li>
          <li>Modul lain masih menggunakan penanda.</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
