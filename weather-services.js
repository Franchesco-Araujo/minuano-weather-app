/**
 * weather-services.js
 * 
 * Este arquivo gerencia todas as integrações com as APIs meteorológicas.
 * Ele fornece métodos para:
 * 1. Buscar cidades (Geocodificação) usando Open-Meteo (keyless).
 * 2. Buscar previsão detalhada do Open-Meteo para múltiplos modelos (ECMWF, GFS, ICON, etc.).
 * 3. Buscar previsão do OpenWeatherMap caso o usuário forneça sua própria chave de API.
 * 
 * Estrutura de Retorno Unificada:
 * Todas as requisições de clima retornam um objeto com a seguinte estrutura para facilitar o uso na interface:
 * {
 *   provider: string, (Nome do modelo/provedor, ex: "ECMWF (Europa)")
 *   current: {
 *     temp: number, (°C)
 *     feelsLike: number, (°C)
 *     humidity: number, (%)
 *     windSpeed: number, (km/h)
 *     pressure: number, (hPa)
 *     conditionCode: number, (Código WMO)
 *     conditionText: string (Texto descritivo em português)
 *   },
 *   daily: [
 *     { date: string, maxTemp: number, minTemp: number, conditionCode: number, rainProb: number }
 *   ],
 *   hourly: [
 *     { time: string, temp: number, rainProb: number, conditionCode: number }
 *   ]
 * }
 */

// Mapeamento de Códigos de Clima da Organização Meteorológica Mundial (WMO)
const WMO_CODES = {
  0: { pt: "Céu Limpo", en: "Clear Sky", es: "Cielo Despejado", icon: "sun" },
  1: { pt: "Principalmente Limpo", en: "Mainly Clear", es: "Mayormente Despejado", icon: "cloud-sun" },
  2: { pt: "Parcialmente Nublado", en: "Partly Cloudy", es: "Parcialmente Nublado", icon: "cloud-sun" },
  3: { pt: "Encoberto", en: "Overcast", es: "Cubierto", icon: "cloud" },
  45: { pt: "Neblina", en: "Fog", es: "Niebla", icon: "cloud-drizzle" },
  48: { pt: "Neblina Congelante", en: "Ice Fog", es: "Niebla Helada", icon: "cloud-drizzle" },
  51: { pt: "Garoa Leve", en: "Light Drizzle", es: "Llovizna Ligera", icon: "cloud-drizzle" },
  53: { pt: "Garoa Moderada", en: "Moderate Drizzle", es: "Llovizna Moderada", icon: "cloud-drizzle" },
  55: { pt: "Garoa Densa", en: "Dense Drizzle", es: "Llovizna Densa", icon: "cloud-drizzle" },
  56: { pt: "Garoa Congelante Leve", en: "Light Freezing Drizzle", es: "Llovizna Helada Ligera", icon: "snowflake" },
  57: { pt: "Garoa Congelante Densa", en: "Dense Freezing Drizzle", es: "Llovizna Helada Densa", icon: "snowflake" },
  61: { pt: "Chuva Fraca", en: "Slight Rain", es: "Lluvia Ligera", icon: "cloud-rain" },
  63: { pt: "Chuva Moderada", en: "Moderate Rain", es: "Lluvia Moderada", icon: "cloud-rain" },
  65: { pt: "Chuva Forte", en: "Heavy Rain", es: "Lluvia Fuerte", icon: "cloud-rain" },
  66: { pt: "Chuva Congelante Leve", en: "Light Freezing Rain", es: "Lluvia Helada Ligera", icon: "snowflake" },
  67: { pt: "Chuva Congelante Forte", en: "Heavy Freezing Rain", es: "Lluvia Helada Fuerte", icon: "snowflake" },
  71: { pt: "Neve Fraca", en: "Slight Snow", es: "Nieve Ligera", icon: "snowflake" },
  73: { pt: "Neve Moderada", en: "Moderate Snow", es: "Nieve Moderada", icon: "snowflake" },
  75: { pt: "Neve Forte", en: "Heavy Snow", es: "Nieve Fuerte", icon: "snowflake" },
  77: { pt: "Grãos de Neve", en: "Snow Grains", es: "Granos de Nieve", icon: "snowflake" },
  80: { pt: "Pancadas de Chuva Fraca", en: "Slight Rain Showers", es: "Chubascos Ligeros", icon: "cloud-rain" },
  81: { pt: "Pancadas de Chuva Moderada", en: "Moderate Rain Showers", es: "Chubascos Moderados", icon: "cloud-rain" },
  82: { pt: "Pancadas de Chuva Violenta", en: "Violent Rain Showers", es: "Chubascos Violentos", icon: "cloud-lightning" },
  85: { pt: "Pancadas de Neve Fraca", en: "Slight Snow Showers", es: "Chubascos de Nieve Ligeros", icon: "snowflake" },
  86: { pt: "Pancadas de Neve Forte", en: "Heavy Snow Showers", es: "Chubascos de Nieve Fuertes", icon: "snowflake" },
  95: { pt: "Trovoada", en: "Thunderstorm", es: "Tormenta", icon: "cloud-lightning" },
  96: { pt: "Trovoada com Granizo Leve", en: "Thunderstorm with Slight Hail", es: "Tormenta con Granizo Ligero", icon: "cloud-lightning" },
  99: { pt: "Trovoada com Granizo Forte", en: "Thunderstorm with Heavy Hail", es: "Tormenta con Granizo Fuerte", icon: "cloud-lightning" }
};

/**
 * Traduz o código WMO em texto descritivo e ícone.
 */
function translateWMO(code) {
  const lang = window.appLang || "pt";
  const entry = WMO_CODES[code] || { pt: "Desconhecido", en: "Unknown", es: "Desconocido", icon: "cloud" };
  return {
    text: entry[lang] || entry.pt,
    icon: entry.icon
  };
}

const WeatherServices = {
  /**
   * Busca cidades por nome usando a API de geocodificação gratuita do Open-Meteo.
   * @param {string} query Nome da cidade
   * @returns {Promise<Array>} Lista de cidades encontradas
   */
  async searchCities(query) {
    if (!query || query.trim().length < 2) return [];
    
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=pt&format=json`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao buscar cidades.");
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("Erro na geocodificação:", error);
      return [];
    }
  },

  /**
   * Busca previsão do tempo em um único lote (batch) para múltiplos modelos usando Open-Meteo.
   * Isso economiza requisições e acelera o carregamento.
   * 
   * @param {number} lat Latitude
   * @param {number} lon Longitude
   * @returns {Promise<Object>} Um objeto indexado por modelo com dados padronizados
   */
  async fetchOpenMeteoMultiModel(lat, lon) {
    // Modelos que queremos requisitar
    const models = ["best_match", "ecmwf_ifs025", "gfs_seamless", "icon_seamless"];
    const modelsParam = models.join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,pressure_msl&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&models=${modelsParam}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao obter dados do Open-Meteo.");
      const data = await response.json();
      
      const results = {};

      models.forEach(model => {
        // No retorno do Open-Meteo, se requisitamos múltiplos modelos, as propriedades por hora
        // vêm com sufixo do modelo, exceto o principal (best_match) que vem com os nomes padrão
        // ou às vezes todas vêm com sufixos. Vamos mapear dinamicamente.
        
        const tempKey = `temperature_2m_${model}`;
        const rainKey = `precipitation_probability_${model}`;
        const codeKey = `weather_code_${model}`;
        const maxTempKey = `temperature_2m_max_${model}`;
        const minTempKey = `temperature_2m_min_${model}`;
        const maxRainKey = `precipitation_probability_max_${model}`;

        // Caso a API retorne os dados agrupados ou o modelo específico não tenha todos os campos
        // devido a limitações geográficas, fazemos um fallback para o best_match.
        const hourlyTemps = data.hourly[tempKey] || data.hourly["temperature_2m_best_match"];
        const hourlyRainProb = data.hourly[rainKey] || data.hourly["precipitation_probability_best_match"] || [];
        const hourlyCodes = data.hourly[codeKey] || data.hourly["weather_code_best_match"] || [];
        const hourlyTimes = data.hourly.time;

        const dailyMaxTemps = data.daily[maxTempKey] || data.daily["temperature_2m_max_best_match"] || [];
        const dailyMinTemps = data.daily[minTempKey] || data.daily["temperature_2m_min_best_match"] || [];
        const dailyCodes = data.daily[codeKey] || data.daily["weather_code_best_match"] || [];
        const dailyRainMax = data.daily[maxRainKey] || data.daily["precipitation_probability_max_best_match"] || [];
        const dailyTimes = data.daily.time;

        // Clima atual do modelo (ou fallback para o current_weather padrão)
        const currentData = data.current;

        // Identificação bonita do Provedor/Modelo
        let friendlyName = "Open-Meteo (Geral)";
        if (model === "ecmwf_ifs025") friendlyName = "ECMWF (Europeu)";
        if (model === "gfs_seamless") friendlyName = "GFS (Americano)";
        if (model === "icon_seamless") friendlyName = "ICON (Alemão)";

        // Construindo a resposta padronizada para este modelo
        results[model] = {
          provider: friendlyName,
          elevation: data.elevation,
          current: {
            temp: Math.round(currentData.temperature_2m),
            feelsLike: Math.round(currentData.apparent_temperature),
            humidity: currentData.relative_humidity_2m,
            windSpeed: currentData.wind_speed_10m,
            pressure: Math.round(currentData.pressure_msl),
            conditionCode: currentData.weather_code,
            conditionText: translateWMO(currentData.weather_code).text
          },
          daily: dailyTimes.map((date, index) => {
            const dayHoursIndices = [];
            hourlyTimes.forEach((time, i) => {
              if (time.startsWith(date)) dayHoursIndices.push(i);
            });
            
            let avgRainProb = 0;
            if (dayHoursIndices.length > 0) {
              let relevantIndices = dayHoursIndices;
              if (index === 0) {
                const currentHourIndex = hourlyTimes.findIndex(t => new Date(t) >= new Date());
                if (currentHourIndex !== -1) {
                  relevantIndices = dayHoursIndices.filter(i => i >= currentHourIndex);
                }
              }
              if (relevantIndices.length > 0) {
                const sum = relevantIndices.reduce((acc, i) => acc + (hourlyRainProb[i] || 0), 0);
                avgRainProb = Math.round(sum / relevantIndices.length);
              }
            }

            return {
              date: date,
              maxTemp: Math.round(dailyMaxTemps[index]),
              minTemp: Math.round(dailyMinTemps[index]),
              conditionCode: dailyCodes[index],
              rainProb: avgRainProb
            };
          }),
          hourly: hourlyTimes.map((time, index) => ({
            time: time,
            temp: Math.round(hourlyTemps[index]),
            rainProb: hourlyRainProb[index] !== undefined ? hourlyRainProb[index] : 0,
            conditionCode: hourlyCodes[index] !== undefined ? hourlyCodes[index] : 3
          }))
        };
      });

      return results;
    } catch (error) {
      console.error("Erro ao buscar previsões multimodelos:", error);
      throw error;
    }
  }
};

/**
 * Utilitário: Capitalizar primeira letra
 */
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
