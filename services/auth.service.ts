import { ApiError, apiService, setAuthToken } from './api';
import { tokenManagerService, TokenValidationCallbacks } from './token-manager.service';
import { DecodedToken, TokenPair, tokenService } from './token.service';

export interface Token {
  access_token: string;
  token_type: string;
  expires_in?: number; // Token lifetime in seconds
  refresh_token?: string; // Refresh token for obtaining new access tokens
}

export interface LoginCredentials {
  username: string;
  password: string;
  grant_type?: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
  grant_type?: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
}

export class AuthService {
  private tokenRefreshTimeout: number | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<Token> | null = null;

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<Token> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);
      
      if (credentials.grant_type) {
        formData.append('grant_type', credentials.grant_type);
      }
      if (credentials.scope) {
        formData.append('scope', credentials.scope);
      }
      if (credentials.client_id) {
        formData.append('client_id', credentials.client_id);
      }
      if (credentials.client_secret) {
        formData.append('client_secret', credentials.client_secret);
      }

      const token = await apiService.post<Token>('/api/v1/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      await this.setToken(token);
      this.scheduleTokenRefresh();
      
      return token;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError('Invalid username or password', 401, 'INVALID_CREDENTIALS');
      }
      throw error;
    }
  }

  /**
   * Logout and clear stored tokens
   */
  async logout(): Promise<void> {
    // Clear stored tokens
    await tokenService.clearTokens();
    
    // Clear API service token
    setAuthToken(null);
    
    // Clear any scheduled refresh
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }

    // Reset refresh state
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await tokenService.isAuthenticated();
  }

  /**
   * Get current user info from token
   */
  async getUserInfo(): Promise<DecodedToken | null> {
    return await tokenService.getUserInfo();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<Token> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    
    try {
      const refreshToken = await tokenService.getRefreshToken();
      if (!refreshToken) {
        throw new ApiError('No refresh token available', 401, 'NO_REFRESH_TOKEN');
      }

      const refreshRequest: RefreshTokenRequest = {
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      };

      this.refreshPromise = apiService.post<Token>('/api/v1/token/refresh', refreshRequest);

      const newToken = await this.refreshPromise;
      await this.setToken(newToken);
      this.scheduleTokenRefresh();

      return newToken;
    } catch (error) {
      // If refresh fails, clear tokens and throw
      await this.logout();
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Validate current token and refresh if needed
   */
  async validateToken(): Promise<boolean> {
    try {
      const isExpired = await tokenService.isTokenExpired();
      
      if (isExpired) {
        // Token is expired, try to refresh
        try {
          await this.refreshToken();
          return true;
        } catch (refreshError) {
          // Refresh failed, user needs to login again
          await this.logout();
          return false;
        }
      }

      // Token is valid
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Get access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string | null> {
    // Check if token is expired or expiring soon
    const isExpiringSoon = await tokenService.isTokenExpiringSoon();
    
    if (isExpiringSoon) {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
      }
    }

    return await tokenService.getAccessToken();
  }

  /**
   * Set token and store securely
   */
  private async setToken(token: Token): Promise<void> {
    // Calculate expiration time (default to 1 hour if not provided)
    const expiresIn = token.expires_in || 3600; // 1 hour default
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + expiresIn;

    // Create token pair for secure storage
    const tokenPair: TokenPair = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token || '',
      expiresAt,
      issuedAt,
    };

    // Store tokens securely
    await tokenService.storeTokens(tokenPair);

    // Update API service with new token
    setAuthToken(token.access_token);
  }

  /**
   * Schedule token refresh before expiration
   */
  private async scheduleTokenRefresh(): Promise<void> {
    // Clear any existing timeout
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }

    const expiry = await tokenService.getTokenExpiry();
    if (!expiry) return;

    // Calculate when to refresh (5 minutes before expiration)
    const currentTime = Math.floor(Date.now() / 1000);
    const refreshTime = expiry - 300; // 5 minutes before expiry
    const timeUntilRefresh = Math.max(0, (refreshTime - currentTime) * 1000);

    // Schedule refresh
    if (timeUntilRefresh > 0) {
      this.tokenRefreshTimeout = setTimeout(async () => {
        try {
          await this.refreshToken();
        } catch (error) {
          console.error('Scheduled token refresh failed:', error);
          // Don't logout here, let the next API request handle it
        }
      }, timeUntilRefresh);
    }
  }

  /**
   * Initialize authentication state on app start
   */
  async initialize(): Promise<boolean> {
    try {
      const isAuthenticated = await this.isAuthenticated();
      
      if (isAuthenticated) {
        // Set token in API service
        const accessToken = await tokenService.getAccessToken();
        if (accessToken) {
          setAuthToken(accessToken);
          this.scheduleTokenRefresh();
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error initializing authentication:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Check if token refresh is in progress
   */
  isRefreshingToken(): boolean {
    return this.isRefreshing;
  }
}

// Singleton instance
export const authService = new AuthService();

// Register token validation callbacks with the token manager
const callbacks: TokenValidationCallbacks = {
  validateToken: () => authService.validateToken(),
  refreshToken: () => authService.refreshToken(),
  logout: () => authService.logout(),
  getAccessToken: () => authService.getAccessToken(),
};

tokenManagerService.registerCallbacks(callbacks);