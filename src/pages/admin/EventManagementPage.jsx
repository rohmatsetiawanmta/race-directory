import React, { useState } from "react";
import { ArrowLeft, Zap } from "lucide-react";

import SeriesCrud from "./SeriesCrud.jsx";
import EventCrud from "./EventCrud.jsx"; // <-- Import Event CRUD BARU

const SeriesAndEventManagementPage = () => {
  const [view, setView] = useState("series");
  const [seriesIdToFilter, setSeriesIdToFilter] = useState(null);

  const navigateToEvents = (newView, seriesId = null) => {
    setSeriesIdToFilter(seriesId); // Simpan filter ID
    setView(newView);
  };

  return (
    <>
      {view === "series" && <SeriesCrud navigateToEvents={navigateToEvents} />}
      {view === "event" && (
        <EventCrud
          navigateToEvents={navigateToEvents}
          seriesIdToFilter={seriesIdToFilter}
        />
      )}
    </>
  );
};

export default SeriesAndEventManagementPage;
