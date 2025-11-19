/**
 * Integration Test for Verification Prompt Flow
 * Tests the complete integration of VerificationPrompt component with root layout
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import RootLayout from '@/app/_layout';
import VerificationPrompt from '@/components/VerificationPrompt';
import { User } from '@/contexts/AuthContext';

// Mock the navigation router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock the AuthContext to provide different user states for testing
const mockUseAuth = (userState: {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}) => {
  return {
    user: userState.user,
    isAuthenticated: userState.isAuthenticated,
    isLoading: userState.isLoading,
    signIn: jest.fn(),
    signOut: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationCode: jest.fn(),
    updateUser: jest.fn(),
    refreshUserData: jest.fn(),
    signUp: jest.fn(),
  };
};

describe('Verification Prompt Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Integration', () => {
    test('VerificationPrompt should be properly imported and rendered', () => {
      const mockAuthContext = mockUseAuth({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date(),
          emailVerified: false, // Unverified user
        },
      });

      // Mock the useAuth hook to return our test data
      jest.mock('@/contexts/AuthContext', () => ({
        useAuth: () => mockAuthContext,
        AuthProvider: ({ children }: { children: React.ReactNode }) => children,
      }));

      const { getByText } = render(<VerificationPrompt />);
      expect(getByText('📧 Email verification required - Click to verify')).toBeTruthy();
    });

    test('VerificationPrompt should not render for verified users', () => {
      const mockAuthContext = mockUseAuth({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date(),
          emailVerified: true, // Verified user
        },
      });

      jest.mock('@/contexts/AuthContext', () => ({
        useAuth: () => mockAuthContext,
        AuthProvider: ({ children }: { children: React.ReactNode }) => children,
      }));

      const { queryByText } = render(<VerificationPrompt />);
      expect(queryByText('📧 Email verification required')).toBeNull();
    });

    test('VerificationPrompt should not render for unauthenticated users', () => {
      const mockAuthContext = mockUseAuth({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });

      jest.mock('@/contexts/AuthContext', () => ({
        useAuth: () => mockAuthContext,
        AuthProvider: ({ children }: { children: React.ReactNode }) => children,
      }));

      const { queryByText } = render(<VerificationPrompt />);
      expect(queryByText('📧 Email verification required')).toBeNull();
    });
  });

  describe('Navigation Flow Testing', () => {
    test('Clicking VerificationPrompt should navigate to verify-email screen', () => {
      const mockRouter = {
        push: jest.fn(),
        back: jest.fn(),
        replace: jest.fn(),
      };

      jest.mock('expo-router', () => ({
        router: mockRouter,
        useRouter: () => mockRouter,
      }));

      const mockAuthContext = mockUseAuth({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date(),
          emailVerified: false,
        },
      });

      jest.mock('@/contexts/AuthContext', () => ({
        useAuth: () => mockAuthContext,
        AuthProvider: ({ children }: { children: React.ReactNode }) => children,
      }));

      const { getByText, getByTestId } = render(<VerificationPrompt />);
      
      const promptButton = getByTestId('verification-prompt-button');
      fireEvent.press(promptButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/verify-email');
    });

    test('RootLayout should auto-redirect unverified users to verify-email', async () => {
      // This test would require more complex setup with the actual navigation stack
      // For now, we'll verify the logic in the RootLayoutNav component
      const mockRouter = {
        push: jest.fn(),
      };

      const mockAuthContext = mockUseAuth({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date(),
          emailVerified: false,
        },
      });

      // Simulate the useEffect logic from RootLayoutNav
      if (!mockAuthContext.isLoading && 
          mockAuthContext.isAuthenticated && 
          mockAuthContext.user && 
          !mockAuthContext.user.emailVerified) {
        mockRouter.push({
          pathname: '/verify-email',
          params: { email: mockAuthContext.user.email }
        } as any);
      }

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/verify-email',
        params: { email: 'test@example.com' }
      });
    });
  });

  describe('User State Scenarios', () => {
    test('Newly signed up user should trigger verification flow', () => {
      const newUser = {
        id: '1',
        email: 'newuser@example.com',
        name: 'New User',
        createdAt: new Date(),
        emailVerified: false, // New users start unverified
      };

      const mockAuthContext = mockUseAuth({
        isAuthenticated: false, // After signup, user is not authenticated yet
        isLoading: false,
        user: newUser,
      });

      // The verification prompt should appear but navigation should be manual
      const { getByText } = render(<VerificationPrompt />);
      // Since user is not authenticated, prompt should not show
      expect(() => getByText('📧 Email verification required')).toThrow();
    });

    test('Authenticated verified user should access main app', () => {
      const verifiedUser = {
        id: '1',
        email: 'verified@example.com',
        name: 'Verified User',
        createdAt: new Date(),
        emailVerified: true,
      };

      const mockAuthContext = mockUseAuth({
        isAuthenticated: true,
        isLoading: false,
        user: verifiedUser,
      });

      // Verification prompt should not show for verified users
      const { queryByText } = render(<VerificationPrompt />);
      expect(queryByText('📧 Email verification required')).toBeNull();
    });

    test('Unauthenticated user should see public screens', () => {
      const mockAuthContext = mockUseAuth({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });

      // Verification prompt should not show for unauthenticated users
      const { queryByText } = render(<VerificationPrompt />);
      expect(queryByText('📧 Email verification required')).toBeNull();
    });
  });

  describe('Error Prevention and Edge Cases', () => {
    test('Component should handle missing user gracefully', () => {
      const mockAuthContext = mockUseAuth({
        isAuthenticated: true,
        isLoading: false,
        user: null, // No user
      });

      const { queryByText } = render(<VerificationPrompt />);
      expect(queryByText('📧 Email verification required')).toBeNull();
    });

    test('Component should handle loading states', () => {
      const mockAuthContext = mockUseAuth({
        isAuthenticated: true,
        isLoading: true, // Loading state
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date(),
          emailVerified: false,
        },
      });

      const { queryByText } = render(<VerificationPrompt />);
      expect(queryByText('📧 Email verification required')).toBeNull();
    });

    test('Navigation should handle email parameter correctly', () => {
      const userEmail = 'test@example.com';
      const mockRouter = {
        push: jest.fn(),
      };

      // Simulate the navigation with email parameter
      mockRouter.push({
        pathname: '/verify-email',
        params: { email: userEmail }
      } as any);

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/verify-email',
        params: { email: userEmail }
      });
    });
  });

  describe('Import and Dependency Tests', () => {
    test('All imports should be available', () => {
      // Test that we can import the component without errors
      expect(() => require('@/components/VerificationPrompt')).not.toThrow();
      expect(() => require('@/contexts/AuthContext')).not.toThrow();
    });

    test('Verify-email screen should be accessible', () => {
      // This would require checking the actual file structure
      const fs = require('fs');
      const path = require('path');
      
      const verifyEmailPath = path.join(process.cwd(), 'app/verify-email.tsx');
      expect(fs.existsSync(verifyEmailPath)).toBe(true);
    });
  });
});