import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import {
  Loader,
  Edit,
  Trash2,
  PlusCircle,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Tag,
} from "lucide-react";

// --- KOMPONEN MODAL DELETE ---
const DeleteConfirmationModal = ({
  isOpen,
  item,
  onClose,
  onConfirm,
  isProcessing,
}) => {
  if (!isOpen || !item) return null;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 transition-opacity">
      {/* Modal Content */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 transform transition-all scale-100 opacity-100">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Konfirmasi Penghapusan
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Anda yakin ingin menghapus Tipe Lomba {item.type_name}?
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
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN MODAL TAMBAH/EDIT TIPE LOMBA ---
const RaceTypeModal = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  isProcessing,
}) => {
  // Gunakan state lokal untuk formulir
  const [formState, setFormState] = useState(initialData);

  useEffect(() => {
    // Memastikan state formulir sinkron dengan data awal yang diberikan
    setFormState(initialData);
  }, [initialData, mode]);

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formState);
  };

  if (!isOpen) return null;

  const title = mode === "add" ? "Tambah Tipe Lomba Baru" : `Edit Tipe Lomba`;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 transition-opacity">
      {/* Modal Content */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 transform transition-all scale-100 opacity-100">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-500 hover:text-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field: Nama Tipe Lomba */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Lomba
            </label>
            <input
              type="text"
              name="type_name"
              value={formState.type_name}
              onChange={(e) => handleFormChange("type_name", e.target.value)}
              placeholder="Contoh: Road Race"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              required
              disabled={isProcessing}
            />
          </div>

          {/* Field: Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi Singkat (Opsional)
            </label>
            <textarea
              name="description"
              value={formState.description || ""}
              onChange={(e) => handleFormChange("description", e.target.value)}
              rows="3"
              placeholder="Deskripsi singkat tentang tipe lomba ini."
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              disabled={isProcessing}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-200 transition text-sm"
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition text-sm disabled:bg-gray-400"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader size={18} className="animate-spin mr-2" />
              ) : (
                <Save size={18} className="mr-2" />
              )}{" "}
              {mode === "add" ? "Simpan Tipe Lomba" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- KOMPONEN UTAMA CRUD TIPE LOMBA ---
const RaceTypeCrud = () => {
  const tableName = "race_types";
  const displayName = "Tipe Lomba";
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // Untuk submit dan delete

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentRaceType, setCurrentRaceType] = useState(null);

  // --- DELETE MODAL STATE ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const initialFormState = { type_name: "", description: "" };

  // Hitung sort order maksimum yang ada
  const maxSortOrder = useMemo(() => {
    return data.length > 0 ? Math.max(...data.map((d) => d.sort_order)) : 0;
  }, [data]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: fetchedData, error } = await supabase
      .from(tableName)
      .select("id, type_name, description, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching data:", error);
      toast.error(`Gagal memuat daftar ${displayName}.`);
    } else {
      setData(fetchedData);
    }
    setIsLoading(false);
  };

  // --- MODAL CONTROL FUNCTIONS ---

  const openAddModal = () => {
    setCurrentRaceType(initialFormState);
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentRaceType(item);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentRaceType(null);
    setModalMode("add");
    setIsProcessing(false);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    setIsProcessing(false);
  };

  // --- SUBMISSION LOGIC (ADD/EDIT) ---
  const handleModalSubmit = async (formData) => {
    if (isProcessing) return;

    if (!formData.type_name.trim()) {
      toast.error("Nama Tipe Lomba wajib diisi.");
      return;
    }

    setIsProcessing(true);

    let result;
    let toastMessage;
    const toastId = toast.loading(
      modalMode === "add"
        ? `Menambahkan ${displayName}...`
        : `Memperbarui ${displayName}...`
    );

    const payload = {
      type_name: formData.type_name.trim(),
      description: formData.description ? formData.description.trim() : null, // Handle deskripsi opsional
    };

    if (modalMode === "edit") {
      // Logika Update
      result = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", currentRaceType.id);
      toastMessage = `${displayName} berhasil diperbarui!`;
    } else {
      // Logika Insert (tambahkan sort_order baru)
      payload.sort_order = maxSortOrder + 1;
      result = await supabase.from(tableName).insert([payload]);
      toastMessage = `${displayName} baru berhasil ditambahkan!`;
    }

    if (result.error) {
      console.error("Supabase Error:", result.error);
      toast.error(`Gagal: ${result.error.message}`, { id: toastId });
    } else {
      toast.success(toastMessage, { id: toastId });
      closeModal();
      fetchData();
    }
    setIsProcessing(false);
  };

  // --- DELETE CONFIRMATION LOGIC ---
  const handleDeleteConfirm = async (id) => {
    if (isProcessing) return;

    setIsProcessing(true);
    const toastId = toast.loading(`Menghapus ${displayName}...`);

    const { error } = await supabase.from(tableName).delete().eq("id", id);

    if (error) {
      console.error("Supabase Delete Error:", error);
      toast.error(
        `Gagal menghapus ${displayName}. Pesan: ${error.message}. Kemungkinan masih terhubung dengan Event.`,
        { id: toastId }
      );
    } else {
      toast.success(`${displayName} berhasil dihapus!`, { id: toastId });
      await fetchData();
    }
    closeDeleteModal();
  };

  // --- REORDERING LOGIC ---
  const reorderItem = async (currentItem, newSortOrder) => {
    if (isProcessing || isLoading) return;

    const targetItem = data.find((d) => d.sort_order === newSortOrder);

    if (!targetItem) return;

    setIsProcessing(true);
    const toastId = toast.loading("Mengubah urutan...");

    const currentOrder = currentItem.sort_order;
    const targetOrder = targetItem.sort_order;

    const updates = [
      supabase
        .from(tableName)
        .update({ sort_order: targetOrder })
        .eq("id", currentItem.id),
      supabase
        .from(tableName)
        .update({ sort_order: currentOrder })
        .eq("id", targetItem.id),
    ];

    const results = await Promise.all(updates);

    const hasError = results.some((res) => res.error);

    if (hasError) {
      console.error("Reordering Error:", results);
      toast.error("Gagal mengubah urutan. Cek console untuk detail.", {
        id: toastId,
      });
    } else {
      fetchData();
      toast.success("Urutan berhasil diubah!", { id: toastId });
    }
    setIsProcessing(false);
  };

  const isActionDisabled =
    isProcessing || isModalOpen || isDeleteModalOpen || isLoading;
  const numItems = data.length;

  return (
    <div className="rounded-xl bg-white p-6 shadow-xl border border-gray-100 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-semibold text-gray-800">{displayName}</h3>

        {/* Tombol Tambah (Membuka Modal) */}
        <button
          onClick={openAddModal}
          className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition shadow-md w-fit"
          disabled={isActionDisabled}
        >
          <PlusCircle size={18} className="mr-2" /> Tambah {displayName}
        </button>
      </div>

      {/* Tampilan Data - Menggunakan Tabel */}
      {isLoading ? (
        <div className="flex justify-center py-8 flex-grow items-center">
          <Loader size={24} className="animate-spin text-blue-600" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-gray-500 italic text-center py-8">
          Belum ada data {displayName.toLowerCase()} yang tersimpan.
        </p>
      ) : (
        <div className="flex flex-col flex-grow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/12">
                  Urutan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/4">
                  Tipe Lomba
                </th>
                {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Deskripsi
                </th> */}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition text-sm"
                >
                  {/* Kolom Urutan: Panah Atas, Nomor, Panah Bawah */}
                  <td className="px-4 py-3 text-left w-1/12">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => reorderItem(item, item.sort_order - 1)}
                        className={`p-1 rounded-full ${
                          index === 0 || isActionDisabled
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                        }`}
                        title="Pindahkan ke Atas"
                        disabled={index === 0 || isActionDisabled}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <span className="text-sm font-semibold text-gray-700 w-4 text-center">
                        {index + 1}
                      </span>
                      <button
                        onClick={() => reorderItem(item, item.sort_order + 1)}
                        className={`p-1 rounded-full ${
                          index === numItems - 1 || isActionDisabled
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                        }`}
                        title="Pindahkan ke Bawah"
                        disabled={index === numItems - 1 || isActionDisabled}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-semibold text-gray-900 w-1/4">
                    {item.type_name}
                  </td>
                  {/* <td className="px-4 py-3 text-gray-600">
                    {item.description || (
                      <span className="italic text-gray-400">
                        Tidak ada deskripsi
                      </span>
                    )}
                  </td> */}

                  <td className="px-4 py-3 text-right w-32">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className={`p-1 rounded-full ${
                          isActionDisabled
                            ? "text-gray-400"
                            : "text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition"
                        }`}
                        title="Edit"
                        disabled={isActionDisabled}
                      >
                        <Edit size={18} />
                      </button>

                      <button
                        onClick={() => openDeleteModal(item)}
                        className={`p-1 rounded-full ${
                          isActionDisabled
                            ? "text-gray-400"
                            : "text-red-600 hover:text-red-800 hover:bg-red-100 transition"
                        }`}
                        title="Hapus"
                        disabled={isActionDisabled}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah/Edit Tipe Lomba */}
      <RaceTypeModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={currentRaceType || initialFormState}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isProcessing={isProcessing}
      />

      {/* Modal Konfirmasi Hapus */}
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

export default RaceTypeCrud;
