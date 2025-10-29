import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import toast from "react-hot-toast";
import {
  Loader,
  Calendar,
  MapPin,
  Ruler,
  Clock,
  DollarSign,
  Zap,
  Link as LinkIcon,
  Layers,
  Clock4,
  ArrowLeft,
  Image,
  Banknote,
  Wallet,
  FlagTriangleLeft,
  FlagTriangleRight,
  Flag,
} from "lucide-react";

// Helper function (Duplikasi dari EventCrud untuk kemandirian)
const formatHoursToHHMM = (totalHours) => {
  if (typeof totalHours !== "number" || isNaN(totalHours) || totalHours < 0)
    return "00:00";
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const EventDetailPage = () => {
  const { eventId } = useParams();
  const [eventData, setEventData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchEventDetail(eventId);
    }
  }, [eventId]);

  const fetchEventDetail = async (id) => {
    setIsLoading(true);

    try {
      // Deep select with all required relational data
      const { data, error } = await supabase
        .from("events")
        .select(
          `
            id, event_year, date_start, date_end, is_published, event_location, rpc_info,
            results_link, docs_link,
            series(series_name, organizer, location_city_main, series_official_url),
            event_distances(
                event_id, distance_id, price_min, cut_off_time_hrs, flag_off_time, route_image_url,
                distances(distance_name, distance_km, sort_order)
            ),
            event_race_types(
                race_types(type_name)
            )
          `
        )
        .eq("id", id)
        .eq("is_published", true) // Hanya tampilkan yang sudah dipublikasi
        .single();

      if (error) throw error;
      if (!data)
        throw new Error("Event tidak ditemukan atau belum dipublikasi.");

      // Sort distances by distance_km from master distances
      const sortedDistances = data.event_distances.sort((a, b) => {
        return a.distances.distance_km - b.distances.distance_km;
      });

      setEventData({ ...data, event_distances: sortedDistances });
    } catch (error) {
      console.error("Error fetching event detail:", error);
      toast.error(error.message || "Gagal memuat detail event.");
      setEventData(null); // Set null untuk menampilkan pesan not found
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateRange = (start, end) => {
    const startDate = formatDate(start);
    if (!end) return startDate;
    const endDate = formatDate(end);
    return `${startDate} - ${endDate}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 min-h-screen">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-red-600">
          Event Tidak Ditemukan
        </h1>
        <p className="mt-2 text-gray-600">
          Event yang Anda cari tidak tersedia atau belum dipublikasi.
        </p>
        <Link
          to="/events"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} className="inline mr-1" /> Kembali ke Direktori
        </Link>
      </div>
    );
  }

  const {
    series,
    event_year,
    date_start,
    date_end,
    event_location,
    results_link,
    docs_link,
    event_distances,
    event_race_types,
    rpc_info,
  } = eventData;

  const raceTypes = event_race_types
    .map((rt) => rt.race_types.type_name)
    .join(", ");

  const dateRange = formatDateRange(date_start, date_end);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tombol Kembali */}
      <Link
        to="/events"
        className="text-blue-600 hover:text-blue-800 flex items-center mb-6 font-semibold transition"
      >
        <ArrowLeft size={20} className="mr-2" /> Kembali ke Direktori
      </Link>

      <div className="bg-white rounded-xl shadow-2xl p-6 lg:p-10">
        {/* Header Event */}
        <h1 className="text-4xl font-extrabold text-gray-900 mb-1">
          {series.series_name} {event_year}
        </h1>
        <p className="text-xl text-blue-600 font-semibold mb-6">
          Series oleh {series.organizer}
        </p>

        {/* Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-6">
          <div className="flex items-start">
            <Calendar
              size={24}
              className="text-red-600 mr-3 mt-1 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium text-gray-500">Tanggal Event</p>
              <p className="font-bold text-gray-800">{dateRange}</p>
            </div>
          </div>
          <div className="flex items-start">
            <MapPin
              size={24}
              className="text-green-600 mr-3 mt-1 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium text-gray-500">Lokasi</p>
              <p className="font-bold text-gray-800">{event_location}</p>
            </div>
          </div>
          <div className="flex items-start">
            <Flag
              size={24}
              className="text-yellow-600 mr-3 mt-1 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium text-gray-500">Tipe Lomba</p>
              <p className="font-bold text-gray-800">{raceTypes}</p>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* SECTION 1: HARGA JARAK LOMBA */}
        {/* ============================================== */}
        <section className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Wallet size={28} className="mr-3 text-blue-600" /> Biaya
            Pendaftaran
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {event_distances.map((dist) => (
              <div
                key={dist.id}
                className="p-5 rounded-xl border-l-4 border-blue-500 shadow-md bg-white"
              >
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {dist.distances.distance_name}
                </p>
                <p className="text-3xl font-extrabold text-blue-900">
                  {formatCurrency(dist.price_min)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Harga Normal</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================== */}
        {/* SECTION 2: FLAG OFF & CUT OFF TIME */}
        {/* ============================================== */}
        <section className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Clock4 size={28} className="mr-3 text-red-600" /> Detail Race
          </h2>

          <div className="space-y-6">
            {event_distances.map((dist) => (
              <div
                key={dist.id}
                className="p-5 rounded-xl border border-red-200 shadow-md bg-white"
              >
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3">
                  {dist.distances.distance_name}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Flag Off */}
                  <div className="border p-3 rounded-lg bg-red-50/50">
                    <p className="text-xs font-medium text-red-600 mb-1 flex items-center">
                      <Clock4 size={14} className="mr-1" /> Flag Off (Start)
                    </p>
                    <p className="text-base font-bold text-gray-800 leading-snug">
                      {new Date(dist.flag_off_time).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "long",
                        }
                      )}{" "}
                      <span className="text-xl font-extrabold text-red-700">
                        {dist.flag_off_time.substring(11, 16)}
                      </span>{" "}
                      WIB
                    </p>
                  </div>

                  {/* COT */}
                  <div className="border p-3 rounded-lg bg-indigo-50/50">
                    <p className="text-xs font-medium text-indigo-600 mb-1 flex items-center">
                      <Clock size={14} className="mr-1" /> Cut Off Time (COT)
                    </p>
                    <p className="text-xl font-extrabold text-indigo-700">
                      {formatHoursToHHMM(dist.cut_off_time_hrs)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Waktu maksimal untuk finish.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================== */}
        {/* SECTION 3: GAMBAR RUTE LOMBA */}
        {/* ============================================== */}
        <section className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Image size={28} className="mr-3 text-green-600" /> Gambar Rute
            Lomba
          </h2>

          <div className="space-y-6">
            {event_distances.map((dist) => (
              <div
                key={dist.id}
                className="p-5 rounded-xl border border-green-200 shadow-md bg-white"
              >
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-3">
                  {dist.distances.distance_name}
                </h3>

                <div className="p-4 rounded-lg bg-green-50/50">
                  {dist.route_image_url ? (
                    <a
                      href={dist.route_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={dist.route_image_url}
                        alt={`Rute Lomba ${dist.distances.distance_name}`}
                        className="w-full h-auto max-h-96 object-contain rounded-lg shadow-md border"
                      />
                      <p className="text-xs text-gray-700 mt-2 text-center hover:underline italic font-semibold">
                        Klik gambar untuk melihat resolusi penuh
                      </p>
                    </a>
                  ) : (
                    <div className="p-8 text-center bg-white border-dashed border-2 rounded-lg text-gray-500 italic">
                      Gambar Rute untuk jarak ini belum tersedia.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Race Pack Collection (RPC) Info */}
        <section className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Layers size={28} className="mr-3 text-yellow-600" /> Race Pack
            Collection
          </h2>
          <div className="space-y-6">
            {rpc_info &&
              rpc_info.length > 0 &&
              rpc_info.map((loc, index) => (
                <div
                  key={index}
                  className="p-5 border rounded-xl shadow-md bg-white"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                    <MapPin size={20} className="mr-2 text-blue-500" />
                    {loc.location_name}
                  </h3>
                  <ul className="space-y-2 pl-2">
                    {loc.dates.map((dateItem, dateIndex) => (
                      <li
                        key={dateIndex}
                        className="text-gray-700 text-sm flex items-center"
                      >
                        <Calendar size={14} className="mr-2 text-gray-500" />
                        <span className="font-semibold mr-2">
                          {formatDate(dateItem.date)}:
                        </span>
                        {dateItem.time_start} - {dateItem.time_end} WIB
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>

        {/* 3. Link Eksternal */}
        <section className="mt-8 pt-6 border-t">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <LinkIcon size={28} className="mr-3 text-indigo-600" /> Link &
            Dokumen
          </h2>
          <div className="flex flex-wrap gap-4">
            {results_link && (
              <a
                href={results_link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <LinkIcon size={18} className="mr-2" /> Lihat Hasil Lomba
              </a>
            )}
            {docs_link && (
              <a
                href={docs_link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition flex items-center"
              >
                <LinkIcon size={18} className="mr-2" /> Lihat Dokumentasi
              </a>
            )}
            {series.series_official_url && (
              <a
                href={series.series_official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition flex items-center"
              >
                <LinkIcon size={18} className="mr-2" /> Website Resmi Series
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default EventDetailPage;
