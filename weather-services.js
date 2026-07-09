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
  0: { text: "Céu Limpo", icon: "sun" },
  1: { text: "Principalmente Limpo", icon: "cloud-sun" },
  2: { text: "Parcialmente Nublado", icon: "cloud-sun" },
  3: { text: "Encoberto", icon: "cloud" },
  45: { text: "Neblina", icon: "cloud-drizzle" },
  48: { text: "Neblina Congelante", icon: "cloud-drizzle" },
  51: { text: "Garoa Leve", icon: "cloud-drizzle" },
  53: { text: "Garoa Moderada", icon: "cloud-drizzle" },
  55: { text: "Garoa Densa", icon: "cloud-drizzle" },
  56: { text: "Garoa Congelante Leve", icon: "snowflake" },
  57: { text: "Garoa Congelante Densa", icon: "snowflake" },
  61: { text: "Chuva Fraca", icon: "cloud-rain" },
  63: { text: "Chuva Moderada", icon: "cloud-rain" },
  65: { text: "Chuva Forte", icon: "cloud-rain" },
  66: { text: "Chuva Congelante Leve", icon: "snowflake" },
  67: { text: "Chuva Congelante Forte", icon: "snowflake" },
  71: { text: "Neve Fraca", icon: "snowflake" },
  73: { text: "Neve Moderada", icon: "snowflake" },
  75: { text: "Neve Forte", icon: "snowflake" },
  77: { text: "Grãos de Neve", icon: "snowflake" },
  80: { text: "Pancadas de Chuva Fraca", icon: "cloud-rain" },
  81: { text: "Pancadas de Chuva Moderada", icon: "cloud-rain" },
  82: { text: "Pancadas de Chuva Violenta", icon: "cloud-lightning" },
  85: { text: "Pancadas de Neve Fraca", icon: "snowflake" },
  86: { text: "Pancadas de Neve Forte", icon: "snowflake" },
  95: { text: "Trovoada", icon: "cloud-lightning" },
  96: { text: "Trovoada com Granizo Leve", icon: "cloud-lightning" },
  99: { text: "Trovoada com Granizo Forte", icon: "cloud-lightning" }
};

/**
 * Traduz o código WMO em texto descritivo e ícone.
 */
function translateWMO(code) {
  return WMO_CODES[code] || { text: "Desconhecido", icon: "cloud" };
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
          current: {
            temp: Math.round(currentData.temperature_2m),
            feelsLike: Math.round(currentData.apparent_temperature),
            humidity: currentData.relative_humidity_2m,
            windSpeed: currentData.wind_speed_10m,
            pressure: Math.round(currentData.pressure_msl),
            conditionCode: currentData.weather_code,
            conditionText: translateWMO(currentData.weather_code).text
          },
          daily: dailyTimes.map((date, index) => ({
            date: date,
            maxTemp: Math.round(dailyMaxTemps[index]),
            minTemp: Math.round(dailyMinTemps[index]),
            conditionCode: dailyCodes[index],
            rainProb: dailyRainMax[index] !== undefined ? dailyRainMax[index] : 0
          })),
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
  },

  /**
   * Busca previsão do tempo no OpenWeatherMap caso o usuário possua uma chave.
   * 
   * @param {number} lat Latitude
   * @param {number} lon Longitude
   * @param {string} apiKey Chave de API do usuário
   * @returns {Promise<Object>} Dados meteorológicos formatados
   */
  async fetchOpenWeatherMap(lat, lon, apiKey) {
    if (!apiKey) return null;

    // URL para previsão de 5 dias/3 horas (Grátis sem cadastro de cartão)
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Chave de API inválida ou limite excedido no OpenWeatherMap.");
      const data = await response.json();

      // O OpenWeatherMap retorna uma lista de previsões de 3 em 3 horas.
      // O primeiro item representa o clima mais próximo do atual.
      const currentRaw = data.list[0];
      
      // Agrupar previsões por dia para obter máximas/mínimas
      const dailyMap = {};
      const hourlyList = [];

      data.list.forEach(item => {
        // Pegar apenas a data YYYY-MM-DD
        const dateStr = item.dt_txt.split(" ")[0];
        
        // Mapear previsão horária para nossa estrutura
        // Nota: O OpenWeatherMap usa seus próprios IDs de condição. Mapearemos de forma simples para WMO
        const owmId = item.weather[0].id;
        const wmoCode = mapOWMCodeToWMO(owmId);

        hourlyList.push({
          time: item.dt_txt.replace(" ", "T").substring(0, 16),
          temp: Math.round(item.main.temp),
          rainProb: Math.round((item.pop || 0) * 100), // pop é probabilidade de 0 a 1
          conditionCode: wmoCode
        });

        // Agrupar máximas e mínimas para o dia
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = {
            temps: [],
            rainProbs: [],
            codes: []
          };
        }
        dailyMap[dateStr].temps.push(item.main.temp);
        dailyMap[dateStr].rainProbs.push(item.pop || 0);
        dailyMap[dateStr].codes.push(wmoCode);
      });

      // Construindo a previsão diária baseada nos agrupamentos de 3 horas
      const dailyList = Object.keys(dailyMap).map(date => {
        const dayData = dailyMap[date];
        const maxTemp = Math.max(...dayData.temps);
        const minTemp = Math.min(...dayData.temps);
        const maxRainProb = Math.max(...dayData.rainProbs) * 100;
        
        // Usar o código meteorológico mais frequente no dia
        const mostFrequentCode = dayData.codes.reduce((a, b, i, arr) => 
          (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b), 
          dayData.codes[0]
        );

        return {
          date: date,
          maxTemp: Math.round(maxTemp),
          minTemp: Math.round(minTemp),
          conditionCode: mostFrequentCode,
          rainProb: Math.round(maxRainProb)
        };
      });

      return {
        provider: "OpenWeatherMap",
        current: {
          temp: Math.round(currentRaw.main.temp),
          feelsLike: Math.round(currentRaw.main.feels_like),
          humidity: currentRaw.main.humidity,
          windSpeed: Math.round(currentRaw.wind.speed * 3.6), // m/s para km/h
          pressure: currentRaw.main.pressure,
          conditionCode: mapOWMCodeToWMO(currentRaw.weather[0].id),
          conditionText: capitalize(currentRaw.weather[0].description)
        },
        daily: dailyList.slice(0, 5), // O API grátis cobre 5 dias
        hourly: hourlyList
      };
    } catch (error) {
      console.error("Erro no OpenWeatherMap:", error);
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

/**
 * Mapeia códigos de clima do OpenWeatherMap (2xx-8xx) para os códigos WMO correspondentes.
 */
function mapOWMCodeToWMO(owmId) {
  if (owmId >= 200 && owmId < 300) return 95; // Tempestades
  if (owmId >= 300 && owmId < 400) return 51; // Garoa
  if (owmId >= 500 && owmId < 600) {
    if (owmId === 500 || owmId === 501) return 61; // Chuva leve/mod
    return 65; // Chuva forte
  }
  if (owmId >= 600 && owmId < 700) return 73; // Neve
  if (owmId === 701 || owmId === 741) return 45; // Neblina
  if (owmId === 800) return 0; // Céu limpo
  if (owmId === 801) return 1; // Poucas nuvens
  if (owmId === 802) return 2; // Parcialmente nublado
  if (owmId === 803 || owmId === 804) return 3; // Encoberto
  return 3; // Padrão nublado
}
