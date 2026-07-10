/**
 * app.js
 * 
 * Lógica principal da aplicação Minuano.
 * Coordena buscas, geolocalização, controle de estados,
 * gráficos comparativos (Chart.js) e mapa interativo (Leaflet.js).
 */

// --- Estados Globais da Aplicação ---
let currentLat = -29.1201; // Padrão: Sítio (Serra Gaúcha)
let currentLon = -50.9686;
let currentLocationName = "Sítio (Serra Gaúcha), RS";
let activeDayIndex = 0; // 0 = Hoje, 1 = Amanhã...
let activeProvider = "best_match"; // Modelo padrão selecionado para o cartão esquerdo
let currentUnit = "C"; // C ou F
let weatherData = null; // Guardará o retorno das APIs
let mapInstance = null;
let markerInstance = null;
let tileLayerInstance = null; // Instância da camada de mapa
let chartInstance = null;
let mapTheme = "light"; // "light" ou "dark"
let appLang = "pt"; // "pt", "en", "es"
window.appLang = appLang;

// Configurações salvas
let favoriteLocation = null; // { lat, lon, name }

// Debounce para busca de cidades
let searchDebounceTimeout = null;

// --- Inicialização ---
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  setupEventListeners();
  initMap();
  
  // Decidir localização inicial: Favorito -> GPS -> Padrão
  if (favoriteLocation) {
    currentLat = favoriteLocation.lat;
    currentLon = favoriteLocation.lon;
    currentLocationName = favoriteLocation.name;
    updateCoordinatesUI();
    fetchAndRenderWeather();
  } else {
    tryGeolocation();
  }
});

// --- Carregar e Salvar Configurações (localStorage) ---
function loadSettings() {
  // Carregar tema do mapa
  const savedTheme = localStorage.getItem("map_theme");
  if (savedTheme) {
    mapTheme = savedTheme;
  }
  document.getElementById("map-theme-select").value = mapTheme;

  // Carregar idioma do app
  const savedLang = localStorage.getItem("app_lang");
  if (savedLang) {
    appLang = savedLang;
    window.appLang = appLang;
  }
  document.getElementById("app-lang-select").value = appLang;
  applyTranslations();

  const savedFav = localStorage.getItem("favorite_location");
  if (savedFav) {
    favoriteLocation = JSON.parse(savedFav);
    renderFavoriteStatus();
  }
}

// --- Aplicar Traduções Dinâmicas ---
function applyTranslations() {
  const langData = TRANSLATIONS[appLang] || TRANSLATIONS.pt;

  // Elementos com atributo data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (langData[key]) {
      el.textContent = langData[key];
    }
  });

  // Atualizar placeholders
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.placeholder = langData["search-placeholder"];
  }

  // Se a localização atual for a padrão ou GPS, traduzimos na hora
  if (currentLocationName.includes("Sítio (Serra Gaúcha)") || 
      currentLocationName.includes("Estate (Serra Gaúcha)") || 
      currentLocationName.includes("Campo (Serra Gaúcha)")) {
    currentLocationName = langData["status-default-name"].replace(" (Padrão)", "").replace(" (Default)", "").replace(" (Por Defecto)", "");
  } else if (currentLocationName.includes("Localização Atual") || 
             currentLocationName.includes("Current Location") || 
             currentLocationName.includes("Ubicación Actual")) {
    currentLocationName = langData["status-gps-success"];
  }

  const nameSpan = document.getElementById("current-location-name");
  if (nameSpan) {
    nameSpan.textContent = currentLocationName;
  }
}

function renderFavoriteStatus() {
  const infoDiv = document.getElementById("saved-favorite-info");
  const favBtn = document.getElementById("favorite-button");
  
  if (favoriteLocation) {
    infoDiv.innerHTML = `
      <div class="fav-detail">
        <span><strong>${favoriteLocation.name}</strong><br><small>Lat: ${favoriteLocation.lat.toFixed(4)} | Lon: ${favoriteLocation.lon.toFixed(4)}</small></span>
        <button id="btn-delete-fav" class="btn-remove-fav">Remover</button>
      </div>
    `;
    document.getElementById("btn-delete-fav").addEventListener("click", removeFavorite);
    
    // Se a localização atual for a favorita, marca o botão com destaque
    const isCurrentFav = Math.abs(currentLat - favoriteLocation.lat) < 0.001 && 
                          Math.abs(currentLon - favoriteLocation.lon) < 0.001;
    if (isCurrentFav) {
      favBtn.classList.add("active");
    } else {
      favBtn.classList.remove("active");
    }
  } else {
    infoDiv.innerHTML = "Nenhum local favorito salvo ainda.";
    favBtn.classList.remove("active");
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  // Busca de cidades
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(handleSearchInput, 400);
  });

  // Fechar dropdown de busca ao clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      document.getElementById("search-results").classList.add("hidden");
    }
  });

  // GPS
  document.getElementById("gps-button").addEventListener("click", tryGeolocation);

  // Favorito
  document.getElementById("favorite-button").addEventListener("click", toggleFavoriteCurrent);

  // Unidades de Temperatura
  document.getElementById("unit-c").addEventListener("click", () => setUnit("C"));
  document.getElementById("unit-f").addEventListener("click", () => setUnit("F"));

  // Modais de Configurações
  const modal = document.getElementById("settings-modal");
  document.getElementById("settings-button").addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("btn-manual-coords").addEventListener("click", () => modal.classList.remove("hidden"));
  document.getElementById("close-modal").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  // Salvar Configurações
  document.getElementById("btn-save-settings").addEventListener("click", saveSettings);
  
  // Buscar Coordenadas Manuais (dentro do modal)
  document.getElementById("btn-apply-manual-coords").addEventListener("click", applyManualCoordinates);

  // Abas de Provedores (Modelos)
  document.getElementById("provider-tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".provider-tab");
    if (tab) {
      activeProvider = tab.dataset.provider;
      updateProviderTabsUI();
      renderDetailedCard();
    }
  });

  // Checkboxes de ligar/desligar linhas no gráfico
  document.getElementById("chart-toggles").addEventListener("change", () => {
    if (weatherData) {
      renderHourlyChart();
    }
  });
}

// --- Geolocalização (GPS) ---
function tryGeolocation() {
  const nameSpan = document.getElementById("current-location-name");
  const langData = TRANSLATIONS[appLang] || TRANSLATIONS.pt;
  nameSpan.textContent = langData["status-gps-obtaining"];

  if (!navigator.geolocation) {
    nameSpan.textContent = langData["status-gps-error"];
    fallbackToDefault();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLat = position.coords.latitude;
      currentLon = position.coords.longitude;
      currentLocationName = langData["status-gps-success"];
      updateCoordinatesUI();
      fetchAndRenderWeather();
    },
    (error) => {
      console.warn("Erro ao obter GPS:", error.message);
      fallbackToDefault();
    },
    { timeout: 8000 }
  );
}

function fallbackToDefault() {
  currentLat = -29.1201;
  currentLon = -50.9686;
  const langData = TRANSLATIONS[appLang] || TRANSLATIONS.pt;
  currentLocationName = langData["status-default-name"];
  updateCoordinatesUI();
  fetchAndRenderWeather();
}

function updateCoordinatesUI() {
  document.getElementById("current-lat").textContent = currentLat.toFixed(4);
  document.getElementById("current-lon").textContent = currentLon.toFixed(4);
  document.getElementById("current-location-name").textContent = currentLocationName;
  
  // Atualiza também os campos manuais no modal
  document.getElementById("manual-lat").value = currentLat.toFixed(4);
  document.getElementById("manual-lon").value = currentLon.toFixed(4);

  renderFavoriteStatus();
}

// --- Salvar / Remover Favoritos ---
function toggleFavoriteCurrent() {
  const langData = TRANSLATIONS[appLang] || TRANSLATIONS.pt;
  if (favoriteLocation && 
      Math.abs(currentLat - favoriteLocation.lat) < 0.001 && 
      Math.abs(currentLon - favoriteLocation.lon) < 0.001) {
    removeFavorite();
  } else {
    favoriteLocation = {
      lat: currentLat,
      lon: currentLon,
      name: currentLocationName
    };
    localStorage.setItem("favorite_location", JSON.stringify(favoriteLocation));
    renderFavoriteStatus();
    showNotification(langData["notification-fav-added"]);
  }
}

function removeFavorite() {
  favoriteLocation = null;
  localStorage.removeItem("favorite_location");
  renderFavoriteStatus();
  const langData = TRANSLATIONS[appLang] || TRANSLATIONS.pt;
  showNotification(langData["notification-fav-removed"]);
}

// --- Salvar Configurações Gerais ---
function saveSettings() {
  // Obter e salvar o estilo do mapa
  const selectTheme = document.getElementById("map-theme-select").value;
  mapTheme = selectTheme;
  localStorage.setItem("map_theme", mapTheme);
  updateMapTheme();

  // Obter e salvar o idioma do app
  const selectLang = document.getElementById("app-lang-select").value;
  appLang = selectLang;
  window.appLang = appLang;
  localStorage.setItem("app_lang", appLang);
  applyTranslations();

  const langData = TRANSLATIONS[appLang] || TRANSLATIONS.pt;
  showNotification(langData["notification-save-success"]);
  document.getElementById("settings-modal").classList.add("hidden");
  
  // Recarregar os dados
  fetchAndRenderWeather();
}

// --- Aplicar Coordenadas Manuais (dentro do modal) ---
function applyManualCoordinates() {
  const lat = parseFloat(document.getElementById("manual-lat").value);
  const lon = parseFloat(document.getElementById("manual-lon").value);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    alert(appLang === 'en' ? "Please enter valid coordinates (Lat -90 to 90, Lon -180 to 180)." : (appLang === 'es' ? "Por favor, ingrese coordenadas válidas (Lat -90 a 90, Lon -180 a 180)." : "Por favor, insira coordenadas válidas (Lat -90 a 90, Lon -180 a 180)."));
    return;
  }

  currentLat = lat;
  currentLon = lon;
  currentLocationName = `${appLang === 'en' ? 'Coordinates' : (appLang === 'es' ? 'Coordenadas' : 'Coordenadas')}: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  updateCoordinatesUI();
  
  document.getElementById("settings-modal").classList.add("hidden");
  fetchAndRenderWeather();
}

// --- Alternar Unidades de Temperatura ---
function setUnit(unit) {
  if (currentUnit === unit) return;
  currentUnit = unit;
  
  document.getElementById("unit-c").classList.toggle("active", unit === "C");
  document.getElementById("unit-f").classList.toggle("active", unit === "F");

  if (weatherData) {
    renderDaysTabs();
    renderDetailedCard();
    renderHourlyChart();
  }
}

// --- Conversor de Temperatura ---
function formatTemp(celsius) {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return "--";
  if (currentUnit === "C") {
    return Math.round(celsius);
  } else {
    return Math.round((celsius * 9) / 5 + 32);
  }
}

// --- Controle de Busca por Texto ---
async function handleSearchInput() {
  const query = document.getElementById("search-input").value;
  const resultsDiv = document.getElementById("search-results");

  if (!query || query.trim().length < 2) {
    resultsDiv.innerHTML = "";
    resultsDiv.classList.add("hidden");
    return;
  }

  const cities = await WeatherServices.searchCities(query);
  if (cities.length === 0) {
    resultsDiv.innerHTML = `<div style="padding: 12px; color: var(--text-muted); font-size:13px;">Nenhuma localidade encontrada.</div>`;
    resultsDiv.classList.remove("hidden");
    return;
  }

  resultsDiv.innerHTML = "";
  cities.forEach(city => {
    const btn = document.createElement("button");
    btn.className = "result-item";
    
    const stateCountry = [city.admin1, city.country].filter(Boolean).join(", ");
    btn.innerHTML = `
      <span class="result-name">${city.name} <small style="color:var(--text-muted)">(${stateCountry})</small></span>
      <span class="result-coords">Lat: ${city.latitude.toFixed(3)} | Lon: ${city.longitude.toFixed(3)}</span>
    `;

    btn.addEventListener("click", () => {
      currentLat = city.latitude;
      currentLon = city.longitude;
      currentLocationName = `${city.name}, ${stateCountry}`;
      
      updateCoordinatesUI();
      
      document.getElementById("search-input").value = "";
      resultsDiv.classList.add("hidden");
      
      fetchAndRenderWeather();
    });

    resultsDiv.appendChild(btn);
  });
  
  resultsDiv.classList.remove("hidden");
}

// --- Inicialização do Mapa (Leaflet) ---
function initMap() {
  mapInstance = L.map('map', {
    zoomControl: true,
    scrollWheelZoom: false
  }).setView([currentLat, currentLon], 12);

  // Inicializar o tema ativo
  updateMapTheme();

  markerInstance = L.marker([currentLat, currentLon]).addTo(mapInstance);
}

// --- Atualizar Tema das Camadas de Mapa ---
function updateMapTheme() {
  if (!mapInstance) return;

  const lightUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const activeUrl = mapTheme === 'dark' ? darkUrl : lightUrl;
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Remover a camada antiga se ela existir
  if (tileLayerInstance) {
    mapInstance.removeLayer(tileLayerInstance);
  }

  // Adicionar a nova camada
  tileLayerInstance = L.tileLayer(activeUrl, { attribution, maxZoom: 18 }).addTo(mapInstance);

  // Alternar a classe de estilo escuro do container
  const mapElement = document.getElementById("map");
  if (mapElement) {
    if (mapTheme === 'dark') {
      mapElement.classList.add("dark-theme-map");
    } else {
      mapElement.classList.remove("dark-theme-map");
    }
  }
}

function updateMap() {
  if (mapInstance && markerInstance) {
    mapInstance.setView([currentLat, currentLon], 12);
    markerInstance.setLatLng([currentLat, currentLon]);
    // Forçar redesenho para evitar bugs de tamanho do container
    setTimeout(() => mapInstance.invalidateSize(), 300);
  }
}

// --- Fetch do Clima e Integrações ---
async function fetchAndRenderWeather() {
  showLoadingState();
  updateMap();

  try {
    // 1. Busca múltiplos modelos do Open-Meteo
    const data = await WeatherServices.fetchOpenMeteoMultiModel(currentLat, currentLon);
    weatherData = data;

    // Atualizar Altitude (Elevação)
    if (weatherData && weatherData["best_match"]) {
      const elevation = weatherData["best_match"].elevation;
      if (elevation !== undefined && elevation !== null) {
        document.getElementById("current-elevation").textContent = Math.round(elevation);
        document.getElementById("altitude-info").classList.remove("hidden");
      } else {
        document.getElementById("altitude-info").classList.add("hidden");
      }
    }

    // 3. Atualizar Fundo de Acordo com o Clima Atual da fonte ativa
    updateDynamicBackground();

    // 4. Renderizar Elementos da Interface
    renderDaysTabs();
    renderDetailedCard();
    renderHourlyChart();
    
    // Atualizar Ícones Lucide
    lucide.createIcons();

  } catch (error) {
    console.error("Erro geral de renderização:", error);
    document.getElementById("detail-condition").textContent = "Erro ao carregar dados";
    showNotification("Erro ao conectar com serviços meteorológicos.");
  }
}

function showLoadingState() {
  document.getElementById("detail-temp").textContent = "--";
  document.getElementById("detail-condition").textContent = "Carregando clima...";
  document.getElementById("detail-feels").textContent = "--";
  document.getElementById("detail-wind").textContent = "--";
  document.getElementById("detail-humidity").textContent = "--";
  document.getElementById("detail-pressure").textContent = "--";
  document.getElementById("detail-rain").textContent = "--";
  document.getElementById("altitude-info").classList.add("hidden");
  
  // Renderiza skeletons nas abas
  const tabsContainer = document.getElementById("days-tabs");
  tabsContainer.innerHTML = Array(7).fill('<div class="day-tab-skeleton"></div>').join("");
}

// --- Alteração Dinâmica de Fundo (Aesthetics) ---
function updateDynamicBackground() {
  const bg = document.getElementById("dynamic-bg");
  bg.className = ""; // Limpa classes antigas

  if (!weatherData || !weatherData[activeProvider]) {
    bg.classList.add("bg-gradient-default");
    return;
  }

  const currentConditionCode = weatherData[activeProvider].current.conditionCode;

  // Mapeia códigos WMO para temas visuais
  if ([0, 1].includes(currentConditionCode)) {
    bg.classList.add("bg-gradient-clear"); // Dia limpo
  } else if ([2, 3, 45, 48].includes(currentConditionCode)) {
    bg.classList.add("bg-gradient-cloudy"); // Nublado / Névoa
  } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(currentConditionCode)) {
    bg.classList.add("bg-gradient-rain"); // Chuva / Tempestade
  } else {
    bg.classList.add("bg-gradient-default");
  }
}

// --- Renderizar Abas de Dias (Previsão Diária) ---
function renderDaysTabs() {
  const tabsContainer = document.getElementById("days-tabs");
  tabsContainer.innerHTML = "";

  // Usamos os dados da fonte ativa (activeProvider) para desenhar as abas diárias.
  // Se o OpenWeatherMap não estiver carregado e o activeProvider for ele, voltamos pro best_match
  if (!weatherData[activeProvider]) {
    activeProvider = "best_match";
    updateProviderTabsUI();
  }

  const days = weatherData[activeProvider].daily;

  days.forEach((day, index) => {
    const dateObj = new Date(day.date + "T00:00:00");
    
    // Formatação de Dias da Semana
    const localeStr = appLang === 'pt' ? 'pt-BR' : (appLang === 'es' ? 'es-ES' : 'en-US');
    const weekday = dateObj.toLocaleDateString(localeStr, { weekday: "short" }).replace(".", "");
    const formattedDate = dateObj.toLocaleDateString(localeStr, { day: "numeric", month: "short" }).replace(".", "");

    const tabBtn = document.createElement("button");
    tabBtn.className = `day-tab-btn ${index === activeDayIndex ? "active" : ""}`;
    
    // Obter ícone correspondente ao código meteorológico
    const wmoTranslation = WMO_CODES[day.conditionCode] || { icon: "cloud" };

    tabBtn.innerHTML = `
      <span class="day-name">${index === 0 ? (TRANSLATIONS[appLang]["card-today"] || "Hoje") : capitalize(weekday)}</span>
      <span class="day-date">${formattedDate}</span>
      <i data-lucide="${wmoTranslation.icon}" class="day-icon"></i>
      <div class="day-temps">
        <span class="max-temp">${formatTemp(day.maxTemp)}°</span>
        <span class="min-temp">${formatTemp(day.minTemp)}°</span>
      </div>
      <div class="day-rain-prob">
        <i data-lucide="umbrella"></i>
        <span>${day.rainProb}%</span>
      </div>
    `;

    tabBtn.addEventListener("click", () => {
      activeDayIndex = index;
      // Atualiza aba ativa
      document.querySelectorAll(".day-tab-btn").forEach(btn => btn.classList.remove("active"));
      tabBtn.classList.add("active");
      
      // Renderiza as sub-informações e gráficos correspondentes àquele dia
      renderDetailedCard();
      renderHourlyChart();
      lucide.createIcons();
    });

    tabsContainer.appendChild(tabBtn);
  });
}

// --- Renderizar Cartão Detalhado (Coluna Esquerda) ---
function renderDetailedCard() {
  if (!weatherData || !weatherData[activeProvider]) return;

  const currentModelData = weatherData[activeProvider];
  
  // Rótulo superior do dia selecionado
  const dateObj = new Date(currentModelData.daily[activeDayIndex].date + "T00:00:00");
  const localeStr = appLang === 'pt' ? 'pt-BR' : (appLang === 'es' ? 'es-ES' : 'en-US');
  const friendlyDayStr = activeDayIndex === 0 
    ? (TRANSLATIONS[appLang]["card-today"] || "Hoje") 
    : capitalize(dateObj.toLocaleDateString(localeStr, { weekday: "long", day: "numeric", month: "long" }));
  
  document.getElementById("detail-day-label").textContent = friendlyDayStr;
  document.getElementById("detail-city-label").textContent = currentLocationName;
  document.getElementById("detail-provider-badge").textContent = currentModelData.provider;

  // Se for "Hoje" (index 0), mostramos dados em tempo real da API
  // Se for um dia futuro, adaptamos mostrando dados médios ou máximos do dia
  const isToday = activeDayIndex === 0;
  
  let temp, feelsLike, humidity, windSpeed, pressure, conditionCode, conditionText;

  if (isToday) {
    const cur = currentModelData.current;
    temp = cur.temp;
    feelsLike = cur.feelsLike;
    humidity = cur.humidity;
    windSpeed = cur.windSpeed;
    pressure = cur.pressure;
    conditionCode = cur.conditionCode;
    conditionText = cur.conditionText;
  } else {
    // Para dias futuros, mostramos a máxima e mínima
    const dailyInfo = currentModelData.daily[activeDayIndex];
    temp = dailyInfo.maxTemp;
    feelsLike = dailyInfo.minTemp; // UsamosfeelsLike para mostrar a mínima de forma compacta
    
    // Calculamos médias aproximadas das horas para umidade/vento
    const targetDate = dailyInfo.date;
    const dayHours = currentModelData.hourly.filter(h => h.time.startsWith(targetDate));
    
    if (dayHours.length > 0) {
      humidity = Math.round(dayHours.reduce((acc, h) => acc + h.rainProb, 0) / dayHours.length); // Usado para chance de chuva média
      windSpeed = Math.round(currentModelData.current.windSpeed); // Fallback estável
      pressure = currentModelData.current.pressure; // Fallback estável
    } else {
      humidity = dailyInfo.rainProb;
      windSpeed = "--";
      pressure = "--";
    }

    conditionCode = dailyInfo.conditionCode;
    conditionText = translateWMO(conditionCode).text;
  }

  // Preencher DOM
  document.getElementById("detail-temp").textContent = formatTemp(temp);
  document.getElementById("detail-condition").textContent = conditionText;
  
  // Ajuste do rótulo Sensação vs Mínima
  const feelsSpan = document.getElementById("detail-feels");
  const langData = TRANSLATIONS[appLang] || TRANSLATIONS.pt;
  if (isToday) {
    document.querySelector(".feels-like-text").childNodes[0].textContent = langData["feels-like"];
    feelsSpan.textContent = formatTemp(feelsLike);
  } else {
    document.querySelector(".feels-like-text").childNodes[0].textContent = langData["min-temp"];
    feelsSpan.textContent = formatTemp(feelsLike);
  }

  document.getElementById("detail-wind").textContent = `${windSpeed} km/h`;
  document.getElementById("detail-humidity").textContent = `${humidity}%`;
  document.getElementById("detail-pressure").textContent = `${pressure} hPa`;
  
  // Chance de Chuva (Máxima do dia)
  document.getElementById("detail-rain").textContent = `${currentModelData.daily[activeDayIndex].rainProb}%`;

  // Calcular hora que inicia a chuva (primeira hora com prob >= 30%)
  const targetDate = currentModelData.daily[activeDayIndex].date;
  const dayHours = currentModelData.hourly.filter(h => h.time.startsWith(targetDate));
  let rainStartHour = null;
  
  for (let i = 0; i < dayHours.length; i++) {
    if (dayHours[i].rainProb >= 30) {
      const hourPart = dayHours[i].time.split("T")[1];
      rainStartHour = hourPart.substring(0, 5);
      break;
    }
  }
  
  const rainSubElement = document.getElementById("detail-rain-sub");
  if (rainStartHour) {
    rainSubElement.textContent = `${langData["rain-starts"]}${rainStartHour}`;
    rainSubElement.style.color = "var(--color-ecmwf)";
  } else {
    rainSubElement.textContent = langData["rain-none"];
    rainSubElement.style.color = "var(--text-muted)";
  }

  // Ícone
  const weatherIcon = document.getElementById("detail-icon");
  const wmoTranslation = WMO_CODES[conditionCode] || { icon: "cloud" };
  weatherIcon.setAttribute("data-lucide", wmoTranslation.icon);
  
  // Atualizar fundo dinâmico caso o provedor ou o dia mude
  updateDynamicBackground();
}

// --- Renderizar Gráfico Comparativo (Chart.js) ---
function renderHourlyChart() {
  if (!weatherData) return;

  const ctx = document.getElementById("hourlyChart").getContext("2d");

  // Destruir instância anterior se existir
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Obter data do dia ativo (ex: "2026-07-09")
  // Qualquer modelo serve para extrair a data correspondente
  const activeDate = weatherData["best_match"].daily[activeDayIndex].date;

  // Rótulos do Eixo X: as 24 horas (ex: "00:00", "03:00"...)
  // Em algumas APIs, temos dados de 1 em 1 hora, em outras (OpenWeather) de 3 em 3.
  // Vamos construir uma lista de horários unificada para o dia (00:00 às 23:00)
  const xLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

  // Montagem dos Datasets (linhas de dados dos modelos de clima)
  const datasets = [];

  // Configuração visual de cada linha de modelo
  const lineConfigs = {
    ecmwf_ifs025: {
      label: "ECMWF (Europeu)",
      borderColor: "#38bdf8",
      backgroundColor: "rgba(56, 189, 248, 0.05)",
      toggleId: "toggle-ecmwf"
    },
    gfs_seamless: {
      label: "GFS (Americano)",
      borderColor: "#34d399",
      backgroundColor: "rgba(52, 211, 153, 0.05)",
      toggleId: "toggle-gfs"
    },
    icon_seamless: {
      label: "ICON (Alemão)",
      borderColor: "#a855f7",
      backgroundColor: "rgba(168, 85, 247, 0.05)",
      toggleId: "toggle-icon"
    }
  };

  // Iterar por todos os modelos que temos nos dados
  Object.keys(lineConfigs).forEach(modelKey => {
    const config = lineConfigs[modelKey];
    
    // Ignorar se o modelo não estiver nos dados carregados (ex: OpenWeather sem chave)
    if (!weatherData[modelKey]) return;

    // Ignorar se o usuário desmarcou o checkbox deste modelo
    const checkbox = document.getElementById(config.toggleId);
    if (checkbox && !checkbox.checked) return;

    const modelHourly = weatherData[modelKey].hourly;
    
    // Filtrar as previsões horárias apenas do dia selecionado
    const dayHours = modelHourly.filter(item => item.time.startsWith(activeDate));

    // Construir os 24 pontos de temperatura do gráfico
    const temps24h = Array(24).fill(null);

    dayHours.forEach(item => {
      // Extrair a hora (0-23)
      const hour = parseInt(item.time.split("T")[1].substring(0, 2));
      temps24h[hour] = formatTempRaw(item.temp);
    });

    // Se houver lacunas de horas (como OpenWeather que fornece dados a cada 3h),
    // o Chart.js pode interpolar os valores vazios com a opção spanGaps: true.
    datasets.push({
      label: config.label,
      data: temps24h,
      borderColor: config.borderColor,
      backgroundColor: config.backgroundColor,
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      tension: 0.35, // Suavizar curva
      spanGaps: true, // Une os pontos vazios (muito útil para intervalos de 3h)
      fill: true
    });
  });

  // Criando o Gráfico
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: xLabels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Usamos nossos próprios toggles customizados na UI
        },
        tooltip: {
          mode: "index",
          intersect: false,
          padding: 12,
          cornerRadius: 8,
          backgroundColor: "#0f172a",
          titleFont: { family: "Outfit", size: 13, weight: "bold" },
          bodyFont: { family: "Outfit", size: 12 },
          callbacks: {
            label: (context) => {
              return ` ${context.dataset.label}: ${context.raw}°${currentUnit}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.04)"
          },
          ticks: {
            color: "#94a3b8",
            font: { family: "Outfit", size: 11 },
            maxTicksLimit: 8
          }
        },
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.04)"
          },
          ticks: {
            color: "#94a3b8",
            font: { family: "Outfit", size: 11 },
            callback: (val) => `${val}°`
          }
        }
      }
    }
  });
}

// Auxiliar para converter temp sem formatação de string
function formatTempRaw(celsius) {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return null;
  if (currentUnit === "C") {
    return Math.round(celsius);
  } else {
    return Math.round((celsius * 9) / 5 + 32);
  }
}

// --- Atualizar Estilo das Abas de Provedores ---
function updateProviderTabsUI() {
  const tabs = document.querySelectorAll(".provider-tab");
  tabs.forEach(tab => {
    if (tab.dataset.provider === activeProvider) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

// --- Utilitários de Interface ---

// Mostrar notificação rápida (toast) na tela
function showNotification(message) {
  // Criar elemento de notificação
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.right = "24px";
  toast.style.background = "#ff6b4a";
  toast.style.color = "#ffffff";
  toast.style.padding = "12px 24px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  toast.style.zIndex = "2000";
  toast.style.fontFamily = "Outfit";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "600";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(10px)";
  toast.style.transition = "all 0.3s ease";
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animação de entrada
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 50);

  // Remover após 3 segundos
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Capitalizar primeira letra
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
