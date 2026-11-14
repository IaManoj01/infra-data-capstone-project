import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const axiosInstance = axios.create({
  baseURL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Interceptor for centralized request logging and headers
axiosInstance.interceptors.request.use(
  (config) => {
    // You can attach auth tokens here if introduced in backend
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor for centralized error normalization
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    let customError = {
      status: error.response?.status || 0,
      message: "An unexpected network error occurred.",
      details: null,
      isNetworkError: !error.response,
    };

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          customError.message = data?.message || "Invalid request parameters.";
          customError.details = data;
          break;
        case 401:
          customError.message =
            "Authentication required to access this resource.";
          break;
        case 403:
          customError.message = "Access forbidden. You do not have permission.";
          break;
        case 404:
          customError.message =
            data?.message ||
            "The requested resource was not found on the backend.";
          break;
        case 500:
          customError.message =
            data?.message ||
            "Internal server error occurred in Spring Boot service.";
          break;
        default:
          customError.message =
            data?.message || `Backend returned HTTP ${status}`;
      }
    } else if (error.code === "ECONNABORTED") {
      customError.message =
        "Connection timed out. The solar farm backend took too long to respond.";
    } else if (error.message === "Network Error") {
      customError.message = `Cannot reach Solar Farm API at ${baseURL}. Check if Spring Boot service is running.`;
    }

    return Promise.reject(customError);
  },
);

export default axiosInstance;
