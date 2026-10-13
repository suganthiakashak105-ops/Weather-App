/* =========================================================
   WEATHER APP - script.js
   Step 1: Settings        Step 2: Demo data
   Step 3: Helper functions Step 4: Fetch data
   Step 5: Show data on screen  Step 6: Search logic + events
   ========================================================= */

/* ---------- STEP 1: SETTINGS ---------- */

// Paste your OpenWeatherMap API key between the quotes.
// If you leave it as it is, the app runs in DEMO MODE with sample data.
const API_KEY = "YOUR_API_KEY_HERE";

const BASE_URL = "https://api.openweathermap.org/data/2.5";

// Demo mode is ON when there is no real API key
const DEMO_MODE = API_KEY === "YOUR_API_KEY_HERE" || API_KEY.trim() === "";

// The city shown when the page first opens
const DEFAULT_CITY = "London";

/* ---------- Grab HTML elements we need (DOM) ---------- */
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error-message");
const weatherContent = document.getElementById("weather-content");
const demoBadge = document.getElementById("demo-badge");

const cityNameEl = document.getElementById("city-name");
const dateTextEl = document.getElementById("date-text");
const iconEl = document.getElementById("weather-icon");
const temperatureEl = document.getElementById("temperature");
const conditionEl = document.getElementById("condition");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const feelsLikeEl = document.getElementById("feels-like");
const forecastContainer = document.getElementById("forecast-container");

/* ---------- STEP 2: DEMO DATA ---------- */
// Sample info for a few cities (used only in demo mode)
const DEMO_CITIES = {
  london: {
    name: "London", country: "GB", temp: 14, feels: 12, humidity: 76,
    wind: 4.2, main: "Clouds", description: "broken clouds",
    forecast: ["Rain", "Clouds", "Clouds", "Clear", "Drizzle"],
  },
  chennai: {
    name: "Chennai", country: "IN", temp: 32, feels: 38, humidity: 70,
    wind: 3.6, main: "Clear", description: "clear sky",
    forecast: ["Clear", "Clouds", "Rain", "Thunderstorm", "Clear"],
  },
  tokyo: {
    name: "Tokyo", country: "JP", temp: 21, feels: 21, humidity: 58,
    wind: 2.8, main: "Clouds", description: "scattered clouds",
    forecast: ["Clouds", "Clear", "Clear", "Rain", "Clouds"],
  },
  "new york": {
    name: "New York", country: "US", temp: 17, feels: 15, humidity: 64,
    wind: 5.1, main: "Clear", description: "clear sky",
    forecast: ["Clear", "Clouds", "Rain", "Clouds", "Clear"],
  },
  paris: {
    name: "Paris", country: "FR", temp: 15, feels: 14, humidity: 72,
    wind: 3.9, main: "Drizzle", description: "light drizzle",
    forecast: ["Rain", "Clouds", "Clear", "Clouds", "Rain"],
  },
  sydney: {
    name: "Sydney", country: "AU", temp: 24, feels: 25, humidity: 55,
    wind: 6.3, main: "Clear", description: "sunny and clear",
    forecast: ["Clear", "Clear", "Clouds", "Clear", "Rain"],
  },
};

// Turn the simple demo info into the SAME shape the real API returns.
// This way our display code works for both demo and real data.
function createDemoData(info) {
  const current = {
    name: info.name,
    sys: { country: info.country },
    main: { temp: info.temp, feels_like: info.feels, humidity: info.humidity },
    weather: [{ main: info.main, description: info.description, icon: "01d" }],
    wind: { speed: info.wind },
  };

  const tempChanges = [0, 2, -1, 3, 1]; // small changes for each day
  const list = [];

  for (let i = 1; i <= 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateString = date.toISOString().split("T")[0]; // e.g. 2026-10-14

    list.push({
      dt_txt: dateString + " 12:00:00",
      main: { temp: info.temp + tempChanges[i - 1] },
      weather: [{ main: info.forecast[i - 1], description: info.forecast[i - 1].toLowerCase() }],
    });
  }

  return { current: current, forecast: { list: list } };
}

/* ---------- STEP 3: HELPER FUNCTIONS ---------- */

// Show / hide the loading spinner
function showLoading() {
  loadingEl.classList.remove("hidden");
  searchBtn.disabled = true; // stop double-clicking while loading
}

function hideLoading() {
  loadingEl.classList.add("hidden");
  searchBtn.disabled = false;
}

// Show / clear the error message
function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  weatherContent.classList.add("hidden"); // hide old results
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

// Convert the weather type (like "Rain") into an emoji icon
function getWeatherIcon(main, isNight) {
  switch (main) {
    case "Clear":
      return isNight ? "🌙" : "☀️";
    case "Clouds":
      return "⛅";
    case "Rain":
      return "🌧️";
    case "Drizzle":
      return "🌦️";
    case "Thunderstorm":
      return "⛈️";
    case "Snow":
      return "❄️";
    case "Mist":
    case "Fog":
    case "Haze":
    case "Smoke":
    case "Dust":
      return "🌫️";
    default:
      return "🌡️";
  }
}

// Make the first letter big: "light rain" -> "Light rain"
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- STEP 4: FETCH DATA ---------- */

// Get sample data (demo mode)
async function fetchDemoWeather(city) {
  // Pretend the internet is slow so we can see the loading spinner
  await new Promise((resolve) => setTimeout(resolve, 800));

  const info = DEMO_CITIES[city.toLowerCase()];
  if (!info) {
    throw new Error("City not found. Please check the spelling and try again.");
  }
  return createDemoData(info);
}

// Get REAL data from OpenWeatherMap
async function fetchRealWeather(city) {
  // encodeURIComponent makes special characters safe inside a URL
  const safeCity = encodeURIComponent(city);
  const currentUrl = `${BASE_URL}/weather?q=${safeCity}&appid=${API_KEY}&units=metric`;
  const forecastUrl = `${BASE_URL}/forecast?q=${safeCity}&appid=${API_KEY}&units=metric`;

  // Ask for both current weather and forecast at the same time
  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentUrl),
    fetch(forecastUrl),
  ]);

  // Check what the server said
  if (currentRes.status === 404) {
    throw new Error("City not found. Please check the spelling and try again.");
  }
  if (currentRes.status === 401) {
    throw new Error("Invalid API key. New keys can take up to 2 hours to activate.");
  }
  if (!currentRes.ok || !forecastRes.ok) {
    throw new Error("Something went wrong on the server. Please try again later.");
  }

  // Convert the responses to JavaScript objects
  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  return { current: current, forecast: forecast };
}

// One function the rest of the app uses: picks demo or real automatically
async function getWeather(city) {
  if (DEMO_MODE) {
    return await fetchDemoWeather(city);
  }
  return await fetchRealWeather(city);
}

/* ---------- STEP 5: SHOW DATA ON SCREEN ---------- */

function displayCurrentWeather(data) {
  const weather = data.weather[0];
  const isNight = weather.icon.endsWith("n"); // "01n" means night

  cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
  dateTextEl.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  iconEl.textContent = getWeatherIcon(weather.main, isNight);
  temperatureEl.textContent = `${Math.round(data.main.temp)}°C`;
  conditionEl.textContent = weather.description;

  humidityEl.textContent = `${data.main.humidity}%`;
  // The API gives wind in metres/second. Multiply by 3.6 to get km/h.
  windEl.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
  feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°C`;
}

function displayForecast(forecastData) {
  // The API gives a forecast every 3 hours (40 items).
  // We only keep the 12:00 noon item of each day.
  let dailyItems = forecastData.list.filter((item) =>
    item.dt_txt.includes("12:00:00")
  );

  // Safety net: if noon items are missing, take every 8th item (= 24 hours)
  if (dailyItems.length === 0) {
    dailyItems = forecastData.list.filter((item, index) => index % 8 === 0);
  }

  dailyItems = dailyItems.slice(0, 5); // maximum 5 days

  forecastContainer.innerHTML = ""; // clear the old cards

  dailyItems.forEach((item) => {
    const date = new Date(item.dt_txt.replace(" ", "T"));
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weather = item.weather[0];

    // Build a forecast card
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <p class="forecast-day">${dayName}</p>
      <p class="forecast-date">${dateLabel}</p>
      <div class="forecast-icon">${getWeatherIcon(weather.main, false)}</div>
      <p class="forecast-temp">${Math.round(item.main.temp)}°C</p>
      <p class="forecast-desc">${weather.main}</p>
    `;

    forecastContainer.appendChild(card);
  });
}

/* ---------- STEP 6: SEARCH LOGIC + EVENTS ---------- */

// This runs when the user clicks Search or presses Enter
async function handleSearch(cityFromCode) {
  // If a city is passed in, use it. Otherwise read from the input box.
  const city = (cityFromCode || cityInput.value).trim();

  // --- Input validation ---
  if (city === "") {
    showError("Please enter a city name.");
    return;
  }
  // Allow letters (any language), spaces, comma, dot, apostrophe and hyphen
  if (!/^[\p{L}\s.,'-]+$/u.test(city)) {
    showError("City name can only contain letters. Please remove numbers or symbols.");
    return;
  }

  clearError();
  weatherContent.classList.add("hidden");
  showLoading();

  // --- try/catch: handle any error nicely ---
  try {
    const data = await getWeather(city);
    displayCurrentWeather(data.current);
    displayForecast(data.forecast);
    weatherContent.classList.remove("hidden");
  } catch (error) {
    if (error instanceof TypeError) {
      // fetch() throws a TypeError when there is no internet
      showError("Network problem. Please check your internet connection.");
    } else {
      showError(error.message);
    }
  } finally {
    // "finally" always runs, whether it worked or failed
    hideLoading();
  }
}

// Event 1: click on the Search button
searchBtn.addEventListener("click", () => handleSearch());

// Event 2: press Enter inside the input box
cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleSearch();
  }
});

// When the page opens: show the demo badge (if needed) and load a default city
if (DEMO_MODE) {
  demoBadge.classList.remove("hidden");
}
cityInput.value = DEFAULT_CITY;
handleSearch(DEFAULT_CITY);