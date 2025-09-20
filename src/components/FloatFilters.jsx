import React, { useState } from 'react';
import { 
  FiFilter, 
  FiCalendar, 
  FiMapPin, 
  FiMinus, 
  FiPlus, 
  FiChevronDown, 
  FiChevronUp,
  FiMaximize2,
  FiMinimize2,
  FiX
} from 'react-icons/fi';

const FilterSection = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="mb-6 bg-white rounded-xl shadow-md overflow-hidden border border-[#e2e8f0]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-8 py-5 bg-gradient-to-r from-[#1a5f7a] to-[#0081a7] text-white font-semibold text-left rounded-t-lg hover:opacity-95 transition-all duration-200"
      >
        <span className="flex items-center space-x-3">
          <FiMapPin className="text-white" />
          <span>{title}</span>
        </span>
        {isOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
      </button>
      
      <div 
        className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-screen' : 'max-h-0'}`}
      >
        <div className="p-8 bg-white space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};

const FloatFilters = ({ onFilterChange, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [filters, setFilters] = useState({
    latMin: '',
    latMax: '',
    lonMin: '',
    lonMax: '',
    depthMax: '',
    startDate: '',
    endDate: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create a new filters object with the correct parameter names
    const apiFilters = {
      lat_min: filters.latMin || undefined,
      lat_max: filters.latMax || undefined,
      lon_min: filters.lonMin || undefined,
      lon_max: filters.lonMax || undefined,
      depth_max: filters.depthMax ? parseFloat(filters.depthMax) : undefined,
      start_date: filters.startDate || undefined,
      end_date: filters.endDate || undefined
    };
    
    console.log('Applying filters:', apiFilters);
    onFilterChange(apiFilters);
  };

  const resetFilters = () => {
    console.log('Resetting filters');
    setFilters({
      latMin: '',
      latMax: '',
      lonMin: '',
      lonMax: '',
      depthMax: '',
      startDate: '',
      endDate: ''
    });
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  
  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="p-3 bg-gradient-to-r from-[#0077b6] to-[#0096c7] text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          title="Show filters"
        >
          <FiFilter size={20} />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-[#f0f8ff] bg-opacity-90 z-50 transition-all duration-300"
         style={{
           opacity: isMinimized ? 0 : 1,
           visibility: isMinimized ? 'hidden' : 'visible',
           backdropFilter: 'blur(4px)'
         }}>
      <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300"
           style={{
             transform: isExpanded ? 'translateY(0)' : 'translateY(20px)',
             maxHeight: '90vh',
             width: '90%',
             maxWidth: '1400px',
             minWidth: '1000px'
           }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a5f7a] to-[#0081a7] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FiFilter className="text-white" size={20} />
            </div>
            <h3 className="text-white font-bold text-xl">Ocean Data Filters</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${hasActiveFilters ? 'bg-white/20 text-white hover:bg-white/30' : 'text-white/50 cursor-not-allowed'}`}
            >
              Reset All
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
              title="Minimize"
            >
              <FiMinus size={18} />
            </button>
          </div>
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-white/90 hover:bg-blue-400/30 rounded-lg transition-all hover:scale-105"
            title="Minimize"
          >
            <FiMinimize2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-white/90 hover:bg-blue-400/30 rounded-lg transition-all hover:scale-105"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
        </div>
      </div>
      
      <div className="p-8 max-h-[70vh] overflow-y-auto bg-[#f8fafc]">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <FilterSection title="Location">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1a5f7a] mb-2 uppercase tracking-wider">
                    Latitude Range
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="relative">
                      <input
                        type="number"
                        name="latMin"
                        placeholder="Min (-90 to 90)"
                        min="-90"
                        max="90"
                        step="0.0001"
                        value={filters.latMin}
                        onChange={handleInputChange}
                        className="w-full p-4 pl-14 text-base border-2 border-[#cbd5e1] bg-white rounded-xl focus:ring-2 focus:ring-[#90e0ef] focus:border-[#1a5f7a] transition-all duration-200 shadow-sm hover:border-[#90e0ef] text-[#1e293b] placeholder-[#94a3b8] focus:outline-none"
                      />
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#1a5f7a] text-base font-medium pointer-events-none">°N</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        name="latMax"
                        placeholder="Max (-90 to 90)"
                        min="-90"
                        max="90"
                        step="0.0001"
                        value={filters.latMax}
                        onChange={handleInputChange}
                        className="w-full p-3.5 pl-12 text-base border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-[#90e0ef] focus:border-[#0096c7] transition-all duration-200 shadow-sm hover:border-[#90e0ef] text-[#023047] placeholder-gray-400"
                      />
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0077b6] text-base font-medium pointer-events-none">°N</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1a5f7a] mb-2 uppercase tracking-wider">
                    Longitude Range
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="relative">
                      <input
                        type="number"
                        name="lonMin"
                        placeholder="Min (-180 to 180)"
                        min="-180"
                        max="180"
                        step="0.0001"
                        value={filters.lonMin}
                        onChange={handleInputChange}
                        className="w-full p-3.5 pl-12 text-base border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-[#90e0ef] focus:border-[#0096c7] transition-all duration-200 shadow-sm hover:border-[#90e0ef] text-[#023047] placeholder-gray-400"
                      />
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0077b6] text-base font-medium pointer-events-none">°E</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        name="lonMax"
                        placeholder="Max (-180 to 180)"
                        min="-180"
                        max="180"
                        step="0.0001"
                        value={filters.lonMax}
                        onChange={handleInputChange}
                        className="w-full p-3.5 pl-12 text-base border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-[#90e0ef] focus:border-[#0096c7] transition-all duration-200 shadow-sm hover:border-[#90e0ef] text-[#023047] placeholder-gray-400"
                      />
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0077b6] text-base font-medium pointer-events-none">°E</span>
                    </div>
                  </div>
                </div>
              </div>
            </FilterSection>

            <FilterSection title="Depth & Time">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1a5f7a] mb-2 uppercase tracking-wider">
                    Maximum Depth (meters)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="depthMax"
                      placeholder="Maximum depth"
                      min="0"
                      step="0.1"
                      value={filters.depthMax}
                      onChange={handleInputChange}
                      className="w-full p-2.5 pl-12 text-sm border-2 border-green-200 bg-white rounded-lg focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-all shadow-sm"
                    />
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0077b6] text-base font-medium pointer-events-none">m</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1a5f7a] mb-2 uppercase tracking-wider">
                    Date Range
                  </label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleInputChange}
                        className="w-full p-3.5 pl-12 text-base border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-[#90e0ef] focus:border-[#0096c7] transition-all duration-200 shadow-sm hover:border-[#90e0ef] text-[#023047] placeholder-gray-400"
                      />
                      <FiCalendar className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleInputChange}
                        className="w-full p-3.5 pl-12 text-base border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-[#90e0ef] focus:border-[#0096c7] transition-all duration-200 shadow-sm hover:border-[#90e0ef] text-[#023047] placeholder-gray-400"
                      />
                      <FiCalendar className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </FilterSection>

            <div className="pt-6 col-span-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full max-w-md mx-auto bg-gradient-to-r from-[#1a5f7a] to-[#0081a7] hover:from-[#0081a7] hover:to-[#00b4d8] text-white py-4 px-8 rounded-xl font-semibold text-base transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 hover:scale-[1.01]"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Applying...
                  </>
                ) : (
                  <>
                    <FiFilter className="text-white" />
                    <span>Apply Filters</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="px-8 py-4 border-2 border-[#90e0ef] bg-white text-[#1a5f7a] hover:bg-[#f0f8ff] hover:border-[#0081a7] rounded-xl font-medium text-base transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
              >
                <FiX />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FloatFilters;
