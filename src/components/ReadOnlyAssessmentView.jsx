import React from 'react';
import { ChevronLeft, Download } from 'lucide-react';
import { formatDatePST } from '../utils/timezone';

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
  
  // Export to PDF function
  const exportToPDF = () => {
    if (!assessment) return;

    // Import required libraries dynamically
    import('jspdf').then(async ({ default: jsPDF }) => {
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set font styles
      pdf.setFont('helvetica', 'normal');

      // Helper functions for styling
      const addSectionTitle = (text, y) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(text, 15, y);
        pdf.setDrawColor(0, 0, 0);
        pdf.line(15, y + 2, 195, y + 2);
        return y + 10;
      };

      const addField = (label, value, y) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(label, 15, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '-', 60, y);
        return y + 6;
      };

      const addRiskFactor = (label, value, score, y) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(label, 15, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, 80, y);
        
        // Add colored score box - Fixed GAR risk level colors
        const scoreColor = score <= 3 ? [0, 128, 0] : score <= 6 ? [255, 165, 0] : [255, 0, 0];
        pdf.setFillColor(...scoreColor);
        pdf.rect(170, y - 4, 20, 6, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text(score.toString(), 180, y, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
        
        return y + 8;
      };

      const addParagraph = (text, y, maxWidth = 180) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(text, maxWidth);
        
        let currentY = y;
        const lineHeight = 6;
        const pageHeight = 280; // A4 page height minus margins
        
        lines.forEach(line => {
          // Check if we need a new page
          if (currentY + lineHeight > pageHeight) {
            pdf.addPage();
            currentY = 20; // Reset to top of new page with margin
          }
          
          pdf.text(line, 15, currentY);
          currentY += lineHeight;
        });
        
        return currentY;
      };
      
      // Helper function to check if we need a new page and add one
      const checkPageBreak = (currentY, neededHeight = 20) => {
        const pageHeight = 280;
        if (currentY + neededHeight > pageHeight) {
          pdf.addPage();
          return 20; // Return new Y position at top of page
        }
        return currentY;
      };

      // Load and add logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      try {
        // Try to load the logo
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = '/SMFD_1@2x.webp';
        });
        
        // Add logo to PDF (left side)
        const logoWidth = 25;
        const logoHeight = 25;
        const logoX = 15;
        const logoY = 10;
        
        // Convert image to base64 and add to PDF
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        ctx.drawImage(logoImg, 0, 0);
        const logoDataUrl = canvas.toDataURL('image/png');
        
        pdf.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch (error) {
        console.warn('Could not load logo for PDF:', error);
      }
      
      // Header
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SOUTHERN MARIN FIRE DEPARTMENT', 105, 18, { align: 'center' });
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('GAR Assessment Report', 105, 28, { align: 'center' });
      
      // Date stamp (right side)
      pdf.setFontSize(10);
      const now = new Date();
      pdf.text(`Generated: ${formatDatePST(now)}`, 190, 25, { align: 'right' });
      
      // Header line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(15, 38, 195, 38);

      // Reset text color
      pdf.setTextColor(0, 0, 0);

      // Start positioning
      let y = 50;

      // Risk Level Box
      const boxColor = riskLevelInfo.level === 'Low' ? [0, 128, 0] : 
                       riskLevelInfo.level === 'Medium' ? [255, 165, 0] : 
                       riskLevelInfo.level === 'High' ? [255, 140, 0] : [255, 0, 0];
      
      pdf.setFillColor(...boxColor);
      pdf.rect(15, y - 8, 180, 20, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(`Risk Level: ${riskLevelInfo.level} (Score: ${riskScore})`, 105, y + 2, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      
      y += 25;

      // Assessment Information
      y = addSectionTitle('Assessment Information', y);
      y = addField('Date:', assessment.date, y);
      y = addField('Time:', assessment.time, y);
      y = addField('Type:', assessment.type, y);
      y = addField('Station:', assessment.station, y);
      y = addField('Status:', assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1), y);
      y = addField('Captain/Officer:', assessment.captain || '-', y);
      
      y += 10;

      // Weather Conditions
      if (assessment.weather) {
        y = addSectionTitle('Weather Conditions', y);
        y = addField('Temperature:', 
          assessment.weather.temperature && assessment.weather.temperatureUnit 
            ? `${assessment.weather.temperature}${assessment.weather.temperatureUnit}` 
            : 'N/A', y);
        y = addField('Wind:', 
          assessment.weather.wind && assessment.weather.windDirection 
            ? `${assessment.weather.wind} mph ${assessment.weather.windDirection}` 
            : 'N/A', y);
        y = addField('Humidity:', 
          assessment.weather.humidity ? `${assessment.weather.humidity}%` : 'N/A', y);
        y = addField('Precipitation:', 
          assessment.weather.precipitation 
            ? `${assessment.weather.precipitation}${assessment.weather.precipitationRate ? ` (${assessment.weather.precipitationRate}"/hr)` : ''}` 
            : 'N/A', y);
        y = addField('Wave Height:', 
          assessment.weather.waveHeight ? `${assessment.weather.waveHeight} ft` : 'N/A', y);
        y = addField('Wave Period:', 
          assessment.weather.wavePeriod && assessment.weather.waveDirection 
            ? `${assessment.weather.wavePeriod} sec ${assessment.weather.waveDirection}` 
            : 'N/A', y);
        y = addField('Weather Alerts:', assessment.weather.alerts || 'None', y);
        y += 10;
      }

      // Risk Factors
      y = addSectionTitle('Risk Factors Assessment', y);
      Object.entries(assessment.riskFactors).forEach(([key, score]) => {
        if (key !== 'weatherConditions') {
          y = addRiskFactor(factorLabels[key], 
            score <= 1 ? 'Good' : score <= 3 ? 'Moderate' : 'Poor', 
            score, y);
        }
      });
      
      y += 10;

      // Mitigation Strategies
      if (assessment.mitigations) {
        const mitigations = assessment.mitigations;
        const hasMitigations = Object.values(mitigations).some(strategy => strategy && strategy.trim());
        
        if (hasMitigations) {
          // Check if we need a new page for mitigation strategies
          y = checkPageBreak(y, 30);
          y = addSectionTitle('Mitigation Strategies', y);
          
          // Add each mitigation strategy if it exists
          Object.entries(mitigations).forEach(([factor, strategy]) => {
            if (strategy && strategy.trim()) {
              const factorName = factorLabels[factor] || factor;
              
              // Check if we need a new page before adding this strategy
              y = checkPageBreak(y, 25);
              
              // Add factor name in bold
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(11);
              pdf.text(`${factorName}:`, 15, y);
              y += 6;
              
              // Add strategy text as paragraph (this handles its own page breaks)
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(10);
              y = addParagraph(strategy, y, 180);
              y += 8; // Extra spacing between strategies
            }
          });
          
          y += 10; // Extra spacing after all mitigations
        }
      }

      // Footer (place on the last page at the bottom)
      y = checkPageBreak(y, 20);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text('This is an official GAR Assessment report generated by the FullboxHQ System', 105, Math.max(y + 10, 275), { align: 'center' });

      // Generate filename
      const filename = `GAR_Assessment_${assessment.station.replace(/\s+/g, '_')}_${assessment.date.replace(/\//g, '-')}.pdf`;
      
      // Save the PDF
      pdf.save(filename);
    }).catch(error => {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    });
  };
  
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
                  {assessment.weather?.temperature && assessment.weather?.temperatureUnit 
                    ? `${assessment.weather.temperature}${assessment.weather.temperatureUnit}` 
                    : 'N/A'}
                </div>
                
                <div className="text-gray-500 dark:text-gray-400">Wind:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.wind && assessment.weather?.windDirection 
                    ? `${assessment.weather.wind} mph ${assessment.weather.windDirection}` 
                    : 'N/A'}
                </div>
                
                <div className="text-gray-500 dark:text-gray-400">Humidity:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.humidity ? `${assessment.weather.humidity}%` : 'N/A'}
                </div>
                
                <div className="text-gray-500 dark:text-gray-400">Precipitation:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.precipitation 
                    ? `${assessment.weather.precipitation}${assessment.weather?.precipitationRate ? ` (${assessment.weather.precipitationRate}"/hr)` : ''}` 
                    : 'N/A'}
                </div>
                
                <div className="text-gray-500 dark:text-gray-400">Wave Height:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.waveHeight ? `${assessment.weather.waveHeight} ft` : 'N/A'}
                </div>
                
                <div className="text-gray-500 dark:text-gray-400">Wave Period:</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {assessment.weather?.wavePeriod && assessment.weather?.waveDirection 
                    ? `${assessment.weather.wavePeriod} sec ${assessment.weather.waveDirection}` 
                    : 'N/A'}
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
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
            onClick={exportToPDF}
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadOnlyAssessmentView;