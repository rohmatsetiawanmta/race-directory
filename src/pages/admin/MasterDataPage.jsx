import React from "react";
import DistanceCrud from "./DistanceCrud";
import RaceTypeCrud from "./RaceTypeCrud";

const MasterDataPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2 border-b-4 border-blue-500/50 pb-2">
        Manajemen Data Master
      </h1>
      <p className="text-gray-600 mb-8">
        Kelola daftar Jarak Lomba dan Tipe Lomba yang digunakan sebagai
        referensi oleh Event.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <DistanceCrud />
        <RaceTypeCrud />
      </div>
    </div>
  );
};

export default MasterDataPage;
