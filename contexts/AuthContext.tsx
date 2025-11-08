import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, userService, setAuthToken, LoginCredentials, User as ApiUser, UserVerifyEmail } from '@/services';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  emailVerified: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const STORAGE_KEY = '@auth_user';
const TOKEN_STORAGE_KEY = '@auth_token';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load stored user on app start
  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = useCallback(async () => {
    try {
      // For development: Auto-login with demo user
      const demoUser: User = {
        id: 'demo-user-id',
        email: 'demo@example.com',
        name: 'Demo User',
        createdAt: new Date(),
        emailVerified: true,
      };

      // Store demo user in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));

      setAuthState({
        user: demoUser,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log('Development mode: Auto-logged in as demo user');
    } catch (error) {
      console.error('Error loading stored user:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signUp = useCallback(async (email: string, name: string, password: string) => {
    try {
      // For development: Auto-login without API call
      const user: User = {
        id: Date.now().toString(),
        email,
        name,
        createdAt: new Date(),
        emailVerified: false, // New users need email verification
      };

      // Store user in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log('Development mode: Auto-signed up user:', email);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      Alert.alert('Sign Up Error', message);
      return { success: false, error: message };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // For development: Auto-login without API call
      const user: User = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0], // Generate name from email
        createdAt: new Date(),
        emailVerified: true, // Assume existing users are verified
      };

      // Store user in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log('Development mode: Auto-signed in user:', email);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      Alert.alert('Sign In Error', message);
      return { success: false, error: message };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      console.log('Development mode: User signed out');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    try {
      if (!authState.user) return;

      const updatedUser = { ...authState.user, ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  }, [authState.user]);

  const verifyEmail = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!authState.user) {
        return { success: false, error: 'No user found' };
      }

      // Call the API to verify email
      const verifyRequest: UserVerifyEmail = {
        email: authState.user.email,
        code: code,
      };

      const verifiedUser = await userService.verifyEmail(verifyRequest);
      
      // Update local user state with verified status
      const updatedUser = { ...authState.user, emailVerified: true };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email verification failed';
      return { success: false, error: message };
    }
  }, [authState.user]);

  const resendVerificationCode = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!authState.user) {
        return { success: false, error: 'No user found' };
      }

      // Call the API to resend verification code
      await userService.resendVerificationCode(authState.user.email);
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification code';
      return { success: false, error: message };
    }
  }, [authState.user]);

  return useMemo(
    () => ({
      ...authState,
      signUp,
      signIn,
      signOut,
      updateUser,
      verifyEmail,
      resendVerificationCode,
    }),
    [authState, signUp, signIn, signOut, updateUser, verifyEmail, resendVerificationCode]
  );
});