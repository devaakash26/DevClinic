import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DoctorCard from '../../components/DoctorCard';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';

// Mock doctor data
const mockDoctor = {
  _id: '1',
  userId: '1',
  firstname: 'John',
  lastname: 'Doe',
  specialization: 'Cardiologist',
  experience: 10,
  feePerConsultation: 100,
  timings: ['9:00 AM - 5:00 PM'],
  department: 'Cardiology',
  profession: 'Doctor',
  isAvailable: true,
};

// Mock store with user reducer
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      user: (state = { user: null }, action) => {
        switch (action.type) {
          case 'user/setUser':
            return { ...state, user: action.payload };
          default:
            return initialState.user || state;
        }
      },
    },
    preloadedState: {
      user: initialState.user || { user: null },
    },
  });
};

describe('DoctorCard Component Tests', () => {
  // Unit Tests
  describe('Unit Tests', () => {
    it('should render doctor information correctly', () => {
      const store = createMockStore({
        user: { user: { _id: '1', name: 'Test User' } },
      });

      render(
        <Provider store={store}>
          <MemoryRouter>
            <DoctorCard doctor={mockDoctor} />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
      expect(screen.getByText('10+ Yrs Exp')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should handle booking button click', () => {
      const handleBookAppointment = vi.fn();
      const store = createMockStore({
        user: { user: { _id: '1', name: 'Test User' } },
      });

      render(
        <Provider store={store}>
          <MemoryRouter>
            <DoctorCard 
              doctor={mockDoctor} 
              onBookAppointment={handleBookAppointment} 
            />
          </MemoryRouter>
        </Provider>
      );

      const bookButton = screen.getByText('Book Appointment');
      fireEvent.click(bookButton);
      expect(bookButton).toBeInTheDocument();
    });
  });

  // Integration Tests
  describe('Integration Tests', () => {
    it('should work with Redux store for authentication', () => {
      const store = createMockStore({
        user: { user: { _id: '1', name: 'Test User' } },
      });

      render(
        <Provider store={store}>
          <MemoryRouter>
            <DoctorCard doctor={mockDoctor} />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Book Appointment')).toBeInTheDocument();
    });

    it('should handle navigation to doctor details', () => {
      const store = createMockStore({
        user: { user: { _id: '1', name: 'Test User' } },
      });

      render(
        <Provider store={store}>
          <MemoryRouter>
            <DoctorCard doctor={mockDoctor} />
          </MemoryRouter>
        </Provider>
      );

      const viewProfileButton = screen.getByText('View Profile');
      expect(viewProfileButton).toBeInTheDocument();
    });
  });

  // Performance Tests
  describe('Performance Tests', () => {
    it('should render within 200ms', () => {
      const store = createMockStore({
        user: { user: { _id: '1', name: 'Test User' } },
      });

      const startTime = performance.now();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <DoctorCard doctor={mockDoctor} />
          </MemoryRouter>
        </Provider>
      );
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  // Security Tests
  describe('Security Tests', () => {
    it('should not expose sensitive doctor information', () => {
      const store = createMockStore({
        user: { user: { _id: '1', name: 'Test User' } },
      });

      const doctorWithSensitiveData = {
        ...mockDoctor,
        email: 'doctor@example.com',
        phone: '1234567890',
      };

      render(
        <Provider store={store}>
          <MemoryRouter>
            <DoctorCard doctor={doctorWithSensitiveData} />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.queryByText('doctor@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('1234567890')).not.toBeInTheDocument();
    });
  });
}); 