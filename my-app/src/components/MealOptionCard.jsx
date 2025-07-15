import React from 'react';
import { CheckCircle } from 'lucide-react';

const MealOptionCard = ({ option, isSelected, onSelect, disabled }) => {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`relative group border-2 rounded-lg overflow-hidden text-left transition-all duration-200 w-full disabled:opacity-60 disabled:cursor-not-allowed ${
        isSelected
          ? 'border-gray-900 shadow-lg'
          : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 bg-gray-900 text-white rounded-full p-1 z-10">
          <CheckCircle className="w-5 h-5" />
        </div>
      )}
      <div className="aspect-video bg-gray-100">
        <img
          src={option.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}
          alt={option.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-base text-gray-900 truncate">{option.name}</h4>
        <p className="text-sm text-gray-600 mt-1 h-10 overflow-hidden">{option.description}</p>
        {option.tags && option.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {option.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

export default MealOptionCard;
