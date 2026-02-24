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
  const blurTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const initPlacesAPI = async () => {
      if (typeof window === 'undefined' || !window.google || !window.google.maps) {
        setApiError('Google Maps API is not loaded. Please ensure Maps JavaScript API is enabled in Google Cloud Console.');
        return;
      }

      try {
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

    if (window.google && window.google.maps) {
      initPlacesAPI();
    } else {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          initPlacesAPI();
        }
      }, 100);

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

  const createSessionToken = () => {
    if (placesLibrary && placesLibrary.AutocompleteSessionToken) {
      sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
    }
  };

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
      if (!sessionTokenRef.current) {
        createSessionToken();
      }

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

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    isTypingRef.current = true;
    
    if (onChange) {
      onChange(inputValue);
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      await fetchSuggestions(inputValue);
      setTimeout(() => {
        isTypingRef.current = false;
      }, 100);
      if (inputRef.current && document.activeElement !== inputRef.current) {
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        });
      }
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion) => {
    setIsLoading(true);
    setIsOpen(false);
    setSuggestions([]);

    try {
      if (!placesLibrary || !placesLibrary.Place) {
        throw new Error('Places API library not loaded');
      }

      const placeId = suggestion.placePrediction?.placeId;
      if (!placeId) {
        throw new Error('Place ID not found in suggestion');
      }

      const place = new placesLibrary.Place({ id: placeId });
      
      await place.fetchFields({
        fields: [
          'formattedAddress',
          'addressComponents',
          'location',
        ],
        sessionToken: sessionTokenRef.current,
      });

      const addressComponents = place.addressComponents || [];
      
      const getComponent = (types, preferShort = false) => {
        const component = addressComponents.find(comp => 
          types.some(type => comp.types.includes(type))
        );
        if (!component) return '';
        if (preferShort && component.shortText) {
          return component.shortText;
        }
        return component.longText || component.shortText || '';
      };
      
      const streetNumber = getComponent(['street_number']);
      const route = getComponent(['route']);
      const address1 = [streetNumber, route].filter(Boolean).join(' ');
      const address2 = getComponent(['subpremise']); // Apartment, suite, etc.
      const city = getComponent(['locality', 'sublocality', 'sublocality_level_1']);
      const stateName = getComponent(['administrative_area_level_1']);
      const postalCode = getComponent(['postal_code']);
      const countryCodeOrName = getComponent(['country'], true) || getComponent(['country']);
      
      let countryCode = '';
      if (countryCodeOrName) {
        if (countryCodeOrName.length === 2 && /^[A-Z]{2}$/i.test(countryCodeOrName)) {
          countryCode = countryCodeOrName.toUpperCase();
        } else {
          const found = COUNTRIES.find(c => 
            c.label.toLowerCase() === countryCodeOrName.toLowerCase() ||
            c.value.toLowerCase() === countryCodeOrName.toLowerCase()
          );
          countryCode = found ? found.value : countryCodeOrName;
        }
      }
      
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

      if (onChange) {
        onChange(formattedAddress);
      }
      
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

      sessionTokenRef.current = null;
    } catch (error) {
      console.error('Error fetching place details:', error);
      setApiError('Failed to fetch address details. Please try again.');
      
      const suggestionText = suggestion.placePrediction?.text?.text || '';
      if (onChange && suggestionText) {
        onChange(suggestionText);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.keyCode === 32) {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      isTypingRef.current = true;
      
      if (activeIndex >= 0 && isOpen) {
        setActiveIndex(-1);
      }
      e.stopPropagation(); // Prevent any parent handlers from interfering
      return; // Allow default behavior (typing the space)
    }

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
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
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
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
            isTypingRef.current = true;
            
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={(e) => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
            }
            
            blurTimeoutRef.current = setTimeout(() => {
              if (isTypingRef.current) {
                return;
              }
              
              const activeElement = document.activeElement;
              const clickedSuggestion = suggestionsRef.current?.contains(activeElement);
              const backToInput = activeElement === inputRef.current;
              
              if (!clickedSuggestion && !backToInput) {
                setIsOpen(false);
                setActiveIndex(-1);
              }
            }, 200);
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
