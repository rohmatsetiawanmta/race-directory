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
  Wallet,
  Flag,
  Route,
  ChevronLeft, // Icon untuk navigasi
  ChevronRight, // Icon untuk navigasi
} from "lucide-react";

// Helper function (Duplikasi dari EventCrud untuk kemandirian)
const formatHours = (totalHours) => {
  if (typeof totalHours !== "number" || isNaN(totalHours) || totalHours < 0)
    return "00:00";
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  var text = "";
  if (totalHours === 0) {
    return "-";
  }
  if (hours != 0) {
    text = `${hours} jam `;
  }
  if (minutes != 0) {
    text = `${text}${minutes} menit `;
  }

  return text.trim();
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
      // Query 1: Get the current event detail
      const { data, error } = await supabase
        .from("events")
        .select(
          `
            id, event_year, date_start, date_end, is_published, event_location, rpc_info,
            results_links, docs_links, 
            series(id, series_name, organizer, location_city_main, series_official_url), 
            event_distances(
                event_id, distance_id, price_min, cut_off_time_hrs, flag_off_time, route_image_url,
                cut_off_points, 
                distances(distance_name, distance_km, sort_order)
            ),
            event_race_types(
                race_types(type_name)
            )
          `
        )
        .eq("id", id)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      if (!data)
        throw new Error("Event tidak ditemukan atau belum dipublikasi.");

      const currentSeriesId = data.series.id;

      // Query 2: Get all related events for navigation
      const { data: allSeriesEvents, error: eventsError } = await supabase
        .from("events")
        .select("id, event_year")
        .eq("series_id", currentSeriesId)
        .eq("is_published", true)
        // Order berdasarkan TAHUN EVENT (Ascending), kemudian Tanggal Mulai (Descending)
        // Ini memastikan navigasi konsisten berdasarkan urutan waktu.
        .order("event_year", { ascending: true })
        .order("date_start", { ascending: true });

      if (eventsError)
        console.error("Error fetching related events:", eventsError);

      let prevEvent = null; // Tahun/Event yang terjadi SEBELUM event saat ini (Earlier Event)
      let nextEvent = null; // Tahun/Event yang terjadi SETELAH event saat ini (Later Event)

      if (allSeriesEvents && allSeriesEvents.length > 0) {
        const currentIndex = allSeriesEvents.findIndex(
          (event) => event.id === data.id
        );

        // prevEvent (Index yang lebih kecil = Penyelenggaraan Sebelumnya/Earlier)
        if (currentIndex > 0) {
          prevEvent = allSeriesEvents[currentIndex - 1];
        }
        // nextEvent (Index yang lebih besar = Penyelenggaraan Berikutnya/Later)
        if (currentIndex < allSeriesEvents.length - 1) {
          nextEvent = allSeriesEvents[currentIndex + 1];
        }
      }

      // Sort distances as before
      const sortedDistances = data.event_distances.sort((a, b) => {
        return a.distances.distance_km - b.distances.distance_km;
      });

      setEventData({
        ...data,
        event_distances: sortedDistances,
        // ⬅️ UPDATED: Simpan objek event lengkap untuk navigasi
        prevEvent: prevEvent,
        nextEvent: nextEvent,
      });
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

  // Helper function to render dynamic links
  const renderLinks = (links, defaultLabel, baseBgColor, baseTextColor) => {
    if (!Array.isArray(links) || links.length === 0) return null;

    return links
      .filter((link) => link.url && link.url.trim() !== "")
      .map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-4 py-2 ${baseBgColor} ${baseTextColor} font-semibold rounded-lg hover:opacity-90 transition flex items-center shadow-md`}
        >
          <LinkIcon size={18} className="mr-2" />
          {link.label || defaultLabel}
        </a>
      ));
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
    results_links,
    docs_links,
    event_distances,
    event_race_types,
    rpc_info,
    prevEvent, // ⬅️ Destructure event object
    nextEvent, // ⬅️ Destructure event object
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

        {/* ⬅️ NEW: Navigation Buttons by Year (Mencerminkan Mockup) */}
        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-full mb-8">
          {/* Tombol Sebelumnya (Tahun yang lebih lama) */}
          {prevEvent ? (
            <Link
              to={`/events/${prevEvent.id}`}
              className="flex items-center rounded-full px-4 py-2 bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-100 transition shadow-sm"
            >
              <ChevronLeft size={18} className="mr-2" />
              {prevEvent.event_year}
            </Link>
          ) : (
            <span className="flex items-center rounded-full px-4 py-2 bg-gray-100 text-gray-400 font-semibold transition cursor-not-allowed">
              <ChevronLeft size={18} className="mr-2" /> -
            </span>
          )}

          {/* Tombol Berikutnya (Tahun yang lebih baru) */}
          {nextEvent ? (
            <Link
              to={`/events/${nextEvent.id}`}
              className="flex items-center rounded-full px-4 py-2 bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-100 transition shadow-sm"
            >
              {nextEvent.event_year}
              <ChevronRight size={18} className="ml-2" />
            </Link>
          ) : (
            <span className="flex items-center rounded-full px-4 py-2 bg-gray-100 text-gray-400 font-semibold transition cursor-not-allowed">
              - <ChevronRight size={18} className="ml-2" />
            </span>
          )}
        </div>
        {/* ⬅️ END: Navigation Buttons */}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-8 border-b pb-4">
          <a
            href="#price"
            className="hover:text-blue-600 font-semibold transition"
          >
            Biaya Pendaftaran
          </a>
          <span className="text-gray-300">|</span>
          <a
            href="#schedule"
            className="hover:text-blue-600 font-semibold transition"
          >
            Jadwal Race
          </a>
          <span className="text-gray-300">|</span>
          <a
            href="#route"
            className="hover:text-blue-600 font-semibold transition"
          >
            Rute Lomba
          </a>
          <span className="text-gray-300">|</span>
          <a
            href="#rpc"
            className="hover:text-blue-600 font-semibold transition"
          >
            RPC Info
          </a>
          <span className="text-gray-300">|</span>
          <a
            href="#links"
            className="hover:text-blue-600 font-semibold transition"
          >
            Link
          </a>
        </div>

        {/* ============================================== */}
        {/* SECTION: OVERVIEW RACE */}
        {/* ============================================== */}
        <section className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Ruler size={28} className="mr-3 text-red-600" /> Overview Race
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-6">
            <div className="flex items-start">
              <Calendar
                size={24}
                className="text-red-600 mr-3 mt-1 flex-shrink-0"
              />
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Tanggal Event
                </p>
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
        </section>

        {/* ============================================== */}
        {/* SECTION 1: HARGA JARAK LOMBA (CARD GRID) */}
        {/* ============================================== */}
        <section id="price" className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Wallet size={28} className="mr-3 text-blue-600" /> Biaya
            Pendaftaran
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {event_distances.map((dist) => (
              <div
                key={dist.id}
                className="p-5 rounded-xl border-l-4 border-blue-500 shadow-lg bg-white"
              >
                <p className="text-md font-medium text-gray-500">
                  {dist.distances.distance_name}
                </p>
                <p className="text-xl font-extrabold text-blue-900">
                  {formatCurrency(dist.price_min)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================== */}
        {/* SECTION 2: FLAG OFF & CUT OFF TIME (CARD PER JARAK) */}
        {/* ============================================== */}
        <section id="schedule" className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Clock4 size={28} className="mr-3 text-red-600" /> Jadwal Race
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {event_distances.map((dist) => (
              <div
                key={dist.id}
                className="p-5 rounded-xl shadow-lg bg-white border-l-4 border-red-500 " // Card utama menggunakan shadow
              >
                <h3 className="text-lg font-bold text-gray-900 pb-2 mb-4">
                  {dist.distances.distance_name}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DETAIL 1: Flag Off Combined Date/Time (2 Kolom) */}
                  <div className="p-4 rounded-lg bg-red-50 shadow-md">
                    <p className="text-sm font-bold text-red-600 mb-1 flex items-center">
                      <Clock4 size={14} className="mr-1" /> Flag Off
                    </p>
                    <p className="text-lg font-semibold text-gray-800 leading-snug">
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(new Date(dist.flag_off_time))}
                      ,<br />
                      {dist.flag_off_time.substring(11, 16)} WIB
                    </p>
                  </div>

                  {/* DETAIL 2: COT (1 Kolom) */}
                  <div className="p-4 rounded-lg bg-indigo-50 shadow-md">
                    <p className="text-sm font-bold text-indigo-600 mb-1 flex items-center">
                      <Clock size={14} className="mr-1" /> Cut Off Time (COT)
                    </p>
                    <p className="text-lg font-semibold text-indigo-700">
                      {formatHours(dist.cut_off_time_hrs)}
                    </p>
                  </div>

                  {/* DETAIL 3: Cut Off Points (Jika ada) */}
                  {Array.isArray(dist.cut_off_points) &&
                    dist.cut_off_points.length > 0 && (
                      <div className="col-span-2 p-4 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm font-bold text-red-700 mb-2 flex items-center">
                          <Route size={14} className="mr-1" />
                          Cut Off Points
                        </p>
                        <ul className="space-y-1">
                          {/* Data Cut Off Points di-map dan ditampilkan sebagai durasi (menggunakan formatHours) */}
                          {dist.cut_off_points
                            .sort((a, b) => a.km_mark - b.km_mark) // Sort by KM ascending
                            .map((cop, copIndex) => (
                              <li
                                key={copIndex}
                                className="text-sm text-gray-700"
                              >
                                <span className="font-semibold text-red-500">
                                  KM {cop.km_mark}:
                                </span>{" "}
                                <span className="font-semibold">
                                  {formatHours(cop.time_limit_hrs)}
                                </span>{" "}
                                dari Flag Off
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================== */}
        {/* SECTION 3: GAMBAR RUTE LOMBA (GRID) */}
        {/* ============================================== */}
        <section id="route" className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Route size={28} className="mr-3 text-green-600" /> Rute Lomba
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {event_distances.map((dist) => (
              <div
                key={dist.id}
                className="rounded-xl border border-green-200 shadow-md overflow-hidden bg-green-100/50"
              >
                <h3 className="text-lg font-bold text-gray-900 pt-3 text-center">
                  {dist.distances.distance_name}
                </h3>

                {/* Container Image - Hapus padding/bg hijau di sini */}
                <div className="p-3">
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
                        // Penyesuaian untuk mengisi ruang dan menghilangkan whitespace
                        className="h-full w-auto object-contain rounded-lg shadow-md border"
                      />
                    </a>
                  ) : (
                    <div className="p-8 text-center bg-gray-50 border-dashed border-2 rounded-lg text-gray-500 italic">
                      Gambar Rute belum tersedia.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================== */}
        {/* SECTION 4: Race Pack Collection (RPC) Info (UI Improved) */}
        {/* ============================================== */}
        <section id="rpc" className="mb-10 pt-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Layers size={28} className="mr-3 text-yellow-600" /> Race Pack
            Collection Info
          </h2>
          <div className="space-y-4">
            {rpc_info &&
              rpc_info.length > 0 &&
              rpc_info.map((loc, index) => (
                <div
                  key={index}
                  // UI bersih: border kiri kuning, bg abu-abu, shadow kecil
                  className="p-4 rounded-xl border-l-4 border-yellow-500 shadow-sm bg-gray-50"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                    <MapPin size={20} className="mr-2 text-blue-500" />
                    {loc.location_name}
                  </h3>
                  <ul className="space-y-1 text-sm pl-2">
                    {loc.dates.map((dateItem, dateIndex) => (
                      <li
                        key={dateIndex}
                        className="text-gray-700 flex items-center"
                      >
                        <Calendar
                          size={14}
                          className="mr-2 text-gray-500 flex-shrink-0"
                        />
                        <span className="font-semibold mr-2 flex-shrink-0">
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

        {/* ============================================== */}
        {/* SECTION 5: Link Eksternal */}
        {/* ============================================== */}
        <section id="links" className="mt-8 pt-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <LinkIcon size={28} className="mr-3 text-indigo-600" /> Link &
            Dokumen
          </h2>
          <div className="flex flex-wrap gap-4">
            {/* Hasil Lomba Links (Warna Biru) */}
            {renderLinks(
              results_links,
              "Link Hasil Lomba",
              "bg-blue-600",
              "text-white"
            )}

            {/* Dokumentasi Links (Warna Putih Border) */}
            {renderLinks(
              docs_links,
              "Link Dokumentasi",
              "border border-gray-300 bg-white",
              "text-gray-700 hover:bg-gray-100"
            )}

            {/* Link Website Resmi Series (TETAP SAMA) */}
            {series.series_official_url && (
              <a
                href={series.series_official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition flex items-center shadow-md"
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
