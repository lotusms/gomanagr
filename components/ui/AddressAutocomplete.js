import { useState, useEffect, useRef } from 'react';
import * as Label from '@radix-ui/react-label';
import { FORM_CONTROL_LIGHT_LABEL, getInputClasses } from './formControlStyles';
import { COUNTRIES } from '@/utils/countries';
import { getStatesByCountry } from '@/utils/states';

/**
 * Address Autocomplete Component using Google Places API (New)
 * 
 * @param {Object} props
 * @param {string} props.id - Unique ID for the input field
 * @param {string} props.label - Label text
 * @param {string} props.value - Current address value
 * @param {Function} props.onChange - Callback when address changes (receives address string)
 * @param {Function} props.onSelect - Callback when address is selected (receives address object with all fields)
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether the field is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.error - Error message to display
 */
export default function AddressAutocomplete({
  id,
  label,
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address...',
  disabled = false,
  className = '',
  error = '',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [placesLibrary, setPlacesLibrary] = useState(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const debounceRef = useRef(null);

  // Initialize Google Maps Places API (New)
  useEffect(() => {
    const initPlacesAPI = async () => {
      if (typeof window === 'undefined' || !window.google || !window.google.maps) {
        setApiError('Google Maps API is not loaded. Please ensure Maps JavaScript API is enabled in Google Cloud Console.');
        return;
      }

      try {
        // Import the places library using the new API
        const { AutocompleteSuggestion, AutocompleteSessionToken, Place } = 
          await window.google.maps.importLibrary('places');
        
        setPlacesLibrary({
          AutocompleteSuggestion,
          AutocompleteSessionToken,
          Place,
        });
        setApiError('');
      } catch (err) {
        console.error('Error loading Places API:', err);
        setApiError('Failed to load Places API (New). Please ensure Places API (New) is enabled in Google Cloud Console.');
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initPlacesAPI();
    } else {
      // Wait for Google Maps to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          initPlacesAPI();
        }
      }, 100);

      // Cleanup after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (!placesLibrary) {
          setApiError('Google Maps API failed to load. Please check your API key and ensure Maps JavaScript API is enabled.');
        }
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, []);

  // Create a new session token for each autocomplete session
  const createSessionToken = () => {
    if (placesLibrary && placesLibrary.AutocompleteSessionToken) {
      sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
    }
  };

  // Fetch suggestions using the new AutocompleteSuggestion API
  const fetchSuggestions = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (!placesLibrary || !placesLibrary.AutocompleteSuggestion) {
      setApiError('Places API (New) is not loaded.');
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      // Create session token if needed
      if (!sessionTokenRef.current) {
        createSessionToken();
      }

      // Use the new AutocompleteSuggestion API
      const request = {
        input: inputValue,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['us'], // You can customize this
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'], // Address types only
      };

      const { suggestions: fetchedSuggestions } = 
        await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      if (fetchedSuggestions && fetchedSuggestions.length > 0) {
        setSuggestions(fetchedSuggestions);
        setIsOpen(true);
        setActiveIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error fetching autocomplete suggestions:', error);
      setApiError('Failed to fetch address suggestions. Please try again.');
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    
    // Call onChange immediately for controlled input
    if (onChange) {
      onChange(inputValue);
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API call
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, 300);
  };

  // Handle place selection
  const handleSelectSuggestion = async (suggestion) => {
    setIsLoading(true);
    setIsOpen(false);
    setSuggestions([]);

    try {
      if (!placesLibrary || !placesLibrary.Place) {
        throw new Error('Places API library not loaded');
      }

      // Get place ID from the suggestion
      const placeId = suggestion.placePrediction?.placeId;
      if (!placeId) {
        throw new Error('Place ID not found in suggestion');
      }

      // Create a Place object and fetch details
      const place = new placesLibrary.Place({ id: placeId });
      
      // Fetch place fields
      await place.fetchFields({
        fields: [
          'formattedAddress',
          'addressComponents',
          'location',
        ],
        sessionToken: sessionTokenRef.current,
      });

      // Extract address components
      const addressComponents = place.addressComponents || [];
      
      // Helper function to get component by type
      const getComponent = (types, preferShort = false) => {
        const component = addressComponents.find(comp => 
          types.some(type => comp.types.includes(type))
        );
        if (!component) return '';
        // For country, prefer shortName (ISO code) if available
        if (preferShort && component.shortText) {
          return component.shortText;
        }
        return component.longText || component.shortText || '';
      };
      
      // Extract address parts
      const streetNumber = getComponent(['street_number']);
      const route = getComponent(['route']);
      const address1 = [streetNumber, route].filter(Boolean).join(' ');
      const address2 = getComponent(['subpremise']); // Apartment, suite, etc.
      const city = getComponent(['locality', 'sublocality', 'sublocality_level_1']);
      const stateName = getComponent(['administrative_area_level_1']);
      const postalCode = getComponent(['postal_code']);
      // Try to get country code directly (shortName), fallback to name
      const countryCodeOrName = getComponent(['country'], true) || getComponent(['country']);
      
      // Convert country to ISO code if needed
      let countryCode = '';
      if (countryCodeOrName) {
        // Check if it's already a 2-letter code
        if (countryCodeOrName.length === 2 && /^[A-Z]{2}$/i.test(countryCodeOrName)) {
          countryCode = countryCodeOrName.toUpperCase();
        } else {
          // Try to find by name
          const found = COUNTRIES.find(c => 
            c.label.toLowerCase() === countryCodeOrName.toLowerCase() ||
            c.value.toLowerCase() === countryCodeOrName.toLowerCase()
          );
          countryCode = found ? found.value : countryCodeOrName;
        }
      }
      
      // Try to match state/province name to code if country is known
      let stateCode = stateName;
      if (countryCode && stateName) {
        const states = getStatesByCountry(countryCode);
        const matchedState = states.find(s => 
          s.label.toLowerCase() === stateName.toLowerCase() || 
          s.value.toLowerCase() === stateName.toLowerCase()
        );
        if (matchedState) {
          stateCode = matchedState.value;
        }
      }
      
      const formattedAddress = place.formattedAddress || suggestion.placePrediction?.text?.text || '';
      const location = place.location;
      const latLng = location ? { lat: location.lat(), lng: location.lng() } : null;

      // Call onChange with the formatted address string
      if (onChange) {
        onChange(formattedAddress);
      }
      
      // Call onSelect with all the parsed address fields
      if (onSelect) {
        onSelect({
          address1: address1 || formattedAddress,
          address2: address2 || '',
          city: city || '',
          state: stateCode || '',
          postalCode: postalCode || '',
          country: countryCode || '',
          fullAddress: formattedAddress,
          latLng,
        });
      }

      // Consume the session token after successful selection
      sessionTokenRef.current = null;
    } catch (error) {
      console.error('Error fetching place details:', error);
      setApiError('Failed to fetch address details. Please try again.');
      
      // Still call onChange with the suggestion text if available
      const suggestionText = suggestion.placePrediction?.text?.text || '';
      if (onChange && suggestionText) {
        onChange(suggestionText);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    // Handle space key specially - ensure it doesn't cause focus loss or form submission
    if (e.key === ' ' || e.keyCode === 32) {
      // If a suggestion is highlighted, reset it but still allow space to be typed
      if (activeIndex >= 0 && isOpen) {
        setActiveIndex(-1);
      }
      // Ensure input maintains focus - don't prevent default, just ensure focus stays
      // The space will be handled by the onChange handler naturally
      e.stopPropagation(); // Prevent any parent handlers from interfering
      return; // Allow default behavior (typing the space)
    }

    // Only handle navigation keys when dropdown is open
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus(); // Keep focus on input
        break;
      default:
        // For all other keys, allow normal behavior
        break;
    }
  };

  // Close suggestions when clicking outside (but not on keyboard events)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle mouse/touch events, not keyboard events
      if (event.type === 'keydown' || event.type === 'keyup' || event.type === 'keypress') {
        return;
      }
      
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen]);

  // If API is not loaded, show a regular input field with helpful message
  if (apiError && !placesLibrary) {
    return (
      <div className={className}>
        {label && (
          <Label.Root htmlFor={id} className={FORM_CONTROL_LIGHT_LABEL}>
            {label}
          </Label.Root>
        )}
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={getInputClasses('light', !!error)}
        />
        <p className="mt-1 text-sm text-amber-600" role="alert">
          {apiError}
        </p>
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <Label.Root htmlFor={id} className={FORM_CONTROL_LIGHT_LABEL}>
          {label}
        </Label.Root>
      )}
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            // Clear any pending blur timeout
            if (inputRef.current?._blurTimeout) {
              clearTimeout(inputRef.current._blurTimeout);
              inputRef.current._blurTimeout = null;
            }
            
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={(e) => {
            // Don't close dropdown immediately on blur - wait a bit to allow clicks on suggestions
            // This prevents the dropdown from closing when space is pressed or when clicking suggestions
            const blurTimeout = setTimeout(() => {
              // Check if focus moved to a suggestion or back to input
              const activeElement = document.activeElement;
              const clickedSuggestion = suggestionsRef.current?.contains(activeElement);
              const backToInput = activeElement === inputRef.current;
              
              if (!clickedSuggestion && !backToInput) {
                setIsOpen(false);
                setActiveIndex(-1);
              }
            }, 200);
            
            // Store timeout to clear if focus returns quickly
            if (inputRef.current) {
              inputRef.current._blurTimeout = blurTimeout;
            }
          }}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`${getInputClasses('light', !!error)} ${isLoading ? 'opacity-50' : ''}`}
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent" />
          </div>
        )}
        
        {/* Suggestions dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion, index) => {
              const isActive = index === activeIndex;
              const suggestionText = suggestion.placePrediction?.text?.text || '';
              const className = isActive
                ? 'px-4 py-2 bg-primary-50 cursor-pointer'
                : 'px-4 py-2 bg-white hover:bg-gray-50 cursor-pointer';
              
              return (
                <div
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={className}
                >
                  <span className="text-sm text-gray-900">
                    {suggestionText}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {apiError && placesLibrary && (
        <p className="mt-1 text-sm text-amber-600" role="alert">
          {apiError}
        </p>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
