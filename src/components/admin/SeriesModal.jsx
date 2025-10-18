import React, { useState, useEffect } from "react";
import { Save, X, Loader } from "lucide-react";

/**
 * Modal untuk Tambah atau Edit data Series.
 */
const SeriesModal = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  isProcessing,
}) => {
  const [formState, setFormState] = useState(initialData);

  useEffect(() => {
    // Memastikan state formulir sinkron dengan data awal yang diberikan
    setFormState({
      ...initialData,
      // Pastikan URL diisi dengan string kosong jika null dari DB
      series_official_url: initialData.series_official_url || "",
      description: initialData.description || "",
      location_city_main: initialData.location_city_main || "",
    });
  }, [initialData, mode]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formState);
  };

  if (!isOpen) return null;

  const title =
    mode === "add"
      ? "Tambah Series Event Baru"
      : `Edit Series: ${initialData.series_name}`;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 transition-opacity">
      {/* Modal Content */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 transform transition-all scale-100 opacity-100">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field: Nama Series */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Series <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="series_name"
                value={formState.series_name || ""}
                onChange={handleFormChange}
                placeholder="Contoh: Pocari Sweat Run"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
                disabled={isProcessing}
              />
            </div>
            {/* Field: Penyelenggara */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Penyelenggara <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="organizer"
                value={formState.organizer || ""}
                onChange={handleFormChange}
                placeholder="Contoh: Pocari Sweat"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
                disabled={isProcessing}
              />
            </div>
            {/* Field: Lokasi Kota Utama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokasi Kota Utama
              </label>
              <input
                type="text"
                name="location_city_main"
                value={formState.location_city_main || ""}
                onChange={handleFormChange}
                placeholder="Contoh: Jakarta"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                disabled={isProcessing}
              />
            </div>
            {/* Field: URL Resmi Series */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Resmi Series
              </label>
              <input
                type="url"
                name="series_official_url"
                value={formState.series_official_url || ""}
                onChange={handleFormChange}
                placeholder="Contoh: https://runnersworld.id"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                disabled={isProcessing}
              />
            </div>
          </div>
          {/* Field: Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi Series
            </label>
            <textarea
              name="description"
              value={formState.description || ""}
              onChange={handleFormChange}
              rows="3"
              placeholder="Deskripsi singkat tentang series ini."
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
              {mode === "add" ? "Buat Series" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SeriesModal;
