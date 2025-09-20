import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

// This ensures we only load the heat plugin once
let heatPluginLoaded = false;

// Create a custom heat layer class if it doesn't exist
if (typeof L.HeatLayer === 'undefined') {
  L.HeatLayer = L.Layer.extend({
    initialize: function (latlngs, options) {
      this._latlngs = latlngs;
      L.setOptions(this, options);
    },
    
    onAdd: function (map) {
      this._map = map;
      if (!this._heat) {
        this._initHeat();
      }
      this._update();
    },
    
    onRemove: function (map) {
      if (this._heat) {
        this._map.getPanes().overlayPane.removeChild(this._heat);
        this._heat = null;
      }
    },
    
    _initHeat: function () {
      this._heat = L.DomUtil.create('div', 'leaflet-heatmap-layer');
      this._heat.style.position = 'absolute';
      this._heat.style.pointerEvents = 'none';
      this._map.getPanes().overlayPane.appendChild(this._heat);
      
      this._heatmap = window.L.heatLayer([], this.options);
    },
    
    _update: function () {
      if (!this._map) return;
      
      const size = this._map.getSize();
      this._heat.style.width = size.x + 'px';
      this._heat.style.height = size.y + 'px';
      
      if (this._heatmap) {
        this._heatmap.setOptions(this.options);
        this._heatmap.setLatLngs(this._latlngs);
      }
    },
    
    setLatLngs: function (latlngs) {
      this._latlngs = latlngs;
      if (this._heatmap) {
        this._heatmap.setLatLngs(latlngs);
      }
      return this;
    },
    
    setOptions: function (options) {
      L.setOptions(this, options);
      if (this._heatmap) {
        this._heatmap.setOptions(options);
      }
      return this;
    }
  });
  
  L.heatLayer = function (latlngs, options) {
    return new L.HeatLayer(latlngs, options);
  };
}

const HeatmapLayer = ({ points, radius = 25, blur = 15, maxZoom = 18, minOpacity = 0.8, gradient }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);
  const isMounted = useRef(true);

  // Load leaflet.heat and initialize the heatmap
  useEffect(() => {
    const loadHeatmap = async () => {
      try {
        // Only load the plugin once
        if (!heatPluginLoaded) {
          try {
            // Try to load the plugin
            const heatModule = await import('leaflet.heat');
            // The plugin might be available in different ways depending on the version
            const heat = heatModule.default || window.Heat || heatModule.heat;
            
            if (!L.heat && heat) {
              L.heat = heat;
              heatPluginLoaded = true;
            }
          } catch (error) {
            console.error('Failed to load leaflet.heat:', error);
            return;
          }
        }

        if (!isMounted.current || !map || !L.heat) return;

        // Format points for Leaflet.heat
        const heatPoints = points.map(point => [
          point.lat,
          point.lng,
          point.value || 1 // Default intensity to 1 if not provided
        ]);

        // Remove existing layer if it exists
        if (heatLayerRef.current) {
          map.removeLayer(heatLayerRef.current);
        }

        // Create new heat layer
        const heat = L.heatLayer(heatPoints, {
          radius,
          blur,
          maxZoom,
          minOpacity,
          gradient: gradient || {
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
          }
        });

        // Add to map and store reference
        heat.addTo(map);
        heatLayerRef.current = heat;

      } catch (error) {
        console.error('Error initializing heatmap:', error);
      }
    };

    // Only load if we have points
    if (points && points.length > 0) {
      loadHeatmap();
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map]);

  // Update heat layer when points or styles change
  useEffect(() => {
    if (!heatLayerRef.current || !points || points.length === 0) return;

    const heatPoints = points.map(point => [
      point.lat,
      point.lng,
      point.value || 1
    ]);

    // Update the existing layer
    heatLayerRef.current.setOptions({
      radius,
      blur,
      maxZoom,
      minOpacity,
      gradient: gradient || {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    });

    heatLayerRef.current.setLatLngs(heatPoints);
  }, [points, radius, blur, maxZoom, minOpacity, gradient]);

  // Handle component unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map]);

  return null; // This component doesn't render anything itself
};

export default HeatmapLayer;
