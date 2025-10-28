// src/pages/admin/SeriesCrud.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import {
  Loader,
  Edit,
  Trash2,
  PlusCircle,
  Link as LinkIcon,
  MapPin,
  Building2,
  AlertTriangle,
  ArrowLeft,
  Save,
  X,
  CircleArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import SeriesModal from "../../components/admin/SeriesModal.jsx";

// --- KOMPONEN MODAL DELETE --- (Disertakan untuk kemandirian file)
const DeleteConfirmationModal = ({
  isOpen,
  item,
  onClose,
  onConfirm,
  isProcessing,
}) => {
  if (!isOpen || !item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 transform transition-all">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Konfirmasi Hapus Series
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Anda yakin ingin menghapus Series **{item.series_name}**?
          </p>
          <p className="text-xs text-red-600 font-semibold mb-4">
            PERINGATAN: Penghapusan Series akan **gagal** jika masih ada Event
            Tahunan yang terhubung.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-200 transition text-sm"
            disabled={isProcessing}
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(item.id)}
            className="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 transition text-sm disabled:bg-gray-400"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader size={18} className="animate-spin mr-2" />
            ) : (
              <Trash2 size={18} className="mr-2" />
            )}{" "}
            Hapus Series
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END MODAL DELETE ---

const SeriesCrud = ({ navigateToEvents }) => {
  const tableName = "series";
  const displayName = "Series Event";

  const [seriesList, setSeriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentSeries, setCurrentSeries] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const initialFormState = {
    series_name: "",
    organizer: "",
    location_city_main: "",
    series_official_url: "",
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select(
        "id, series_name, organizer, location_city_main, series_official_url, created_at"
      )
      .order("series_name", { ascending: true });

    if (error) {
      console.error(`Error fetching ${displayName}:`, error);
      toast.error(`Gagal memuat daftar ${displayName}.`);
    } else {
      setSeriesList(data);
    }
    setIsLoading(false);
  };

  const openAddModal = () => {
    setCurrentSeries(initialFormState);
    setModalMode("add");
    setIsModalOpen(true);
  };
  const openEditModal = (item) => {
    setCurrentSeries(item);
    setModalMode("edit");
    setIsModalOpen(true);
  };
  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentSeries(null);
    setIsProcessing(false);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    setIsProcessing(false);
  };

  // --- IMPLEMENTASI LOGIKA SUBMIT (ADD/EDIT) ---
  const handleModalSubmit = async (formData) => {
    if (isProcessing) return;

    if (!formData.series_name.trim() || !formData.organizer.trim()) {
      toast.error("Nama Series dan Penyelenggara wajib diisi.");
      return;
    }

    setIsProcessing(true);

    const payload = {
      series_name: formData.series_name.trim(),
      organizer: formData.organizer.trim(),
      location_city_main: formData.location_city_main || null,
      series_official_url: formData.series_official_url || null,
    };

    let result;
    const toastId = toast.loading(
      formData.id
        ? `Memperbarui ${displayName}...`
        : `Menambah ${displayName}...`
    );

    try {
      if (formData.id) {
        // Logic for EDIT (UPDATE)
        result = await supabase
          .from(tableName)
          .update(payload)
          .eq("id", formData.id);
      } else {
        // Logic for ADD (INSERT)
        result = await supabase.from(tableName).insert([payload]);
      }

      if (result.error) throw result.error;

      toast.success(
        formData.id
          ? `${displayName} berhasil diperbarui!`
          : `${displayName} baru berhasil ditambahkan!`,
        { id: toastId }
      );
      closeModal();
      fetchSeries(); // Refresh list
    } catch (error) {
      console.error("Supabase Error:", error);
      toast.error(`Gagal: ${error.message || "Kesalahan Server"}`, {
        id: toastId,
      });
      setIsProcessing(false);
    }
  };

  // --- IMPLEMENTASI LOGIKA DELETE ---
  const handleDeleteConfirm = async (id) => {
    if (isProcessing) return;

    setIsProcessing(true);
    const toastId = toast.loading(`Menghapus ${displayName}...`);

    try {
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) {
        // Cek jika error adalah karena Foreign Key Constraint (ada Event yang terhubung)
        const isForeignKeyError = error.code === "23503"; // Kode PostgreSQL untuk foreign_key_violation
        if (isForeignKeyError) {
          throw new Error(
            "Gagal menghapus Series. Pastikan tidak ada Event Tahunan yang masih terhubung."
          );
        }
        throw error;
      }

      toast.success(`${displayName} berhasil dihapus.`, { id: toastId });
      closeDeleteModal();
      fetchSeries(); // Refresh list
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(`Gagal menghapus Series. Pesan: ${error.message}.`, {
        id: toastId,
      });
      setIsProcessing(false);
    }
  };

  const isActionDisabled = isProcessing || isModalOpen || isDeleteModalOpen;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Container untuk Tombol Back dan Judul (Sama seperti MasterDataPage) */}
      <div className="flex items-center mb-6">
        <Link
          to="/admin"
          className="p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition mr-4 flex-shrink-0"
          title="Kembali ke Dashboard Admin"
          disabled={isActionDisabled}
        >
          <ArrowLeft size={24} />
        </Link>

        <h1 className="text-4xl font-extrabold text-gray-900 flex-grow">
          Series Management
        </h1>
      </div>

      <p className="text-gray-600 mb-8">
        Kelola Series (Induk event) untuk mengelompokkan Event tahunan.
      </p>

      {/* Kontainer Utama Series CRUD (Mirip DistanceCrud) */}
      <div className="rounded-xl bg-white p-6 shadow-xl border border-gray-100 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold text-gray-800">
            {displayName}
          </h3>

          {/* Tombol Aksi Kanan (Direvisi untuk navigasi ke SEMUA event) */}
          <div className="flex gap-3">
            <button
              onClick={() => navigateToEvents("event", null)} // Navigasi ke event tanpa filter
              className="flex items-center rounded-lg border border-blue-500 text-blue-600 px-4 py-2 font-semibold hover:bg-blue-50 transition shadow-sm disabled:opacity-50 text-sm"
              disabled={isActionDisabled}
            >
              Lihat Semua Event
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition shadow-md w-fit text-sm"
              disabled={isActionDisabled}
            >
              <PlusCircle size={18} className="mr-2" /> Tambah {displayName}
            </button>
          </div>
        </div>

        {/* Daftar Series */}
        {isLoading ? (
          <div className="flex justify-center py-8 flex-grow items-center">
            <Loader size={24} className="animate-spin text-blue-600" />
          </div>
        ) : seriesList.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">
            Belum ada Series Event yang ditambahkan.
          </p>
        ) : (
          <div className="flex flex-col flex-grow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              {/* --- HEAD TABLE --- */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                    Nama Series
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/3">
                    Penyelenggara Utama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                    Lokasi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                    URL Resmi
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-1/6">
                    Aksi
                  </th>
                </tr>
              </thead>
              {/* --- BODY TABLE --- */}
              <tbody className="bg-white divide-y divide-gray-200">
                {seriesList.map((series) => (
                  <tr
                    key={series.id}
                    className="hover:bg-gray-50 transition text-sm"
                  >
                    <td className="px-4 py-3 w-2/5">
                      <p className="font-semibold text-gray-900">
                        {series.series_name}
                      </p>
                    </td>
                    <td className="px-4 py-3 w-1/6">
                      <p className="font-medium text-gray-700 flex items-center">
                        {series.organizer}
                      </p>
                    </td>
                    <td className="px-4 py-3 w-1/6">
                      {series.location_city_main ? (
                        <p className="text-sm text-gray-700 flex items-center">
                          {series.location_city_main}
                        </p>
                      ) : (
                        <span className="text-gray-400 italic text-xs">
                          Belum ditentukan
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 w-1/6">
                      {series.series_official_url ? (
                        <a
                          href={series.series_official_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs flex items-center truncate max-w-[150px]"
                        >
                          Link Series
                        </a>
                      ) : (
                        <span className="text-gray-400 italic text-xs">
                          Tidak ada URL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right w-1/6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(series)}
                          className={`p-1 rounded-full ${
                            isActionDisabled
                              ? "text-gray-400"
                              : "text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition"
                          }`}
                          title="Edit Series"
                          disabled={isActionDisabled}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(series)}
                          className={`p-1 rounded-full ${
                            isActionDisabled
                              ? "text-gray-400"
                              : "text-red-600 hover:text-red-800 hover:bg-red-100 transition"
                          }`}
                          title="Hapus Series"
                          disabled={isActionDisabled}
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={() => navigateToEvents("event", series.id)} // <-- Kirim series.id
                          className={`p-1 rounded-full ${
                            isActionDisabled
                              ? "text-gray-400"
                              : "text-green-600 hover:text-green-800 hover:bg-green-100 transition"
                          }`}
                          title={`Lihat Event Tahunan di ${series.series_name}`}
                          disabled={isActionDisabled}
                        >
                          <CircleArrowRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit Series (SeriesModal dari components) */}
      <SeriesModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={currentSeries || initialFormState}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isProcessing={isProcessing}
      />

      {/* Modal Konfirmasi Hapus Series */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        item={itemToDelete}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default SeriesCrud;
