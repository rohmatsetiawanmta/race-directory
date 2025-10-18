import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DistanceCrud from "./DistanceCrud";
import RaceTypeCrud from "./RaceTypeCrud";

const MasterDataPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Container untuk Tombol Back dan Judul */}
      <div className="flex items-center mb-6">
        {/* Tombol Kembali ke Dashboard Admin (Paling Kiri) */}
        <Link
          to="/admin"
          className="p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition mr-4"
          title="Kembali ke Dashboard Admin"
        >
          <ArrowLeft size={24} />
        </Link>

        {/* Judul Utama */}
        <h1 className="text-4xl font-extrabold text-gray-900 flex-grow">
          Manajemen Data Master
        </h1>
      </div>

      <p className="text-gray-600 mb-8">
        Kelola daftar Jarak Lomba dan Tipe Lomba yang digunakan sebagai
        referensi oleh Event.
      </p>

      {/* Konten CRUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <DistanceCrud />
        <RaceTypeCrud />
      </div>
    </div>
  );
};

export default MasterDataPage;
