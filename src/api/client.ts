import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Single-flight token refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to attach token
apiClient.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with silent token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If there's no response or status is not 401, reject immediately
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint = 
      requestUrl.includes('/api/v1/auth/staff/login') ||
      requestUrl.includes('/api/v1/auth/staff/pin-login') ||
      requestUrl.includes('/api/v1/auth/staff/refresh');

    // If the 401 comes from login/refresh itself or has already been retried, log out
    if (isAuthEndpoint || originalRequest._retry) {
      const { logout } = useAuthStore.getState();
      logout();
      return Promise.reject(error);
    }

    const { refreshToken, setTokens, logout } = useAuthStore.getState();

    // If no refresh token is stored, we cannot refresh — log out
    if (!refreshToken) {
      logout();
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request until the new token arrives
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Use clean axios instance to avoid circular interceptor triggers
      const refreshResponse = await axios.post(
        `${apiClient.defaults.baseURL}/api/v1/auth/staff/refresh`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { access_token, refresh_token: new_refresh_token } = refreshResponse.data;

      if (!access_token) {
        throw new Error('No access token returned from refresh endpoint');
      }

      // Update Zustand store (persists to localStorage)
      setTokens(access_token, new_refresh_token || refreshToken);

      // Replay all queued requests with the new access token
      processQueue(null, access_token);

      // Replay the original failed request
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
      }
      return apiClient(originalRequest);

    } catch (refreshError) {
      // If refresh failed (token expired / revoked), reject queue and log out
      processQueue(refreshError, null);
      logout();
      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;

