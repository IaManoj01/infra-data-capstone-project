import axiosInstance from "../axiosInstance";

export const weatherApi = {
  /**
   * Fetches all clean weather observations.
   * Backend: GET /api/weather
   */
  async getAllWeather() {
    const response = await axiosInstance.get("/api/weather");
    return response.data;
  },

  /**
   * Fetches weather sites.
   * Backend: GET /api/weather/sites
   */
  async getWeatherSites() {
    try {
      const response = await axiosInstance.get("/api/weather/sites");
      return response.data;
    } catch {
      return ["SITE_001", "SITE_002"];
    }
  },

  /**
   * Fetches weather observations for a specific site.
   * Backend: GET /api/weather/site/{siteId}
   */
  async getWeatherBySite(siteId) {
    try {
      const response = await axiosInstance.get(
        `/api/weather/site/${encodeURIComponent(siteId)}`,
      );
      return response.data;
    } catch {
      const all = await this.getAllWeather();
      return (all || []).filter((w) => w.siteId === siteId);
    }
  },

  /**
   * Fetches weather observations within a timeframe.
   * Backend: GET /api/weather/timeframe?start={start}&end={end}
   */
  async getWeatherByTimeframe(startIso, endIso) {
    const response = await axiosInstance.get("/api/weather/timeframe", {
      params: { start: startIso, end: endIso },
    });
    return response.data;
  },
};

export default weatherApi;
