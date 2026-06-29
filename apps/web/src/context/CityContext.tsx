/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import type { City } from '../lib/types';

interface CityContextValue {
  activeCityId: string;
  setActiveCityId: (cityId: string) => void;
  activeCity: City | undefined;
  cities: City[];
  isLoading: boolean;
  error: Error | null;
}

const CityContext = createContext<CityContextValue | null>(null);

const STORAGE_KEY = 'airiq-selected-city';

export function CityProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [activeCityId, setActiveCityIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'delhi';
  });

  const { data: cities = [], isLoading, error } = useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: api.cities,
    staleTime: 5 * 60 * 1000, // cache list of cities for 5 minutes
    enabled: !authLoading && Boolean(user),
  });

  const setActiveCityId = (cityId: string) => {
    setActiveCityIdState(cityId);
    localStorage.setItem(STORAGE_KEY, cityId);
  };

  const activeCity = cities.find((c) => c.id === activeCityId);

  return (
    <CityContext.Provider
      value={{
        activeCityId,
        setActiveCityId,
        activeCity,
        cities,
        isLoading,
        error: error as Error | null,
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
