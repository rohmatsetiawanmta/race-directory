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
  Save, // Import Save
  X, // Import X
} from "lucide-react";
import { Link } from "react-router-dom";
// --- HILANGKAN KOMENTAR PADA IMPORT INI ---
import SeriesModal from "../../components/admin/SeriesModal.jsx";
// import DeleteConfirmationModal dari sini

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

// Asumsi SeriesModal diimpor dari tempat lain
// Perlu membuat SeriesModal yang sudah di-import di atas

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
    description: "",
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
        "id, series_name, organizer, description, location_city_main, series_official_url, created_at"
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
      description: formData.description || null,
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
      {/* --- REVISED HEADER: Tombol Back di Samping Judul --- */}
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
      {/* --- END REVISED HEADER --- */}

      <p className="text-gray-600 mb-8">
        Kelola Series (Induk event) untuk mengelompokkan Event tahunan.
      </p>

      {/* Tombol Aksi */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={openAddModal}
          className="flex items-center rounded-lg bg-green-600 px-6 py-2 text-white font-semibold hover:bg-green-700 transition shadow-md disabled:bg-gray-400"
          disabled={isActionDisabled}
        >
          <PlusCircle size={20} className="mr-2" /> Tambah Series Baru
        </button>
        <button
          onClick={() => navigateToEvents("event")}
          className="flex items-center rounded-lg border border-blue-500 text-blue-600 px-6 py-2 font-semibold hover:bg-blue-50 transition shadow-sm disabled:opacity-50"
          disabled={isActionDisabled}
        >
          Lihat Event Tahunan (FR-A02)
        </button>
      </div>

      {/* Daftar Series */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader size={24} className="animate-spin text-blue-600" />
        </div>
      ) : seriesList.length === 0 ? (
        <div className="text-center py-10 text-gray-500 italic bg-gray-50 rounded-xl border">
          Belum ada Series Event yang ditambahkan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            {/* --- HEAD TABLE --- */}
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nama Series
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Penyelenggara & Lokasi
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  URL Resmi
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
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
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">
                      {series.series_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">
                      {series.description || "Tidak ada deskripsi."}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-700 flex items-center">
                      <Building2 size={14} className="mr-1 text-gray-500" />
                      {series.organizer}
                    </p>
                    {series.location_city_main && (
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPin size={12} className="mr-1" />
                        {series.location_city_main}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {series.series_official_url ? (
                      <a
                        href={series.series_official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center truncate max-w-[150px]"
                      >
                        <LinkIcon size={14} className="mr-1" />
                        Link Series
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-xs">
                        Tidak ada URL
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => openEditModal(series)}
                      className={`text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition mr-2 ${
                        isActionDisabled ? "opacity-50" : ""
                      }`}
                      title="Edit Series"
                      disabled={isActionDisabled}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(series)}
                      className={`text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition ${
                        isActionDisabled ? "opacity-50" : ""
                      }`}
                      title="Hapus Series"
                      disabled={isActionDisabled}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAMBAHKAN KOMPONEN MODAL INI --- */}
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
