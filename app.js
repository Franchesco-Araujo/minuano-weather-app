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
let siteTheme = "dark"; // "dark" ou "light"
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
  
  // Renderizar o calendário agrícola
  renderAgriculturalCalendar();
});

// --- Carregar e Salvar Configurações (localStorage) ---
function loadSettings() {
  // Carregar tema do mapa
  const savedTheme = localStorage.getItem("map_theme");
  if (savedTheme) {
    mapTheme = savedTheme;
  }
  document.getElementById("map-theme-select").value = mapTheme;

  // Carregar tema do site
  const savedSiteTheme = localStorage.getItem("site_theme") || "dark";
  siteTheme = savedSiteTheme;
  document.getElementById("site-theme-select").value = siteTheme;
  document.body.classList.toggle("light-theme", siteTheme === "light");

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

  const agroSearchInput = document.getElementById("agro-search-input");
  if (agroSearchInput) {
    agroSearchInput.placeholder = langData["agro-search-placeholder"];
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

  // Atualizar Calendário Agrícola para o novo idioma
  renderAgriculturalCalendar();
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
  
  // Fechar modal revertendo o preview do tema
  const closeModalAndRevert = () => {
    document.body.classList.toggle("light-theme", siteTheme === "light");
    document.getElementById("site-theme-select").value = siteTheme;
    if (weatherData) {
      renderHourlyChart();
    }
    modal.classList.add("hidden");
  };

  document.getElementById("close-modal").addEventListener("click", closeModalAndRevert);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModalAndRevert();
  });

  // Preview instantâneo do tema do site ao mudar a seleção
  document.getElementById("site-theme-select").addEventListener("change", (e) => {
    const tempTheme = e.target.value;
    document.body.classList.toggle("light-theme", tempTheme === "light");
    if (weatherData) {
      renderHourlyChart();
    }
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
      updateDynamicBackground();
      renderDetailedCard();
      renderHourlyChart();
    }
  });

  // Checkboxes de ligar/desligar linhas no gráfico
  document.getElementById("chart-toggles").addEventListener("change", () => {
    if (weatherData) {
      renderHourlyChart();
    }
  });

  // Filtros da Seção Agrícola
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeAgroCategory = btn.getAttribute("data-type");
      renderAgriculturalCalendar();
    });
  });

  const monthSelect = document.getElementById("agro-month-select");
  if (monthSelect) {
    monthSelect.addEventListener("change", (e) => {
      activeAgroMonth = e.target.value;
      renderAgriculturalCalendar();
    });
  }

  const agroSearchInput = document.getElementById("agro-search-input");
  if (agroSearchInput) {
    agroSearchInput.addEventListener("input", renderAgriculturalCalendar);
  }
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

  // Obter e salvar o estilo do site
  const selectSiteTheme = document.getElementById("site-theme-select").value;
  siteTheme = selectSiteTheme;
  localStorage.setItem("site_theme", siteTheme);
  document.body.classList.toggle("light-theme", siteTheme === "light");

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

  // Permitir pinar coordenadas clicando no mapa
  mapInstance.on('click', (e) => {
    const { lat, lng } = e.latlng;
    currentLat = lat;
    currentLon = lng;

    const langData = TRANSLATIONS[appLang] || TRANSLATIONS.pt;
    currentLocationName = `${langData["map-coordinates"]}: ${currentLat.toFixed(4)}, ${currentLon.toFixed(4)}`;

    // Mover o marcador
    if (markerInstance) {
      markerInstance.setLatLng([currentLat, currentLon]);
    }

    // Atualizar UI de Coordenadas
    updateCoordinatesUI();

    // Recarregar os dados do clima
    fetchAndRenderWeather();
  });
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
    updateWeatherOverlays(false, false, false);
    return;
  }

  // Obter dados do dia selecionado
  const activeDayData = weatherData[activeProvider].daily[activeDayIndex];
  const dayConditionCode = activeDayData ? activeDayData.conditionCode : 999;
  const rainProb = activeDayData ? activeDayData.rainProb : 0;

  // Mapeia códigos WMO para temas visuais do gradiente
  if ([0, 1].includes(dayConditionCode)) {
    bg.classList.add("bg-gradient-clear"); // Dia limpo
  } else if ([2, 3, 45, 48].includes(dayConditionCode)) {
    bg.classList.add("bg-gradient-cloudy"); // Nublado / Névoa
  } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(dayConditionCode)) {
    bg.classList.add("bg-gradient-rain"); // Chuva / Tempestade
  } else {
    bg.classList.add("bg-gradient-default");
  }

  // Determinar quais overlays ativar baseado na condição do dia selecionado
  let showSun = false;
  let showClouds = false;
  let showRain = false;

  if ([0, 1].includes(dayConditionCode)) {
    showSun = true;
  } else if ([2, 3, 45, 48].includes(dayConditionCode)) {
    showClouds = true;
  } else if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(dayConditionCode) || rainProb > 40) {
    showClouds = true;
    showRain = true;
  } else {
    // Caso padrão, se a chance de chuva for razoável, coloca nuvens
    if (rainProb > 20) {
      showClouds = true;
    }
  }

  updateWeatherOverlays(showSun, showClouds, showRain);
}

// --- Gerenciador de Efeitos Atmosféricos no Fundo ---
function updateWeatherOverlays(showSun, showClouds, showRain) {
  const sunOverlay = document.getElementById("sun-overlay");
  const cloudsOverlay = document.getElementById("clouds-overlay");
  const rainOverlay = document.getElementById("rain-overlay");
  
  if (!sunOverlay || !cloudsOverlay || !rainOverlay) return;

  // 1. Sol Brilhando
  if (showSun) {
    sunOverlay.classList.remove("hidden");
  } else {
    sunOverlay.classList.add("hidden");
  }

  // 2. Nuvens Flutuantes
  if (showClouds) {
    cloudsOverlay.classList.remove("hidden");
    if (cloudsOverlay.children.length === 0) {
      spawnClouds(cloudsOverlay);
    }
  } else {
    cloudsOverlay.classList.add("hidden");
    cloudsOverlay.innerHTML = "";
  }

  // 3. Chuva Caindo
  if (showRain) {
    rainOverlay.classList.remove("hidden");
    if (rainOverlay.children.length === 0) {
      spawnRain(rainOverlay);
    }
  } else {
    rainOverlay.classList.add("hidden");
    rainOverlay.innerHTML = "";
  }
}

function spawnClouds(container) {
  container.innerHTML = "";
  const cloudCount = 4;
  for (let i = 0; i < cloudCount; i++) {
    const cloud = document.createElement("div");
    cloud.className = "cloud-element";
    
    const size = Math.random() * 250 + 200; // 200px a 450px
    const top = Math.random() * 35; // 0% a 35% do topo
    const duration = Math.random() * 50 + 40; // 40s a 90s
    const delay = Math.random() * -60; // Posições iniciais aleatórias
    
    cloud.style.width = `${size}px`;
    cloud.style.height = `${size * 0.6}px`;
    cloud.style.top = `${top}%`;
    cloud.style.animationDuration = `${duration}s`;
    cloud.style.animationDelay = `${delay}s`;
    
    container.appendChild(cloud);
  }
}

function spawnRain(container) {
  container.innerHTML = "";
  const dropCount = 60;
  for (let i = 0; i < dropCount; i++) {
    const drop = document.createElement("div");
    drop.className = "rain-drop";
    
    const left = Math.random() * 100;
    const height = Math.random() * 40 + 40; // 40px a 80px
    const duration = Math.random() * 0.5 + 0.8; // 0.8s a 1.3s
    const delay = Math.random() * -1.5;
    const opacity = Math.random() * 0.5 + 0.3;
    
    drop.style.left = `${left}%`;
    drop.style.height = `${height}px`;
    drop.style.animationDuration = `${duration}s`;
    drop.style.animationDelay = `${delay}s`;
    drop.style.opacity = opacity;
    
    container.appendChild(drop);
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
      
      // Renderiza as sub-informações, atualiza fundo/overlays e gráficos correspondentes àquele dia
      updateDynamicBackground();
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
  const isLight = document.body.classList.contains("light-theme");
  const tickColor = isLight ? "#475569" : "#94a3b8";
  const gridColor = isLight ? "rgba(15, 23, 42, 0.05)" : "rgba(255, 255, 255, 0.04)";

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
          backgroundColor: isLight ? "#ffffff" : "#0f172a",
          titleColor: isLight ? "#0f172a" : "#f8fafc",
          bodyColor: isLight ? "#334155" : "#cbd5e1",
          borderColor: isLight ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.08)",
          borderWidth: isLight ? 1 : 0,
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
            color: gridColor
          },
          ticks: {
            color: tickColor,
            font: { family: "Outfit", size: 11 },
            maxTicksLimit: 8
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: tickColor,
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

const CROPS_DATA = [
  {
    id: "uva",
    name: { pt: "Uva", en: "Grape", es: "Uva" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "grape",
    bestSeason: { pt: "Julho a Agosto (Inverno - Poda/Plantio)", en: "July to August (Winter - Pruning/Planting)", es: "Julio a Agosto (Invierno - Poda/Plantación)" },
    bestMoon: { pt: "Minguante (poda) / Crescente (plantio)", en: "Waning (pruning) / Waxing (planting)", es: "Menguante (poda) / Creciente (plantación)" },
    months: [6, 7],
    notes: { pt: "Cultura símbolo da Serra Gaúcha. Exige podas secas no inverno.", en: "Symbolic crop of the Serra Gaúcha. Requires dry pruning in winter.", es: "Cultivo símbolo de la Serra Gaúcha. Requiere poda seca en invierno." }
  },
  {
    id: "maca",
    name: { pt: "Maçã", en: "Apple", es: "Manzana" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "apple",
    bestSeason: { pt: "Junho a Agosto (Inverno - Mudas)", en: "June to August (Winter - Seedlings)", es: "Junio a Agosto (Invierno - Plantones)" },
    bestMoon: { pt: "Cheia (desenvolvimento) / Crescente (plantio)", en: "Full (development) / Waxing (planting)", es: "Llena (desarrollo) / Creciente (plantación)" },
    months: [5, 6, 7],
    notes: { pt: "Exige frio invernal acumulado (comum nos Campos de Cima da Serra) para florescer bem.", en: "Requires winter chill hours (common in Highlands of RS) to bloom well.", es: "Requiere frío invernal acumulado (común en las tierras altas de RS) para florecer bien." }
  },
  {
    id: "banana",
    name: { pt: "Banana", en: "Banana", es: "Banana" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "leaf",
    bestSeason: { pt: "Setembro a Novembro (Primavera)", en: "September to November (Spring)", es: "Septiembre a Noviembre (Primavera)" },
    bestMoon: { pt: "Crescente (estimula crescimento rápido)", en: "Waxing (stimulates rapid growth)", es: "Creciente (estimula rápido crecimiento)" },
    months: [8, 9, 10],
    notes: { pt: "Evitar plantio em encostas expostas a ventos frios ou geadas severas. Requer umidade.", en: "Avoid planting on slopes exposed to cold winds or severe frosts. Requires humidity.", es: "Evitar plantar en laderas expuestas a vientos fríos o heladas severas. Requiere humedad." }
  },
  {
    id: "caqui",
    name: { pt: "Caqui", en: "Persimmon", es: "Caqui" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "apple",
    bestSeason: { pt: "Junho a Agosto (Inverno - Mudas)", en: "June to August (Winter - Seedlings)", es: "Junio a Agosto (Invierno - Plantones)" },
    bestMoon: { pt: "Crescente / Cheia", en: "Waxing / Full", es: "Creciente / Llena" },
    months: [5, 6, 7],
    notes: { pt: "Adapta-se muito bem ao clima frio e úmido das encostas da Serra Gaúcha.", en: "Adapts very well to the cool, humid climate of the Serra Gaúcha slopes.", es: "Se adapta muy bien al clima fresco y húmedo de las laderas de la Serra Gaúcha." }
  },
  {
    id: "laranja",
    name: { pt: "Laranja", en: "Orange", es: "Naranja" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "apple",
    bestSeason: { pt: "Junho a Agosto (Inverno)", en: "June to August (Winter)", es: "Junio a Agosto (Invierno)" },
    bestMoon: { pt: "Crescente / Cheia", en: "Waxing / Full", es: "Creciente / Llena" },
    months: [5, 6, 7],
    notes: { pt: "Exige sol pleno e boa drenagem para evitar podridão das raízes no inverno úmido.", en: "Requires full sun and good drainage to prevent root rot in wet winters.", es: "Requiere pleno sol y buen drenaje para evitar la pudrición de las raíces en el invierno húmedo." }
  },
  {
    id: "bergamota",
    name: { pt: "Bergamota (Tangerina)", en: "Bergamot Tangerine", es: "Mandarina" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "apple",
    bestSeason: { pt: "Junho a Agosto (Inverno)", en: "June to August (Winter)", es: "Junio a Agosto (Invierno)" },
    bestMoon: { pt: "Crescente / Cheia", en: "Waxing / Full", es: "Creciente / Llena" },
    months: [5, 6, 7],
    notes: { pt: "Fruta símbolo do inverno gaúcho. Muito resistente e adaptada ao frio local.", en: "Symbolic fruit of the southern winter. Highly resistant and adapted to local cold.", es: "Fruta símbolo del invierno del sur. Muy resistente y adaptada al frío local." }
  },
  {
    id: "figo",
    name: { pt: "Figo", en: "Fig", es: "Higo" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "apple",
    bestSeason: { pt: "Julho a Agosto (Inverno - Poda/Mudas)", en: "July to August (Winter - Pruning/Seedlings)", es: "Julio a Agosto (Invierno - Poda/Plantones)" },
    bestMoon: { pt: "Minguante (poda pesada no inverno) / Crescente (plantio)", en: "Waning (heavy winter pruning) / Waxing (planting)", es: "Menguante (poda pesada de invierno) / Creciente (plantación)" },
    months: [6, 7],
    notes: { pt: "Exige podas drásticas anuais no inverno para produzir frutos de qualidade no verão.", en: "Requires drastic annual pruning in winter to produce quality summer fruit.", es: "Requiere poda drástica anual en invierno para producir frutos de calidad en verano." }
  },
  {
    id: "noz_pecan",
    name: { pt: "Noz Pecã", en: "Pecan Nut", es: "Nuez Pecana" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "leaf",
    bestSeason: { pt: "Junho a Agosto (Inverno - Raiz Nua)", en: "June to August (Winter - Bare Root)", es: "Junio a Agosto (Invierno - Raíz Desnuda)" },
    bestMoon: { pt: "Crescente (plantio)", en: "Waxing (planting)", es: "Creciente (plantación)" },
    months: [5, 6, 7],
    notes: { pt: "Árvore de grande porte muito rústica. Exige espaço e tratos invernais.", en: "Large, very rustic tree. Requires space and winter care.", es: "Árbol grande y muy rústico. Requiere espacio y cuidados de invierno." }
  },
  {
    id: "pessego",
    name: { pt: "Pêssego & Ameixa", en: "Peach & Plum", es: "Durazno y Ciruela" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "cherry",
    bestSeason: { pt: "Junho a Agosto (Inverno - Mudas)", en: "June to August (Winter - Seedlings)", es: "Junio a Agosto (Invierno - Plantones)" },
    bestMoon: { pt: "Minguante (poda) / Cheia (plantio)", en: "Waning (pruning) / Full (planting)", es: "Menguante (poda) / Llena (plantación)" },
    months: [5, 6, 7],
    notes: { pt: "Exigem horas de frio no inverno para quebrar a dormência das gemas.", en: "Requires winter chill hours to break bud dormancy.", es: "Requiere horas de frío en invierno para romper el letargo de las yemas." }
  },
  {
    id: "tomate",
    name: { pt: "Tomate", en: "Tomato", es: "Tomate" },
    type: "fruit",
    typeLabel: { pt: "Hortaliça", en: "Vegetable", es: "Hortaliza" },
    icon: "cherry",
    bestSeason: { pt: "Outubro a Dezembro (Primavera/Verão)", en: "October to December (Spring/Summer)", es: "Octubre a Diciembre (Primavera/Verano)" },
    bestMoon: { pt: "Cheia (concentração de água e sabor)", en: "Full (concentrates water and flavor)", es: "Llena (concentración de agua y sabor)" },
    months: [9, 10, 11],
    notes: { pt: "Requer tutoramento e proteção contra umidade excessiva nas folhas.", en: "Requires staking and protection against excessive leaf moisture.", es: "Requiere tutorado y protección contra la humedad excesiva en las hojas." }
  },
  {
    id: "repolho",
    name: { pt: "Repolho", en: "Cabbage", es: "Repollo" },
    type: "vegetable",
    typeLabel: { pt: "Hortaliça", en: "Vegetable", es: "Hortaliza" },
    icon: "leaf",
    bestSeason: { pt: "Março a Junho (Outono/Inverno)", en: "March to June (Autumn/Winter)", es: "Marzo a Junio (Otoño/Invierno)" },
    bestMoon: { pt: "Crescente (formação da cabeça)", en: "Waxing (head formation)", es: "Creciente (formación de la cabeza)" },
    months: [2, 3, 4, 5],
    notes: { pt: "Gosta de solos bem adubados e umidade constante. Resistente a geadas.", en: "Prefers well-fertilized soils and constant moisture. Resistant to frost.", es: "Prefiere suelos bien fertilizados y humedad constante. Resistente a las heladas." }
  },
  {
    id: "cenoura",
    name: { pt: "Cenoura", en: "Carrot", es: "Zanahoria" },
    type: "tuber",
    typeLabel: { pt: "Tubérculo", en: "Tuber", es: "Tubérculo" },
    icon: "carrot",
    bestSeason: { pt: "Março a Julho (Outono/Inverno)", en: "March to July (Autumn/Winter)", es: "Marzo a Julio (Otoño/Invierno)" },
    bestMoon: { pt: "Minguante (direciona energia para a raiz)", en: "Waning (directs energy to root)", es: "Menguante (dirige la energía a la raíz)" },
    months: [2, 3, 4, 5, 6],
    notes: { pt: "Semeadura direta nos canteiros. Solo deve ser fofo e livre de pedras.", en: "Direct seeding in garden beds. Soil must be loose and stone-free.", es: "Siembra directa en canteros. El suelo debe estar suelto y libre de piedras." }
  },
  {
    id: "alface",
    name: { pt: "Alface", en: "Lettuce", es: "Lechuga" },
    type: "vegetable",
    typeLabel: { pt: "Hortaliça", en: "Vegetable", es: "Hortaliza" },
    icon: "leaf",
    bestSeason: { pt: "Ano todo (evitar extremos de geada e calor)", en: "All year round (avoid extreme frost/heat)", es: "Todo el año (evitar heladas y calor extremos)" },
    bestMoon: { pt: "Crescente (folhas grandes e saborosas)", en: "Waxing (large, tasty leaves)", es: "Creciente (hojas grandes y sabrosas)" },
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    notes: { pt: "Exige irrigação diária e canteiros ricos em nitrogênio.", en: "Requires daily irrigation and nitrogen-rich beds.", es: "Requiere riego diario y canteros ricos en nitrógeno." }
  },
  {
    id: "mandioca",
    name: { pt: "Mandioca (Aipim)", en: "Cassava", es: "Mandioca" },
    type: "tuber",
    typeLabel: { pt: "Tubérculo", en: "Tuber", es: "Tubérculo" },
    icon: "carrot",
    bestSeason: { pt: "Agosto a Outubro (Fim do Inverno/Primavera)", en: "August to October (Late Winter/Spring)", es: "Agosto a Octubre (Fin de Invierno/Primavera)" },
    bestMoon: { pt: "Minguante (crescimento subterrâneo)", en: "Waning (underground growth)", es: "Menguante (crecimiento subterráneo)" },
    months: [7, 8, 9],
    notes: { pt: "Plantio por ramas (manivas). Exige solo arenoso e bem drenado.", en: "Planted via stem cuttings. Requires sandy, well-drained soil.", es: "Siembra por esquejes de tallo. Requiere suelo arenoso y bien drenado." }
  },
  {
    id: "couve",
    name: { pt: "Couve & Brócolis", en: "Kale & Broccoli", es: "Col & Brócoli" },
    type: "vegetable",
    typeLabel: { pt: "Hortaliça", en: "Vegetable", es: "Hortaliza" },
    icon: "leaf",
    bestSeason: { pt: "Março a Julho (Outono/Inverno)", en: "March to July (Autumn/Winter)", es: "Marzo a Julio (Otoño/Invierno)" },
    bestMoon: { pt: "Crescente (estimula folhas e caules)", en: "Waxing (stimulates leaves and stems)", es: "Creciente (estimula hojas y tallos)" },
    months: [2, 3, 4, 5, 6],
    notes: { pt: "Resistentes ao frio e às geadas comuns na Serra Gaúcha.", en: "Resistant to cold and frost common in Serra Gaúcha.", es: "Resistente al frío y a las heladas comunes en Serra Gaúcha." }
  },
  {
    id: "batata",
    name: { pt: "Batata", en: "Potato", es: "Papa" },
    type: "tuber",
    typeLabel: { pt: "Tubérculo", en: "Tuber", es: "Tubérculo" },
    icon: "carrot",
    bestSeason: { pt: "Agosto a Outubro (Fim do Inverno/Primavera)", en: "August to October (Late Winter/Spring)", es: "Agosto a Octubre (Fin de Invierno/Primavera)" },
    bestMoon: { pt: "Minguante (força nas raízes)", en: "Waning (focuses energy on roots)", es: "Menguante (fuerza en las raíces)" },
    months: [7, 8, 9],
    notes: { pt: "Evitar plantio em solos muito encharcados.", en: "Avoid planting in waterlogged soils.", es: "Evitar plantar en suelos muy encharcados." }
  },
  {
    id: "cebola",
    name: { pt: "Cebola & Alho", en: "Onion & Garlic", es: "Cebolla y Ajo" },
    type: "vegetable",
    typeLabel: { pt: "Hortaliça", en: "Vegetable", es: "Hortaliza" },
    icon: "leaf",
    bestSeason: { pt: "Abril a Junho (Outono)", en: "April to June (Autumn)", es: "Abril a Junio (Otoño)" },
    bestMoon: { pt: "Nova / Minguante (desenvolvimento do bulbo)", en: "New / Waning (bulb development)", es: "Nueva / Menguante (desarrollo del bulbo)" },
    months: [3, 4, 5],
    notes: { pt: "A cebola e o alho se desenvolvem bem nas temperaturas amenas de outono.", en: "Onions and garlic develop well in mild autumn temperatures.", es: "La cebolla y el ajo se desarrollan bien en las temperaturas suaves de otoño." }
  },
  {
    id: "milho",
    name: { pt: "Milho", en: "Corn", es: "Maíz" },
    type: "cereal",
    typeLabel: { pt: "Cereal", en: "Cereal", es: "Cereal" },
    icon: "wheat",
    bestSeason: { pt: "Setembro a Dezembro (Primavera)", en: "September to December (Spring)", es: "Septiembre a Diciembre (Primavera)" },
    bestMoon: { pt: "Crescente (crescimento rápido acima do solo)", en: "Waxing (fast growth above ground)", es: "Creciente (rápido crecimiento sobre el suelo)" },
    months: [8, 9, 10, 11],
    notes: { pt: "Exige bastante calor e irrigação durante a floração.", en: "Requires substantial heat and irrigation during flowering.", es: "Requiere bastante calor e irrigación durante la floración." }
  },
  {
    id: "feijao",
    name: { pt: "Feijão", en: "Beans", es: "Frijol" },
    type: "legume",
    typeLabel: { pt: "Leguminosa", en: "Legume", es: "Leguminosa" },
    icon: "sprout",
    bestSeason: { pt: "Setembro a Novembro (Safra da Primavera)", en: "September to November (Spring Crop)", es: "Septiembre a Noviembre (Cosecha de Primavera)" },
    bestMoon: { pt: "Crescente (estimula vagem e grãos)", en: "Waxing (stimulates pod and grain growth)", es: "Creciente (estimula vainas y granos)" },
    months: [8, 9, 10],
    notes: { pt: "Muito sensível a geadas tardias da primavera.", en: "Very sensitive to late spring frosts.", es: "Muy sensible a las heladas tardías de la primavera." }
  },
  {
    id: "cafe",
    name: { pt: "Café", en: "Coffee", es: "Café" },
    type: "other",
    typeLabel: { pt: "Outros", en: "Others", es: "Otros" },
    icon: "sprout",
    bestSeason: { pt: "Setembro a Novembro (Primavera)", en: "September to November (Spring)", es: "Septiembre a Noviembre (Primavera)" },
    bestMoon: { pt: "Crescente (estimula crescimento das mudas)", en: "Waxing (stimulates seedling growth)", es: "Creciente (estimula el crecimiento de las plántulas)" },
    months: [8, 9, 10],
    notes: { pt: "Sensível a geadas severas. No Sul, o cultivo comercial se restringe ao norte do Paraná. Exige proteção.", en: "Sensitive to severe frosts. In the South, commercial cultivation is restricted to northern Paraná. Requires protection.", es: "Sensible a las heladas severas. En el Sur, el cultivo comercial se restringe al norte del Paraná. Requiere protección." }
  },
  {
    id: "acai",
    name: { pt: "Açaí", en: "Açaí Berry", es: "Açaí" },
    type: "fruit",
    typeLabel: { pt: "Frutífera", en: "Fruit", es: "Frutífera" },
    icon: "cherry",
    bestSeason: { pt: "Outubro a Janeiro (Primavera/Verão)", en: "October to January (Spring/Summer)", es: "Octubre a Enero (Primavera/Verano)" },
    bestMoon: { pt: "Crescente / Cheia (desenvolvimento foliar/fruto)", en: "Waxing / Full (leaf/fruit development)", es: "Creciente / Llena (desarrollo foliar/fruto)" },
    months: [9, 10, 11, 0],
    notes: { pt: "Palmeira tropical nativa da Amazônia. Extremamente sensível ao frio e geadas do Sul; requer estufas.", en: "Tropical palm native to the Amazon. Extremely sensitive to Southern cold and frost; requires greenhouses.", es: "Palmera tropical nativa de la Amazonía. Extremadamente sensible al frío y heladas del Sur; requiere invernaderos." }
  }
];

let activeAgroCategory = "all";
let activeAgroMonth = "all";

// --- Função para Calcular Fase da Lua com Dicas de Cultivo ---
function getMoonPhaseInfo(date) {
  // Cálculo simplificado da idade da lua
  // Lua Nova de referência: 2000-01-06 18:14:00
  const referenceDate = new Date("2000-01-06T18:14:00");
  const diff = date.getTime() - referenceDate.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  const cycle = 29.530588853;
  const phase = (days % cycle) / cycle;

  // Retorna nome, ícone e descrição no idioma ativo
  if (phase < 0.03 || phase > 0.97) {
    return {
      name: appLang === 'en' ? "New Moon" : (appLang === 'es' ? "Luna Nueva" : "Lua Nova"),
      icon: "moon",
      desc: appLang === 'en' ? "Excellent for planting root vegetables, tubers, and bulbs (garlic, onion)." : (appLang === 'es' ? "Excelente para plantar raíces, tubérculos y bulbos (ajo, cebolla)." : "Excelente para plantio de raízes, tubérculos e bulbos (alho, cebola).")
    };
  } else if (phase < 0.22) {
    return {
      name: appLang === 'en' ? "Waxing Crescent" : (appLang === 'es' ? "Creciente" : "Lua Crescente"),
      icon: "moon-star",
      desc: appLang === 'en' ? "Great for leafy vegetables and greens that grow above ground (kale, lettuce)." : (appLang === 'es' ? "Excelente para hojas y hortalizas que crecen sobre el suelo (col, lechuga)." : "Ótima para folhosas e hortaliças que crescem acima do solo (couve, alface).")
    };
  } else if (phase < 0.28) {
    return {
      name: appLang === 'en' ? "First Quarter" : (appLang === 'es' ? "Cuarto Creciente" : "Quarto Crescente"),
      icon: "moon-star",
      desc: appLang === 'en' ? "Stimulates stem and leaf development." : (appLang === 'es' ? "Estimula el desarrollo de tallos y hojas." : "Estimula o desenvolvimento de caules e folhas.")
    };
  } else if (phase < 0.47) {
    return {
      name: appLang === 'en' ? "Waxing Gibbous" : (appLang === 'es' ? "Gibosa Creciente" : "Gibosa Crescente"),
      icon: "moon-star",
      desc: appLang === 'en' ? "Good sap circulation in plants." : (appLang === 'es' ? "Buena circulación de savia en las plantas." : "Boa circulação de seiva nas plantas.")
    };
  } else if (phase < 0.53) {
    return {
      name: appLang === 'en' ? "Full Moon" : (appLang === 'es' ? "Luna Llena" : "Lua Cheia"),
      icon: "sun",
      desc: appLang === 'en' ? "Ideal for harvesting fruits and planting flowers and fruit trees." : (appLang === 'es' ? "Ideal para cosechar frutos y plantar flores y frutales." : "Ideal para colheita de frutos e plantio de flores e frutíferas.")
    };
  } else if (phase < 0.72) {
    return {
      name: appLang === 'en' ? "Waning Gibbous" : (appLang === 'es' ? "Gibosa Menguante" : "Gibosa Minguante"),
      icon: "moon",
      desc: appLang === 'en' ? "Good time for pruning and pest control." : (appLang === 'es' ? "Buen momento para podas y control de plagas." : "Boa época para podas e controle de pragas.")
    };
  } else if (phase < 0.78) {
    return {
      name: appLang === 'en' ? "Last Quarter" : (appLang === 'es' ? "Cuarto Menguante" : "Quarto Minguante"),
      icon: "moon",
      desc: appLang === 'en' ? "Sap flows down to roots; good for underground fertilization." : (appLang === 'es' ? "La savia baja a las raíces; bueno para fertilización subterránea." : "A seiva desce para as raízes; bom para adubação subterrânea.")
    };
  } else {
    return {
      name: appLang === 'en' ? "Waning Crescent" : (appLang === 'es' ? "Menguante" : "Lua Minguante"),
      icon: "moon",
      desc: appLang === 'en' ? "Ideal for pruning, weeding, and eliminating weeds. Sap is in roots." : (appLang === 'es' ? "Ideal para podar, deshierbar y eliminar malas hierbas. La savia está en las raíces." : "Ideal para podar, capinar e eliminar ervas daninhas. A seiva está nas raízes.")
    };
  }
}

// --- Renderizar Calendário Agrícola ---
function renderAgriculturalCalendar() {
  const grid = document.getElementById("crops-grid");
  if (!grid) return;

  // 1. Atualizar Fase da Lua Hoje
  const moonInfo = getMoonPhaseInfo(new Date());
  const moonIconEl = document.getElementById("moon-icon");
  const moonNameEl = document.getElementById("moon-name");
  const moonDescEl = document.getElementById("moon-desc");

  if (moonIconEl) {
    moonIconEl.setAttribute("data-lucide", moonInfo.icon);
  }
  if (moonNameEl) moonNameEl.textContent = moonInfo.name;
  if (moonDescEl) moonDescEl.textContent = moonInfo.desc;

  // 2. Filtrar dados de culturas
  const agroSearchEl = document.getElementById("agro-search-input");
  const searchQuery = agroSearchEl ? agroSearchEl.value.toLowerCase().trim() : "";

  const filteredCrops = CROPS_DATA.filter(crop => {
    const matchesCategory = activeAgroCategory === "all" || crop.type === activeAgroCategory;
    
    let matchesMonth = true;
    if (activeAgroMonth !== "all") {
      const monthNum = parseInt(activeAgroMonth, 10);
      matchesMonth = crop.months.includes(monthNum);
    }

    let matchesSearch = true;
    if (searchQuery) {
      const namePt = (crop.name.pt || "").toLowerCase();
      const nameEn = (crop.name.en || "").toLowerCase();
      const nameEs = (crop.name.es || "").toLowerCase();
      const notesPt = (crop.notes.pt || "").toLowerCase();
      const notesEn = (crop.notes.en || "").toLowerCase();
      const notesEs = (crop.notes.es || "").toLowerCase();
      const typeLabelPt = (crop.typeLabel.pt || "").toLowerCase();
      const typeLabelEn = (crop.typeLabel.en || "").toLowerCase();
      const typeLabelEs = (crop.typeLabel.es || "").toLowerCase();

      matchesSearch = namePt.includes(searchQuery) || 
                      nameEn.includes(searchQuery) || 
                      nameEs.includes(searchQuery) || 
                      notesPt.includes(searchQuery) || 
                      notesEn.includes(searchQuery) || 
                      notesEs.includes(searchQuery) || 
                      typeLabelPt.includes(searchQuery) || 
                      typeLabelEn.includes(searchQuery) || 
                      typeLabelEs.includes(searchQuery);
    }

    return matchesCategory && matchesMonth && matchesSearch;
  });

  // 3. Renderizar cartões
  grid.innerHTML = "";
  
  if (filteredCrops.length === 0) {
    const noCropsMsg = appLang === 'en' ? "No crops found for the selected filters." : (appLang === 'es' ? "No se encontraron cultivos para los filtros seleccionados." : "Nenhuma cultura encontrada para os filtros selecionados.");
    grid.innerHTML = `<div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 32px; color: var(--text-muted); font-size: 14px;">${noCropsMsg}</div>`;
    return;
  }

  const lblMoon = appLang === 'en' ? "Ideal Moon:" : (appLang === 'es' ? "Luna Ideal:" : "Lua Ideal:");
  const lblSeason = appLang === 'en' ? "Best Season:" : (appLang === 'es' ? "Melhor Época:" : "Melhor Época:");

  filteredCrops.forEach(crop => {
    const card = document.createElement("div");
    card.className = "crop-card";

    card.innerHTML = `
      <div class="crop-card-header">
        <div class="crop-title-row">
          <div class="crop-icon-wrapper">
            <i data-lucide="${crop.icon}"></i>
          </div>
          <span class="crop-name">${crop.name[appLang] || crop.name.pt}</span>
        </div>
        <span class="crop-badge ${crop.type}">${crop.typeLabel[appLang] || crop.typeLabel.pt}</span>
      </div>
      
      <div class="crop-details">
        <div class="crop-detail-row">
          <i data-lucide="moon" class="icon-moon"></i>
          <div>
            <span class="crop-detail-label">${lblMoon} </span>
            <span class="crop-detail-value">${crop.bestMoon[appLang] || crop.bestMoon.pt}</span>
          </div>
        </div>
        
        <div class="crop-detail-row">
          <i data-lucide="calendar" class="icon-calendar"></i>
          <div>
            <span class="crop-detail-label">${lblSeason} </span>
            <span class="crop-detail-value">${crop.bestSeason[appLang] || crop.bestSeason.pt}</span>
          </div>
        </div>
        
        <div class="crop-notes">
          ${crop.notes[appLang] || crop.notes.pt}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Re-inicializar ícones Lucide
  if (window.lucide) {
    lucide.createIcons();
  }
}
