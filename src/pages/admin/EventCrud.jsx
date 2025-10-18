import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import {
  Loader,
  Edit,
  Trash2,
  PlusCircle,
  ArrowLeft,
  Calendar,
  MapPin,
  AlertTriangle,
  Layers,
  DollarSign,
  Users,
  Ruler,
  Clock,
  Zap,
  X,
  Save,
} from "lucide-react";

// Enum to manage event registration status colors
const statusColors = {
  Upcoming: "text-yellow-600 bg-yellow-100",
  Open: "text-green-600 bg-green-100",
  Closed: "text-red-600 bg-red-100",
  Finished: "text-gray-600 bg-gray-100",
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 transform transition-all">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Konfirmasi Hapus Event
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Anda yakin ingin menghapus Event **{item.series_name} Tahun{" "}
            {item.event_year}**?
          </p>
          <p className="text-xs text-red-600">
            Penghapusan ini akan menghapus semua detail Jarak, Tipe Lomba, dan
            data relasional lainnya.
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
            Hapus Event
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN MODAL TAMBAH/EDIT EVENT ---
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
    series_id: seriesList[0]?.id || "", // Default to first series if available
    event_year: new Date().getFullYear(),
    date_start: "",
    reg_status: "Upcoming",
    results_link: "",
    docs_link: "",
    reg_link: "",
    is_published: false,
    distances: [],
    race_types: [], // Array of type IDs
  };

  const [formState, setFormState] = useState(initialData || initialFormState);

  useEffect(() => {
    if (initialData && initialData.id) {
      setFormState({
        ...initialData,
        series_id: initialData.series_id || "",
        event_year: initialData.event_year || new Date().getFullYear(),
        date_start: initialData.date_start
          ? initialData.date_start.substring(0, 10)
          : "",
        reg_status: initialData.reg_status || "Upcoming",
        is_published: initialData.is_published ?? false,
        race_types: initialData.event_race_types
          ? initialData.event_race_types.map((rt) => rt.type_id)
          : [],
        distances: initialData.event_distances || [],
      });
    } else {
      // Set default series ID if it's an 'add' mode and list is ready
      setFormState({
        ...initialFormState,
        series_id: seriesList[0]?.id || "",
      });
    }
  }, [initialData, mode, seriesList]);

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

    // Cek jika field adalah distance_id, harus string
    if (field === "distance_id") {
      newDistances[index][field] = value;
    } else {
      // Untuk field numeric (price, kuota, cot)
      // Mengubah ke 0 jika input dikosongkan (Supabase numeric/int requires value)
      newDistances[index][field] =
        value === "" || value === null ? 0 : parseFloat(value) || 0;
    }

    setFormState((prev) => ({ ...prev, distances: newDistances }));
  };

  const addDistance = () => {
    // ID Jarak harus berupa string kosong agar select required berfungsi
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
  const selectedDistanceIds = formState.distances.map((d) => d.distance_id);

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
                disabled={isProcessing || mode === "edit"}
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
                  <div className="col-span-12 flex justify-between items-center border-b pb-2">
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

                  {/* Kolom Input Jarak (Dropdown) */}
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      <Ruler size={12} className="mr-1 inline" /> Jarak (Master)
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
                          disabled={
                            selectedDistanceIds.includes(d.id) &&
                            d.id !== dist.distance_id
                          }
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
                      <Users size={12} className="mr-1" /> Kuota
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
                      <Clock size={12} className="mr-1" /> COT (Jam)
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
                  <option value="Finished">Finished</option>
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

const EventCrud = ({ navigateToEvents }) => {
  const tableName = "events";
  const displayName = "Event Tahunan";

  const [eventsList, setEventsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Master Data State (Options for the Modal)
  const [seriesList, setSeriesList] = useState([]);
  const [distanceOptions, setDistanceOptions] = useState([]);
  const [raceTypeOptions, setRaceTypeOptions] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Fetch master and event data on mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    // Fetch foreign key options in parallel
    const [seriesRes, distRes, rtRes] = await Promise.all([
      supabase
        .from("series")
        .select("id, series_name, location_city_main")
        .order("series_name", { ascending: true }),
      supabase
        .from("distances")
        .select("id, distance_name, distance_km")
        .order("distance_km", { ascending: true }),
      supabase
        .from("race_types")
        .select("id, type_name")
        .order("type_name", { ascending: true }),
    ]);

    if (seriesRes.error)
      console.error("Error fetching series:", seriesRes.error);
    if (distRes.error)
      console.error("Error fetching distances:", distRes.error);
    if (rtRes.error) console.error("Error fetching race types:", rtRes.error);

    setSeriesList(seriesRes.data || []);
    setDistanceOptions(distRes.data || []);
    setRaceTypeOptions(rtRes.data || []);

    // Then fetch events
    fetchEvents(seriesRes.data || []);
  };

  // Fetch Event List with Series Name and nested details
  const fetchEvents = useCallback(async (fetchedSeries) => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from(tableName)
      .select(
        `
                id, event_year, date_start, reg_status, is_published,
                reg_link, results_link, docs_link, series_id,
                event_distances!inner(distance_id, price_min, cut_off_time_hrs, kuota),
                event_race_types!inner(type_id)
            `
      )
      .order("date_start", { ascending: false });

    if (error) {
      console.error("Error fetching Events:", error);
      toast.error("Gagal memuat daftar Events.");
    } else {
      // Map series_id to series_name and location
      const seriesMap = new Map(fetchedSeries.map((s) => [s.id, s]));
      const processedData = data.map((event) => ({
        ...event,
        series_name:
          seriesMap.get(event.series_id)?.series_name ||
          "Series Tidak Ditemukan",
        location_city_main:
          seriesMap.get(event.series_id)?.location_city_main || "N/A",
      }));
      setEventsList(processedData);
    }
    setIsLoading(false);
  }, []);

  // --- MODAL & DELETE CONTROL ---

  const openAddModal = () => {
    if (seriesList.length === 0) {
      toast.error("Anda harus membuat Series Induk terlebih dahulu.");
      return;
    }
    setCurrentEvent(null);
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    // Deep copy untuk nested array agar state modal tidak mengubah state list
    const eventToEdit = JSON.parse(JSON.stringify(item));
    setCurrentEvent(eventToEdit);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const closeAllModals = () => {
    setIsModalOpen(false);
    setIsDeleteModalOpen(false);
    setCurrentEvent(null);
    setItemToDelete(null);
    setIsProcessing(false);
  };

  // --- SUBMISSION LOGIC (Event Creation / Update) ---

  const handleModalSubmit = async (formData) => {
    if (isProcessing) return;

    setIsProcessing(true);
    const toastId = toast.loading(
      formData.id ? "Memperbarui Event..." : "Membuat Event Baru..."
    );

    try {
      // 1. Prepare Main Event Payload
      const mainEventPayload = {
        series_id: formData.series_id,
        event_year: formData.event_year,
        date_start: formData.date_start,
        reg_status: formData.reg_status,
        is_published: formData.is_published,
        reg_link: formData.reg_link || null,
        results_link: formData.results_link || null,
        docs_link: formData.docs_link || null,
      };

      let eventId;

      // A. Insert or Update Main Event
      if (formData.id) {
        // Update existing event
        const { data: updatedEvent, error: updateError } = await supabase
          .from(tableName)
          .update(mainEventPayload)
          .eq("id", formData.id)
          .select("id")
          .single();
        if (updateError) throw updateError;
        eventId = updatedEvent.id;

        // For update, first delete all related distances and race types (Clean slate for re-insertion)
        // PENTING: Karena ini adalah relasi many-to-many, kita harus membersihkan tabel join.
        await supabase.from("event_distances").delete().eq("event_id", eventId);
        await supabase
          .from("event_race_types")
          .delete()
          .eq("event_id", eventId);
      } else {
        // Insert new event
        const { data: newEvent, error: insertError } = await supabase
          .from(tableName)
          .insert([mainEventPayload])
          .select("id")
          .single();
        if (insertError) throw insertError;
        eventId = newEvent.id;
      }

      // 2. Prepare Relational Data Payloads
      const distancePayload = formData.distances.map((d) => ({
        event_id: eventId,
        distance_id: d.distance_id,
        price_min: d.price_min || 0,
        cut_off_time_hrs: d.cut_off_time_hrs || 0,
        kuota: d.kuota || 0,
      }));

      const raceTypePayload = formData.race_types.map((typeId) => ({
        event_id: eventId,
        type_id: typeId,
      }));

      // 3. Insert Relational Data
      const [distInsertRes, rtInsertRes] = await Promise.all([
        supabase.from("event_distances").insert(distancePayload),
        supabase.from("event_race_types").insert(raceTypePayload),
      ]);

      if (distInsertRes.error) throw distInsertRes.error;
      if (rtInsertRes.error) throw rtInsertRes.error;

      toast.success(
        formData.id ? "Event berhasil diperbarui!" : "Event berhasil dibuat!",
        { id: toastId }
      );
      closeAllModals();
      fetchEvents(seriesList); // Refresh list
    } catch (error) {
      console.error("Submission Error:", error);
      toast.error(`Gagal: ${error.message || "Kesalahan Server"}.`, {
        id: toastId,
      });
      setIsProcessing(false);
    }
  };

  // --- DELETE LOGIC ---
  const handleDeleteConfirm = async (id) => {
    if (isProcessing) return;
    setIsProcessing(true);
    const toastId = toast.loading("Menghapus Event dan data terkait...");

    try {
      // Delete all related records first
      await supabase.from("event_distances").delete().eq("event_id", id);
      await supabase.from("event_race_types").delete().eq("event_id", id);

      // Then delete the main event record
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;

      toast.success("Event berhasil dihapus!", { id: toastId });
      closeAllModals();
      fetchEvents(seriesList);
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(`Gagal menghapus Event. Pesan: ${error.message}.`, {
        id: toastId,
      });
      setIsProcessing(false);
    }
  };

  const isActionDisabled = isProcessing || isModalOpen || isDeleteModalOpen;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tombol Back */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigateToEvents("series")}
          className="p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition mr-4 flex-shrink-0"
          title="Kembali ke Daftar Series"
          disabled={isActionDisabled}
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-4xl font-extrabold text-gray-900 flex-grow">
          Event Management
        </h1>
      </div>

      <p className="text-gray-600 mb-8">
        Kelola Event spesifik untuk setiap tahun di bawah Series yang tersedia.
      </p>

      {/* Tombol Aksi */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={openAddModal}
          className="flex items-center rounded-lg bg-green-600 px-6 py-2 text-white font-semibold hover:bg-green-700 transition shadow-md disabled:bg-gray-400"
          disabled={isActionDisabled || seriesList.length === 0}
        >
          <PlusCircle size={20} className="mr-2" /> Tambah Event Baru
        </button>
        {seriesList.length === 0 && (
          <p className="text-sm text-red-500 pt-3 font-medium">
            Anda perlu membuat Series Induk terlebih dahulu.
          </p>
        )}
      </div>

      {/* Event List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader size={32} className="animate-spin text-blue-600" />
        </div>
      ) : eventsList.length === 0 ? (
        <div className="text-center py-10 text-gray-500 italic bg-gray-50 rounded-xl border">
          Belum ada Event Tahunan yang ditambahkan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Series
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tahun & Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status Reg.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Publikasi
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eventsList.map((event) => (
                <tr
                  key={event.id}
                  className="hover:bg-gray-50 transition text-sm"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">
                      {event.series_name}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center">
                      <MapPin size={12} className="mr-1" />{" "}
                      {event.location_city_main}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-700">
                      Tahun {event.event_year}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center">
                      <Calendar size={12} className="mr-1" />{" "}
                      {new Date(event.date_start).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                        statusColors[event.reg_status] ||
                        "text-gray-600 bg-gray-100"
                      }`}
                    >
                      {event.reg_status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                        event.is_published
                          ? "text-green-600 bg-green-100"
                          : "text-gray-600 bg-gray-100"
                      }`}
                    >
                      {event.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => openEditModal(event)}
                      className={`text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition mr-2 ${
                        isActionDisabled ? "opacity-50" : ""
                      }`}
                      title="Edit Event"
                      disabled={isActionDisabled}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(event)}
                      className={`text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition ${
                        isActionDisabled ? "opacity-50" : ""
                      }`}
                      title="Hapus Event"
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

      {/* Event Modal (Tambah/Edit) */}
      <EventModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={currentEvent}
        seriesList={seriesList}
        distanceOptions={distanceOptions}
        raceTypeOptions={raceTypeOptions}
        onClose={closeAllModals}
        onSubmit={handleModalSubmit}
        isProcessing={isProcessing}
      />

      {/* Modal Konfirmasi Hapus */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        item={itemToDelete}
        onClose={closeAllModals}
        onConfirm={handleDeleteConfirm}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default EventCrud;
