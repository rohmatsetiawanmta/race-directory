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
  Ruler,
  Clock,
  Zap,
  X,
  Save,
  Link as LinkIcon,
  Map as MapIconComponent, // Ikon untuk lokasi RPC (digunakan untuk menghindari konflik dengan Map JavaScript)
  ListChecks, // Ikon baru untuk detail tanggal RPC
  Clock4,
  Wallet, // Ikon baru untuk waktu flag off
} from "lucide-react";

// Enum to manage event registration status colors (Dibiarkan untuk referensi list lama, meski status reg. dihapus dari form)
const statusColors = {
  Upcoming: "text-yellow-600 bg-yellow-100",
  Open: "text-green-600 bg-green-100",
  Closed: "text-red-600 bg-red-100",
  Finished: "text-gray-600 bg-gray-100",
};

// --- HELPER FUNCTION: Konversi Total Jam Desimal ke HH:MM ---
const formatHoursToHHMM = (totalHours) => {
  if (typeof totalHours !== "number" || isNaN(totalHours) || totalHours < 0)
    return "00:00";
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
};

// --- HELPER FUNCTION: Konversi HH:MM ke Total Jam Desimal ---
const parseHHMMToHours = (hhmm) => {
  if (!hhmm) return 0;
  // Memisahkan HH dan MM, mengabaikan detik jika ada (walau form hanya meminta HH:MM)
  const parts = hhmm.split(":").map((p) => parseInt(p) || 0);
  if (parts.length === 2) {
    const hours = parts[0];
    const minutes = parts[1];
    if (minutes > 59) return hours; // Mengabaikan menit jika > 59
    return hours + minutes / 60;
  }
  return 0;
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
  const initialDateRPC = () => {
    // Default H-1 dari hari ini (asumsi event start biasanya H+n)
    const d = new Date();
    d.setDate(d.getDate()); // Ambil tanggal hari ini sebagai default RPC
    return d.toISOString().substring(0, 10);
  };

  const initialLinkState = (label) => ({
    id: Date.now() + Math.random(),
    label: label,
    url: "",
  });

  const initialFormState = {
    series_id: seriesList[0]?.id || "",
    event_year: new Date().getFullYear(),
    date_start: "",
    date_end: "",
    is_multiday: false,
    results_links: [initialLinkState("Hasil Utama")],
    docs_links: [initialLinkState("Dokumentasi Utama")],
    is_published: false,
    event_location: "",
    distances: [],
    rpc_info: [
      {
        id: Date.now(),
        location_name: "",
        dates: [
          {
            id: Date.now() + 1,
            date: initialDateRPC(),
            time_start: "10:00",
            time_end: "20:00",
          },
        ],
      },
    ],
    race_types: [],
  };

  const [formState, setFormState] = useState(initialData || initialFormState);

  // STATE BARU untuk mengelola status upload file
  const [uploading, setUploading] = useState({}); // { index: boolean }
  const [uploadError, setUploadError] = useState({}); // { index: string }

  useEffect(() => {
    if (initialData && initialData.id) {
      setFormState({
        ...initialData,
        series_id: initialData.series_id || "",
        event_year: initialData.event_year || new Date().getFullYear(),
        date_start: initialData.date_start
          ? initialData.date_start.substring(0, 10)
          : "",
        date_end: initialData.date_end
          ? initialData.date_end.substring(0, 10)
          : "",
        is_multiday: !!initialData.date_end,
        is_published: initialData.is_published ?? false,
        race_types: initialData.event_race_types
          ? initialData.event_race_types.map((rt) => rt.type_id)
          : [],
        event_location: initialData.event_location || "",
        distances: initialData.event_distances
          ? initialData.event_distances.map((d) => {
              // Ekstraksi tanggal dan waktu dari timestampz Flag Off
              const flagOffTimestamp = d.flag_off_time || null;
              const flagOffDate = flagOffTimestamp
                ? flagOffTimestamp.substring(0, 10)
                : "";
              const flagOffTime = flagOffTimestamp
                ? flagOffTimestamp.substring(11, 16)
                : "05:00";

              return {
                ...d,
                cut_off_time_hrs_display: formatHoursToHHMM(d.cut_off_time_hrs),
                flag_off_time: flagOffTime, // HH:MM
                flag_off_date: flagOffDate, // YYYY-MM-DD
                route_image_url: d.route_image_url || "", // <-- Ambil URL Gambar Rute
                // ⬅️ NEW: Load cut_off_points dari DB, convert to UI format
                cut_off_points: (d.cut_off_points || []).map((cop) => ({
                  // Generate temp ID untuk CRUD di UI
                  id: Date.now() + Math.random(),
                  km_mark: cop.km_mark,
                  // Convert stored decimal hours back to HH:MM for display
                  time_limit_hrs: formatHoursToHHMM(cop.time_limit_hrs),
                })),
              };
            })
          : [],
        // MAPPING: Load RPC info dari JSONB (default jika null)
        rpc_info: initialData.rpc_info || initialFormState.rpc_info,
        // MAPPING: Mapping Link Array Baru
        results_links:
          initialData.results_links && initialData.results_links.length > 0
            ? initialData.results_links
            : [initialLinkState("Hasil Utama")],
        docs_links:
          initialData.docs_links && initialData.docs_links.length > 0
            ? initialData.docs_links
            : [initialLinkState("Dokumentasi Utama")],
      });
    } else {
      setFormState({
        ...initialFormState,
        series_id: seriesList[0]?.id || "",
        results_links: [initialLinkState("Hasil Utama")],
        docs_links: [initialLinkState("Dokumentasi Utama")],
      });
    }
    // Reset status upload saat modal dibuka
    setUploading({});
    setUploadError({});
  }, [initialData, mode, seriesList]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      if (name === "is_multiday" && !checked) {
        setFormState((prev) => ({ ...prev, [name]: checked, date_end: "" }));
      } else {
        setFormState((prev) => ({ ...prev, [name]: checked }));
      }
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

  // --- LOGIC UNTUK NESTED DISTANCES ---
  const handleDistanceChange = (index, field, value) => {
    const newDistances = [...formState.distances];

    if (field === "distance_id") {
      newDistances[index][field] = value;
    } else if (field === "price_min") {
      newDistances[index][field] =
        value === "" || value === null ? 0 : parseFloat(value) || 0;
    } else if (field === "cut_off_time_hrs_display") {
      newDistances[index]["cut_off_time_hrs_display"] = value;
      const hoursDecimal = parseHHMMToHours(value);
      newDistances[index]["cut_off_time_hrs"] = hoursDecimal;
    } else if (field === "flag_off_time" || field === "flag_off_date") {
      // Handle date dan time terpisah
      newDistances[index][field] = value;
    } else if (field === "route_image_url") {
      // <-- Handle link gambar
      newDistances[index][field] = value;
    }

    setFormState((prev) => ({ ...prev, distances: newDistances }));
  };

  const addDistance = () => {
    setFormState((prev) => ({
      ...prev,
      distances: [
        ...prev.distances,
        {
          distance_id: "",
          price_min: 0,
          cut_off_time_hrs: 0,
          cut_off_time_hrs_display: "00:00",
          flag_off_time: "05:00", // Default HH:MM
          flag_off_date: formState.date_start || "", // Default ke tanggal mulai event
          route_image_url: "", // <-- Field untuk URL Gambar Rute
          cut_off_points: [], // ⬅️ NEW: Initialize COP as empty array
        },
      ],
    }));
  };

  const removeDistance = (index) => {
    const newDistances = formState.distances.filter((_, i) => i !== index);
    setFormState((prev) => ({ ...prev, distances: newDistances }));
  };

  // --- LOGIC UNTUK NESTED CUT OFF POINTS (COP) ---
  const handleCopChange = (distIndex, copId, field, value) => {
    const newDistances = [...formState.distances];
    newDistances[distIndex].cut_off_points = newDistances[
      distIndex
    ].cut_off_points.map((cop) =>
      cop.id === copId
        ? {
            ...cop,
            [field]: field === "km_mark" ? parseFloat(value) || 0 : value, // km_mark is numeric
          }
        : cop
    );
    setFormState((prev) => ({ ...prev, distances: newDistances }));
  };

  const addCop = (distIndex) => {
    const newDistances = [...formState.distances];
    newDistances[distIndex].cut_off_points = [
      ...(newDistances[distIndex].cut_off_points || []),
      {
        id: Date.now() + Math.random(),
        km_mark: 0,
        time_limit_hrs: "00:00", // Time limit from Flag Off in HH:MM format (UI)
      },
    ];
    setFormState((prev) => ({ ...prev, distances: newDistances }));
  };

  const removeCop = (distIndex, copId) => {
    const newDistances = [...formState.distances];
    newDistances[distIndex].cut_off_points = (
      newDistances[distIndex].cut_off_points || []
    ).filter((cop) => cop.id !== copId);
    setFormState((prev) => ({ ...prev, distances: newDistances }));
  };
  // --- END LOGIC COP ---

  // FUNGSI BARU: Mengunggah file ke Supabase Storage
  const handleFileUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi dasar
    if (file.size > 5 * 1024 * 1024) {
      // Max 5MB
      setUploadError((prev) => ({
        ...prev,
        [index]: "Ukuran file maksimal 5MB.",
      }));
      return;
    }

    setUploading((prev) => ({ ...prev, [index]: true }));
    setUploadError((prev) => ({ ...prev, [index]: "" }));

    const seriesData = seriesList.find((s) => s.id === formState.series_id);
    const distanceData = distanceOptions.find(
      (d) => d.id === formState.distances[index].distance_id
    );

    // Pastikan data penting tersedia
    if (!seriesData || !distanceData) {
      setUploadError((prev) => ({
        ...prev,
        [index]: "Pilih Series dan Jarak dulu sebelum mengunggah.",
      }));
      setUploading((prev) => ({ ...prev, [index]: false }));
      e.target.value = null;
      return;
    }

    const seriesNameSlug = seriesData.series_name
      .toLowerCase()
      .replace(/\s/g, "-");
    const eventYear = formState.event_year;
    const distanceNameSlug = distanceData.distance_name
      .toLowerCase()
      .replace(/\s/g, "-");

    // Buat path unik: event-routes/series-slug/year/distance-slug/unique-timestamp-filename
    const uniqueFileName = `${distanceNameSlug}-${Date.now()}-${file.name.replace(
      /\s/g,
      "-"
    )}`;
    const uniquePath = `event-routes/${seriesNameSlug}/${eventYear}/${uniqueFileName}`;

    try {
      // Upload file ke bucket 'event-assets'
      const { error: uploadError } = await supabase.storage
        .from("event-assets") // Asumsi nama bucket adalah 'event-assets'
        .upload(uniquePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Dapatkan URL publik
      const { data: publicUrlData } = supabase.storage
        .from("event-assets")
        .getPublicUrl(uniquePath);

      if (publicUrlData && publicUrlData.publicUrl) {
        // Update formState dengan URL publik
        handleDistanceChange(index, "route_image_url", publicUrlData.publicUrl);
        toast.success(
          `Gambar rute ${distanceData.distance_name} berhasil diunggah!`
        );
      } else {
        throw new Error("Gagal mendapatkan URL publik.");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      const errorMessage = error.message.includes("duplicate key value")
        ? "File sudah ada atau path tidak unik. Coba ganti nama file."
        : error.message || "Gagal mengunggah file.";
      setUploadError((prev) => ({ ...prev, [index]: errorMessage }));
      toast.error(`Gagal mengunggah gambar rute: ${errorMessage}`);
      e.target.value = null;
    } finally {
      setUploading((prev) => ({ ...prev, [index]: false }));
    }
  };

  // --- LOGIC UNTUK NESTED RACE PACK COLLECTION (RPC) ---
  const handleRpcLocationChange = (locId, field, value) => {
    const newRpcInfo = formState.rpc_info.map((loc) =>
      loc.id === locId ? { ...loc, [field]: value } : loc
    );
    setFormState((prev) => ({ ...prev, rpc_info: newRpcInfo }));
  };

  const addRpcLocation = () => {
    const initialDate = initialDateRPC(); // Ambil default tanggal
    setFormState((prev) => ({
      ...prev,
      rpc_info: [
        ...prev.rpc_info,
        {
          id: Date.now(),
          location_name: "",
          dates: [
            {
              id: Date.now() + 1,
              date: initialDate,
              time_start: "10:00",
              time_end: "20:00",
            },
          ],
        },
      ],
    }));
  };

  const removeRpcLocation = (locId) => {
    const newRpcInfo = formState.rpc_info.filter((loc) => loc.id !== locId);
    setFormState((prev) => ({ ...prev, rpc_info: newRpcInfo }));
  };

  const addRpcDate = (locId) => {
    const newRpcInfo = formState.rpc_info.map((loc) => {
      if (loc.id === locId) {
        // Ambil tanggal terakhir sebagai default
        const lastDate =
          loc.dates[loc.dates.length - 1].date || initialDateRPC();
        return {
          ...loc,
          dates: [
            ...loc.dates,
            {
              id: Date.now(),
              date: lastDate,
              time_start: "10:00",
              time_end: "20:00",
            },
          ],
        };
      }
      return loc;
    });
    setFormState((prev) => ({ ...prev, rpc_info: newRpcInfo }));
  };

  const removeRpcDate = (locId, dateId) => {
    const newRpcInfo = formState.rpc_info.map((loc) => {
      if (loc.id === locId) {
        return {
          ...loc,
          dates: loc.dates.filter((date) => date.id !== dateId),
        };
      }
      return loc;
    });
    setFormState((prev) => ({ ...prev, rpc_info: newRpcInfo }));
  };

  const handleRpcDateChange = (locId, dateId, field, value) => {
    const newRpcInfo = formState.rpc_info.map((loc) => {
      if (loc.id === locId) {
        return {
          ...loc,
          dates: loc.dates.map((date) =>
            date.id === dateId ? { ...date, [field]: value } : date
          ),
        };
      }
      return loc;
    });
    setFormState((prev) => ({ ...prev, rpc_info: newRpcInfo }));
  };

  // --- HANDLER BARU UNTUK LIST LINK ---
  const handleLinkChange = (listName, id, field, value) => {
    setFormState((prev) => ({
      ...prev,
      [listName]: prev[listName].map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addLink = (listName, defaultLabel) => {
    setFormState((prev) => ({
      ...prev,
      [listName]: [
        ...prev[listName],
        { id: Date.now() + Math.random(), label: defaultLabel, url: "" },
      ],
    }));
  };

  const removeLink = (listName, id) => {
    setFormState((prev) => ({
      ...prev,
      [listName]: prev[listName].filter((item) => item.id !== id),
    }));
  };
  // --- END HANDLER BARU ---

  // --- SUBMIT VALIDATION ---
  const handleSubmit = (e) => {
    e.preventDefault();

    // Cek apakah ada proses upload yang masih berjalan
    if (Object.values(uploading).some((status) => status)) {
      toast.error("Tunggu hingga proses upload gambar rute selesai.");
      return;
    }

    // Validasi Dasar
    if (
      !formState.series_id ||
      !formState.event_year ||
      !formState.date_start ||
      !formState.event_location.trim()
    ) {
      toast.error(
        "Series, Tahun, Tanggal Mulai, dan Lokasi Event wajib diisi."
      );
      return;
    }
    // Validasi Flag Off Date
    if (formState.distances.some((d) => !d.flag_off_date)) {
      toast.error("Tanggal Flag Off wajib diisi untuk semua Jarak.");
      return;
    }
    // Validasi Multi-Day
    if (formState.is_multiday && !formState.date_end) {
      toast.error("Tanggal Selesai wajib diisi untuk Multi-Day Event.");
      return;
    }
    if (formState.is_multiday && formState.date_end < formState.date_start) {
      toast.error("Tanggal Selesai tidak boleh sebelum Tanggal Mulai.");
      return;
    }
    // Validasi Jarak
    if (formState.distances.length === 0) {
      toast.error("Setidaknya satu Jarak Lomba wajib ditambahkan.");
      return;
    }
    const distanceIds = formState.distances.map((d) => d.distance_id);
    const uniqueDistanceIds = new Set(distanceIds);
    if (distanceIds.length !== uniqueDistanceIds.size) {
      toast.error(
        "Setiap Jarak Lomba harus unik. Pastikan tidak ada duplikasi jarak."
      );
      return;
    }

    // Validasi RPC
    if (
      formState.rpc_info.some(
        (loc) =>
          !loc.location_name.trim() ||
          loc.dates.length === 0 ||
          loc.dates.some(
            (date) => !date.date || !date.time_start || !date.time_end
          )
      )
    ) {
      toast.error("Semua field Lokasi dan Jadwal RPC wajib diisi.");
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
    // FIX SCROLL: Ganti items-center menjadi items-start pada backdrop
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-900 bg-opacity-75 transition-opacity overflow-y-auto py-8">
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
          <div className="p-4 rounded-lg bg-blue-50/50 space-y-4">
            {/* Group Series ID dan Tahun Event (Grid 2 Kolom) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* BARU: Input Lokasi Event (Full Width) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lokasi Event <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="event_location"
                value={formState.event_location}
                onChange={handleFormChange}
                placeholder="Contoh: Jakarta Pusat atau Bandung"
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                required
                disabled={isProcessing}
              />
            </div>

            {/* Multi-Day Checkbox */}
            <div className="flex items-center pt-2">
              <input
                id="is_multiday"
                name="is_multiday"
                type="checkbox"
                checked={formState.is_multiday}
                onChange={handleFormChange}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={isProcessing}
              />
              <label
                htmlFor="is_multiday"
                className="ml-2 block text-sm font-medium text-gray-900"
              >
                Multi-Day Event (Lomba lebih dari 1 hari)
              </label>
            </div>

            {/* Tanggal Mulai / Selesai (Grid 1 atau 2 Kolom) */}
            <div
              className={`grid gap-4 ${
                formState.is_multiday
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
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
              {/* Date End (Hanya muncul jika Multi-day) */}
              {formState.is_multiday && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Selesai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date_end"
                    value={formState.date_end}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                    required
                    disabled={isProcessing}
                    min={formState.date_start || undefined}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bagian 2: Data Relasional - Race Types (UI Revised) */}
          <div className="p-4 rounded-lg bg-blue-50/50 space-y-4">
            {" "}
            {/* Use same blue background */}
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Zap size={18} className="mr-2 text-yellow-600" /> Tipe Lomba
              (Race Types)
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-3 p-4 shadow-md rounded-lg bg-white">
              {" "}
              {/* Inner White box for checkboxes */}
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
            <p className="text-xs text-gray-500">
              Pilih semua tipe yang berlaku untuk Event ini.
            </p>
          </div>

          {/* Bagian 3: Data Relasional - Event Distances (Nested Array) (UI Revised) */}
          <div className="p-4 rounded-lg bg-blue-50/50 space-y-4">
            {" "}
            {/* Use same blue background */}
            <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-between">
              <span className="flex items-center">
                <Ruler size={18} className="mr-2 text-red-600" /> Jarak Lomba &
                Detail Finisher <span className="text-red-500 ml-1">*</span>
              </span>
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
                  className="p-4 rounded-lg bg-white shadow-md" // Disederhanakan
                >
                  <div className="col-span-12 flex justify-between items-center border-b pb-2">
                    <h4 className="text-base font-bold text-gray-700">
                      Detail Jarak #{index + 1}
                    </h4>
                    {/* FIX FONT SIZE/ICON: Dikecilkan dan ikon di kiri */}
                    <button
                      type="button"
                      onClick={() => removeDistance(index)}
                      className="text-red-600 hover:text-red-800 text-sm flex items-center"
                      disabled={isProcessing}
                    >
                      <Trash2 size={16} className="mr-1" /> Hapus Jarak
                    </button>
                  </div>

                  {/* Container input di dalam detail jarak - Menggunakan 5 Kolom (3+2+3+2+2) */}
                  <div className="grid grid-cols-12 gap-3 mt-4">
                    {/* Kolom 1: Jarak (Dropdown) - 3 kolom */}
                    <div className="col-span-12 sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        <Ruler size={12} className="mr-1 inline" /> Jarak
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

                    {/* Kolom 2: Harga - 2 kolom */}
                    <div className="col-span-12 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                        <Wallet size={12} className="mr-1" /> Harga Normal
                      </label>
                      <input
                        type="number"
                        value={dist.price_min}
                        onChange={(e) =>
                          handleDistanceChange(
                            index,
                            "price_min",
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                        min="0"
                        step="0.01"
                        disabled={isProcessing}
                      />
                    </div>

                    {/* Kolom 3: Flag Off Date - 3 kolom */}
                    <div className="col-span-12 sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                        <Calendar size={12} className="mr-1" /> Flag Off Date
                      </label>
                      <input
                        type="date"
                        value={dist.flag_off_date}
                        onChange={(e) =>
                          handleDistanceChange(
                            index,
                            "flag_off_date",
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                        required
                        disabled={isProcessing}
                      />
                    </div>

                    {/* Kolom 4: Flag Off Time - 2 kolom */}
                    <div className="col-span-12 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                        <Clock4 size={12} className="mr-1" /> Flag Off Time
                      </label>
                      <input
                        type="time" // Mengambil HH:MM
                        value={dist.flag_off_time}
                        onChange={(e) =>
                          handleDistanceChange(
                            index,
                            "flag_off_time",
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                        required
                        disabled={isProcessing}
                      />
                    </div>

                    {/* Kolom 5: COT (HH:MM) - 2 kolom */}
                    <div className="col-span-12 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                        <Clock size={12} className="mr-1" /> COT (HH:MM)
                      </label>
                      <input
                        type="text" // Diubah ke text
                        placeholder="HH:MM (e.g., 03:30)"
                        // Gunakan formatHoursToHHMM jika field display belum di-update (saat load data)
                        value={
                          dist.cut_off_time_hrs_display ||
                          formatHoursToHHMM(dist.cut_off_time_hrs)
                        }
                        onChange={(e) =>
                          handleDistanceChange(
                            index,
                            "cut_off_time_hrs_display", // Gunakan field display
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                        pattern="\d{1,2}:\d{2}"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  {/* BARU: Input Link Gambar Rute dengan tombol Upload */}
                  <div className="grid grid-cols-12 gap-3 mt-3 pt-3 border-t border-gray-100">
                    <div className="col-span-12">
                      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center">
                        <LinkIcon size={12} className="mr-1" /> Link Gambar Rute
                      </label>
                      <div className="flex space-x-2 items-center">
                        {/* Input URL Manual */}
                        <input
                          type="url"
                          name={`route_image_url_${index}`}
                          placeholder="URL Gambar Rute atau Upload"
                          value={dist.route_image_url || ""}
                          onChange={(e) =>
                            handleDistanceChange(
                              index,
                              "route_image_url",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                          disabled={isProcessing || uploading[index]}
                        />
                        {/* Tombol Upload */}
                        <label
                          htmlFor={`file-upload-${index}`}
                          className={`flex-shrink-0 flex items-center justify-center p-2 rounded-lg text-white text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                            uploading[index]
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                          title="Upload file ke Supabase Storage (Max 5MB)"
                        >
                          {uploading[index] ? (
                            <Loader size={16} className="animate-spin" />
                          ) : (
                            "Upload File"
                          )}
                          <input
                            id={`file-upload-${index}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, index)}
                            disabled={isProcessing || uploading[index]}
                          />
                        </label>
                      </div>

                      {/* Status/Error Upload */}
                      {uploadError[index] && (
                        <p className="text-xs text-red-500 mt-1">
                          {uploadError[index]}
                        </p>
                      )}
                      {dist.route_image_url &&
                        !uploading[index] &&
                        !uploadError[index] && (
                          <p className="text-xs text-green-600 mt-1 truncate">
                            Tersimpan: {dist.route_image_url.substring(0, 50)}
                            ...
                          </p>
                        )}
                    </div>
                  </div>

                  {/* --- BARU: Cut Off Points (COP) Section --- */}
                  <div className="grid grid-cols-12 gap-3 mt-3 pt-3 border-t border-gray-100">
                    <div className="col-span-12">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                        <span className="flex items-center">
                          <Clock size={16} className="mr-1 text-red-500" />
                          Cut Off Points (COP)
                        </span>
                        <button
                          type="button"
                          onClick={() => addCop(index)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center"
                          disabled={isProcessing}
                        >
                          <PlusCircle size={14} className="mr-1" /> Tambah COP
                        </button>
                      </h4>
                      <div className="space-y-2">
                        {(!dist.cut_off_points ||
                          dist.cut_off_points.length === 0) && (
                          <p className="text-xs text-gray-500 italic p-2 border rounded border-dashed border-gray-300 bg-gray-100">
                            Tidak ada Cut Off Point untuk jarak ini.
                          </p>
                        )}
                        {dist.cut_off_points &&
                          dist.cut_off_points.map((cop) => (
                            <div
                              key={cop.id}
                              className="flex gap-2 items-center"
                            >
                              {/* Input KM Mark */}
                              <input
                                type="number"
                                placeholder="KM Mark (e.g., 21)"
                                value={cop.km_mark || ""}
                                onChange={(e) =>
                                  handleCopChange(
                                    index,
                                    cop.id,
                                    "km_mark",
                                    e.target.value
                                  )
                                }
                                className="w-1/3 rounded-lg border p-2 text-xs border-gray-300"
                                min="0.1"
                                step="0.1"
                                required
                                disabled={isProcessing}
                              />
                              {/* Input Time Limit HH:MM */}
                              <input
                                type="text"
                                placeholder="Limit (HH:MM dari Flag Off)"
                                value={cop.time_limit_hrs || ""}
                                onChange={(e) =>
                                  handleCopChange(
                                    index,
                                    cop.id,
                                    "time_limit_hrs",
                                    e.target.value
                                  )
                                }
                                className="w-1/2 rounded-lg border p-2 text-xs border-gray-300"
                                pattern="\d{1,2}:\d{2}"
                                required
                                disabled={isProcessing}
                              />
                              {/* Tombol Hapus COP */}
                              <button
                                type="button"
                                onClick={() => removeCop(index, cop.id)}
                                className={`p-1 rounded-full text-red-500 hover:bg-red-100`}
                                disabled={isProcessing}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bagian 4: Race Pack Collection Info (BARU) */}
          <div className="p-4 rounded-lg bg-blue-50/50 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-between">
              <span className="flex items-center">
                <Layers size={18} className="mr-2 text-yellow-600" /> Race Pack
                Collection Info
              </span>
              <button
                type="button"
                onClick={addRpcLocation}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                disabled={isProcessing}
              >
                <PlusCircle size={16} className="mr-1" /> Tambah Lokasi
              </button>
            </h3>

            <div className="space-y-6">
              {formState.rpc_info.map((loc) => (
                <div
                  key={loc.id}
                  className="p-4 rounded-lg bg-white shadow-md border-2 border-dashed border-gray-200"
                >
                  {/* Lokasi Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-full pr-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <MapPin size={14} className="mr-1 text-gray-500" /> Nama
                        Lokasi/Venue <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={loc.location_name}
                        onChange={(e) =>
                          handleRpcLocationChange(
                            loc.id,
                            "location_name",
                            e.target.value
                          )
                        }
                        placeholder="Contoh: Mall A, City Center"
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:ring-blue-500"
                        required
                        disabled={isProcessing}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRpcLocation(loc.id)}
                      className="text-red-600 hover:text-red-800 text-sm flex items-center whitespace-nowrap pt-1"
                      disabled={isProcessing || formState.rpc_info.length === 1}
                      title="Hapus Lokasi Koleksi"
                    >
                      <Trash2 size={16} className="mr-1" /> Hapus Lokasi
                    </button>
                  </div>

                  {/* Jadwal (Dates) */}
                  <div className="border p-3 rounded-lg space-y-3 bg-gray-50">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                      <h5 className="text-sm font-semibold text-gray-700 flex items-center">
                        <Calendar size={14} className="mr-1 text-blue-600" />
                        Jadwal Pengambilan ({loc.dates.length} Hari)
                      </h5>
                      <button
                        type="button"
                        onClick={() => addRpcDate(loc.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
                        disabled={isProcessing}
                      >
                        <PlusCircle size={14} className="mr-1" /> Tambah Hari
                      </button>
                    </div>

                    {loc.dates.map((dateItem, dateIndex) => (
                      <div
                        key={dateItem.id}
                        className="grid grid-cols-12 gap-3 items-end"
                      >
                        <div className="col-span-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Tanggal <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={dateItem.date}
                            onChange={(e) =>
                              handleRpcDateChange(
                                loc.id,
                                dateItem.id,
                                "date",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:ring-blue-500"
                            required
                            disabled={isProcessing}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Jam Mulai
                          </label>
                          <input
                            type="time"
                            value={dateItem.time_start}
                            onChange={(e) =>
                              handleRpcDateChange(
                                loc.id,
                                dateItem.id,
                                "time_start",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:ring-blue-500"
                            required
                            disabled={isProcessing}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Jam Selesai
                          </label>
                          <input
                            type="time"
                            value={dateItem.time_end}
                            onChange={(e) =>
                              handleRpcDateChange(
                                loc.id,
                                dateItem.id,
                                "time_end",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:ring-blue-500"
                            required
                            disabled={isProcessing}
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeRpcDate(loc.id, dateItem.id)}
                            className={`p-1 rounded-full ${
                              loc.dates.length === 1 || isProcessing
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-red-500 hover:bg-red-100"
                            }`}
                            disabled={loc.dates.length === 1 || isProcessing}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bagian 5: Link dan Publish (DIREVISI) */}
          <div className="space-y-4 p-4 rounded-lg bg-blue-50/50">
            {" "}
            {/* Use same blue background */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KOLOM KIRI: Hasil Lomba Links */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <LinkIcon size={16} className="mr-1" /> Link Hasil Lomba
                  <button
                    type="button"
                    onClick={() => addLink("results_links", "Hasil Tambahan")}
                    className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
                    disabled={isProcessing}
                  >
                    <PlusCircle size={14} className="mr-1" /> Tambah
                  </button>
                </h4>
                <div className="space-y-3">
                  {formState.results_links.map((link) => (
                    <div key={link.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Label (e.g., Hasil Utama)"
                        value={link.label}
                        onChange={(e) =>
                          handleLinkChange(
                            "results_links",
                            link.id,
                            "label",
                            e.target.value
                          )
                        }
                        className="w-1/3 rounded-lg border p-2 text-xs"
                        disabled={isProcessing}
                      />
                      <input
                        type="url"
                        placeholder="URL Hasil Lomba"
                        value={link.url}
                        onChange={(e) =>
                          handleLinkChange(
                            "results_links",
                            link.id,
                            "url",
                            e.target.value
                          )
                        }
                        className="w-1/2 rounded-lg border p-2 text-xs"
                        disabled={isProcessing}
                      />
                      <button
                        type="button"
                        onClick={() => removeLink("results_links", link.id)}
                        className={`p-1 rounded-full ${
                          formState.results_links.length <= 1 || isProcessing
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-500 hover:bg-red-100"
                        }`}
                        disabled={
                          formState.results_links.length <= 1 || isProcessing
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* KOLOM KANAN: Dokumentasi Links */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <LinkIcon size={16} className="mr-1" /> Link Dokumentasi
                  <button
                    type="button"
                    onClick={() => addLink("docs_links", "Foto Utama")}
                    className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
                    disabled={isProcessing}
                  >
                    <PlusCircle size={14} className="mr-1" /> Tambah
                  </button>
                </h4>
                <div className="space-y-3">
                  {formState.docs_links.map((link) => (
                    <div key={link.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Label (e.g., Foto Instagram)"
                        value={link.label}
                        onChange={(e) =>
                          handleLinkChange(
                            "docs_links",
                            link.id,
                            "label",
                            e.target.value
                          )
                        }
                        className="w-1/3 rounded-lg border p-2 text-xs"
                        disabled={isProcessing}
                      />
                      <input
                        type="url"
                        placeholder="URL Dokumentasi"
                        value={link.url}
                        onChange={(e) =>
                          handleLinkChange(
                            "docs_links",
                            link.id,
                            "url",
                            e.target.value
                          )
                        }
                        className="w-1/2 rounded-lg border p-2 text-xs"
                        disabled={isProcessing}
                      />
                      <button
                        type="button"
                        onClick={() => removeLink("docs_links", link.id)}
                        className={`p-1 rounded-full ${
                          formState.docs_links.length <= 1 || isProcessing
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-500 hover:bg-red-100"
                        }`}
                        disabled={
                          formState.docs_links.length <= 1 || isProcessing
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Status Publish */}
            <div className="flex gap-6 pt-2 border-t mt-4">
              <div className="flex items-center">
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
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-200 transition text-sm"
              disabled={
                isProcessing ||
                Object.values(uploading).some((status) => status)
              }
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 transition text-sm disabled:bg-gray-400"
              disabled={
                isProcessing ||
                Object.values(uploading).some((status) => status)
              }
            >
              {isProcessing ||
              Object.values(uploading).some((status) => status) ? (
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

const EventCrud = ({ navigateToEvents, seriesIdToFilter }) => {
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
  }, [seriesIdToFilter]); // <-- Tambahkan dependency filter

  const fetchMasterData = async () => {
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

    const fetchedSeries = seriesRes.data || [];
    const fetchedDistances = distRes.data || [];
    const fetchedRaceTypes = rtRes.data || [];

    setSeriesList(fetchedSeries);
    setDistanceOptions(fetchedDistances);
    setRaceTypeOptions(fetchedRaceTypes);

    // Membuat map untuk lookup nama distance
    const distanceNameMap = new Map(
      fetchedDistances.map((d) => [d.id, d.distance_name])
    );

    fetchEvents(fetchedSeries, distanceNameMap);
  };

  // Fetch Event List with Series Name and nested details
  const fetchEvents = useCallback(
    async (fetchedSeries, distanceNameMap) => {
      setIsLoading(true);

      let query = supabase.from(tableName).select(
        `
                id, event_year, date_start, date_end, is_published, rpc_info, event_location,
                results_links, docs_links, series_id,
                event_distances!inner(distance_id, price_min, cut_off_time_hrs, flag_off_time, route_image_url, cut_off_points),
                event_race_types!inner(type_id)
            `
      );

      // LOGIKA FILTER: Terapkan filter jika seriesIdToFilter ada
      if (seriesIdToFilter) {
        query = query.eq("series_id", seriesIdToFilter);
      }
      // END LOGIKA FILTER

      const { data, error } = await query.order("date_start", {
        ascending: false,
      });

      if (error) {
        console.error("Error fetching Events:", error);
        toast.error("Gagal memuat daftar Events.");
      } else {
        const seriesMap = new Map(fetchedSeries.map((s) => [s.id, s]));
        const processedData = data.map((event) => ({
          ...event,
          series_name:
            seriesMap.get(event.series_id)?.series_name ||
            "Series Tidak Ditemukan",
          // Menggunakan event_location untuk kolom Lokasi
          location_city_main: event.event_location || "N/A",
          // Menambahkan nama jarak ke event object
          distance_names: event.event_distances.map((d) => ({
            id: d.distance_id,
            name: distanceNameMap.get(d.distance_id) || "Jarak Tidak Dikenal",
          })),
        }));
        setEventsList(processedData);
      }
      setIsLoading(false);
    },
    [seriesIdToFilter]
  );

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
        date_end: formData.is_multiday ? formData.date_end : null,
        is_published: formData.is_published,
        // Menggunakan link array JSONB yang baru
        results_links: formData.results_links.filter(
          (l) => l.url.trim() !== ""
        ), // Filter out empty URLs
        docs_links: formData.docs_links.filter((l) => l.url.trim() !== ""), // Filter out empty URLs
        event_location: formData.event_location,
        // BARU: RPC Info (JSONB)
        rpc_info: formData.rpc_info,
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

        // For update, first delete all related distances and race types
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
      const distancePayload = formData.distances.map((d) => {
        // MENGGABUNGKAN TANGGAL DARI UI DENGAN WAKTU DARI UI (TIMESTAMPZ)
        const datePart = d.flag_off_date;
        const flagOffTimestamp = `${datePart}T${d.flag_off_time || "00:00"}:00`;

        // ⬅️ NEW: Map COP array, convert time_limit_hrs (HH:MM) to hours decimal
        const processedCop = (d.cut_off_points || [])
          .filter((cop) => cop.km_mark > 0 && cop.time_limit_hrs) // Filter out incomplete COP
          .map((cop) => ({
            km_mark: cop.km_mark,
            time_limit_hrs: parseHHMMToHours(cop.time_limit_hrs),
          }));

        return {
          event_id: eventId,
          distance_id: d.distance_id,
          price_min: d.price_min || 0,
          cut_off_time_hrs: d.cut_off_time_hrs || 0,
          // BARU: Flag Off Time (TIMESTAMPZ)
          flag_off_time: flagOffTimestamp,
          route_image_url: d.route_image_url || null, // <-- Tambahkan URL Gambar Rute
          // ⬅️ NEW: Include processed COP payload (JSONB)
          cut_off_points: processedCop,
        };
      });

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

      // Panggil fetchMasterData untuk memastikan semua Map di-reinitialize
      fetchMasterData();
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
      fetchMasterData();
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(`Gagal menghapus Event. Pesan: ${error.message}.`, {
        id: toastId,
      });
      setIsProcessing(false);
    }
  };

  const isActionDisabled = isProcessing || isModalOpen || isDeleteModalOpen;

  // Modifikasi Tampilan Event Management: Tambahkan Judul Sub-Page Dinamis
  const selectedSeries = seriesList.find((s) => s.id === seriesIdToFilter);
  const pageTitle = seriesIdToFilter
    ? `Event Tahunan Series: ${selectedSeries?.series_name || "Memuat..."}`
    : "Event Management";

  // --- UI UTAMA (Sesuai dengan SeriesCrud) ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tombol Back & Judul */}
      <div className="flex items-center mb-6">
        <button
          // Tombol ini selalu kembali ke Series View, dengan filter null
          onClick={() => navigateToEvents("series", null)}
          className="p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition mr-4 flex-shrink-0"
          title="Kembali ke Daftar Series"
          disabled={isActionDisabled}
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-4xl font-extrabold text-gray-900 flex-grow">
          {pageTitle}
        </h1>
      </div>

      <p className="text-gray-600 mb-8">
        {seriesIdToFilter
          ? `Menampilkan event yang terhubung dengan series: ${
              selectedSeries?.series_name || "Memuat..."
            }.`
          : "Kelola Event spesifik untuk setiap tahun di bawah Series yang tersedia."}
      </p>

      {/* Kontainer Utama Event CRUD (Mengikuti style SeriesCrud) */}
      <div className="rounded-xl bg-white p-6 shadow-xl border border-gray-100 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold text-gray-800">
            {displayName}
          </h3>
          {/* Tombol Aksi Kanan */}
          <div className="flex gap-3">
            {seriesList.length === 0 ? (
              <p className="text-sm text-red-500 pt-3 font-medium">
                Buat Series Induk dulu.
              </p>
            ) : (
              <button
                onClick={openAddModal}
                className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 transition shadow-md disabled:bg-gray-400 text-sm"
                disabled={isActionDisabled}
              >
                <PlusCircle size={18} className="mr-2" /> Tambah Event Baru
              </button>
            )}
          </div>
        </div>

        {/* Event List */}
        {isLoading ? (
          <div className="flex justify-center py-16 flex-grow items-center">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        ) : eventsList.length === 0 ? (
          <div className="text-center py-10 text-gray-500 italic">
            Belum ada Event Tahunan yang ditambahkan.
          </div>
        ) : (
          <div className="flex flex-col flex-grow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-2/12">
                    Series
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/12">
                    Tahun
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-3/12">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-2/12">
                    Lokasi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-3/12">
                    List Jarak
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-1/12">
                    Publikasi
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-24">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eventsList.map((event) => (
                  <tr key={event.id}>
                    {/* Kolom 1: Series */}
                    <td className="px-4 py-3 w-2/12 text-gray-700 text-sm">
                      <p className="font-medium text-gray-900 text-sm">
                        {event.series_name}
                      </p>
                    </td>

                    {/* Kolom 2: Tahun */}
                    <td className="px-4 py-3 w-1/12 text-gray-700 text-sm">
                      <p className="text-sm">{event.event_year}</p>
                    </td>

                    {/* Kolom 3: Tanggal Event */}
                    <td className="px-4 py-3 w-3/12 text-gray-700 text-sm">
                      <p className="text-sm">
                        {new Date(event.date_start).toLocaleDateString(
                          "id-ID",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                        {event.date_end && (
                          <span className="ml-1 text-sm">
                            s/d{" "}
                            {new Date(event.date_end).toLocaleDateString(
                              "id-ID",
                              {
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        )}
                      </p>
                    </td>

                    {/* Kolom 4: Lokasi */}
                    <td className="px-4 py-3 w-2/12 text-gray-700 text-sm">
                      <p className="text-sm">{event.location_city_main}</p>
                    </td>

                    {/* Kolom 5: List Jarak (Badges) */}
                    <td className="px-4 py-3 w-3/12">
                      {/* Badges Jarak */}
                      <div className="flex flex-wrap gap-1">
                        {event.distance_names.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                          >
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Kolom 6: Publikasi (Badge) */}
                    <td className="px-4 py-3 w-1/12 text-center text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${
                          event.is_published
                            ? "text-green-700 bg-green-100"
                            : "text-gray-700 bg-gray-200"
                        }`}
                      >
                        {event.is_published ? "Published" : "Draft"}
                      </span>
                    </td>

                    {/* Kolom 7: Aksi */}
                    <td className="px-4 py-3 text-right w-24">
                      {/* FIX: Container Aksi harus menggunakan flex dan gap yang kecil */}
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditModal(event)}
                          className={`text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition ${
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
