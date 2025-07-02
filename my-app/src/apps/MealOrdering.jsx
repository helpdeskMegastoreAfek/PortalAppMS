"use client";

import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { X, Check, Calendar, Clock, Utensils } from "lucide-react";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const options = {
  main: [
    { name: "Chicken", emoji: "🍗", color: "bg-orange-50 border-orange-200" },
    { name: "Beef", emoji: "🥩", color: "bg-red-50 border-red-200" },
    { name: "Fish", emoji: "🐟", color: "bg-blue-50 border-blue-200" },
    { name: "Vegan", emoji: "🥬", color: "bg-green-50 border-green-200" },
  ],
  salad1: [
    { name: "Cucumber", emoji: "🥒", color: "bg-green-50 border-green-200" },
    { name: "Tomato", emoji: "🍅", color: "bg-red-50 border-red-200" },
    { name: "Coleslaw", emoji: "🥗", color: "bg-yellow-50 border-yellow-200" },
  ],
  salad2: [
    { name: "Corn", emoji: "🌽", color: "bg-yellow-50 border-yellow-200" },
    { name: "Greek", emoji: "🫒", color: "bg-green-50 border-green-200" },
    { name: "Caesar", emoji: "🥬", color: "bg-green-50 border-green-200" },
  ],
  side1: [
    { name: "Rice", emoji: "🍚", color: "bg-gray-50 border-gray-200" },
    { name: "Potatoes", emoji: "🥔", color: "bg-yellow-50 border-yellow-200" },
    { name: "Pasta", emoji: "🍝", color: "bg-orange-50 border-orange-200" },
  ],
  side2: [
    { name: "Beans", emoji: "🫘", color: "bg-amber-50 border-amber-200" },
    { name: "Lentils", emoji: "🟤", color: "bg-amber-50 border-amber-200" },
    { name: "Couscous", emoji: "🌾", color: "bg-yellow-50 border-yellow-200" },
  ],
};

const fieldLabels = {
  main: "Main Course",
  salad1: "Fresh Salad",
  salad2: "Side Salad",
  side1: "Primary Side",
  side2: "Secondary Side",
};

export default function MealOrderingForm() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [meals, setMeals] = useState(
    days.map((day) => ({
      day,
      main: "",
      salad1: "",
      salad2: "",
      side1: "",
      side2: "",
      notes: "",
    }))
  );
  const [show, setShow] = useState(true);
  const [currentDay, setCurrentDay] = useState(0);

  const handleChange = (day, field, value) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.day === day ? { ...meal, [field]: value } : meal
      )
    );
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, meals }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Order submitted successfully!");
        setShow(false);
      } else {
        alert("Submission error");
      }
    } catch (err) {
      alert("Server error", err.message);
    }
  };

  const getCompletionPercentage = () => {
    const totalFields = meals.length * 5; // 5 fields per day
    const completedFields = meals.reduce((acc, meal) => {
      return (
        acc +
        [meal.main, meal.salad1, meal.salad2, meal.side1, meal.side2].filter(
          Boolean
        ).length
      );
    }, 0);
    return Math.round((completedFields / totalFields) * 100);
  };

  const isDayComplete = (meal) => {
    return [meal.main, meal.salad1, meal.salad2, meal.side1, meal.side2].every(
      Boolean
    );
  };

  if (!show)
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white p-12 border border-gray-200 max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-light text-gray-900 mb-2">
            Order Confirmed!
          </h2>
          <p className="text-gray-600 mb-8">
            Your weekly meal plan has been submitted successfully
          </p>
          <button
            onClick={() => setShow(true)}
            className="px-6 py-2 bg-gray-900 text-white text-sm hover:bg-gray-800 transition-colors"
          >
            Plan Another Week
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Header user={user} />
      <div className="flex">
        <Sidebar user={user} />

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header with Progress */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-light text-gray-900 mb-2">
                    Weekly Meal Planner
                  </h1>
                  <p className="text-gray-600">
                    Create your personalized meal plan for the week
                  </p>
                </div>
                <button
                  onClick={() => setShow(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="bg-gray-200 h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${getCompletionPercentage()}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">
                  {getCompletionPercentage()}% Complete
                </span>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={14} />
                  <span>~5 min remaining</span>
                </div>
              </div>
            </div>

            {/* Day Navigation */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {days.map((day, index) => (
                <button
                  key={day}
                  onClick={() => setCurrentDay(index)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-all ${
                    currentDay === index
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {isDayComplete(meals[index]) && (
                    <Check size={14} className="text-green-400" />
                  )}
                  <Calendar size={14} />
                  {day}
                </button>
              ))}
            </div>

            {/* Current Day Meal Planning */}
            <div className="bg-white border border-gray-200 p-8 mb-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-medium text-gray-900">
                    {meals[currentDay].day}
                  </h2>
                  <p className="text-gray-600">Plan your meals for this day</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {["main", "salad1", "salad2", "side1", "side2"].map((field) => (
                  <div key={field} className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      {fieldLabels[field]}
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {options[field].map((option) => (
                        <button
                          key={option.name}
                          onClick={() =>
                            handleChange(
                              meals[currentDay].day,
                              field,
                              option.name
                            )
                          }
                          className={`p-3 border-2 text-left transition-all hover:scale-105 ${
                            meals[currentDay][field] === option.name
                              ? `${option.color} border-current shadow-md`
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{option.emoji}</span>
                            <span className="font-medium">{option.name}</span>
                            {meals[currentDay][field] === option.name && (
                              <Check
                                size={16}
                                className="ml-auto text-green-600"
                              />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Special Instructions
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-gray-500 resize-none"
                  rows={3}
                  placeholder="Any dietary restrictions, allergies, or special requests for this day..."
                  value={meals[currentDay].notes}
                  onChange={(e) =>
                    handleChange(meals[currentDay].day, "notes", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mb-8">
              <button
                onClick={() => setCurrentDay(Math.max(0, currentDay - 1))}
                disabled={currentDay === 0}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous Day
              </button>

              <div className="flex gap-2">
                {days.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentDay ? "bg-gray-900" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>

              {currentDay < days.length - 1 ? (
                <button
                  onClick={() => setCurrentDay(currentDay + 1)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Next Day →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white text-sm hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105"
                >
                  Submit Order ✨
                </button>
              )}
            </div>

            {/* Week Overview */}
            <div className="bg-gray-50 border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Week Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {meals.map((meal, i) => (
                  <div
                    key={i}
                    className={`p-4 bg-white border transition-all cursor-pointer hover:shadow-md ${
                      i === currentDay
                        ? "border-gray-400 shadow-sm"
                        : "border-gray-200"
                    }`}
                    onClick={() => setCurrentDay(i)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {meal.day}
                      </span>
                      {isDayComplete(meal) && (
                        <Check size={16} className="text-green-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {[
                        meal.main,
                        meal.salad1,
                        meal.salad2,
                        meal.side1,
                        meal.side2,
                      ]
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((item, idx) => (
                          <div key={idx}>• {item}</div>
                        ))}
                      {[
                        meal.main,
                        meal.salad1,
                        meal.salad2,
                        meal.side1,
                        meal.side2,
                      ].filter(Boolean).length > 2 && (
                        <div className="text-gray-400">
                          +
                          {[
                            meal.main,
                            meal.salad1,
                            meal.salad2,
                            meal.side1,
                            meal.side2,
                          ].filter(Boolean).length - 2}{" "}
                          more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
