import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import {
  Save,
  X,
  Loader,
  Trash2,
  PlusCircle,
  Clock,
  DollarSign,
  Users,
  Ruler,
  Zap,
} from "lucide-react";

const EventModal = ({
  isOpen,
  mode,
  initialData,
  seriesList,
  distanceOptions,
  raceTypeOptions,
  onClose,
  onSubmit,
  isProcessing,
}) => {
  const initialFormState = {
    series_id: "",
    event_year: new Date().getFullYear(),
    date_start: "",
    reg_status: "Upcoming", // Default
    results_link: "",
    docs_link: "",
    reg_link: "",
    is_published: false,
    distances: [], // Nested data for event_distances
    race_types: [], // Nested data for event_race_types (IDs array)
  };

  const [formState, setFormState] = useState(initialData || initialFormState);

  useEffect(() => {
    // Map initialData for form, handling nulls/undefined and ensuring correct structure
    if (initialData && initialData.id) {
      setFormState({
        ...initialData,
        series_id: initialData.series_id || "",
        event_year: initialData.event_year || new Date().getFullYear(),
        // Format date to YYYY-MM-DD
        date_start: initialData.date_start
          ? initialData.date_start.substring(0, 10)
          : "",
        reg_status: initialData.reg_status || "Upcoming",
        is_published: initialData.is_published ?? false,

        // Nested data mapping
        // Note: event_race_types diubah dari array objek ke array ID
        race_types: initialData.event_race_types
          ? initialData.event_race_types.map((rt) => rt.type_id)
          : [],
        distances: initialData.event_distances || [],
      });
    } else {
      setFormState(initialFormState);
    }
  }, [initialData, mode]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormState((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormState((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handler untuk Race Types (Checkboxes)
  const handleRaceTypeChange = (typeId, isChecked) => {
    setFormState((prev) => ({
      ...prev,
      race_types: isChecked
        ? [...prev.race_types, typeId]
        : prev.race_types.filter((id) => id !== typeId),
    }));
  };

  // Handler untuk Distances (Nested Form Array)
  const handleDistanceChange = (index, field, value) => {
    const newDistances = [...formState.distances];
    newDistances[index] = {
      ...newDistances[index],
      // Pastikan nilai numeric adalah float, atau string kosong jika input dihapus
      [field]:
        field === "price_min" ||
        field === "kuota" ||
        field === "cut_off_time_hrs"
          ? value !== ""
            ? parseFloat(value) || 0
            : 0
          : value,
    };
    setFormState((prev) => ({ ...prev, distances: newDistances }));
  };

  const addDistance = () => {
    setFormState((prev) => ({
      ...prev,
      distances: [
        ...prev.distances,
        { distance_id: "", price_min: 0, cut_off_time_hrs: 0, kuota: 0 },
      ],
    }));
  };

  const removeDistance = (index) => {
    const newDistances = formState.distances.filter((_, i) => i !== index);
    setFormState((prev) => ({ ...prev, distances: newDistances }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation checks
    if (
      !formState.series_id ||
      !formState.event_year ||
      !formState.date_start
    ) {
      toast.error("Series, Tahun, dan Tanggal Mulai wajib diisi.");
      return;
    }
    if (formState.distances.length === 0) {
      toast.error("Setidaknya satu Jarak Lomba wajib ditambahkan.");
      return;
    }
    // Cek duplikasi distance_id
    const distanceIds = formState.distances.map((d) => d.distance_id);
    const uniqueDistanceIds = new Set(distanceIds);
    if (distanceIds.length !== uniqueDistanceIds.size) {
      toast.error(
        "Setiap Jarak Lomba harus unik. Pastikan tidak ada duplikasi jarak."
      );
      return;
    }

    onSubmit(formState);
  };

  if (!isOpen) return null;

  const title =
    mode === "add"
      ? "Buat Event Tahunan Baru"
      : `Edit Event Tahun ${initialData.event_year}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 transition-opacity overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-8 p-6 transform transition-all">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bagian 1: Informasi Dasar Event */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-blue-50/50">
            {/* Series ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series Induk <span className="text-red-500">*</span>
              </label>
              <select
                name="series_id"
                value={formState.series_id}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                required
                disabled={isProcessing}
              >
                <option value="">--- Pilih Series ---</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.series_name} ({s.location_city_main})
                  </option>
                ))}
              </select>
            </div>
            {/* Event Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tahun Event <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="event_year"
                value={formState.event_year}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                required
                disabled={isProcessing || mode === "edit"} // Tahun biasanya tidak diubah saat edit
                min="2000"
                max={new Date().getFullYear() + 2}
              />
            </div>
            {/* Date Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date_start"
                value={formState.date_start}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                required
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Bagian 2: Data Relasional - Race Types */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Zap size={18} className="mr-2 text-yellow-600" /> Tipe Lomba
              (Race Types)
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-3 p-4 border rounded-lg bg-gray-50">
              {raceTypeOptions.map((rt) => (
                <div key={rt.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`rt-${rt.id}`}
                    checked={formState.race_types.includes(rt.id)}
                    onChange={(e) =>
                      handleRaceTypeChange(rt.id, e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor={`rt-${rt.id}`}
                    className="ml-2 block text-sm font-medium text-gray-700"
                  >
                    {rt.type_name}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Pilih semua tipe yang berlaku untuk Event ini.
            </p>
          </div>

          {/* Bagian 3: Data Relasional - Event Distances (Nested Array) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center justify-between">
              <Ruler size={18} className="mr-2 text-red-600" /> Jarak Lomba &
              Detail Finisher <span className="text-red-500">*</span>
              <button
                type="button"
                onClick={addDistance}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                disabled={isProcessing}
              >
                <PlusCircle size={16} className="mr-1" /> Tambah Jarak
              </button>
            </h3>

            <div className="space-y-4">
              {formState.distances.map((dist, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 p-4 border rounded-lg bg-white shadow-sm"
                >
                  <div className="col-span-12 flex justify-between items-center mb-2 border-b pb-2">
                    <h4 className="text-base font-bold text-gray-700">
                      Detail Jarak #{index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeDistance(index)}
                      className="text-red-600 hover:text-red-800"
                      disabled={isProcessing}
                    >
                      <Trash2 size={16} /> Hapus Jarak
                    </button>
                  </div>

                  {/* Kolom Input Jarak */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Jarak (Master)
                    </label>
                    <select
                      value={dist.distance_id}
                      onChange={(e) =>
                        handleDistanceChange(
                          index,
                          "distance_id",
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                      required
                      disabled={isProcessing}
                    >
                      <option value="">--- Pilih Jarak ---</option>
                      {distanceOptions.map((d) => (
                        <option
                          key={d.id}
                          value={d.id}
                          // Disable jika sudah dipilih di index lain
                          disabled={formState.distances.some(
                            (fd, i) => i !== index && fd.distance_id === d.id
                          )}
                        >
                          {d.distance_name} ({d.distance_km} km)
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Kolom Input Harga */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                      <DollarSign size={12} className="mr-1" /> Harga Min
                      (Numeric)
                    </label>
                    <input
                      type="number"
                      value={dist.price_min}
                      onChange={(e) =>
                        handleDistanceChange(index, "price_min", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      disabled={isProcessing}
                    />
                  </div>
                  {/* Kolom Input Kuota */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                      <Users size={12} className="mr-1" /> Kuota (Int)
                    </label>
                    <input
                      type="number"
                      value={dist.kuota}
                      onChange={(e) =>
                        handleDistanceChange(index, "kuota", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                      min="0"
                      step="1"
                      disabled={isProcessing}
                    />
                  </div>
                  {/* Kolom Input COT */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                      <Clock size={12} className="mr-1" /> COT (Jam/Numeric)
                    </label>
                    <input
                      type="number"
                      value={dist.cut_off_time_hrs}
                      onChange={(e) =>
                        handleDistanceChange(
                          index,
                          "cut_off_time_hrs",
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                      min="0"
                      step="0.5"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bagian 4: Link dan Status */}
          <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Reg Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Pendaftaran
                </label>
                <input
                  type="url"
                  name="reg_link"
                  value={formState.reg_link}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border p-2 text-sm"
                  placeholder="https://reg.link"
                  disabled={isProcessing}
                />
              </div>
              {/* Results Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Hasil Lomba
                </label>
                <input
                  type="url"
                  name="results_link"
                  value={formState.results_link}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border p-2 text-sm"
                  placeholder="https://results.link"
                  disabled={isProcessing}
                />
              </div>
              {/* Docs Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Dokumentasi
                </label>
                <input
                  type="url"
                  name="docs_link"
                  value={formState.docs_link}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border p-2 text-sm"
                  placeholder="https://docs.link"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Status dan Publish */}
            <div className="flex gap-6 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Pendaftaran
                </label>
                <select
                  name="reg_status"
                  value={formState.reg_status}
                  onChange={handleFormChange}
                  className="rounded-lg border p-2 text-sm"
                  required
                  disabled={isProcessing}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="flex items-center pt-4">
                <input
                  id="is_published"
                  name="is_published"
                  type="checkbox"
                  checked={formState.is_published}
                  onChange={handleFormChange}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="is_published"
                  className="ml-2 block text-sm font-medium text-gray-900"
                >
                  Publish (Tayangkan ke Publik)
                </label>
              </div>
            </div>
          </div>

          {/* Tombol Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-200 transition text-sm"
              disabled={isProcessing}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 transition text-sm disabled:bg-gray-400"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader size={18} className="animate-spin mr-2" />
              ) : (
                <Save size={18} className="mr-2" />
              )}
              {mode === "add" ? "Buat Event" : "Simpan Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
