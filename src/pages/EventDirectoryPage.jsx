import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  Loader,
  Calendar,
  MapPin,
  Ruler,
  Zap,
  ArrowRight,
  Search,
} from "lucide-react";

// Helper function yang diimpor dari EventCrud untuk formatting
const formatHoursToHHMM = (totalHours) => {
  if (typeof totalHours !== "number" || isNaN(totalHours) || totalHours < 0)
    return "00:00";
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
};

const EventDirectoryPage = () => {
  const [eventsList, setEventsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // UPDATED STATE: Filter and Search
  const [filterMode, setFilterMode] = useState("upcoming"); // 'upcoming', 'this_year', 'finished', or 'all'
  const [searchTerm, setSearchTerm] = useState("");

  const today = new Date().toISOString().substring(0, 10);
  const currentYear = new Date().getFullYear();

  // Trigger refetch when filter or search term changes
  useEffect(() => {
    fetchEvents();
  }, [filterMode, searchTerm]);

  const fetchEvents = async () => {
    setIsLoading(true);

    try {
      let query = supabase
        .from("events")
        .select(
          `
            id, event_year, date_start, date_end, is_published, event_location,
            series(series_name),
            event_distances(distances(distance_name, distance_km))
          `
        )
        .eq("is_published", true);

      let orderByField = "date_start";
      let ascending = true;

      // 1. FILTER BY DATE (UPCOMING vs THIS YEAR vs FINISHED vs ALL)
      if (filterMode === "upcoming") {
        query = query.gte("date_start", today);
      } else if (filterMode === "this_year") {
        query = query.eq("event_year", currentYear);
      } else if (filterMode === "finished") {
        query = query.lt("date_start", today);
        orderByField = "date_start";
        ascending = false; // Terbaru di atas
      }

      // 2. FILTER BY SEARCH TERM
      const search = searchTerm.trim();
      if (search) {
        query = query.or(
          `series.series_name.ilike.%${search}%,event_location.ilike.%${search}%`
        );
      }

      // 3. ORDERING
      const { data, error } = await query.order(orderByField, {
        ascending: ascending,
      });

      if (error) throw error;

      const processedData = data.map((event) => {
        const distances = event.event_distances.map(
          (ed) => ed.distances.distance_km
        );
        const minDistance = distances.length > 0 ? Math.min(...distances) : 0;
        const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;
        const distanceRange =
          minDistance === maxDistance && minDistance !== 0
            ? `${minDistance} km`
            : minDistance !== 0
            ? `${minDistance} - ${maxDistance} km`
            : "N/A";

        return {
          ...event,
          series_name: event.series.series_name,
          distance_names:
            event.event_distances
              .map((ed) => `${ed.distances.distance_name}`)
              .join(", ") || "Jarak Tidak Ditemukan",
          distance_range: distanceRange,
        };
      });

      setEventsList(processedData);
    } catch (error) {
      console.error("Error fetching public events:", error);
      toast.error("Gagal memuat daftar event.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateRange = (start, end) => {
    const startDate = new Date(start).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!end) return startDate;
    const endDate = new Date(end).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    // Jika tahun dan bulan sama, tampilkan hari saja untuk tanggal akhir
    if (
      new Date(start).getMonth() === new Date(end).getMonth() &&
      new Date(start).getFullYear() === new Date(end).getFullYear()
    ) {
      const endDay = new Date(end).toLocaleDateString("id-ID", {
        day: "numeric",
      });
      const startMonthYear = new Date(start).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      return `${new Date(start).getDate()} - ${endDay} ${startMonthYear}`;
    }

    return `${startDate} - ${endDate}`;
  };

  // Handlers for UI
  const handleFilterChange = (mode) => {
    setFilterMode(mode);
    setSearchTerm(""); // Reset search when changing filter mode
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const getButtonClass = (mode) => {
    return `px-4 py-2 rounded-lg font-semibold text-sm transition ${
      filterMode === mode
        ? "bg-blue-600 text-white shadow-lg"
        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
    }`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
        Direktori Event Lari Indonesia
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Temukan event lari yang akan datang dan siap Anda ikuti.
      </p>

      {/* FILTER AND SEARCH BAR UI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        {/* Filter Buttons (UPDATED: Added Finished) */}
        <div className="flex space-x-3 flex-shrink-0 overflow-x-auto pb-1">
          <button
            onClick={() => handleFilterChange("upcoming")}
            className={getButtonClass("upcoming")}
            disabled={isLoading}
          >
            Akan Datang
          </button>
          <button
            onClick={() => handleFilterChange("this_year")}
            className={getButtonClass("this_year")}
            disabled={isLoading}
          >
            Tahun Ini
          </button>
          <button
            onClick={() => handleFilterChange("finished")}
            className={getButtonClass("finished")}
            disabled={isLoading}
          >
            Baru Selesai
          </button>
          <button
            onClick={() => handleFilterChange("all")}
            className={getButtonClass("all")}
            disabled={isLoading}
          >
            Semua Event
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Cari nama series atau lokasi..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
            disabled={isLoading}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader size={32} className="animate-spin text-blue-600" />
        </div>
      ) : eventsList.length === 0 ? (
        <div className="text-center py-16 text-gray-500 italic border-2 border-dashed rounded-xl">
          {searchTerm ? (
            <p>Tidak ada Event yang cocok dengan pencarian Anda.</p>
          ) : filterMode === "upcoming" ? (
            <p>Tidak ada Event yang akan datang saat ini.</p>
          ) : filterMode === "this_year" ? (
            <p>
              Tidak ada Event yang dijadwalkan tahun {currentYear} saat ini.
            </p>
          ) : filterMode === "finished" ? (
            <p>Tidak ada Event yang baru selesai ditemukan.</p>
          ) : (
            <p>Tidak ada Event yang tersedia.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventsList.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 overflow-hidden"
            >
              <div className="p-6">
                <p className="text-sm font-semibold text-blue-600 uppercase mb-1">
                  {event.series_name}
                </p>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  {event.series_name} {event.event_year}
                </h2>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar
                      size={16}
                      className="text-red-500 mr-2 flex-shrink-0"
                    />
                    <span>
                      {formatDateRange(event.date_start, event.date_end)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MapPin
                      size={16}
                      className="text-green-500 mr-2 flex-shrink-0"
                    />
                    <span>{event.event_location}</span>
                  </div>
                  <div className="flex items-center">
                    <Ruler
                      size={16}
                      className="text-yellow-600 mr-2 flex-shrink-0"
                    />
                    <span>{event.distance_range}</span>
                  </div>
                </div>
              </div>
              <Link
                to={`/events/${event.id}`}
                className="flex items-center justify-between bg-gray-50 p-4 text-blue-600 font-semibold hover:bg-blue-100 transition"
              >
                Lihat Detail Event
                <ArrowRight size={18} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventDirectoryPage;
