import { ApiError, apiService, setAuthToken } from './api';
import { tokenManagerService, TokenValidationCallbacks } from './token-manager.service';
import { DecodedToken, TokenPair, tokenService } from './token.service';
import { userService } from './user.service';

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
   * Check if user is authenticated using backend validation
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      return await this.validateTokenWithBackend();
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
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

      console.log('Attempting token refresh:', {
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken ? refreshToken.length : 0
      });

      if (!refreshToken || refreshToken.trim() === '') {
        console.error('No refresh token available for token refresh');
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

      console.log('Token refresh successful');
      return newToken;
    } catch (error) {
      // If refresh fails, clear tokens and throw
      console.error('Token refresh failed:', error);
      await this.logout();
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Validate current token and refresh if needed
   * Uses backend validation by calling /api/v1/users/me endpoint
   * No longer uses local expiration checks
   */
  async validateToken(): Promise<boolean> {
    try {
      // Always validate with backend first
      const isValid = await this.validateTokenWithBackend();
      
      if (isValid) {
        return true;
      }
      
      // If backend validation fails, try to refresh token
      try {
        await this.refreshToken();
        // After refresh, validate with backend again
        return await this.validateTokenWithBackend();
      } catch (refreshError) {
        // Refresh failed, user needs to login again
        await this.logout();
        return false;
      }
    } catch (error) {
      console.error('Error validating token:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Validate token with backend by calling /api/v1/users/me
   * This ensures the token is actually valid on the server side
   */
  private async validateTokenWithBackend(): Promise<boolean> {
    try {
      // Call the /api/v1/users/me endpoint which requires valid authentication
      await userService.getCurrentUser();
      return true;
    } catch (error) {
      // If backend returns 401, token is invalid
      if (error instanceof ApiError && error.status === 401) {
        console.log('Backend token validation failed: Token is invalid (401)');
        return false;
      }
      
      // Log other errors but don't consider them authentication failures
      console.warn('Backend validation failed with non-401 error:', error);
      
      // For other errors (network issues, server errors), we might want to be more lenient
      // and allow the token to be considered valid temporarily
      // This prevents logging out users due to temporary network issues
      return true;
    }
  }

  /**
   * Get access token, refreshing if necessary
   * No longer uses local expiration checks - relies on backend validation
   */
  async getAccessToken(): Promise<string | null> {
    // Always try to get the current access token
    // Token refresh will be handled by validateToken when needed
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

    // Validate required fields
    if (!token.access_token) {
      throw new Error('Access token is required');
    }

    // Only store refresh token if it's actually provided
    const refreshToken = token.refresh_token && token.refresh_token.trim() !== ''
      ? token.refresh_token
      : null;

    console.log('Storing tokens:', {
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!refreshToken,
      expiresIn,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    });

    // Create token pair for secure storage
    const tokenPair: TokenPair = {
      accessToken: token.access_token,
      refreshToken: refreshToken || '',
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