import React, { useRef } from 'react';

// Using uncontrolled component with ref to avoid focus issues
const RiskFactorOptimized = ({ name, description, value, onChange, disabled = false, getFactorRiskColor }) => {
  const riskColor = getFactorRiskColor(value);
  const sliderRef = useRef(null);

  // Handle changes using onBlur instead of onChange to avoid focus issues
  const handleSliderChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-md p-4 ${disabled ? 'opacity-90' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div className={`${riskColor} text-white font-bold w-10 h-10 flex items-center justify-center rounded-full`}>
          {value}
        </div>
      </div>

      <div className="flex items-center">
        <span className="text-xs text-green-600 dark:text-green-400 mr-2">Low Risk</span>

        {/* Using slider input with onBlur to avoid focus issues */}
        <input
          type="range"
          min="0"
          max="10"
          ref={sliderRef}
          className={`flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          style={{
            background: `linear-gradient(to right,
              #4ade80 0%, #4ade80 40%,
              #f59e0b 40%, #f59e0b 70%,
              #ef4444 70%, #ef4444 100%)`
          }}
          defaultValue={value}
          onChange={handleSliderChange}
          disabled={disabled}
        />

        <span className="text-xs text-red-600 dark:text-red-400 ml-2">High Risk</span>
      </div>
    </div>
  );
};

export default RiskFactorOptimized;