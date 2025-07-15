import React from 'react';
import { Check, Circle, ChevronRight } from 'lucide-react';
import MealOptionCard from './MealOptionCard'; // ודא שקובץ זה קיים

const MealSelectionForm = ({
  days,
  meals,
  activeDay,
  setActiveDay,
  handleChange,
  isDayComplete,
  show,
  categories,
  options: allOptions,
  handleSubmit,
  allowEdit,
  getProgress,
}) => {
  const selectedCateringType = meals[activeDay].catering;

  return (
    <>
      {/* Day Navigation - Mobile Scrollable */}
      <div className="mb-6 sm:mb-8">
        <div className="flex gap-1 sm:gap-2 bg-white border border-gray-200 p-1 sm:p-2 rounded-lg shadow-sm overflow-x-auto">
          {days.map((day, index) => {
            const isComplete = isDayComplete(meals[index]);
            return (
              <button
                key={day}
                disabled={!allowEdit}
                onClick={() => setActiveDay(index)}
                className={`flex-shrink-0 min-w-0 flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-all relative rounded-md disabled:cursor-not-allowed disabled:opacity-60 ${
                  activeDay === index
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {isComplete && (
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
                <div className="font-semibold">{day}</div>
                <div className="text-xs opacity-75 mt-1 truncate">
                  {meals[index].catering ? `Catering ${meals[index].catering}` : 'Not set'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {days[activeDay]} - Meal Selection
          </h2>
        </div>

        <div className="p-4 sm:p-6">
          {/* Catering Selection */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
              Select Catering Option
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                disabled={!allowEdit}
                onClick={() => handleChange(meals[activeDay].day, 'catering', '1')}
                className={`p-4 sm:p-6 border-2 rounded-lg text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  selectedCateringType === '1'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">Catering 1</h4>
                  {selectedCateringType === '1' ? (
                    <Check className="w-5 h-5 text-gray-900" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <p className="text-sm text-gray-600">Full meal: 1 main dish + 2 salads + 2 sides</p>
              </button>
              <button
                disabled={!allowEdit}
                onClick={() => handleChange(meals[activeDay].day, 'catering', '2')}
                className={`p-4 sm:p-6 border-2 rounded-lg text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                  selectedCateringType === '2'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">Catering 2</h4>
                  {selectedCateringType === '2' ? (
                    <Check className="w-5 h-5 text-gray-900" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <p className="text-sm text-gray-600">Simple meal: 1 main dish only</p>
              </button>
            </div>
          </div>

          {/* Meal Selection */}
          {selectedCateringType && (
            <div className="space-y-8">
              {show && (
                <>
                  {categories.map((category) => {
                    // 1. בחר את התפריט הנכון (של קייטרינג 1 או 2)
                    const currentOptionsSet = allOptions[`catering${selectedCateringType}`];

                    // 2. קח את האפשרויות לקטגוריה הספציפית מתוך התפריט
                    const categoryOptions = currentOptionsSet
                      ? currentOptionsSet[category.key]
                      : [];

                    // 3. אם אין אפשרויות לקטגוריה זו, אל תציג כלום
                    if (!categoryOptions || categoryOptions.length === 0) {
                      return null;
                    }

                    return (
                      <div key={category.key} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 uppercase tracking-wide">
                            {category.label}
                          </h3>
                          <div className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">
                            {meals[activeDay][category.key] ? 'SELECTED' : 'PENDING'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryOptions.map((option) => {
                            const isSelected = meals[activeDay][category.key] === option.id;
                            return (
                              <MealOptionCard
                                key={option.id}
                                option={option}
                                isSelected={isSelected}
                                onSelect={() =>
                                  handleChange(meals[activeDay].day, category.key, option.id)
                                }
                                disabled={!allowEdit}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6 sm:mt-8 gap-4">
        <button
          onClick={() => setActiveDay(Math.max(0, activeDay - 1))}
          disabled={activeDay === 0 || !allowEdit}
          className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          ← <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex gap-1 sm:gap-2">
          {days.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                index === activeDay ? 'bg-gray-900 scale-125' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {activeDay < days.length - 1 ? (
          <button
            onClick={() => setActiveDay(activeDay + 1)}
            disabled={!allowEdit}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allowEdit || getProgress() !== 100}
            className="flex items-center gap-2 px-4 sm:px-8 py-2 sm:py-3 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm"
          >
            <span className="hidden sm:inline">Submit All</span>
            <span className="sm:hidden">Submit</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );
};

export default MealSelectionForm;
