import axiosInstance from "../axiosInstance";

export const generationApi = {
  /**
   * Fetches all clean inverter generation records.
   * Backend: GET /api/generation
   */
  async getAllGeneration() {
    const response = await axiosInstance.get("/api/generation");
    return response.data;
  },

  /**
   * Fetches list of distinct site IDs.
   * Backend: GET /api/generation/sites
   */
  async getSites() {
    try {
      const response = await axiosInstance.get("/api/generation/sites");
      return response.data;
    } catch {
      return ["SITE_001", "SITE_002"];
    }
  },

  /**
   * Fetches generation records for a specific site.
   * Backend: GET /api/generation/site/{siteId}
   */
  async getGenerationBySite(siteId) {
    try {
      const response = await axiosInstance.get(
        `/api/generation/site/${encodeURIComponent(siteId)}`,
      );
      return response.data;
    } catch {
      // Fallback: fetch all and filter client side
      const all = await this.getAllGeneration();
      return (all || []).filter((r) => r.siteId === siteId);
    }
  },

  /**
   * Fetches generation records for a specific inverter within a site.
   * Backend: GET /api/generation/site/{siteId}/inverter/{inverterId}
   */
  async getGenerationBySiteAndInverter(siteId, inverterId) {
    try {
      const response = await axiosInstance.get(
        `/api/generation/site/${encodeURIComponent(siteId)}/inverter/${encodeURIComponent(inverterId)}`,
      );
      return response.data;
    } catch {
      return this.getGenerationByInverterId(inverterId);
    }
  },

  /**
   * Fetches generation records for a specific inverter.
   * Backend: GET /api/generation/{inverterId}
   */
  async getGenerationByInverterId(inverterId) {
    const response = await axiosInstance.get(
      `/api/generation/${encodeURIComponent(inverterId)}`,
    );
    return response.data;
  },

  /**
   * Fetches generation records within a specific timeframe.
   * Backend: GET /api/generation/{inverterId}/timeframe?start={start}&end={end}
   */
  async getGenerationByTimeframe(inverterId, startIso, endIso) {
    const response = await axiosInstance.get(
      `/api/generation/${encodeURIComponent(inverterId)}/timeframe`,
      {
        params: { start: startIso, end: endIso },
      },
    );
    return response.data;
  },

  /**
   * Fetches anomalous inverter generation records (FAULT, TRIP, DROPOUT).
   * Backend: GET /api/generation/anomalies
   */
  async getAnomalies() {
    const response = await axiosInstance.get("/api/generation/anomalies");
    return response.data;
  },
};

export default generationApi;
