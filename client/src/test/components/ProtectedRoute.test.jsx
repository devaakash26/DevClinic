import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute.js';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('axios');
vi.mock('react-hot-toast');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Mock child component
const MockChild = () => <div>Protected Content</div>;

// Mock store with loading and user reducers
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      user: (state = initialState.user || { user: null }, action) => {
        switch (action.type) {
          case 'user/setUser':
            return { ...state, user: action.payload };
          default:
            return state;
        }
      },
      loader: (state = { loading: false }, action) => {
        switch (action.type) {
          case 'loader/showLoading':
            return { loading: true };
          case 'loader/hideLoading':
            return { loading: false };
          default:
            return state;
        }
      },
    },
  });
};

describe('ProtectedRoute Component Tests', () => {
  const navigate = vi.fn();
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useNavigate.mockReturnValue(navigate);
    store = createMockStore();
  });

  // Unit Tests
  describe('Unit Tests', () => {
    it('should redirect to login when no token exists', async () => {
      render(
        <Provider store={store}>
          <MemoryRouter>
            <ProtectedRoute>
              <MockChild />
            </ProtectedRoute>
          </MemoryRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login');
      });
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render children when authenticated and user exists', async () => {
      localStorage.setItem('token', 'test-token');
      store = createMockStore({
        user: { user: { id: 1, name: 'Test User' } },
      });

      render(
        <Provider store={store}>
          <MemoryRouter>
            <ProtectedRoute>
              <MockChild />
            </ProtectedRoute>
          </MemoryRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {
    it('should handle successful API authentication', async () => {
      localStorage.setItem('token', 'test-token');
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { id: 1, name: 'Test User' },
        },
      });

      render(
        <Provider store={store}>
          <MemoryRouter>
            <ProtectedRoute>
              <MockChild />
            </ProtectedRoute>
          </MemoryRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:4000/api/user/get-user-info',
          {},
          expect.any(Object)
        );
      });
    });

    it('should handle API authentication failure', async () => {
      localStorage.setItem('token', 'test-token');
      axios.post.mockRejectedValueOnce(new Error('Auth failed'));

      render(
        <Provider store={store}>
          <MemoryRouter>
            <ProtectedRoute>
              <MockChild />
            </ProtectedRoute>
          </MemoryRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  // Security Tests
  describe('Security Tests', () => {
    it('should remove token on authentication failure', async () => {
      localStorage.setItem('token', 'invalid-token');
      axios.post.mockRejectedValueOnce(new Error('Auth failed'));

      render(
        <Provider store={store}>
          <MemoryRouter>
            <ProtectedRoute>
              <MockChild />
            </ProtectedRoute>
          </MemoryRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
      });
    });
  });
}); 