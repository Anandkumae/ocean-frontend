import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DepthProfileChart = ({ data, title = 'Depth Profile' }) => {
  console.log('Rendering DepthProfileChart with data:', data);
  
  // Ensure data is available and in the correct format
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log('No valid data provided to DepthProfileChart');
    return (
      <div className="bg-white rounded-lg shadow-md h-full">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <div className="p-4">
          <div className="text-center text-gray-500 p-4">
            No depth profile data available
          </div>
        </div>
      </div>
    );
  }

  // Check if we have both temperature and salinity data
  const hasTemperature = data.some(item => item.temperature !== undefined);
  const hasSalinity = data.some(item => item.salinity !== undefined);
  
  console.log('Has temperature data:', hasTemperature);
  console.log('Has salinity data:', hasSalinity);
  
  // Ensure we have at least one data type to display
  if (!hasTemperature && !hasSalinity) {
    console.log('No valid data to display in DepthProfileChart');
    return (
      <div className="bg-white rounded-lg shadow-md h-full">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
          <h3 className="text-lg font-medium">{title}</h3>
        </div>
        <div className="p-4">
          <div className="text-center text-gray-500 p-4">
            No valid data available for the depth profile
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md h-full" style={{ minHeight: '500px' }}>
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      <div className="p-4 h-[calc(100%-64px)]">
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={['auto', 'auto']}
                label={{ 
                  value: hasTemperature ? 'Temperature (°C)' : 'Salinity (PSU)', 
                  position: 'bottom',
                  offset: 0
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                dataKey="depth" 
                type="number" 
                domain={['auto', 'auto']}
                reversed={true}
                tick={{ fontSize: 12 }}
                label={{ 
                  value: 'Depth (m)', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 12 }
                }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  const unit = name === 'temperature' ? '°C' : 'PSU';
                  return [`${value} ${unit}`, name === 'temperature' ? 'Temperature' : 'Salinity'];
                }}
                labelFormatter={(depth) => `Depth: ${depth} m`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              />
              <Legend />
              {hasTemperature && (
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {hasSalinity && (
                <Line
                  type="monotone"
                  dataKey="salinity"
                  name="Salinity"
                  stroke="#82ca9d"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DepthProfileChart;
