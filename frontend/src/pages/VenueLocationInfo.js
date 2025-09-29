import React, { useMemo } from 'react';
// This component expects the VenueAutocomplete options logic to be passed in as optionsComponent
export default function VenueLocationInfo({ venue, optionsComponent: OptionsComponent }) {
  // Try to get the options from the VenueAutocomplete component (static cache or similar)
  // If not possible, just show the venue string
  // In a real app, you might want to lift the options state up or use a context for this
  const options = OptionsComponent?.lastOptions || [];
  const selectedOption = useMemo(() => {
    if (!venue) return null;
    return options.find(o => o.name === venue) || null;
  }, [venue, options]);
  if (!selectedOption) return null;
  return (
    <div style={{ marginTop: 8, marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fafbfc' }}>
      <div><strong>Name:</strong> {selectedOption.name}</div>
      {selectedOption.address && <div><strong>Address:</strong> {selectedOption.address}</div>}
      {selectedOption.city && <div><strong>City:</strong> {selectedOption.city}</div>}
      {selectedOption.country && <div><strong>Country:</strong> {selectedOption.country}</div>}
      {selectedOption.state && <div><strong>State/Region:</strong> {selectedOption.state}</div>}
      {selectedOption.postalCode && <div><strong>Postal Code:</strong> {selectedOption.postalCode}</div>}
      {selectedOption.lat && selectedOption.lng && <div><strong>Coordinates:</strong> {selectedOption.lat}, {selectedOption.lng}</div>}
    </div>
  );
}