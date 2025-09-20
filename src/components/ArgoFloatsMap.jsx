import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import DepthProfileChart from './DepthProfileChart';
import FloatFilters from './FloatFilters';
import { FiX, FiThermometer, FiDroplet, FiFilter } from 'react-icons/fi';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// API base URL - point to the backend server
const API_BASE_URL = 'http://localhost:8000';

const ArgoFloatsMap = () => {
  const [argoFloats, setArgoFloats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [filters, setFilters] = useState({});
  const [selectedFloat, setSelectedFloat] = useState(null);
  const [depthProfileData, setDepthProfileData] = useState([]);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  // Heatmap state and settings
  const [activeHeatmap, setActiveHeatmap] = useState('temperature');  // Show temperature by default
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.9);  // Increased default intensity for more vibrant colors
  const [heatmapRadius, setHeatmapRadius] = useState(40);  // Increased default radius for better coverage
  const [clickedPoint, setClickedPoint] = useState(null);  // Store clicked point data
  
  // Prepare heatmap data with validation and filtering for Indian Ocean region
  const heatmapData = useMemo(() => {
    if (!argoFloats || !Array.isArray(argoFloats) || !argoFloats.length) return [];
    
    // Define the Indian Ocean and Bay of Bengal region
    const indianOceanBounds = {
      latMin: -30, latMax: 30,
      lngMin: 30, lngMax: 100
    };
    
    return argoFloats
      .filter(float => {
        if (!float) return false;
        
        const lat = parseFloat(float.lat);
        const lng = parseFloat(float.lng);
        
        // Basic validation
        if (isNaN(lat) || isNaN(lng)) return false;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
        
        // Filter for Indian Ocean region
        const isInIndianOcean = 
          lat >= indianOceanBounds.latMin && 
          lat <= indianOceanBounds.latMax && 
          lng >= indianOceanBounds.lngMin && 
          lng <= indianOceanBounds.lngMax;
          
        return isInIndianOcean;
      })
      .map(float => {
        // Safely extract numeric values from temperature and salinity
        const tempValue = float.temp ? parseFloat(float.temp) : 0;
        // Handle case where salinity might be a number, string, or undefined
        const salinityStr = float.salinity ? String(float.salinity) : '0';
        const salinityValue = parseFloat(salinityStr.split(' ')[0]) || 0;
        
        return {
          lat: parseFloat(float.lat),
          lng: parseFloat(float.lng),
          temp: tempValue,
          salinity: salinityValue,
          value: activeHeatmap === 'temperature' ? tempValue : salinityValue
        };
      })
      .filter(point => !isNaN(point.value) && !isNaN(point.lat) && !isNaN(point.lng)); // Filter out any invalid points
  }, [argoFloats, activeHeatmap]);
  
  // Handle map click to show temperature/salinity at point
  const handleMapClick = useCallback((e) => {
    if (!activeHeatmap || !map || !heatmapData || heatmapData.length === 0) return;
    
    // Find the nearest data point to the clicked location
    const clickedLatLng = e.latlng;
    let nearestPoint = null;
    let minDistance = Infinity;
    
    heatmapData.forEach(point => {
      const distance = Math.sqrt(
        Math.pow(point.lat - clickedLatLng.lat, 2) + 
        Math.pow(point.lng - clickedLatLng.lng, 2)
      ) * 100; // Convert to km (approximate)
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
      }
    });
    
    // Show popup if click is within 5 degrees of a data point
    if (nearestPoint && minDistance < 100) {  // Increased threshold to 100km
      setClickedPoint({
        lat: clickedLatLng.lat,
        lng: clickedLatLng.lng,
        value: nearestPoint.value,
        type: activeHeatmap,
        distance: minDistance < 1 ? 
          `${Math.round(minDistance * 1000)} m away` : 
          `${minDistance.toFixed(1)} km away`
      });
    } else {
      setClickedPoint(null);
    }
  }, [activeHeatmap, heatmapData, map]);
  
  // Toggle heatmap on/off
  const toggleHeatmap = (type) => {
    setActiveHeatmap(activeHeatmap === type ? null : type);
  };

  // Get color gradient based on active heatmap type
  const getGradient = useCallback(() => {
    if (activeHeatmap === 'temperature') {
      // More vibrant temperature gradient with stronger reds and yellows
      return {
        0.0: '#0000FF', // Deep Blue (cold)
        0.1: '#1E90FF', // Dodger Blue
        0.2: '#00BFFF', // Deep Sky Blue
        0.3: '#00FA9A', // Medium Spring Green
        0.4: '#00FF00', // Lime
        0.5: '#7CFC00', // Lawn Green
        0.6: '#FFFF00', // Yellow
        0.7: '#FFD700', // Gold
        0.8: '#FF8C00', // Dark Orange
        0.9: '#FF4500', // Orange Red
        1.0: '#FF0000'  // Red (hot)
      };
    } else {
      // Enhanced salinity gradient with more contrast
      return {
        0.0: '#0000FF', // Blue (low salinity)
        0.2: '#4169E1', // Royal Blue
        0.4: '#00BFFF', // Deep Sky Blue
        0.5: '#00FF7F', // Spring Green
        0.6: '#32CD32', // Lime Green
        0.7: '#FFD700', // Gold
        0.8: '#FFA500', // Orange
        0.9: '#FF6347', // Tomato
        1.0: '#FF0000'  // Red (high salinity)
      };
    }
  }, [activeHeatmap]);


  // Define fetchArgoFloats first
  const fetchArgoFloats = useCallback(async (filterParams = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query string from filter parameters
      const queryParams = new URLSearchParams();
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      const apiUrl = `${API_BASE_URL}/api/floats?${queryParams.toString()}`;
      console.log('Fetching data from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `HTTP error! status: ${response.status}, message: ${errorData.detail || 'No details'}`;
        console.error('API Error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('API Response data:', data);
      
      // Transform data to match expected format if needed
      const formattedData = Array.isArray(data) ? data : [];
      setArgoFloats(formattedData);
      
      // Update map bounds to show all markers
      if (map && formattedData.length > 0) {
        const bounds = L.latLngBounds(formattedData.map(f => [f.lat, f.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
      
      return formattedData;
    } catch (err) {
      console.error('Error in fetchArgoFloats:', err);
      setError(`Failed to load Argo float data: ${err.message}. Please check your connection and try again.`);
      throw err;
    } finally {
      setIsLoading(false);
      setIsFiltering(false);
    }
  }, [map]);

  // Handle filter changes
  const handleFilterChange = useCallback(async (newFilters) => {
    console.log('handleFilterChange called with:', newFilters);
    try {
      setIsFiltering(true);
      setFilters(newFilters);
      
      console.log('Calling fetchArgoFloats with:', newFilters);
      const data = await fetchArgoFloats(newFilters);
      
      console.log('Filtered data received in handleFilterChange:', data);
      if (data && Array.isArray(data)) {
        console.log(`Received ${data.length} data points after filtering`);
        if (data.length > 0) {
          console.log('First data point:', data[0]);
        }
      }
    } catch (error) {
      console.error('Error in handleFilterChange:', error);
    } finally {
      setIsFiltering(false);
    }
  }, [fetchArgoFloats]);

  // Initial data load with Indian Ocean and Bay of Bengal bounds
  useEffect(() => {
    // Define the bounding box for Indian Ocean and Bay of Bengal
    const indianOceanBounds = {
      lat_min: -30,   // Southern Indian Ocean
      lat_max: 30,    // Northern Indian Ocean
      lon_min: 30,    // Eastern Africa
      lon_max: 100    // Western Australia
    };
    
    // Use the fetchArgoFloats function we defined earlier
    fetchArgoFloats(indianOceanBounds).catch(error => {
      console.error('Error in initial data load:', error);
    });
  }, [fetchArgoFloats]);

  // Generate sample depth profile data for a float
  const generateDepthProfile = useCallback((floatId) => {
    const profiles = [];
    const baseTemp = 25 + (Math.random() * 5);
    const baseSalinity = 34.5 + (Math.random() * 2);
    
    for (let depth = 0; depth <= 1000; depth += 10) {
      const temperature = baseTemp - (depth * 0.02) + (Math.random() * 0.5 - 0.25);
      const salinity = baseSalinity + (depth < 200 ? 0 : (depth - 200) * 0.005) + (Math.random() * 0.1 - 0.05);
      
      profiles.push({
        depth: depth,
        temperature: parseFloat(temperature.toFixed(2)),
        salinity: parseFloat(salinity.toFixed(2))
      });
    }
    
    return profiles;
  }, []);

  const handleFloatClick = useCallback((float) => {
    setSelectedFloat(float);
    const profileData = generateDepthProfile(float.id);
    setDepthProfileData(profileData);
    setIsProfileDialogOpen(true);
  }, [generateDepthProfile]);

  const handleCloseDialog = () => {
    setIsProfileDialogOpen(false);
    setSelectedFloat(null);
  };

  // Set initial map view to center on the Indian Ocean and Bay of Bengal
  const mapCenter = [5, 85];  // Centered between Indian Ocean and Bay of Bengal
  const zoomLevel = 4;        // Zoom level to show the entire region

  // Custom marker icon
  const argoIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/4471/4471679.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4">Loading Argo float data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-600">
        <p className="mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Filter Panel */}
      <FloatFilters 
        onFilterChange={handleFilterChange} 
        isLoading={isFiltering} 
      />
      {/* Enhanced Heatmap Controls */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-xl z-10 w-72">
        <h3 className="font-bold text-lg mb-3 text-gray-800">Heatmap Controls</h3>
        
        <div className="space-y-4">
          {/* Heatmap Type Toggle */}
          <div className="flex space-x-2">
            <button
              onClick={() => toggleHeatmap('temperature')}
              className={`flex-1 py-2 rounded-lg transition-colors ${activeHeatmap === 'temperature' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              🌡️ Temperature
            </button>
            <button
              onClick={() => toggleHeatmap('salinity')}
              className={`flex-1 py-2 rounded-lg transition-colors ${activeHeatmap === 'salinity' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              🌊 Salinity
            </button>
          </div>

          {activeHeatmap && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Intensity:</span>
                  <span className="font-mono">{heatmapIntensity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={heatmapIntensity}
                  onChange={(e) => setHeatmapIntensity(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Radius:</span>
                  <span className="font-mono">{heatmapRadius}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={heatmapRadius}
                  onChange={(e) => setHeatmapRadius(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{activeHeatmap === 'temperature' ? 'Cold' : 'Low'}</span>
                  <span>→</span>
                  <span>{activeHeatmap === 'temperature' ? 'Hot' : 'High'}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden">
                  {activeHeatmap === 'temperature' ? (
                    <div className="h-full w-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500"></div>
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500"></div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div style={{ height: '100%', width: '100%' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={zoomLevel} 
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          whenCreated={(mapInstance) => {
            setMap(mapInstance);
            // Fit bounds to show all markers when map is created
            if (argoFloats.length > 0) {
              const bounds = L.latLngBounds(argoFloats.map(f => [f.lat, f.lng]));
              if (bounds.isValid()) {
                mapInstance.fitBounds(bounds, { padding: [50, 50] });
              }
            }
          }}
          onClick={handleMapClick}
        >
          {/* Base Map Layer */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Sea Surface Temperature Layer */}
          <TileLayer
            url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.jpg"
            attribution='Imagery &copy; <a href="https://earthdata.nasa.gov">NASA EOSDIS</a>'
            tileSize={256}
            maxNativeZoom={8}
            bounds={[[-85, -180], [85, 180]]}
            opacity={0.8}
            time=""
            tileMatrixSet="GoogleMapsCompatible_Level8"
            format="image/jpeg"
          />
          
          {/* Add a semi-transparent color overlay for temperature visualization */}
          <TileLayer
            url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.png"
            attribution='Temperature &copy; <a href="https://earthdata.nasa.gov">NASA EOSDIS</a>'
            tileSize={256}
            maxNativeZoom={8}
            bounds={[[-85, -180], [85, 180]]}
            opacity={0.6}
            time=""
            tileMatrixSet="GoogleMapsCompatible_Level8"
            format="image/png"
            transparent={true}
          />

          {/* Enhanced Heatmap Layer for Indian Ocean */}
          {activeHeatmap && heatmapData.length > 0 && (
            <HeatmapLayer
              key={`heatmap-${activeHeatmap}`}
              fitBoundsOnLoad={true}
              fitBoundsOnUpdate={true}
              points={heatmapData}
              longitudeExtractor={m => m.lng}
              latitudeExtractor={m => m.lat}
              intensityExtractor={m => m.value}
              gradient={getGradient()}
              // Adjusted for Indian Ocean conditions
              max={activeHeatmap === 'temperature' ? 32 : 38}  // Max temperature/salinity in Indian Ocean
              min={activeHeatmap === 'temperature' ? 10 : 30}  // Min temperature/salinity in Indian Ocean
              radius={heatmapRadius}
              opacity={heatmapIntensity}
              useLocalExtrema={false}  // Use global min/max for consistent coloring
              maxZoom={18}  // Keep heatmap visible when zoomed out
              minOpacity={0.8}  // Increased minimum opacity for better visibility
              blur={40}  // Increased blur for smoother transitions
              maxIntensity={1.2}  // Slightly increased max intensity for more vibrant colors
              onAdd={(map) => {
                // Force update the heatmap when added to the map
                setTimeout(() => {
                  map.invalidateSize();
                  // Fit to the data bounds if we have data
                  if (heatmapData.length > 0) {
                    const bounds = L.latLngBounds(
                      heatmapData.map(point => [point.lat, point.lng])
                    );
                    if (bounds.isValid()) {
                      map.fitBounds(bounds, { padding: [50, 50] });
                    }
                  }
                }, 0);
              }}
            />
          )}

          {/* Clicked Point Popup */}
          {clickedPoint && (
            <Marker 
              position={[clickedPoint.lat, clickedPoint.lng]}
              icon={L.divIcon({
                html: `
                  <div class="bg-white bg-opacity-95 p-3 rounded-lg shadow-xl border-2 ${
                    clickedPoint.type === 'temperature' ? 'border-blue-200' : 'border-teal-200'
                  } min-w-[180px]">
                    <div class="flex items-center mb-1">
                      <span class="text-2xl mr-2">
                        ${clickedPoint.type === 'temperature' ? '🌡️' : '🌊'}
                      </span>
                      <span class="font-bold text-gray-800">
                        ${clickedPoint.type === 'temperature' ? 'Temperature' : 'Salinity'}
                      </span>
                    </div>
                    <div class="text-2xl font-mono font-bold ${
                      clickedPoint.type === 'temperature' ? 'text-blue-600' : 'text-teal-600'
                    } mb-1">
                      ${clickedPoint.value.toFixed(2)}
                      <span class="text-sm font-normal text-gray-600 ml-1">
                        ${clickedPoint.type === 'temperature' ? '°C' : 'PSU'}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500 mb-1">
                      ${clickedPoint.lat >= 0 ? 
                        `${clickedPoint.lat.toFixed(2)}°N` : 
                        `${Math.abs(clickedPoint.lat).toFixed(2)}°S`
                      }, 
                      ${clickedPoint.lng >= 0 ? 
                        `${clickedPoint.lng.toFixed(2)}°E` : 
                        `${Math.abs(clickedPoint.lng).toFixed(2)}°W`
                      }
                    </div>
                    <div class="text-xs text-gray-400 italic">
                      ${clickedPoint.distance} from nearest data point
                    </div>
                    <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
                      border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent 
                      ${clickedPoint.type === 'temperature' ? 'border-t-blue-200' : 'border-t-teal-200'}">
                    </div>
                  </div>
                `,
                className: 'bg-transparent border-0',
                iconSize: [180, 0],
                iconAnchor: [90, 100],
                popupAnchor: [0, -90]
              })}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  setClickedPoint(null);
                }
              }}
            >
              <Popup>
                <div class="text-sm">
                  Click to close
                </div>
              </Popup>
            </Marker>
          )}

          {/* Argo Float Markers */}
          {!isLoading && !error && argoFloats
            .filter(float => 
              !isNaN(parseFloat(float.lat)) && 
              !isNaN(parseFloat(float.lng)) &&
              Math.abs(parseFloat(float.lat)) <= 90 &&
              Math.abs(parseFloat(float.lng)) <= 180
            )
            .map((float, index) => (
            <Marker
              key={`${float.id || 'marker'}-${index}`}
              position={[
                parseFloat(float.lat),
                parseFloat(float.lng)
              ]}
              icon={argoIcon}
              eventHandlers={{
                click: () => handleFloatClick(float),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-bold">{float.name}</h3>
                  <p>Last seen: {float.lastSeen}</p>
                  <p>Temperature: {float.temp}</p>
                  <p>Salinity: {float.salinity}</p>
                  <button 
                    className="mt-2 text-blue-600 hover:underline text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFloatClick(float);
                    }}
                  >
                    View Depth Profile →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Depth Profile Dialog */}
      {isProfileDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true" 
              onClick={handleCloseDialog}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            {depthProfileData.length > 0 ? (
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <div className="bg-blue-600 px-4 py-3 sm:px-6 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-white">
                      {selectedFloat ? `${selectedFloat.name} - Depth Profile` : 'Depth Profile'}
                    </h3>
                    <button
                      type="button"
                      className="text-white hover:text-gray-200 focus:outline-none"
                      onClick={handleCloseDialog}
                    >
                      <FiX className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="h-[500px] w-full">
                    <DepthProfileChart 
                      data={depthProfileData} 
                      title={`${selectedFloat?.name || 'Float'} - Depth Profile`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                <div className="bg-blue-600 px-4 py-3 sm:px-6 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-white">
                      {selectedFloat ? `${selectedFloat.name} - Depth Profile` : 'Depth Profile'}
                    </h3>
                    <button
                      type="button"
                      className="text-white hover:text-gray-200 focus:outline-none"
                      onClick={handleCloseDialog}
                    >
                      <FiX className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="text-center text-gray-600 py-8">
                    <p>Loading depth profile data...</p>
                    <p className="text-sm text-gray-500 mt-2">If this takes too long, please try again.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="map-legend absolute bottom-4 left-4 z-10 bg-white p-3 rounded-lg shadow-md">
        <h4 className="font-bold mb-2">Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/4471/4471679.png" 
              alt="Argo Float" 
              width="20" 
              className="mr-2" 
            />
            <span>Argo Float</span>
          </div>
          {activeHeatmap === 'temperature' && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>20°C</span>
                <span>35°C</span>
              </div>
              <div className="h-4 w-full bg-gradient-to-r from-blue-500 via-cyan-500 via-green-500 via-yellow-500 via-orange-500 to-red-500 rounded"></div>
            </div>
          )}
          {activeHeatmap === 'salinity' && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>30 PSU</span>
                <span>40 PSU</span>
              </div>
              <div className="h-4 w-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded"></div>
            </div>
          )}
        </div>
      </div>

      {/* Map Note - Removed sample data note */}
    </div>
  );
};

export default ArgoFloatsMap;
