import React from 'react';
import { ChevronLeft } from 'lucide-react';

const ReadOnlyAssessmentView = ({ 
  assessment, 
  getFactorRiskColor, 
  calculateRiskScore, 
  getRiskLevel, 
  onClose 
}) => {
  const factorLabels = {
    supervision: "Supervision",
    planning: "Planning",
    teamSelection: "Team Selection",
    teamFitness: "Team Fitness",
    environment: "Environment",
    complexity: "Event Complexity"
  };
  
  const riskScore = calculateRiskScore();
  const riskLevelInfo = getRiskLevel(riskScore);
  
  return (
    <div>
      {/* Header with risk level */}
      <div className={`${riskLevelInfo.color} rounded-lg shadow p-6 mb-6 text-white`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">GAR Assessment Details</h1>
            <div className="text-lg">
              {assessment.date} at {assessment.time} • {assessment.station}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold">{riskScore}</div>
            <div className="text-xl font-semibold">{riskLevelInfo.level}</div>
          </div>
        </div>
      </div>
      
      {/* Basic info card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Assessment Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Details</h3>
            <div className="bg-gray-50 dark:bg-gray-750 rounded-md p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-gray-500 dark:text-gray-400">Date:</div>
                <div className="font-medium text-gray-900 dark:text-white">{assessment.date}</div>
                
                <div className="text-gray-500 dark:text-gray-400">Time:</div>
                <div className="font-medium text-gray-900 dark:text-white">{assessment.time}</div>
                
                <div className="text-gray-500 dark:text-gray-400">Type:</div>
                <div className="font-medium text-gray-900 dark:text-white">{assessment.type}</div>
                
                <div className="text-gray-500 dark:text-gray-400">Station:</div>
                <div className="font-medium text-gray-900 dark:text-white">{assessment.station}</div>
                
                <div className="text-gray-500 dark:text-gray-400">Status:</div>
                <div className="font-medium text-gray-900 dark:text-white capitalize">{assessment.status}</div>
                
                <div className="text-gray-500 dark:text-gray-400">Captain:</div>
                <div className="font-medium text-gray-900 dark:text-white">{assessment.captain || "Unknown"}</div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Weather Conditions</h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-gray-500 dark:text-gray-400">Temperature:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.temperature}{assessment.weather?.temperatureUnit}
                </div>
                
                <div className="text-gray-500 dark:text-gray-400">Wind:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.wind} mph {assessment.weather?.windDirection}
                </div>
                
                <div className="text-gray-500 dark:text-gray-400">Humidity:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.humidity}%
                </div>
                
                <div className="text-gray-500 dark:text-gray-400">Precipitation:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.precipitation} 
                  {assessment.weather?.precipitationRate ? ` (${assessment.weather.precipitationRate}"/hr)` : ''}
                </div>
                
                <div className="text-gray-500 dark:text-gray-400 col-span-2">Alerts:</div>
                <div className="font-medium text-amber-600 dark:text-amber-400 col-span-2">
                  {assessment.weather?.alerts || "None"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Risk factors card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Risk Factors</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(assessment.riskFactors).map(([factor, value]) => {
            const riskColor = getFactorRiskColor(value);
            
            return (
              <div key={factor} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                <div className={`${riskColor} text-white font-bold w-12 h-12 flex items-center justify-center rounded-full mr-4`}>
                  {value}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {factorLabels[factor]}
                  </h3>
                  <div className="mt-1 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div 
                      className={`${riskColor} h-2 rounded-full`} 
                      style={{ width: `${(value / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mitigation strategies card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Mitigation Strategies</h2>
        
        {Object.entries(assessment.mitigations).some(([_, value]) => value && value.trim()) ? (
          <div className="space-y-4">
            {Object.entries(assessment.mitigations).map(([factor, value]) => {
              // Only show factors that have mitigation strategies
              if (!value || !value.trim()) return null;
              
              const factorScore = assessment.riskFactors[factor];
              const riskColor = getFactorRiskColor(factorScore);
              const borderColor = riskColor.replace('bg-', 'border-');
              
              return (
                <div key={factor} className={`border-l-4 ${borderColor} pl-4 py-2`}>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {factorLabels[factor]} ({factorScore})
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <p>No mitigation strategies were provided for this assessment.</p>
          </div>
        )}
      </div>
      
      {/* Footer actions */}
      <div className="flex justify-between mt-6">
        <button 
          className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          onClick={onClose}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Assessment List
        </button>
        
        <div className="flex space-x-3">
          <button 
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            onClick={() => window.print()}
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadOnlyAssessmentView;