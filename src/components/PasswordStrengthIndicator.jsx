import React from 'react';
import { validatePassword } from '../utils/security';

const PasswordStrengthIndicator = ({ password, showRequirements = true }) => {
  const validation = validatePassword(password);
  
  const getStrengthColor = () => {
    switch (validation.strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };
  
  const getStrengthWidth = () => {
    if (!password) return '0%';
    return `${(validation.score / 5) * 100}%`;
  };
  
  return (
    <div className="mt-2">
      {password && (
        <>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">Password strength</span>
            <span className={`text-xs font-medium ${
              validation.strength === 'weak' ? 'text-red-600' :
              validation.strength === 'medium' ? 'text-yellow-600' :
              validation.strength === 'strong' ? 'text-green-600' :
              'text-gray-600'
            }`}>
              {validation.strength ? validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1) : ''}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getStrengthColor()}`}
              style={{ width: getStrengthWidth() }}
            />
          </div>
        </>
      )}
      
      {showRequirements && validation.messages.length > 0 && (
        <ul className="mt-2 space-y-1">
          {validation.messages.map((message, index) => (
            <li key={index} className="text-xs text-gray-600 flex items-start">
              <span className="mr-1">•</span>
              <span>{message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;