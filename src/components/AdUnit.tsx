
import React, { useEffect, useRef, useState } from 'react';

interface AdUnitProps {
  code: string;
  className?: string;
  position?: 'top' | 'middle' | 'bottom' | 'after-timer' | 'sticky' | 'interstitial';
  priority?: 'high' | 'normal' | 'low';
}

const AdUnit: React.FC<AdUnitProps> = ({ 
  code, 
  className = "", 
  position = "middle",
  priority = "normal" 
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [adId] = useState(`ad-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    // Ensure we have both the ref and ad code to work with
    if (!adRef.current || !code) return;
    
    // Create a function to initialize the ad
    const initializeAd = () => {
      try {
        // Clear any previous content
        if (adRef.current) {
          adRef.current.innerHTML = '';
          setIsLoaded(false);
          setHasError(false);
          
          // Create a div with unique ID to hold the ad
          const adContainer = document.createElement('div');
          adContainer.id = adId;
          
          // Directly set the ad code to innerHTML for more reliable script execution
          adContainer.innerHTML = code;
          
          // Append the ad container to our component
          adRef.current.appendChild(adContainer);
          
          // Execute any scripts within the ad code - improved script execution
          const scripts = adContainer.getElementsByTagName('script');
          Array.from(scripts).forEach(oldScript => {
            // Remove the original script
            const scriptParent = oldScript.parentNode;
            if (scriptParent) {
              scriptParent.removeChild(oldScript);
              
              // Create a new script element
              const newScript = document.createElement('script');
              
              // Copy all attributes from the original script
              Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
              });
              
              // Set the script content
              newScript.innerHTML = oldScript.innerHTML;
              
              // Add the script to the document head for more reliable execution
              document.head.appendChild(newScript);
            }
          });
          
          console.log(`Ad initialized at position: ${position} with priority: ${priority} and ID: ${adId}`);
          
          // Mark as loaded after a delay to allow scripts to execute
          setTimeout(() => {
            setIsLoaded(true);
          }, 1000); // Increased delay for better script execution
        }
      } catch (error) {
        console.error('Error initializing ad:', error);
        setHasError(true);
      }
    };

    // Set loading delay based on priority
    const loadingDelay = priority === 'high' ? 100 : priority === 'normal' ? 300 : 500;

    // Initialize the ad with a delay based on priority
    const timer = setTimeout(() => {
      initializeAd();
    }, loadingDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [code, position, priority, adId]);

  // Apply different styling based on position
  const getPositionClass = () => {
    switch (position) {
      case 'top': return 'mb-6';
      case 'middle': return 'my-6';
      case 'bottom': return 'mt-6';
      case 'after-timer': return 'my-4';
      case 'sticky': return 'sticky top-0 z-50 my-2';
      case 'interstitial': return 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70';
      default: return 'my-4';
    }
  };

  return (
    <div 
      ref={adRef} 
      className={`ad-container w-full overflow-hidden border border-gray-200 rounded-lg bg-gray-50 ${getPositionClass()} ${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      data-testid="ad-unit"
      data-ad-position={position}
      data-ad-priority={priority}
      data-ad-status={hasError ? 'error' : isLoaded ? 'loaded' : 'loading'}
      style={{ minHeight: '250px' }} // Enforce minimum ad height for better visibility
    />
  );
};

export default AdUnit;
