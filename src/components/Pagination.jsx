// src/components/Pagination.jsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  darkMode = false,
  showItemCount = true
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pagination with ellipsis
      if (currentPage <= 3) {
        // Show first pages + ellipsis + last page
        for (let i = 1; i <= 4; i++) pages.push(i);
        if (totalPages > 5) pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Show first page + ellipsis + last pages
        pages.push(1);
        if (totalPages > 5) pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        // Show first + ellipsis + current range + ellipsis + last
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between px-4 py-6 sm:px-6 mt-6 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } border-t rounded-b-lg`}>
      <div className="flex-1 flex flex-col sm:hidden gap-4">
        {/* Mobile pagination info */}
        {showItemCount && (
          <div className="text-center">
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Showing {startItem}-{endItem} of {totalItems} results
            </p>
          </div>
        )}
        
        {/* Mobile pagination controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-6 py-3 border text-base font-medium rounded-lg ${
              darkMode
                ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
            } disabled:cursor-not-allowed transition-colors`}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </button>
          
          <div className={`flex items-center px-4 py-2 text-sm font-medium ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <span className="mx-2">Page {currentPage} of {totalPages}</span>
          </div>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-6 py-3 border text-base font-medium rounded-lg ${
              darkMode
                ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50'
            } disabled:cursor-not-allowed transition-colors`}
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>

      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        {showItemCount && (
          <div>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Showing{' '}
              <span className="font-medium">{startItem}</span>
              {' '}to{' '}
              <span className="font-medium">{endItem}</span>
              {' '}of{' '}
              <span className="font-medium">{totalItems}</span>
              {' '}results
            </p>
          </div>
        )}

        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm space-x-1" aria-label="Pagination">
            {/* Previous button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                darkMode
                  ? 'border-gray-600 text-gray-400 bg-gray-700 hover:bg-gray-600 disabled:opacity-50'
                  : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && onPageChange(page)}
                disabled={page === '...'}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg transition-colors ${
                  page === currentPage
                    ? darkMode
                      ? 'z-10 bg-blue-600 border-blue-600 text-white'
                      : 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : page === '...'
                    ? darkMode
                      ? 'border-gray-600 text-gray-400 bg-gray-700 cursor-default'
                      : 'border-gray-300 text-gray-700 bg-white cursor-default'
                    : darkMode
                    ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}

            {/* Next button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                darkMode
                  ? 'border-gray-600 text-gray-400 bg-gray-700 hover:bg-gray-600 disabled:opacity-50'
                  : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50'
              } disabled:cursor-not-allowed`}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;