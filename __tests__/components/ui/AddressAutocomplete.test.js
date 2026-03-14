/**
 * Unit tests for AddressAutocomplete: render, API load/error, input, suggestions, select, keyboard
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';

jest.mock('@radix-ui/react-label', () => ({
  Root: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/formControlStyles', () => ({
  FORM_CONTROL_LIGHT_LABEL: 'form-label',
  getInputClasses: () => 'input-class',
}));

const mockFetchSuggestions = jest.fn();
const mockFetchFields = jest.fn();

function createMockPlacesLibrary() {
  const MockPlace = function (opts) {
    this.id = opts?.id;
    this.formattedAddress = '123 Main St, City, ST 12345';
    this.addressComponents = [
      { types: ['street_number'], longText: '123', shortText: '123' },
      { types: ['route'], longText: 'Main St', shortText: 'Main St' },
      { types: ['locality'], longText: 'City', shortText: 'City' },
      { types: ['administrative_area_level_1'], longText: 'California', shortText: 'CA' },
      { types: ['postal_code'], longText: '12345', shortText: '12345' },
      { types: ['country'], longText: 'United States', shortText: 'US' },
    ];
    this.location = { lat: () => 37.77, lng: () => -122.42 };
    this.fetchFields = mockFetchFields;
  };
  return {
    AutocompleteSuggestion: {
      fetchAutocompleteSuggestions: mockFetchSuggestions,
    },
    AutocompleteSessionToken: function () {},
    Place: MockPlace,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSuggestions.mockResolvedValue({
    suggestions: [
      {
        placePrediction: {
          placeId: 'place-1',
          text: { text: '123 Main St, City, ST 12345' },
        },
      },
    ],
  });
  mockFetchFields.mockResolvedValue(undefined);
  window.google = {
    maps: {
      importLibrary: jest.fn().mockImplementation(() => Promise.resolve(createMockPlacesLibrary())),
    },
  };
});

afterEach(() => {
  delete window.google;
});

jest.mock('@/utils/countries', () => ({
  COUNTRIES: [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
  ],
}));

jest.mock('@/utils/states', () => ({
  getStatesByCountry: (code) => {
    if (code === 'US') {
      return [{ value: 'CA', label: 'California' }, { value: 'NY', label: 'New York' }];
    }
    return [];
  },
}));

async function waitForPlacesReady() {
  await waitFor(() => {
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
}

function ControlledWrapper(props) {
  const [value, setValue] = React.useState(props.initialValue || '');
  return (
    <AddressAutocomplete
      {...props}
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onChange?.(v);
      }}
    />
  );
}

describe('AddressAutocomplete', () => {
  it('renders label and input with placeholder', async () => {
    render(
      <AddressAutocomplete
        id="address"
        label="Address"
        value=""
        onChange={jest.fn()}
      />
    );
    await waitForPlacesReady();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Start typing an address...')).toBeInTheDocument();
  });

  it('renders custom placeholder and shows value', async () => {
    render(
      <AddressAutocomplete
        id="addr"
        value="123 Main St"
        onChange={jest.fn()}
        placeholder="Enter address"
      />
    );
    await waitForPlacesReady();
    expect(screen.getByPlaceholderText('Enter address')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
  });

  it('calls onChange when user types', async () => {
    const onChange = jest.fn();
    render(<ControlledWrapper id="a" onChange={onChange} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '12');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('12');
  });

  const advanceDebounce = () => new Promise((r) => setTimeout(r, 400));

  it('fetches suggestions after debounce when input has 2+ chars', async () => {
    render(<ControlledWrapper id="a" onChange={jest.fn()} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '123');
    await advanceDebounce();
    await waitFor(() => {
      expect(mockFetchSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({
          input: '123',
          includedRegionCodes: ['us'],
        })
      );
    });
  });

  it('shows suggestions dropdown when fetch returns results', async () => {
    render(<ControlledWrapper id="a" onChange={jest.fn()} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '123 Main');
    await advanceDebounce();
    await waitFor(() => {
      expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
    });
  });

  it('calls onSelect with address object when suggestion is clicked', async () => {
    const onSelect = jest.fn();
    const onChange = jest.fn();
    render(<ControlledWrapper id="a" onChange={onChange} onSelect={onSelect} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '123 Main');
    await advanceDebounce();
    await waitFor(() => {
      expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('123 Main St, City, ST 12345'));
    await waitFor(() => {
      expect(mockFetchFields).toHaveBeenCalled();
    });
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        address1: '123 Main St',
        city: 'City',
        state: 'CA',
        postalCode: '12345',
        country: 'US',
        fullAddress: '123 Main St, City, ST 12345',
        latLng: { lat: 37.77, lng: -122.42 },
      })
    );
    expect(onChange).toHaveBeenCalledWith('123 Main St, City, ST 12345');
  });

  it('ArrowDown and Enter selects suggestion', async () => {
    const onSelect = jest.fn();
    render(<ControlledWrapper id="a" onChange={jest.fn()} onSelect={onSelect} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '123');
    await advanceDebounce();
    await waitFor(() => {
      expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
    });
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
    });
  });

  it('Escape closes dropdown', async () => {
    render(<ControlledWrapper id="a" onChange={jest.fn()} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '123');
    await advanceDebounce();
    await waitFor(() => {
      expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
    });
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('123 Main St, City, ST 12345')).not.toBeInTheDocument();
    });
  });

  it('shows apiError when Google Maps API is not loaded', async () => {
    delete window.google;
    jest.useFakeTimers();
    render(
      <AddressAutocomplete id="a" value="" onChange={jest.fn()} />
    );
    act(() => {
      jest.advanceTimersByTime(10100);
    });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Google Maps API failed to load|is not loaded/i);
    });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    jest.useRealTimers();
  }, 8000);

  it('shows error prop when provided', async () => {
    render(
      <AddressAutocomplete id="a" value="" onChange={jest.fn()} error="Address is required" />
    );
    await waitForPlacesReady();
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((el) => el.textContent.includes('Address is required'))).toBe(true);
  });

  it('disables input when disabled prop is true', async () => {
    render(
      <AddressAutocomplete id="a" value="" onChange={jest.fn()} disabled />
    );
    await waitForPlacesReady();
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('clears suggestions when input is less than 2 chars', async () => {
    render(<ControlledWrapper id="a" onChange={jest.fn()} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '123');
    await advanceDebounce();
    await waitFor(() => {
      expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
    });
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.type(screen.getByRole('textbox'), '1');
    await advanceDebounce();
    await waitFor(() => {
      expect(screen.queryByText('123 Main St, City, ST 12345')).not.toBeInTheDocument();
    });
  });

  it('sets activeIndex on suggestion mouseEnter and Enter selects', async () => {
    render(<ControlledWrapper id="a" onChange={jest.fn()} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '123');
    await advanceDebounce();
    await waitFor(() => {
      expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
    });
    await userEvent.hover(screen.getByText('123 Main St, City, ST 12345'));
    screen.getByRole('textbox').focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(mockFetchFields).toHaveBeenCalled();
    });
  });
});

describe('AddressAutocomplete when Places API fails to load', () => {
  beforeEach(() => {
    window.google = {
      maps: {
        importLibrary: jest.fn().mockRejectedValue(new Error('Load failed')),
      },
    };
  });

  it('shows API error message and fallback input', async () => {
    render(
      <AddressAutocomplete id="a" value="" onChange={jest.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load Places API|Places API \(New\)/i);
    });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

describe('AddressAutocomplete handleSelectSuggestion error path', () => {
  it('onSelect not called and apiError set when fetchFields throws', async () => {
    mockFetchFields.mockRejectedValueOnce(new Error('Network error'));
    const onSelect = jest.fn();
    const onChange = jest.fn();
    render(<ControlledWrapper id="a" onChange={onChange} onSelect={onSelect} />);
    await waitForPlacesReady();
    await userEvent.type(screen.getByRole('textbox'), '123');
    await new Promise((r) => setTimeout(r, 400));
    await waitFor(() => {
      expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('123 Main St, City, ST 12345'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Failed to fetch address details/i);
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('123 Main St, City, ST 12345');
  });
});
