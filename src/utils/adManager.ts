
import { useCallback, useEffect, useState } from 'react';
import { AdUnit } from './ads/types';
import { fetchAllAdUnits, fetchAdsByPosition, createAdUnit as createAdUnitService, updateAdUnit as updateAdUnitService, deleteAdUnit as deleteAdUnitService, toggleAdActive as toggleAdActiveService } from './ads/adService';
import { defaultAdUnits } from './ads/defaultAds';

// Change the export to use 'export type' for TypeScript isolatedModules compatibility
export type { AdUnit };

/**
 * Register the service worker for ad handling
 */
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered with scope:', registration.scope);
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }
  return false;
};

/**
 * Hook to manage ad units in the application
 */
export const useAdManager = () => {
  const [adUnits, setAdUnits] = useState<AdUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAdsByPosition, setActiveAdsByPosition] = useState<Record<string, AdUnit[]>>({});
  const [swRegistered, setSwRegistered] = useState(false);

  // Register service worker on component mount
  useEffect(() => {
    const initServiceWorker = async () => {
      const registered = await registerServiceWorker();
      setSwRegistered(registered);
    };
    
    initServiceWorker();
  }, []);

  // Load ad units from database
  const loadAdUnits = useCallback(async () => {
    setLoading(true);
    try {
      const ads = await fetchAllAdUnits();
      console.log('Loaded ad units:', ads);
      setAdUnits(ads);
      organizeAdsByPosition(ads);
    } catch (error) {
      console.error('Error loading ad units:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Organize ads by position for easier access
  const organizeAdsByPosition = useCallback((ads: AdUnit[]) => {
    const adsByPosition: Record<string, AdUnit[]> = {};
    
    ads.filter(ad => ad.active).forEach(ad => {
      if (!adsByPosition[ad.position]) {
        adsByPosition[ad.position] = [];
      }
      adsByPosition[ad.position].push(ad);
    });
    
    setActiveAdsByPosition(adsByPosition);
  }, []);

  // Get active ads for a specific position
  const getActiveAdsByPosition = useCallback((position: string): AdUnit[] => {
    return activeAdsByPosition[position] || [];
  }, [activeAdsByPosition]);

  // Add a new ad unit
  const addAdUnit = useCallback(async (ad: Omit<AdUnit, 'id'>) => {
    const newAd = await createAdUnitService(ad);
    if (newAd) {
      setAdUnits(prev => [...prev, newAd]);
      if (newAd.active) {
        setActiveAdsByPosition(prev => {
          const updated = {...prev};
          if (!updated[newAd.position]) {
            updated[newAd.position] = [];
          }
          updated[newAd.position] = [...updated[newAd.position], newAd];
          return updated;
        });
      }
    }
    return newAd;
  }, []);

  // Update an existing ad unit
  const updateAdUnit = useCallback(async (id: string, updates: Partial<AdUnit>) => {
    const updatedAd = await updateAdUnitService(id, updates);
    if (updatedAd) {
      setAdUnits(prev => prev.map(ad => ad.id === id ? updatedAd : ad));
      // Re-organize ads by position in case position or active status changed
      loadAdUnits();
    }
    return updatedAd;
  }, [loadAdUnits]);

  // Delete an ad unit
  const deleteAdUnit = useCallback(async (id: string) => {
    const success = await deleteAdUnitService(id);
    if (success) {
      setAdUnits(prev => prev.filter(ad => ad.id !== id));
      setActiveAdsByPosition(prev => {
        const updated = {...prev};
        for (const position in updated) {
          updated[position] = updated[position].filter(ad => ad.id !== id);
          if (updated[position].length === 0) {
            delete updated[position];
          }
        }
        return updated;
      });
    }
    return success;
  }, []);

  // Toggle active status of an ad unit
  const toggleAdActive = useCallback(async (id: string) => {
    const updatedAd = await toggleAdActiveService(id);
    if (updatedAd) {
      setAdUnits(prev => prev.map(ad => ad.id === id ? updatedAd : ad));
      // Re-organize ads by position to update active ads
      loadAdUnits();
    }
    return updatedAd;
  }, [loadAdUnits]);

  // Reset to default ad units
  const resetToDefaults = useCallback(async () => {
    try {
      // Delete all existing ad units first
      const { error } = await supabase
        .from('ad_units')
        .delete()
        .neq('id', '0'); // Using neq with a non-existent ID to delete all
        
      if (error) throw error;

      // Then create the default ones
      for (const ad of defaultAdUnits) {
        await createAdUnitService(ad);
      }
      
      // Reload from database
      loadAdUnits();
      
      return true;
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      return false;
    }
  }, [loadAdUnits]);

  // Initial load
  useEffect(() => {
    loadAdUnits();
  }, [loadAdUnits]);
  
  // Return the hook interface
  return {
    adUnits,
    loading,
    getActiveAdsByPosition,
    addAdUnit,
    updateAdUnit,
    deleteAdUnit,
    toggleAdActive,
    resetToDefaults,
    reloadAds: loadAdUnits,
    swRegistered
  };
};

// Import supabase only for the resetToDefaults function
import { supabase } from '../integrations/supabase/client';
