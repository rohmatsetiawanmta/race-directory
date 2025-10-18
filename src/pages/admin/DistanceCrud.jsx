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
} from "lucide-react";

// --- KOMPONEN MODAL DELETE BARU ---
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
            Anda yakin ingin menghapus jarak {item.distance_name} (
            {item.distance_km} km)?
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-200 transition text-sm"
            disabled={isProcessing}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(item.id)}
            className="flex items-center rounded-lg bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 transition text-sm disabled:bg-gray-400"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader size={18} className="animate-spin mr-2" />
            ) : (
              <Trash2 size={18} className="mr-2" />
            )}{" "}
            Hapus Permanen
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN MODAL TAMBAH/EDIT ---
const DistanceModal = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  isProcessing,
}) => {
  const [formState, setFormState] = useState(initialData);

  useEffect(() => {
    // Reset form state ketika modal dibuka atau data/mode berubah
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

  const title = mode === "add" ? "Tambah Jarak Lomba Baru" : `Edit Jarak`;

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
          {/* Field: Nama Jarak */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Jarak
            </label>
            <input
              type="text"
              value={formState.distance_name}
              onChange={(e) =>
                handleFormChange("distance_name", e.target.value)
              }
              placeholder="Contoh: Half Marathon"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              required
              disabled={isProcessing}
            />
          </div>
          {/* Field: Jarak KM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jarak (km)
            </label>
            <input
              type="number"
              value={formState.distance_km}
              onChange={(e) =>
                handleFormChange("distance_km", parseFloat(e.target.value) || 0)
              }
              placeholder="Contoh: 21.1"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              required
              step="0.1"
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
              {mode === "add" ? "Simpan Jarak Baru" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- KOMPONEN UTAMA CRUD ---
const DistanceCrud = () => {
  const tableName = "distances";
  const displayName = "Jarak Lomba";
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [currentDistance, setCurrentDistance] = useState(null); // Data untuk modal Tambah/Edit

  // --- DELETE MODAL STATE ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Data untuk modal Hapus

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
      .select("id, distance_name, distance_km, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(`Error fetching ${displayName}:`, error);
      toast.error(`Gagal memuat data ${displayName}.`);
    } else {
      const processedData = fetchedData.map((item) => ({
        ...item,
        distance_km: parseFloat(item.distance_km) || 0,
        sort_order: parseInt(item.sort_order) || 99,
      }));
      setData(processedData);
    }
    setIsLoading(false);
  };

  // --- MODAL CONTROL FUNCTIONS ---

  const openAddModal = () => {
    setCurrentDistance({ distance_name: "", distance_km: 0 });
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentDistance(item); // Load existing data
    setModalMode("edit");
    setIsModalOpen(true);
  };

  // Membuka modal konfirmasi hapus
  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setItemToDelete(null);
    setCurrentDistance(null);
    setModalMode("add");
    setIsProcessing(false);
  };

  // Menutup modal hapus
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    setIsProcessing(false);
  };

  // --- SUBMISSION LOGIC (COMBINED) ---

  const handleModalSubmit = async (formData) => {
    if (isProcessing) return;

    if (!formData.distance_name.trim() || formData.distance_km <= 0) {
      toast.error("Nama dan KM harus diisi dengan benar.");
      return;
    }

    setIsProcessing(true);

    let payload;
    let result;
    let toastMessage;
    const toastId = toast.loading(
      modalMode === "add"
        ? `Menambah ${displayName}...`
        : `Memperbarui ${displayName}...`
    );

    if (modalMode === "add") {
      // Logic for ADD
      const newSortOrder = maxSortOrder + 1;
      payload = {
        distance_name: formData.distance_name.trim(),
        distance_km: formData.distance_km,
        sort_order: newSortOrder,
      };
      result = await supabase.from(tableName).insert([payload]);
      toastMessage = `${displayName} berhasil ditambahkan!`;
    } else {
      // Logic for EDIT (UPDATE)
      payload = {
        distance_name: formData.distance_name.trim(),
        distance_km: formData.distance_km,
      };
      // Menggunakan currentDistance.id yang sudah diload saat openEditModal
      result = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", currentDistance.id);
      toastMessage = `${displayName} berhasil diperbarui!`;
    }

    if (result.error) {
      console.error("Supabase Error:", result.error);
      toast.error(
        `Gagal ${
          modalMode === "add" ? "menambah" : "memperbarui"
        } ${displayName}. Pesan: ${result.error.message}`,
        { id: toastId }
      );
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
      toast.error(
        `Gagal menghapus ${displayName}. Pastikan tidak ada Event yang menggunakannya.`,
        { id: toastId }
      );
    } else {
      toast.success(`${displayName} berhasil dihapus.`, { id: toastId });
      await fetchData();
    }

    closeDeleteModal(); // Tutup modal setelah proses selesai
  };

  const handleReorder = async (currentIndex, direction) => {
    if (isProcessing) return;

    const newIndex = currentIndex + (direction === "up" ? -1 : 1);
    if (newIndex < 0 || newIndex >= data.length) return;

    setIsProcessing(true);
    const toastId = toast.loading("Mengubah urutan...");

    const currentItem = data[currentIndex];
    const targetItem = data[newIndex];

    // Swap the actual sort_order values
    const newOrder1 = targetItem.sort_order;
    const newOrder2 = currentItem.sort_order;

    const { error: error1 } = await supabase
      .from(tableName)
      .update({ sort_order: newOrder1 })
      .eq("id", currentItem.id);

    const { error: error2 } = await supabase
      .from(tableName)
      .update({ sort_order: newOrder2 })
      .eq("id", targetItem.id);

    if (error1 || error2) {
      console.error("Reorder Error:", error1, error2);
      toast.error("Gagal mengubah urutan. Silakan coba lagi.", { id: toastId });
    } else {
      toast.success("Urutan berhasil diubah.", { id: toastId });
      await fetchData();
    }
    setIsProcessing(false);
  };

  // Tombol aksi di-disable saat ada modal terbuka atau ada proses sedang berjalan
  const isActionDisabled = isProcessing || isModalOpen || isDeleteModalOpen;

  return (
    <div className="rounded-xl bg-white p-6 shadow-xl border border-gray-100 h-full flex flex-col">
      <h3 className="mb-4 text-2xl font-semibold text-gray-800">
        {displayName}
      </h3>

      {/* Tombol Tambah (Membuka Modal) */}
      <button
        onClick={openAddModal}
        className="mb-6 flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition shadow-md w-fit"
        disabled={isActionDisabled}
      >
        <PlusCircle size={18} className="mr-2" /> Tambah {displayName}
      </button>

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">
                  Urutan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">
                  Nama Jarak
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">
                  KM
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-1/4">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={item.id} className="text-sm hover:bg-gray-50">
                  {/* Kolom Urutan: Panah Atas, Nomor, Panah Bawah */}
                  <td className="px-4 py-3 text-left">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleReorder(index, "up")}
                        disabled={index === 0 || isActionDisabled}
                        className={`p-1 rounded-full ${
                          index === 0 || isActionDisabled
                            ? "text-gray-400"
                            : "text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                        }`}
                        title="Pindahkan ke atas"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <span className="text-sm font-semibold text-gray-700 w-4 text-center">
                        {index + 1}
                      </span>
                      <button
                        onClick={() => handleReorder(index, "down")}
                        disabled={index === data.length - 1 || isActionDisabled}
                        className={`p-1 rounded-full ${
                          index === data.length - 1 || isActionDisabled
                            ? "text-gray-400"
                            : "text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                        }`}
                        title="Pindahkan ke bawah"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-700 truncate">
                    {item.distance_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.distance_km} km
                  </td>

                  {/* Kolom Aksi Edit/Delete (Membuka Modal Edit) */}
                  <td className="px-4 py-3 text-right">
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

      {/* Modal Tambah/Edit Jarak */}
      <DistanceModal
        isOpen={isModalOpen}
        mode={modalMode}
        // Pastikan initialData selalu berupa objek yang valid
        initialData={currentDistance || { distance_name: "", distance_km: 0 }}
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

export default DistanceCrud;
