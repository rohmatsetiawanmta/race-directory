import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Loader, Calendar, MapPin, Ruler, Zap, ArrowRight } from "lucide-react";

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

  // Filter state (bisa dikembangkan di iterasi berikutnya)
  const today = new Date().toISOString().substring(0, 10);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);

    try {
      // Fetch Event yang Published dan Tanggal Mulai >= Hari Ini
      const { data, error } = await supabase
        .from("events")
        .select(
          `
            id, event_year, date_start, date_end, is_published, event_location,
            series(series_name),
            event_distances(distances(distance_name, distance_km))
          `
        )
        .eq("is_published", true)
        .gte("date_start", today)
        .order("date_start", { ascending: true });

      if (error) throw error;

      const processedData = data.map((event) => {
        // Gabungkan semua nama jarak dari relasi
        const distanceNames =
          event.event_distances
            .map((ed) => `${ed.distances.distance_name}`)
            .join(", ") || "Jarak Tidak Ditemukan";

        // Cari jarak terpendek dan terpanjang untuk display range
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
          distance_names: distanceNames,
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
    if (new Date(start).getMonth() === new Date(end).getMonth()) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
        Direktori Event Lari Indonesia
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Temukan event lari yang akan datang dan siap Anda ikuti.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader size={32} className="animate-spin text-blue-600" />
        </div>
      ) : eventsList.length === 0 ? (
        <div className="text-center py-16 text-gray-500 italic border-2 border-dashed rounded-xl">
          Tidak ada Event yang akan datang saat ini.
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
