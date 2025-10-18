import React, { useState } from "react";
import { ArrowLeft, Zap } from "lucide-react";

import SeriesCrud from "./SeriesCrud.jsx";
import EventCrud from "./EventCrud.jsx"; // <-- Import Event CRUD BARU

// Placeholder untuk Event List dihapus, diganti dengan EventCrud

// SeriesCrud akan memanggil navigateToEvents('event') untuk berpindah ke EventCrud
// EventCrud akan memanggil navigateToEvents('series') untuk berpindah kembali

const SeriesAndEventManagementPage = () => {
  // State untuk mengontrol tampilan: 'series' atau 'event'
  const [view, setView] = useState("series");

  const navigateToEvents = (newView) => {
    setView(newView);
  };

  return (
    <>
      {/* Tampilan Series (FR-A01) */}
      {view === "series" && <SeriesCrud navigateToEvents={navigateToEvents} />}

      {/* Tampilan Event Tahunan (FR-A02) */}
      {view === "event" && <EventCrud navigateToEvents={navigateToEvents} />}
    </>
  );
};

export default SeriesAndEventManagementPage;
