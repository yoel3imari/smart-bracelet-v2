import { apiService, setAuthToken, ApiError, NetworkError, ValidationError } from './api';

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  grant_type?: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
}

export class AuthService {
  private token: Token | null = null;
  private tokenRefreshTimeout: NodeJS.Timeout | null = null;

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

      this.setToken(token);
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
  logout(): void {
    this.token = null;
    setAuthToken(null);
    
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
      this.tokenRefreshTimeout = null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.token.access_token;
  }

  /**
   * Get current token
   */
  getToken(): Token | null {
    return this.token;
  }

  /**
   * Set token and update API service
   */
  private setToken(token: Token): void {
    this.token = token;
    setAuthToken(token.access_token);
  }

  /**
   * Refresh token (placeholder - implement based on your backend)
   */
  async refreshToken(): Promise<Token> {
    // This is a placeholder implementation
    // In a real app, you would call a refresh token endpoint
    throw new ApiError('Token refresh not implemented', 501, 'NOT_IMPLEMENTED');
  }

  /**
   * Schedule token refresh (placeholder)
   */
  private scheduleTokenRefresh(): void {
    // This is a placeholder implementation
    // In a real app, you would schedule token refresh before expiration
    if (this.tokenRefreshTimeout) {
      clearTimeout(this.tokenRefreshTimeout);
    }
    
    // For now, we'll just clear any existing timeout
    this.tokenRefreshTimeout = null;
  }

  /**
   * Validate current token (placeholder)
   */
  async validateToken(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    // In a real app, you might call a validate endpoint
    // For now, we'll assume the token is valid if we have one
    return true;
  }
}

// Singleton instance
export const authService = new AuthService();