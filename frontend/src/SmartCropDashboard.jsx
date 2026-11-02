import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./SmartCrop.css";

// ===============================
// NAVIGATION ITEMS
// ===============================
const NAV_ITEMS = [
  { icon: "📊", label: "Dashboard" },
  { icon: "💧", label: "Land & Water" },
  { icon: "☁️", label: "Weather" },
  { icon: "🌱", label: "Crop Recommendation" },
  { icon: "⚠️", label: "Disease Risk Map" },
  { icon: "🍃", label: "Fertilizer Recommendation" },
  { icon: "📜", label: "Historical Data" },
  { icon: "🗺️", label: "Field Mapping" },
  { icon: "📄", label: "Reports" },
  { icon: "⚙️", label: "Settings" },
  { icon: "❓", label: "Help" },
];

// ===============================
// WEATHER API
// ===============================
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || "";
const WEATHER_API_URL =
  import.meta.env.VITE_WEATHER_API_URL || "https://api.open-meteo.com/v1/forecast";
const USE_WEATHERAPI = Boolean(WEATHER_API_KEY) && /weatherapi\.com/i.test(WEATHER_API_URL);

const OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const TALUK_COORDS = {
  Hunsur: [12.3049, 76.2929],
  Heggadadevankote: [12.0883, 76.3296],
  Mysuru: [12.2958, 76.6394],
  Nanjangud: [12.1197, 76.6837],
  "K.R.Nagar": [12.4244, 76.3883],
  Periyapatana: [12.3286, 76.0714],
  "T-Narsipur": [12.2102, 76.8990],
};
const DEFAULT_MAP_CENTER = [12.2958, 76.6394];
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function MapRecenter({ position }) {
  const map = useMap();
  useEffect(() => { map.setView(position, 11, { animate: true }); }, [map, position]);
  return null;
}

function PlotMapClickHandler({ enabled, onPoint }) {
  useMapEvents({
    click(event) {
      if (enabled) onPoint([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

const DEFAULT_WEATHER = {
  tempC: "--",
  humidity: "--",
  rainfallMm: "--",
  windKph: "--",
  uv: "--",
  condition: "Loading...",
  icon: "",
  feelsLikeC: "--",
  cloud: "--",
  updated: "",
};

const mapWeatherCode = (code) => {
  const codes = {
    0: "Clear sky",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent rain showers",
    85: "Light snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm",
  };

  return codes[code] || "Weather update";
};

const buildWeatherQueries = (taluk, district) => [
  taluk,
  `${taluk}, Karnataka, India`,
  `${district}, Karnataka, India`,
  "Chitradurga, Karnataka, India",
];

// ===============================
// LAND & WATER INFORMATION
// ===============================
const LAND_INFO = [
  {
    icon: "🌿",
    label: "Area",
    value: "1,250 ha",
  },
  {
    icon: "🪨",
    label: "Soil Type",
    value: "Red Soil",
  },
  {
    icon: "💧",
    label: "Irrigation Type",
    value: "Borewell",
  },
  {
    icon: "🌡️",
    label: "Groundwater",
    value: "18.4 m",
  },
  {
    icon: "💦",
    label: "Net Irrigated Area",
    value: "720 ha",
  },
];

// ===============================
// CROP RECOMMENDATIONS
// ===============================
const CROPS = [
  {
    icon: "🌾",
    name: "Ragi",
    suitability: 94,
    yieldVal: "2,800",
  },
  {
    icon: "🌽",
    name: "Maize",
    suitability: 88,
    yieldVal: "3,200",
  },
  {
    icon: "🌱",
    name: "Groundnut",
    suitability: 82,
    yieldVal: "2,100",
  },
];

const DISEASE_PREVENTION = [
  {
    crops: ["paddy", "rice"],
    disease: "Blast and sheath blight",
    steps: [
      "Use healthy, locally recommended seed and avoid planting too densely.",
      "Keep bunds and field channels clear; avoid prolonged stagnant water where local practice permits.",
      "Use balanced fertilizer and avoid excess nitrogen; inspect leaves and stems regularly.",
      "Remove heavily infected residues after harvest and rotate crops where practical.",
    ],
  },
  {
    crops: ["coconut"],
    disease: "Bud rot and fruit rot",
    steps: [
      "Maintain good drainage around palms, especially during the monsoon.",
      "Remove and safely dispose of diseased plant parts; avoid injuring the crown.",
      "Keep the palm basin clean and follow locally recommended balanced nutrition.",
      "Check crowns and developing nuts regularly and seek advice promptly if rot appears.",
    ],
  },
  {
    crops: ["ginger"],
    disease: "Soft rot and rhizome rot",
    steps: [
      "Plant only healthy, disease-free rhizomes in well-drained raised beds.",
      "Do not let water collect in beds; clean drains before and during rainy periods.",
      "Rotate away from ginger and other related crops, and remove diseased clumps and rhizomes.",
      "Clean tools between plots and avoid moving soil or water from affected areas.",
    ],
  },
  {
    crops: ["tea"],
    disease: "Blister blight and leaf diseases",
    steps: [
      "Prune and manage shade to improve airflow through the bushes.",
      "Remove badly affected leaves and keep pruning debris out of the field.",
      "Avoid excessive nitrogen and monitor young flush during wet, humid weather.",
      "Use only locally approved treatments when advised by a tea extension officer.",
    ],
  },
  {
    crops: ["cotton"],
    disease: "Wilt and leaf-spot diseases",
    steps: [
      "Use certified seed and varieties recommended for the local area.",
      "Rotate with non-host crops and remove volunteer cotton and infected crop residues.",
      "Maintain suitable plant spacing and drainage; avoid over-irrigation.",
      "Scout plants regularly and get suspected wilt checked before choosing a treatment.",
    ],
  },
  {
    crops: ["groundnut"],
    disease: "Leaf spots and rust",
    steps: [
      "Use healthy seed and rotate groundnut with non-host crops.",
      "Maintain recommended spacing and avoid keeping foliage wet for long periods.",
      "Remove infected crop residues after harvest and monitor lower leaves regularly.",
      "Ask a local agriculture officer to confirm the disease before applying any pesticide.",
    ],
  },
  {
    crops: ["pepper"],
    disease: "Foot rot (quick wilt)",
    steps: [
      "Ensure fast drainage around vines and do not allow water to stagnate.",
      "Use healthy planting material and avoid damaging roots and stems during field work.",
      "Remove severely affected vines and contaminated debris; do not move soil from affected spots.",
      "Keep the vine base aerated and ask an extension officer to confirm suspected foot rot.",
    ],
  },
  {
    crops: ["arecanut"],
    disease: "Fruit rot (koleroga) and bud rot",
    steps: [
      "Keep drainage channels open and improve airflow by removing excess weeds.",
      "Collect and remove affected nuts and fallen diseased material from the garden.",
      "Inspect palms and bunches frequently during prolonged wet weather.",
      "Seek local horticulture advice early if rot is observed; do not rely on a map as diagnosis.",
    ],
  },
  {
    crops: ["cardamum", "cardamom"],
    disease: "Capsule rot and clump rot",
    steps: [
      "Maintain drainage and suitable shade; avoid waterlogging around clumps.",
      "Remove diseased capsules and plant debris and keep the clumps well ventilated.",
      "Use healthy planting material and clean tools before moving between clumps.",
      "Monitor closely during wet weather and confirm symptoms with a local extension officer.",
    ],
  },
];

// ===============================
// HISTORICAL CROP DATA
// ===============================
const HISTORY = [
  {
    year: 2024,
    season: "Kharif",
    crop: "Ragi",
    area: 420,
  },
  {
    year: 2023,
    season: "Kharif",
    crop: "Maize",
    area: 380,
  },
  {
    year: 2022,
    season: "Kharif",
    crop: "Ragi",
    area: 450,
  },
  {
    year: 2021,
    season: "Kharif",
    crop: "Groundnut",
    area: 310,
  },
];

// ===============================
// YIELD INFORMATION
// ===============================
const YIELD_BOXES = [
  {
    label: "Area Average",
    value: "2,800",
  },
  {
    label: "Taluk Average",
    value: "2,450",
  },
  {
    label: "District Average",
    value: "2,300",
  },
];

// ===============================
// MAIN COMPONENT
// ===============================
export default function SmartCropDashboard({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [showFertilizerDetails, setShowFertilizerDetails] = useState(false);
  const [fertilizerMode, setFertilizerMode] = useState("npk");
  const fertilizerSectionRef = useRef(null);
  const fieldMappingRef = useRef(null);

  const [district, setDistrict] = useState("");
  const [taluk, setTaluk] = useState("");
  const [year, setYear] = useState("");
  const [crop, setCrop] = useState("");
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [years, setYears] = useState([]);
  const [crops, setCrops] = useState([]);
  const [cropData, setCropData] = useState(null);
  const [cropDataLoading, setCropDataLoading] = useState(false);
  const [cropDataError, setCropDataError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [updates, setUpdates] = useState([]);
  const [updatesLoading, setUpdatesLoading] = useState(true);
  const [updatesError, setUpdatesError] = useState("");

  const [weather, setWeather] = useState(DEFAULT_WEATHER);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");
  const [diseaseMapPosition, setDiseaseMapPosition] = useState(null);
  const [diseaseMapLocationError, setDiseaseMapLocationError] = useState("");
  const [fieldPlots, setFieldPlots] = useState([]);
  const [fieldPlotsLoading, setFieldPlotsLoading] = useState(false);
  const [fieldPlotsError, setFieldPlotsError] = useState("");
  const [fieldPlotsMessage, setFieldPlotsMessage] = useState("");
  const [fieldPlotSaving, setFieldPlotSaving] = useState(false);
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState([]);
  const [plotForm, setPlotForm] = useState({
    farm_name: "",
    plot_name: "",
    district: "",
    taluk: "",
    crop: "",
    season: "Kharif",
    year: String(new Date().getFullYear()),
    notes: "",
  });
  const [seasonPlotId, setSeasonPlotId] = useState(null);
  const [seasonForm, setSeasonForm] = useState({
    crop: "",
    season: "Kharif",
    year: String(new Date().getFullYear()),
    notes: "",
  });
  const [seasonSaving, setSeasonSaving] = useState(false);
  const selectedCropName = cropData?.crop || crop;
  const selectedCropGuidance = DISEASE_PREVENTION.find((entry) =>
    entry.crops.includes(selectedCropName.trim().toLowerCase())
  );
  const nutrientValue = (value) => value == null || value === "" ? null : Number(value);
  const fertilizerValues = cropData ? {
    nitrogen: nutrientValue(cropData.recommended_n),
    phosphorus: nutrientValue(cropData.recommended_p),
    potassium: nutrientValue(cropData.recommended_k),
  } : null;
  const hasFertilizerValues = fertilizerValues && Object.values(fertilizerValues).some(
    (value) => value !== null && Number.isFinite(value)
  );
  const isOrganicRecord = /organic/i.test(cropData?.farming_type || "");

  useEffect(() => {
    setFertilizerMode(/organic/i.test(cropData?.farming_type || "") ? "organic" : "npk");
    setShowFertilizerDetails(false);
  }, [cropData?.farming_type, cropData?.crop, cropData?.year]);
  const humidityValue = weather.humidity === "--" || weather.humidity == null ? NaN : Number(weather.humidity);
  const rainfallValue = weather.rainfallMm === "--" || weather.rainfallMm == null ? NaN : Number(weather.rainfallMm);
  const hasWeatherRiskData = Number.isFinite(humidityValue) || Number.isFinite(rainfallValue);
  const diseaseRisk = !hasWeatherRiskData
    ? { label: "Unavailable", color: "#64748b", className: "unknown" }
    : humidityValue >= 85 || rainfallValue >= 10
      ? { label: "Elevated", color: "#c9503f", className: "high" }
      : humidityValue >= 70 || rainfallValue >= 2
        ? { label: "Moderate", color: "#e39b2c", className: "medium" }
        : { label: "Lower", color: "#70a452", className: "low" };

  useEffect(() => {
    if (!district || !taluk) {
      setDiseaseMapPosition(null);
      setDiseaseMapLocationError("");
      return;
    }

    const knownLocation = Object.entries(TALUK_COORDS).find(
      ([name]) => name.toLowerCase() === taluk.toLowerCase()
    );
    if (knownLocation) {
      setDiseaseMapPosition(knownLocation[1]);
      setDiseaseMapLocationError("");
      return;
    }

    let active = true;
    setDiseaseMapPosition(null);
    setDiseaseMapLocationError("");
    const query = `${taluk}, ${district}, Karnataka, India`;
    fetch(`${OPEN_METEO_GEOCODE_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.reason || `Location lookup failed (${response.status})`);
        const result = data.results?.[0];
        if (!result) throw new Error("No map location was found for this taluk.");
        return [result.latitude, result.longitude];
      })
      .then((position) => {
        if (active) setDiseaseMapPosition(position);
      })
      .catch((error) => {
        if (active) setDiseaseMapLocationError(error.message || "Unable to locate this taluk on the map.");
      });

    return () => { active = false; };
  }, [district, taluk]);

  const loadUpdates = async () => {
    setUpdatesLoading(true);
    setUpdatesError("");
    try {
      const token = localStorage.getItem("smartCropToken");
      const response = await fetch(`${API_BASE_URL}/updates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load updates");
      setUpdates(data.updates || []);
    } catch (error) {
      setUpdates([]);
      setUpdatesError(error.message || "Unable to load updates");
    } finally {
      setUpdatesLoading(false);
    }
  };

  useEffect(() => { loadUpdates(); }, []);

  const loadFieldPlots = async () => {
    setFieldPlotsLoading(true);
    setFieldPlotsError("");
    try {
      const token = localStorage.getItem("smartCropToken");
      const response = await fetch(`${API_BASE_URL}/plots`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load registered fields");
      setFieldPlots(data.plots || []);
    } catch (error) {
      setFieldPlotsError(error.message || "Unable to load registered fields");
    } finally {
      setFieldPlotsLoading(false);
    }
  };

  useEffect(() => { loadFieldPlots(); }, []);

  useEffect(() => {
    setPlotForm((form) => ({
      ...form,
      district: form.district || district,
      taluk: form.taluk || taluk,
    }));
  }, [district, taluk]);

  async function saveFieldPlot(event) {
    event.preventDefault();
    setFieldPlotsError("");
    setFieldPlotsMessage("");
    if (boundaryPoints.length < 3) {
      setFieldPlotsError("Draw a field boundary with at least 3 points before saving.");
      return;
    }
    setFieldPlotSaving(true);
    try {
      const token = localStorage.getItem("smartCropToken");
      const ring = [...boundaryPoints, boundaryPoints[0]].map(([lat, lon]) => [lon, lat]);
      const response = await fetch(`${API_BASE_URL}/plots`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...plotForm,
          year: Number(plotForm.year),
          notes: plotForm.notes.trim() || null,
          boundary: { type: "Polygon", coordinates: [ring] },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to save field");
      setFieldPlots((plots) => [data, ...plots]);
      setFieldPlotsMessage(`${data.plot_name} saved (${data.area_ha} ha).`);
      setBoundaryPoints([]);
      setIsDrawingBoundary(false);
      setPlotForm((form) => ({
        ...form,
        farm_name: "",
        plot_name: "",
        crop: "",
        notes: "",
      }));
    } catch (error) {
      setFieldPlotsError(error.message || "Unable to save field");
    } finally {
      setFieldPlotSaving(false);
    }
  }

  async function uploadFieldBoundary(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFieldPlotsError("");
    setFieldPlotsMessage("");
    try {
      const parsed = JSON.parse(await file.text());
      const geometry = parsed.type === "Feature" ? parsed.geometry : parsed;
      if (geometry?.type !== "Polygon" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1) {
        throw new Error("Upload a GeoJSON Polygon with one exterior boundary ring. MultiPolygons and interior rings are not supported.");
      }
      let ring = geometry.coordinates[0];
      if (!Array.isArray(ring)) throw new Error("GeoJSON boundary ring is invalid.");
      if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) {
        ring = ring.slice(0, -1);
      }
      if (ring.length < 3 || ring.length > 1000 || ring.some((point) =>
        !Array.isArray(point) || point.length < 2 || !Number.isFinite(Number(point[0])) ||
        !Number.isFinite(Number(point[1])) || Math.abs(Number(point[0])) > 180 || Math.abs(Number(point[1])) > 90
      )) {
        throw new Error("Boundary must contain 3–1000 valid longitude/latitude points.");
      }
      setBoundaryPoints(ring.map(([longitude, latitude]) => [Number(latitude), Number(longitude)]));
      setIsDrawingBoundary(false);
      setFieldPlotsMessage(`Loaded ${ring.length} boundary points from ${file.name}. Check the map before saving.`);
    } catch (error) {
      setFieldPlotsError(error instanceof SyntaxError ? "The selected file is not valid GeoJSON/JSON." : (error.message || "Unable to read the field boundary."));
    }
  }

  async function removeFieldPlot(plot) {
    if (!window.confirm(`Delete ${plot.plot_name} and all its crop history?`)) return;
    setFieldPlotsError("");
    setFieldPlotsMessage("");
    try {
      const token = localStorage.getItem("smartCropToken");
      const response = await fetch(`${API_BASE_URL}/plots/${plot.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to delete field");
      setFieldPlots((plots) => plots.filter((item) => item.id !== plot.id));
      setFieldPlotsMessage(`${plot.plot_name} and its crop history were deleted.`);
    } catch (error) {
      setFieldPlotsError(error.message || "Unable to delete field");
    }
  }

  async function addPlotSeason(event, plotId) {
    event.preventDefault();
    setFieldPlotsError("");
    setFieldPlotsMessage("");
    setSeasonSaving(true);
    try {
      const token = localStorage.getItem("smartCropToken");
      const response = await fetch(`${API_BASE_URL}/plots/${plotId}/seasons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...seasonForm,
          year: Number(seasonForm.year),
          notes: seasonForm.notes.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to record crop history");
      setFieldPlots((plots) => plots.map((plot) => plot.id === plotId ? data : plot));
      setSeasonPlotId(null);
      setSeasonForm({ crop: "", season: "Kharif", year: String(new Date().getFullYear()), notes: "" });
      setFieldPlotsMessage("Crop season added to field history.");
    } catch (error) {
      setFieldPlotsError(error.message || "Unable to record crop history");
    } finally {
      setSeasonSaving(false);
    }
  }

  const fetchWeather = async () => {
    setWeatherLoading(true);
    setWeatherError("");

    try {
      let data = null;
      let lastError = "Unable to fetch weather data.";

      for (const query of buildWeatherQueries(taluk, district)) {
        if (USE_WEATHERAPI) {
          const url =
            `${WEATHER_API_URL}?key=${encodeURIComponent(WEATHER_API_KEY)}` +
            `&q=${encodeURIComponent(query)}&aqi=no`;

          try {
            const response = await fetch(url, {
              method: "GET",
              headers: { Accept: "application/json" },
            });

            const result = await response.json();

            if (response.ok && !result.error) {
              data = result;
              break;
            }

            lastError =
              result?.error?.message || `Weather API error (${response.status})`;
          } catch (requestError) {
            lastError = requestError?.message || "Weather API request failed.";
          }
        }

        if (!data) {
          const geocodeUrl = `${OPEN_METEO_GEOCODE_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
          const geocodeResponse = await fetch(geocodeUrl);
          const geocodeResult = await geocodeResponse.json();
          const place = geocodeResult?.results?.[0];

          if (!place) {
            continue;
          }

          const weatherUrl =
            `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
            "&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,uv_index,cloud_cover,apparent_temperature,weather_code" +
            "&timezone=auto&forecast_days=1";

          const weatherResponse = await fetch(weatherUrl);
          const weatherResult = await weatherResponse.json();

          if (weatherResponse.ok && weatherResult?.current) {
            data = {
              current: {
                temp_c: weatherResult.current.temperature_2m,
                humidity: weatherResult.current.relative_humidity_2m,
                precip_mm: weatherResult.current.precipitation,
                wind_kph: weatherResult.current.wind_speed_10m,
                uv: weatherResult.current.uv_index,
                cloud: weatherResult.current.cloud_cover,
                feelslike_c: weatherResult.current.apparent_temperature,
                last_updated: new Date().toISOString(),
                condition: {
                  text: mapWeatherCode(weatherResult.current.weather_code),
                  icon: "",
                },
              },
            };
            break;
          }

          lastError = weatherResult?.error || "Open-Meteo fallback failed.";
        }
      }

      if (!data) {
        throw new Error(lastError);
      }

      const current = data.current;

      setWeather({
        tempC: Number(current.temp_c).toFixed(1),
        humidity: current.humidity,
        rainfallMm: Number(current.precip_mm).toFixed(1),
        windKph: Number(current.wind_kph).toFixed(1),
        uv: Number(current.uv).toFixed(1),
        condition: current.condition?.text || "Unknown",
        icon: current.condition?.icon ? `https:${current.condition.icon}` : "",
        feelsLikeC: Number(current.feelslike_c).toFixed(1),
        cloud: current.cloud,
        updated: current.last_updated || "",
      });
    } catch (error) {
      console.error("Weather API error:", error);
      setWeatherError(
        error?.message ||
          "Weather data unavailable. Check the API key and internet connection."
      );
      setWeather(DEFAULT_WEATHER);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/crop/districts`)
      .then((r) => r.json())
      .then((d) => {
        const values = d.districts || [];
        setDistricts(values);
        if (values.length) setDistrict((current) => current || values[0]);
      })
      .catch((e) => setCropDataError(e.message || "Unable to load districts"));
  }, []);

  useEffect(() => {
    if (!district) return;
    setTaluk(""); setYear(""); setCrop(""); setTaluks([]); setYears([]); setCrops([]); setCropData(null);
    fetch(`${API_BASE_URL}/crop/taluks?district=${encodeURIComponent(district)}`)
      .then((r) => r.json())
      .then((d) => {
        const values = d.taluks || [];
        setTaluks(values);
        if (values.length) setTaluk(values[0]);
      })
      .catch((e) => setCropDataError(e.message || "Unable to load taluks"));
  }, [district]);

  useEffect(() => {
    if (!district || !taluk) return;
    setYear(""); setCrop(""); setYears([]); setCrops([]); setCropData(null);
    fetch(`${API_BASE_URL}/crop/years?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}`)
      .then((r) => r.json())
      .then((d) => {
        const values = d.years || [];
        setYears(values);
        if (values.length) setYear(String(values[0]));
      })
      .catch((e) => setCropDataError(e.message || "Unable to load years"));
  }, [taluk]);

  useEffect(() => {
    if (!district || !taluk || !year) return;
    setCrop(""); setCrops([]); setCropData(null);
    fetch(`${API_BASE_URL}/crop/crops?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}&year=${encodeURIComponent(year)}`)
      .then((r) => r.json())
      .then((d) => {
        const values = d.crops || [];
        setCrops(values);
        if (values.length) setCrop(values[0]);
      })
      .catch((e) => setCropDataError(e.message || "Unable to load crops"));
  }, [year]);

  useEffect(() => {
    if (district && taluk) fetchWeather();
  }, [district, taluk]);

  useEffect(() => {
    if (!district || !taluk || !year || !crop) return;
    setCropDataLoading(true); setCropDataError("");
    fetch(`${API_BASE_URL}/crop/data?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}&year=${encodeURIComponent(year)}&crop=${encodeURIComponent(crop)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Crop record not found");
        return d;
      })
      .then(setCropData)
      .catch((e) => { setCropData(null); setCropDataError(e.message || "Unable to load crop data"); })
      .finally(() => setCropDataLoading(false));
  }, [district, taluk, year, crop]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const params = new URLSearchParams();
      if (district) params.set("district", district);
      if (taluk) params.set("taluk", taluk);
      if (crop) params.set("crop", crop);
      const response = await fetch(`${API_BASE_URL}/crop/history?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load history");
      setHistoryRows(data.history || []);
    } catch (e) {
      setHistoryRows([]);
      setHistoryError(e.message || "Unable to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [district, taluk, crop]);

  // ===============================
  // SEARCH / ANALYZE
  // ===============================
  const handleSearch = () => {
    if (!district || !taluk || !year || !crop) return;
    setCropDataLoading(true);
    fetch(`${API_BASE_URL}/crop/data?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}&year=${encodeURIComponent(year)}&crop=${encodeURIComponent(crop)}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.detail || "Record not found"); return d; })
      .then(setCropData)
      .catch((e) => setCropDataError(e.message || "Unable to load crop data"))
      .finally(() => setCropDataLoading(false));
  };

  const downloadReport = async () => {
    if (!district || !taluk || !year || !crop) return;
    setReportLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/crop/report?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}&year=${encodeURIComponent(year)}&crop=${encodeURIComponent(crop)}`);
      if (!response.ok) { const d = await response.json().catch(() => ({})); throw new Error(d.detail || "Unable to generate report"); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Smart_Crop_${district}_${taluk}_${year}_${crop}.docx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { setCropDataError(e.message || "Unable to generate report"); }
    finally { setReportLoading(false); }
  };

  // ===============================
  // NAVIGATION CLICK
  // ===============================
  const handleNavigation = (label) => {
    setActiveNav(label);
    setSidebarOpen(false);
    if (label === "Fertilizer Recommendation") {
      fertilizerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    if (activeNav === "Field Mapping") {
      fieldMappingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeNav]);

  return (
    <div className="scms-root">
      <div className="scms-app">

        {/* =====================================
            SIDEBAR
        ====================================== */}
        <aside
          className={`scms-sidebar ${
            sidebarOpen ? "open" : ""
          }`}
        >
          {/* BRAND */}
          <div className="scms-brand">
            <div className="scms-brand-icon">
              🌿
            </div>

            <div>
              <div className="scms-brand-title">
                Smart Crop
              </div>

              <div className="scms-brand-subtitle">
                Management System
              </div>
            </div>
          </div>

          {/* NAVIGATION */}
          <nav className="scms-navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`scms-nav-item ${
                  activeNav === item.label
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleNavigation(item.label)
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* SIDEBAR BOTTOM */}
          <div className="scms-sidebar-bottom">
            <div>
              &ldquo;Right Crop, Right Place,
              <br />
              Better Yield, Better Tomorrow.&rdquo;
            </div>
          </div>
        </aside>

        {/* =====================================
            MAIN CONTENT
        ====================================== */}
        <main className="scms-main">

          {/* ===================================
              TOP BAR
          ==================================== */}
          <header className="scms-topbar">

            {/* MENU BUTTON */}
            <button
              type="button"
              className="scms-menu-button"
              onClick={() =>
                setSidebarOpen((open) => !open)
              }
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>

            <div className="scms-top-space"></div>

            {/* LIVE WEATHER */}
            <div className="scms-weather-top">
              <span className="scms-weather-icon">
                {weather.icon ? (
                  <img
                    src={weather.icon}
                    alt={weather.condition}
                    style={{ width: 40, height: 40 }}
                  />
                ) : (
                  "☀️"
                )}
              </span>

              <div>
                <strong>
                  {weather.tempC === "--" ? "--" : `${weather.tempC}°C`}
                </strong>
                <small>{weather.condition}</small>
              </div>
            </div>

            {/* NOTIFICATION */}
            <div className="scms-notification">
              🔔
              <span>{updates.length}</span>
            </div>

            {/* PROFILE */}
            <div className="scms-profile">
              <div className="scms-avatar">{user?.name?.charAt(0)?.toUpperCase() || "F"}</div>

              <span>{user?.name || "Farmer"}</span>
              <span>⌄</span>
              <button
                type="button"
                className="scms-logout-button"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          </header>

          {/* ===================================
              DASHBOARD CONTENT
          ==================================== */}
          <div className="scms-content">

            <section className="scms-page-heading">
              <div>
                <span className="scms-page-eyebrow">SMART CROP · FARMER DASHBOARD</span>
                <h1>Good farming starts with good insights.</h1>
                <p>Weather, crop performance and practical guidance for your farm.</p>
              </div>
              <div className={`scms-live-status ${weatherError ? "offline" : ""}`}>
                <span></span>{weatherLoading ? "Updating weather" : weatherError ? "Weather unavailable" : "Weather connected"}
              </div>
            </section>

            <section className="scms-card scms-updates-card">
              <div className="scms-updates-heading">
                <div><h3>📢 Updates for Farmers</h3><small>Announcements and information from Smart Crop administrators</small></div>
                <button type="button" className="scms-outline-button" onClick={loadUpdates} disabled={updatesLoading}>{updatesLoading ? "Loading..." : "↻ Refresh"}</button>
              </div>
              {updatesError && <div className="scms-weather-error">⚠️ {updatesError}</div>}
              {updatesLoading && <p className="scms-updates-empty">Loading updates...</p>}
              {!updatesLoading && !updatesError && !updates.length && <p className="scms-updates-empty">There are no new updates right now.</p>}
              {!updatesLoading && updates.length > 0 && <div className="scms-updates-list">
                {updates.map((item) => <article className="scms-update-item" key={item.id}>
                  <div className="scms-update-meta"><span>{item.category}</span><time>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ""}</time></div>
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                </article>)}
              </div>}
            </section>

            {activeNav === "Field Mapping" && <section className="scms-card scms-field-registration" ref={fieldMappingRef}>
              <div className="scms-field-heading">
                <div><span className="scms-page-eyebrow">FARM OPERATIONS</span><h2>Field mapping &amp; crop records</h2><p>Draw plot boundaries, calculate area, and keep a season-by-season crop history.</p></div>
                <span className="scms-field-count">{fieldPlots.length} {fieldPlots.length === 1 ? "field" : "fields"} registered</span>
              </div>
              {fieldPlotsError && <div className="scms-weather-error" role="alert">{fieldPlotsError}</div>}
              {fieldPlotsMessage && <div className="scms-field-success" role="status">{fieldPlotsMessage}</div>}

              <div className="scms-field-map-layout">
                <div>
                  <div className="scms-field-map-heading">
                    <div><strong>Field boundary</strong><small>{isDrawingBoundary ? `Click on the map to add points (${boundaryPoints.length} added)` : "Start drawing, then click at least 3 boundary points."}</small></div>
                    <div className="scms-field-map-actions">
                      <button type="button" className={isDrawingBoundary ? "drawing" : ""} onClick={() => setIsDrawingBoundary((drawing) => !drawing)}>{isDrawingBoundary ? "Finish drawing" : "Draw boundary"}</button>
                      <label className="scms-boundary-upload">Upload GeoJSON<input type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={uploadFieldBoundary} /></label>
                      <button type="button" onClick={() => setBoundaryPoints((points) => points.slice(0, -1))} disabled={!boundaryPoints.length}>Undo</button>
                      <button type="button" onClick={() => { setBoundaryPoints([]); setIsDrawingBoundary(false); }}>Clear</button>
                    </div>
                  </div>
                  <div className={`scms-plot-map ${isDrawingBoundary ? "drawing" : ""}`}>
                    <MapContainer center={diseaseMapPosition || DEFAULT_MAP_CENTER} zoom={11} scrollWheelZoom className="scms-plot-leaflet-map">
                      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {diseaseMapPosition && <MapRecenter position={diseaseMapPosition} />}
                      <PlotMapClickHandler enabled={isDrawingBoundary} onPoint={(point) => setBoundaryPoints((points) => [...points, point])} />
                      {fieldPlots.map((plot) => <Polygon
                        key={plot.id}
                        positions={plot.boundary.coordinates[0].map(([longitude, latitude]) => [latitude, longitude])}
                        pathOptions={{ color: "#13754b", fillColor: "#32a66a", fillOpacity: 0.2, weight: 2 }}
                      ><Popup><strong>{plot.plot_name}</strong><br />{plot.farm_name}<br />{plot.area_ha} ha</Popup></Polygon>)}
                      {boundaryPoints.length > 2 && <Polygon positions={boundaryPoints} pathOptions={{ color: "#1677c8", fillColor: "#4da5ed", fillOpacity: 0.18, dashArray: "5 5" }} />}
                      {boundaryPoints.length === 2 && <Polyline positions={boundaryPoints} pathOptions={{ color: "#1677c8", dashArray: "5 5" }} />}
                      {boundaryPoints.map((point, index) => <CircleMarker key={`${point.join(",")}-${index}`} center={point} radius={5} pathOptions={{ color: "#fff", weight: 2, fillColor: "#1677c8", fillOpacity: 1 }} />)}
                    </MapContainer>
                  </div>
                  <small className="scms-field-map-footnote">Map boundaries are farmer-drawn estimates; verify acreage and legal boundaries using official survey records.</small>
                </div>

                <form className="scms-plot-form" onSubmit={saveFieldPlot}>
                  <div className="scms-plot-form-title"><strong>Register a plot</strong><small>Required fields marked *</small></div>
                  <label>Farm / grower name *</label>
                  <input value={plotForm.farm_name} onChange={(event) => setPlotForm((form) => ({ ...form, farm_name: event.target.value }))} maxLength="120" required placeholder="e.g. Green Valley Farm" />
                  <label>Plot name *</label>
                  <input value={plotForm.plot_name} onChange={(event) => setPlotForm((form) => ({ ...form, plot_name: event.target.value }))} maxLength="120" required placeholder="e.g. North Field" />
                  <div className="scms-plot-form-pair">
                    <div><label>District *</label><input list="plot-district-options" value={plotForm.district} onChange={(event) => setPlotForm((form) => ({ ...form, district: event.target.value, taluk: "" }))} required /><datalist id="plot-district-options">{districts.map((value) => <option key={value} value={value} />)}</datalist></div>
                    <div><label>Taluk *</label><input list="plot-taluk-options" value={plotForm.taluk} onChange={(event) => setPlotForm((form) => ({ ...form, taluk: event.target.value }))} required /><datalist id="plot-taluk-options">{taluks.map((value) => <option key={value} value={value} />)}</datalist></div>
                  </div>
                  <div className="scms-plot-form-pair">
                    <div><label>Crop *</label><input list="plot-crop-options" value={plotForm.crop} onChange={(event) => setPlotForm((form) => ({ ...form, crop: event.target.value }))} maxLength="100" required /><datalist id="plot-crop-options">{crops.map((value) => <option key={value} value={value} />)}</datalist></div>
                    <div><label>Season *</label><select value={plotForm.season} onChange={(event) => setPlotForm((form) => ({ ...form, season: event.target.value }))}><option>Kharif</option><option>Rabi</option><option>Summer</option><option>Perennial</option><option>Other</option></select></div>
                  </div>
                  <label>Crop year *</label>
                  <input type="number" min="1900" max="2200" value={plotForm.year} onChange={(event) => setPlotForm((form) => ({ ...form, year: event.target.value }))} required />
                  <label>Notes</label>
                  <textarea rows="2" maxLength="2000" value={plotForm.notes} onChange={(event) => setPlotForm((form) => ({ ...form, notes: event.target.value }))} placeholder="Optional field or crop notes" />
                  <button className="scms-search-button" disabled={fieldPlotSaving || boundaryPoints.length < 3}>{fieldPlotSaving ? "Saving field..." : `Save field${boundaryPoints.length >= 3 ? ` · ${boundaryPoints.length} boundary points` : ""}`}</button>
                </form>
              </div>

              <div className="scms-registered-fields">
                <div className="scms-registered-fields-heading"><div><strong>Registered fields</strong><small>Saved to PostgreSQL and private to your account</small></div><button type="button" className="scms-outline-button" onClick={loadFieldPlots} disabled={fieldPlotsLoading}>{fieldPlotsLoading ? "Loading..." : "↻ Refresh"}</button></div>
                {fieldPlotsLoading && <p className="scms-field-empty">Loading your fields...</p>}
                {!fieldPlotsLoading && !fieldPlotsError && !fieldPlots.length && <p className="scms-field-empty">No fields yet. Draw a boundary above to register your first plot.</p>}
                <div className="scms-plot-list">{fieldPlots.map((plot) => <article className="scms-plot-card" key={plot.id}>
                  <div className="scms-plot-card-heading"><div><h3>{plot.plot_name}</h3><small>{plot.farm_name} · {plot.taluk}, {plot.district}</small></div><div className="scms-plot-area"><strong>{plot.area_ha}</strong><small>hectares</small></div></div>
                  <div className="scms-plot-history-heading"><strong>Crop rotation &amp; history</strong><button type="button" onClick={() => { setSeasonPlotId(seasonPlotId === plot.id ? null : plot.id); setSeasonForm({ crop: "", season: "Kharif", year: String(new Date().getFullYear()), notes: "" }); }}>{seasonPlotId === plot.id ? "Cancel" : "+ Add season"}</button></div>
                  {plot.seasons.length ? <div className="scms-season-list">{plot.seasons.map((item) => <div className="scms-season-row" key={item.id}><strong>{item.crop}</strong><span>{item.season} {item.year}</span>{item.notes && <small>{item.notes}</small>}</div>)}</div> : <p className="scms-field-empty">No crop history recorded.</p>}
                  {seasonPlotId === plot.id && <form className="scms-season-form" onSubmit={(event) => addPlotSeason(event, plot.id)}>
                    <input aria-label="Crop" placeholder="Crop" value={seasonForm.crop} onChange={(event) => setSeasonForm((form) => ({ ...form, crop: event.target.value }))} required />
                    <select aria-label="Season" value={seasonForm.season} onChange={(event) => setSeasonForm((form) => ({ ...form, season: event.target.value }))}><option>Kharif</option><option>Rabi</option><option>Summer</option><option>Perennial</option><option>Other</option></select>
                    <input aria-label="Year" type="number" min="1900" max="2200" value={seasonForm.year} onChange={(event) => setSeasonForm((form) => ({ ...form, year: event.target.value }))} required />
                    <input aria-label="Notes" placeholder="Optional notes" value={seasonForm.notes} onChange={(event) => setSeasonForm((form) => ({ ...form, notes: event.target.value }))} />
                    <button type="submit" disabled={seasonSaving}>{seasonSaving ? "Saving..." : "Save season"}</button>
                  </form>}
                  <button type="button" className="scms-plot-delete" onClick={() => removeFieldPlot(plot)}>Delete field &amp; history</button>
                </article>)}</div>
              </div>
            </section>}

            {/* =================================
                FILTERS
            ================================== */}
            <section className="scms-filters">
              <div className="scms-filter"><label htmlFor="district">District</label><select id="district" value={district} onChange={(e) => setDistrict(e.target.value)}><option value="">Select District</option>{districts.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div className="scms-filter"><label htmlFor="taluk">Taluk</label><select id="taluk" value={taluk} onChange={(e) => setTaluk(e.target.value)} disabled={!district}><option value="">Select Taluk</option>{taluks.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div className="scms-filter"><label htmlFor="year">Year</label><select id="year" value={year} onChange={(e) => setYear(e.target.value)} disabled={!taluk}><option value="">Select Year</option>{years.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div className="scms-filter"><label htmlFor="crop">Crop</label><select id="crop" value={crop} onChange={(e) => setCrop(e.target.value)} disabled={!year}><option value="">Select Crop</option>{crops.map((x) => <option key={x}>{x}</option>)}</select></div>
              <button type="button" className="scms-search-button" onClick={handleSearch} disabled={cropDataLoading || !crop}>{cropDataLoading ? "⏳ Loading..." : "🔍 Search / Analyze"}</button>
            </section>

            {/* =================================
                STATISTICS
            ================================== */}
            <section className="scms-stats">
              {[
                {
                  icon: "🌧️",
                  color: "scms-blue",
                  label: "Rainfall",
                  value:
                    weather.rainfallMm === "--"
                      ? "--"
                      : `${weather.rainfallMm} mm`,
                  sub: "Today",
                },
                {
                  icon: "🌡️",
                  color: "scms-orange",
                  label: "Temperature",
                  value:
                    weather.tempC === "--" ? "--" : `${weather.tempC}°C`,
                  sub: "Current",
                },
                {
                  icon: "💧",
                  color: "scms-cyan",
                  label: "Humidity",
                  value:
                    weather.humidity === "--"
                      ? "--"
                      : `${weather.humidity}%`,
                  sub: "Current",
                },
                {
                  icon: "💨",
                  color: "scms-purple",
                  label: "Wind Speed",
                  value:
                    weather.windKph === "--"
                      ? "--"
                      : `${weather.windKph} km/h`,
                  sub: "Current",
                },
                {
                  icon: "☀️",
                  color: "scms-green",
                  label: "UV Index",
                  value: weather.uv === "--" ? "--" : weather.uv,
                  sub: "Current",
                },
              ].map((stat) => (
                <div
                  className="scms-stat-card"
                  key={stat.label}
                >
                  <div
                    className={`scms-stat-icon ${stat.color}`}
                  >
                    {stat.icon}
                  </div>

                  <div>
                    <p>{stat.label}</p>
                    <h2>{stat.value}</h2>
                    <small>{stat.sub}</small>
                  </div>
                </div>
              ))}
            </section>

            {weatherError && (
              <div
                className="scms-weather-error"
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#fff4f4",
                  color: "#b42318",
                  fontSize: 13,
                }}
              >
                ⚠️ Weather API: {weatherError}
              </div>
            )}

            {cropDataError && <div className="scms-weather-error" style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#fff4f4", color: "#b42318", fontSize: 13 }}>⚠️ {cropDataError}</div>}

            {cropData && (
              <section className="scms-card" style={{ marginTop: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div><h3>Selected Crop Data</h3><p style={{ margin: 0, color: "#65706b", fontSize: 12 }}>{district} • {taluk} • {year} • {crop}</p></div>
                  <button type="button" className="scms-outline-button" onClick={downloadReport} disabled={reportLoading}>{reportLoading ? "Generating..." : "📄 Generate Word Report"}</button>
                </div>
                <div className="scms-info-grid" style={{ marginTop: 12 }}>
                  {[["Season",cropData.season],["Farming Type",cropData.farming_type],["Rainfall",cropData.rainfall_mm == null ? "--" : `${cropData.rainfall_mm} mm`], ["Temperature",cropData.temperature_c == null ? "--" : `${cropData.temperature_c} °C`], ["Humidity",cropData.humidity == null ? "--" : `${cropData.humidity}%`], ["Yield",cropData.yield_kg_ha == null ? "--" : `${cropData.yield_kg_ha} kg/ha`], ["Taluk Avg Yield",cropData.taluk_avg_yield_kg_ha == null ? "--" : `${cropData.taluk_avg_yield_kg_ha} kg/ha`], ["N / P / K",`${cropData.recommended_n ?? "--"} / ${cropData.recommended_p ?? "--"} / ${cropData.recommended_k ?? "--"}`]].map(([label,value]) => <div className="scms-info-row" key={label}><span>•</span><span>{label}</span><strong>{value ?? "--"}</strong></div>)}
                </div>
              </section>
            )}

            {/* =================================
                TOP THREE COLUMNS
            ================================== */}
            <section className="scms-three-columns">

              {/* LAND & WATER */}
              <div className="scms-card">
                <h3>
                  Land &amp; Water Information
                </h3>

                {(cropData ? [
                  ["🌿", "Area", cropData.area_ha == null ? "--" : `${cropData.area_ha} ha`],
                  ["🪨", "Soil Type", cropData.soil_type || "--"],
                  ["💧", "Irrigation", cropData.irrigation || "--"],
                  ["🌡️", "Groundwater", cropData.groundwater_post == null ? "--" : cropData.groundwater_post],
                  ["💦", "Net Irrigated Area", cropData.net_irrigated_area == null ? "--" : `${cropData.net_irrigated_area} ha`],
                ] : LAND_INFO.map((x) => [x.icon, x.label, x.value])).map(([icon, label, value]) => (
                  <div className="scms-info-row" key={label}><span>{icon}</span><span>{label}</span><strong>{value}</strong></div>
                ))}

                <button
                  type="button"
                  className="scms-outline-button"
                >
                  View Full Details →
                </button>
              </div>

              {/* LOCATION MAP */}
              <div className="scms-card">
                <h3>Location Map</h3>
                <div className="scms-map real-map">
                  {(() => {
                    const position = TALUK_COORDS[taluk] || DEFAULT_MAP_CENTER;
                    return (
                      <MapContainer center={position} zoom={11} scrollWheelZoom className="scms-leaflet-map">
                        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapRecenter position={position} />
                        <Marker position={position} icon={markerIcon}>
                          <Popup><b>{taluk || "Mysuru"}</b><br />{district || "Mysuru"}, Karnataka</Popup>
                        </Marker>
                      </MapContainer>
                    );
                  })()}
                </div>
                <a className="scms-outline-button map-link" href={`https://www.openstreetmap.org/?mlat=${(TALUK_COORDS[taluk] || DEFAULT_MAP_CENTER)[0]}&mlon=${(TALUK_COORDS[taluk] || DEFAULT_MAP_CENTER)[1]}#map=12/${(TALUK_COORDS[taluk] || DEFAULT_MAP_CENTER)[0]}/${(TALUK_COORDS[taluk] || DEFAULT_MAP_CENTER)[1]}`} target="_blank" rel="noreferrer">Open larger map ↗</a>
              </div>

              {/* CROP RECOMMENDATION */}
              <div className="scms-card">
                <h3>
                  Top Recommended Crops
                </h3>

                <div className="scms-crop-header">
                  <span>Crop</span>
                  <span>Suitability</span>
                  <span>Yield</span>
                </div>

                {CROPS.map((crop) => (
                  <div
                    className="scms-crop"
                    key={crop.name}
                  >
                    <span>
                      {crop.icon}{" "}
                      <b>{crop.name}</b>
                    </span>

                    <div>
                      <strong className="scms-green-text">
                        {crop.suitability}%
                      </strong>

                      <div className="scms-progress">
                        <div
                          className="scms-progress-bar"
                          style={{
                            "--progress": `${crop.suitability}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <strong>
                      {crop.yieldVal}
                    </strong>
                  </div>
                ))}

                <button
                  type="button"
                  className="scms-outline-button"
                >
                  View All Recommendations →
                </button>
              </div>
            </section>

            {/* =================================
                SECOND ROW
            ================================== */}
            <section className="scms-three-columns">

              {/* DISEASE PREVENTION */}
              <div className="scms-card">
                <h3>Disease Risk &amp; Prevention</h3>
                <div className="scms-disease-location">
                  <span>Selected crop</span><strong>{selectedCropName || "Choose a crop above"}</strong>
                  {district && taluk && <small>{taluk}, {district}{year ? ` · ${year}` : ""}</small>}
                </div>
                <div className="scms-disease-risk-summary">
                  <span className={`scms-risk-dot ${diseaseRisk.className}`}></span>
                  <div><small>Current weather-based disease pressure</small><strong>{diseaseRisk.label}</strong></div>
                  {weather.updated && <time>{weather.updated}</time>}
                </div>
                {diseaseMapPosition ? <div className="scms-disease-map">
                  <MapContainer center={diseaseMapPosition} zoom={11} scrollWheelZoom className="scms-disease-leaflet-map">
                    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapRecenter position={diseaseMapPosition} />
                    <Circle center={diseaseMapPosition} radius={2500} pathOptions={{ color: diseaseRisk.color, fillColor: diseaseRisk.color, fillOpacity: 0.2, weight: 2 }} />
                    <Marker position={diseaseMapPosition} icon={markerIcon}>
                      <Popup><b>{taluk}, {district}</b><br />Indicative weather-based disease pressure: {diseaseRisk.label}. Not parcel-level survey data.</Popup>
                    </Marker>
                  </MapContainer>
                </div> : !diseaseMapLocationError && <div className="scms-disease-map-placeholder">Select a district and taluk to view the local map.</div>}
                {diseaseMapLocationError && <div className="scms-map-location-error">Map location unavailable: {diseaseMapLocationError}</div>}
                <div className="scms-disease-legend">
                  <span><i className="low"></i>Lower</span><span><i className="medium"></i>Moderate</span><span><i className="high"></i>Elevated</span>
                </div>
                <p className="scms-disease-note">This approximate taluk-level indicator uses current humidity and rainfall only. It is not a field diagnosis or survey-number risk assessment.</p>
                {selectedCropGuidance ? <>
                  <h4 className="scms-disease-name">Prevention: {selectedCropGuidance.disease}</h4>
                  <ul className="scms-prevention-list">
                    {selectedCropGuidance.steps.map((step) => <li key={step}>{step}</li>)}
                  </ul>
                </> : <p className="scms-disease-note">Choose a crop from the filters for crop-specific prevention tips. General guidance: use healthy planting material, maintain good drainage and field hygiene, inspect plants regularly, and confirm a disease before treatment.</p>}
                <p className="scms-disease-note">These are general prevention tips, not a live disease diagnosis or a parcel-level risk reading. Weather, crop stage, and field inspection can change disease risk.</p>
                <a className="scms-bhumi-link" href="https://landrecords.karnataka.gov.in/Service2/" target="_blank" rel="noreferrer">
                  Open Karnataka Land Records Service 2 ↗
                </a>
                <small className="scms-bhumi-note">Use your survey number on Karnataka Land Records Service 2 to check land records. This portal opens separately; survey data is not imported into this dashboard.</small>
              </div>

              {/* HISTORICAL DATA */}
              <div className="scms-card">
                <div className="history-heading"><div><h3>Historical Crop Data</h3><small>{historyRows.length} records from PostgreSQL</small></div><button type="button" className="scms-outline-button" onClick={loadHistory} disabled={historyLoading}>{historyLoading ? "Loading..." : "↻ Refresh"}</button></div>
                {historyError && <div className="scms-weather-error">⚠️ {historyError}</div>}
                <div className="history-table-wrap">
                  <table><thead><tr><th>Year</th><th>Season</th><th>Crop</th><th>Area (ha)</th><th>Yield (kg/ha)</th></tr></thead>
                  <tbody>{historyRows.slice(0, 8).map((row) => <tr key={`${row.id}-${row.year}-${row.crop}`}><td>{row.year}</td><td>{row.season || "—"}</td><td>{row.crop}</td><td>{row.area_ha ?? "—"}</td><td>{row.yield_kg_ha ?? "—"}</td></tr>)}{!historyLoading && !historyRows.length && <tr><td colSpan="5">No historical records found.</td></tr>}</tbody></table>
                </div>
                <button type="button" className="scms-outline-button" onClick={() => setActiveNav("Historical Data")}>View Full History →</button>
              </div>

              {/* YIELD INFORMATION */}
              <div className="scms-card">
                <h3>Yield Information</h3>

                <div className="scms-yield-boxes">
                  {YIELD_BOXES.map((box) => (
                    <div key={box.label}>
                      <small>{box.label}</small>

                      <strong>
                        {box.value}
                      </strong>

                      <span>kg/ha</span>
                    </div>
                  ))}
                </div>

                <h4>Yield Trend</h4>

                <div className="scms-chart">
                  <div className="scms-chart-line"></div>

                  <div className="scms-chart-values">
                    <span>2020</span>
                    <span>2021</span>
                    <span>2022</span>
                    <span>2023</span>
                    <span>2024</span>
                  </div>
                </div>
              </div>
            </section>

            {activeNav === "Historical Data" && (
              <section className="scms-card scms-full-history">
                <div className="history-heading"><div><h3>Full Historical Data</h3><p>Complete records from the PostgreSQL crop_records table.</p></div><button type="button" className="scms-outline-button" onClick={loadHistory} disabled={historyLoading}>{historyLoading ? "Loading..." : "↻ Refresh"}</button></div>
                <div className="history-table-wrap large"><table><thead><tr><th>Year</th><th>District</th><th>Taluk</th><th>Crop</th><th>Season</th><th>Area ha</th><th>Rainfall</th><th>Temp</th><th>Yield kg/ha</th></tr></thead><tbody>{historyRows.map(row => <tr key={`${row.id}-full`}><td>{row.year}</td><td>{row.district}</td><td>{row.taluk}</td><td>{row.crop}</td><td>{row.season || "—"}</td><td>{row.area_ha ?? "—"}</td><td>{row.rainfall_mm ?? "—"}</td><td>{row.temperature_c ?? "—"}</td><td>{row.yield_kg_ha ?? "—"}</td></tr>)}</tbody></table></div>
              </section>
            )}

            {/* =================================
                FERTILIZER RECOMMENDATION
            ================================== */}
            <section className="scms-card scms-fertilizer-card" ref={fertilizerSectionRef} id="fertilizer-recommendation">
              <div className="scms-fertilizer-heading">
                <div><h3>Fertilizer Recommendation</h3><p>{cropData?.farming_type ? `Farming type: ${cropData.farming_type}. Choose the input approach for this crop.` : "Recommended nutrients from the selected crop record"}</p></div>
                <span className="scms-fertilizer-source">{cropData ? "POSTGRESQL CROP DATA" : "WAITING FOR CROP"}</span>
              </div>
              {cropData && <div className="scms-fertilizer-mode" role="group" aria-label="Fertilizer type">
                <button type="button" className={fertilizerMode === "organic" ? "active" : ""} onClick={() => { setFertilizerMode("organic"); setShowFertilizerDetails(false); }} aria-pressed={fertilizerMode === "organic"}>🌿 Organic fertilizer</button>
                <button type="button" className={fertilizerMode === "npk" ? "active" : ""} onClick={() => { setFertilizerMode("npk"); setShowFertilizerDetails(false); }} aria-pressed={fertilizerMode === "npk"}>🧪 N-P-K recommendation</button>
                {isOrganicRecord && <small>Organic is selected by default for this record; you can switch to the recorded N-P-K rates at any time.</small>}
              </div>}
              {cropData && fertilizerMode === "organic" ? <div className="scms-organic-fertilizer">
                <div className="scms-organic-fertilizer-banner"><span>🌱</span><div><strong>Organic soil-fertility options</strong><small>Choose inputs permitted by your certification and local recommendations.</small></div></div>
                <div className="scms-organic-input-grid">
                  <div><strong>Compost / FYM</strong><p>Use mature, well-decomposed material; base application on soil test results and material quality.</p></div>
                  <div><strong>Vermicompost</strong><p>Apply as a supplementary organic nutrient source according to crop and local extension guidance.</p></div>
                  <div><strong>Green manure / cover crops</strong><p>Grow and incorporate locally suitable legumes to support soil organic matter and nitrogen cycling.</p></div>
                  <div><strong>Biofertilizers</strong><p>Use crop-appropriate, quality-assured inoculants as directed on the product label.</p></div>
                </div>
                <p className="scms-organic-caution">Organic input rates are not calculated from the database N-P-K figures. Nutrient content varies by source; confirm quantities with a soil test or agriculture officer.</p>
                <button type="button" className="scms-green-button" onClick={() => setFertilizerMode("npk")}>View recorded N-P-K rates instead →</button>
              </div> : hasFertilizerValues ? <>
                <div className="scms-fertilizer-content">
                  <div className="scms-fert-icon">🌱</div>
                  <div className="scms-fert-crop"><small>Selected crop</small><strong>{cropData.crop}</strong><span>{cropData.taluk}, {cropData.district} · {cropData.year}</span></div>
                  {[
                    ["Nitrogen (N)", fertilizerValues.nitrogen, "scms-nitrogen"],
                    ["Phosphorus (P)", fertilizerValues.phosphorus, "scms-phosphorus"],
                    ["Potassium (K)", fertilizerValues.potassium, "scms-potassium"],
                  ].map(([label, value, color]) => <div className={`scms-nutrient ${color}`} key={label}>
                    <small>{label}</small>
                    <strong>{value == null || !Number.isFinite(value) ? "—" : `${value} kg/ha`}</strong>
                  </div>)}
                  <button type="button" className="scms-green-button" onClick={() => setShowFertilizerDetails((shown) => !shown)} aria-expanded={showFertilizerDetails}>
                    {showFertilizerDetails ? "Hide guidance ↑" : "View guidance →"}
                  </button>
                </div>
                {showFertilizerDetails && <div className="scms-fertilizer-details">
                  <h4>How to use this recommendation</h4>
                  <p>Values are nutrient rates per hectare from the selected crop record—not bag weights. Use the result as a starting reference, and confirm the fertilizer product, timing, and split application with a soil test or local agricultural officer.</p>
                  <div><span>N · Nitrogen</span><small>Supports leafy and vegetative growth.</small></div>
                  <div><span>P · Phosphorus</span><small>Supports root development and establishment.</small></div>
                  <div><span>K · Potassium</span><small>Supports crop resilience and plant functions.</small></div>
                </div>}
              </> : <div className="scms-fertilizer-empty">
                <span>🌾</span>
                <div><strong>{cropData ? "N-P-K values are not available for this crop record." : "Select a crop to view its fertilizer recommendation."}</strong><small>Choose District, Taluk, Year, and Crop above. Recommendations are loaded from the selected PostgreSQL crop record. When a record is marked organic, you can still select Organic fertilizer or N-P-K above.</small></div>
                <button type="button" className="scms-outline-button" onClick={() => document.getElementById("district")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Choose crop</button>
              </div>}
            </section>

            {/* =================================
                FOOTER
            ================================== */}
            <footer className="scms-footer">
              Smart Crop Management System © 2026
            </footer>

          </div>
        </main>
      </div>
    </div>
  );
}
