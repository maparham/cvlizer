import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { User, LoginRequest, RegisterRequest } from "../types";
import api, { normalizeApiError } from "../services/api";
import { decodeJWT } from "../utils/jwt";
import { TokenManager } from "./utils";

interface AuthState {
  // State
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  verifyToken: () => Promise<void>;
  refreshToken: () => Promise<boolean>;

  // Internal actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// decodeJWT moved to utils/jwt for reuse

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,

        // Actions
        login: async (credentials: LoginRequest) => {
          set({ loading: true, error: null });

          try {
            const response = await api.post("/auth/login", credentials);
            const { access_token, refresh_token } = response.data as {
              access_token?: string;
              refresh_token?: string;
            };
            if (!access_token || !refresh_token) {
              throw new Error("Invalid token response");
            }

            // Store tokens
            TokenManager.setTokens(access_token, refresh_token);

            // Decode user from token
            const payload = decodeJWT(access_token);
            if (payload && payload.sub && payload.email) {
              const user: User = {
                id: payload.sub as string,
                email: payload.email as string,
                is_active: true,
                email_verified: true,
                created_at: payload.created_at || new Date().toISOString(),
                updated_at: payload.updated_at || new Date().toISOString(),
              };

              set({
                user,
                loading: false,
                isAuthenticated: true,
                error: null,
              });
            }
          } catch (error: any) {
            const errorMessage = normalizeApiError(error) || "Login failed";
            set({
              error: errorMessage,
              loading: false,
              user: null,
              isAuthenticated: false,
            });
            throw new Error(errorMessage);
          }
        },

        register: async (credentials: RegisterRequest) => {
          set({ loading: true, error: null });

          try {
            const response = await api.post("/auth/register", credentials);
            const { access_token, refresh_token } = response.data as {
              access_token?: string;
              refresh_token?: string;
            };
            if (!access_token || !refresh_token) {
              throw new Error("Invalid token response");
            }

            // Store tokens
            TokenManager.setTokens(access_token, refresh_token);

            // Decode user from token
            const payload = decodeJWT(access_token);
            if (payload && payload.sub && payload.email) {
              const user: User = {
                id: payload.sub as string,
                email: payload.email as string,
                is_active: true,
                email_verified: false, // New registrations typically need verification
                created_at: payload.created_at || new Date().toISOString(),
                updated_at: payload.updated_at || new Date().toISOString(),
              };

              set({
                user,
                loading: false,
                isAuthenticated: true,
                error: null,
              });
            }
          } catch (error: any) {
            const errorMessage =
              normalizeApiError(error) || "Registration failed";
            set({
              error: errorMessage,
              loading: false,
              user: null,
              isAuthenticated: false,
            });
            throw new Error(errorMessage);
          }
        },

        logout: () => {
          // Clear tokens
          TokenManager.clearTokens();

          // Clear state
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        },

        clearError: () => {
          set({ error: null });
        },

        verifyToken: async () => {
          const token = TokenManager.getAccessToken();
          if (!token) {
            set({ user: null, isAuthenticated: false, loading: false });
            return;
          }

          set({ loading: true });

          try {
            // Verify token by making a simple authenticated request
            const response = await api.get("/auth/me");
            const user: User = response.data;

            set({
              user,
              isAuthenticated: true,
              loading: false,
              error: null,
            });
          } catch (error) {
            // Token is invalid, remove it and log out
            get().logout();
            set({ loading: false });
          }
        },

        refreshToken: async (): Promise<boolean> => {
          const refreshToken = TokenManager.getRefreshToken();
          if (!refreshToken) {
            get().logout();
            return false;
          }

          try {
            const response = await api.post("/auth/refresh", {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token: newRefreshToken } =
              response.data as {
                access_token?: string;
                refresh_token?: string;
              };
            if (!access_token || !newRefreshToken) {
              throw new Error("Invalid token response");
            }
            TokenManager.setTokens(access_token, newRefreshToken);

            // Update user data from new token if needed
            const payload = decodeJWT(access_token);
            if (payload && payload.email && get().user) {
              set({
                user: {
                  ...get().user!,
                  email: payload.email as string, // Update any changed fields
                },
              });
            }

            return true;
          } catch (error) {
            get().logout();
            return false;
          }
        },

        // Internal actions for manual state management
        setUser: (user: User | null) => {
          set({
            user,
            isAuthenticated: user !== null,
          });
        },

        setLoading: (loading: boolean) => {
          set({ loading });
        },

        setError: (error: string | null) => {
          set({ error });
        },
      }),
      {
        name: "auth-store",
        // Only persist user state, not loading/error states
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    {
      name: "auth-store",
    },
  ),
);
