import axiosInstance from "../axiosInstance";

export const etlApi = {
  /**
   * Triggers ETL pipeline execution in Spring Boot.
   * Backend: POST /api/etl/run
   * @param {Object} batchRequest - { runId, batchId, startTimestamp, endTimestamp }
   */
  async runEtl(batchRequest) {
    const response = await axiosInstance.post("/api/etl/run", batchRequest);
    return response.data;
  },
};

export default etlApi;
