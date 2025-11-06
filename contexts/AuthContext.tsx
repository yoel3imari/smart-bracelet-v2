import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const STORAGE_KEY = '@auth_user';

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
      const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signUp = useCallback(async (email: string, name: string, password: string) => {
    try {
      // Mock validation - in real app, this would be API call
      if (!email || !name || !password) {
        throw new Error('All fields are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Mock user creation
      const user: User = {
        id: Date.now().toString(),
        email,
        name,
        createdAt: new Date(),
      };

      // Store user in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      Alert.alert('Sign Up Error', message);
      return { success: false, error: message };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Mock authentication - in real app, this would be API call
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // For demo purposes, accept any email/password combination
      // In real app, this would validate against backend
      const user: User = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0], // Generate name from email
        createdAt: new Date(),
      };

      // Store user in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

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

  return useMemo(
    () => ({
      ...authState,
      signUp,
      signIn,
      signOut,
      updateUser,
    }),
    [authState, signUp, signIn, signOut, updateUser]
  );
});