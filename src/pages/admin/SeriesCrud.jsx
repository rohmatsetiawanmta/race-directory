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
} from "lucide-react";
import { Link } from "react-router-dom";
// import SeriesModal from "../../components/admin/SeriesModal.jsx"; // Anggap sudah ada
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
            className="rounded-lg bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 transition text-sm disabled:bg-gray-400"
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
// const SeriesModal = ({...}) => {...};

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
    if (!error) setSeriesList(data);
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

  // (Implementasi handleModalSubmit dan handleDeleteConfirm dihilangkan untuk fokus pada UI)

  // Placeholder untuk fungsi submit/delete
  const handleModalSubmit = async (formData) => {
    toast.error("Logika Submit Belum Penuh!");
    closeModal();
  };
  const handleDeleteConfirm = async (id) => {
    toast.error("Logika Hapus Belum Penuh!");
    closeDeleteModal();
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
        <div className="text-center py-10 text-gray-500 italic bg-gray-50 rounded-xl">
          Belum ada Series Event yang ditambahkan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            {/* ... table content */}
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit Series (Anggap SeriesModal sudah di-define/impor) */}
      {/* <SeriesModal ... /> */}

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
