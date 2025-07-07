"use client";
import { useState, useEffect } from "react";
import { Check, ChevronRight, Circle, Menu, X } from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import toast, { Toaster } from "react-hot-toast";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu"];

const options = {
  main: ["Chicken", "Beef", "Fish", "Vegan"],
  salad1: ["Cucumber", "Tomato", "Coleslaw"],
  salad2: ["Corn", "Greek", "Caesar"],
  side1: ["Rice", "Potatoes", "Pasta"],
  side2: ["Beans", "Lentils", "Couscous"],
};

const categories = [
  { key: "main", label: "Main" },
  { key: "salad1", label: "Salad 1" },
  { key: "salad2", label: "Salad 2" },
  { key: "side1", label: "Side 1" },
  { key: "side2", label: "Side 2" },
];

function getWeekId(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export default function MealOrderingForm() {
  const [meals, setMeals] = useState(
    days.map((day) => ({
      day,
      catering: "", // "1" or "2"
      main: "",
      salad1: "",
      salad2: "",
      side1: "",
      side2: "",
    }))
  );

  const [show, setShow] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [orders, setOrders] = useState({});

  const currentWeekId = getWeekId();
  const today = new Date();
  const currentDayIndex = today.getDay();
  const allowEdit = currentDayIndex >= 0 && currentDayIndex <= 3; // Sunday–Wednesday
  const nextWeekId = getWeekId(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const nextWeekMeals = orders[nextWeekId] || {};
  const currentWeekMeals = orders[currentWeekId] || {};

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?._id;

  const handleChange = (day, field, value) => {
    if (!allowEdit) return;

    setMeals((prev) =>
      prev.map((meal) => {
        if (meal.day === day) {
          const updatedMeal = { ...meal, [field]: value };

          // If catering type changes, reset other selections
          if (field === "catering") {
            return {
              ...updatedMeal,
              main: "",
              salad1: "",
              salad2: "",
              side1: "",
              side2: "",
            };
          }

          return updatedMeal;
        }
        return meal;
      })
    );
  };

  const isDayComplete = (meal) => {
    if (!meal.catering) return false;

    if (meal.catering === "1") {
      return (
        meal.main && meal.salad1 && meal.salad2 && meal.side1 && meal.side2
      );
    } else if (meal.catering === "2") {
      return meal.main;
    }

    return false;
  };

  const getProgress = () => {
    const completedDays = meals.filter(isDayComplete).length;
    return Math.round((completedDays / days.length) * 100);
  };

  const handleSubmit = async () => {
    const isComplete = meals.every(isDayComplete);

    if (!isComplete) {
      toast.error("Please complete all meal selections before submitting.");
      return;
    }

    try {

      const response = await fetch("http://localhost:5000/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          weekId: nextWeekId,
          username: user.username,
          meals,
        }),
      });
    

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Server error");
      }

      const data = await response.json();
      toast.success(data.message || "Order submitted successfully!");

      setOrders((prevOrders) => ({
        ...prevOrders,
        [nextWeekId]: Object.fromEntries(
          meals.map((meal) => [meal.day, { ...meal, week: nextWeekId }])
        ),
      }));
      setShow(false);
    } catch (err) {
      toast.error("Server error: " + err.message);
    }
  };

  useEffect(() => {
    const userObj = JSON.parse(localStorage.getItem("user"));
    const userId = userObj?._id;
    if (!userId) return;

    const fetchOrders = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/meals/${userId}`);
        const data = await res.json();
        const structured = {};

        data.forEach((entry) => {
          const weekId = entry.week || entry.weekId;
          if (entry.meals && Array.isArray(entry.meals)) {
            entry.meals.forEach((meal) => {
              if (!structured[weekId]) structured[weekId] = {};
              structured[weekId][meal.day] = meal;
            });
          } else if (entry.day) {
            if (!structured[weekId]) structured[weekId] = {};
            structured[weekId][entry.day] = entry;
          }
        });

        setOrders(structured);
      } catch (err) {
        console.error("Failed to fetch orders", err);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <Sidebar user={user} />
      <Toaster position="top-center" />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:ml-64">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Meal Planner
            </h1>
            <p className="text-gray-600 mt-1">Configure meals for next week</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center sm:text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {getProgress()}%
              </div>
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-gray-200 rounded-full flex items-center justify-center">
              <div className="text-sm sm:text-lg font-bold text-gray-600">
                {activeDay + 1}/5
              </div>
            </div>
          </div>
        </div>
        {/* Day Navigation - Mobile Scrollable */}
        <div className="mb-6 sm:mb-8">
          <div className="flex gap-1 sm:gap-2 bg-white border border-gray-200 p-1 sm:p-2 rounded-lg shadow-sm overflow-x-auto">
            {days.map((day, index) => {
              const isComplete = isDayComplete(meals[index]);
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(index)}
                  className={`flex-shrink-0 min-w-0 flex-1 py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-medium transition-all relative rounded-md ${
                    activeDay === index
                      ? "bg-gray-900 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {isComplete && (
                    <div className="absolute top-1 sm:top-2 right-1 sm:right-2 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                  <div className="font-semibold">{day}</div>
                  <div className="text-xs opacity-75 mt-1 truncate">
                    {meals[index].catering
                      ? `Catering ${meals[index].catering}`
                      : "Not set"}
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
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() =>
                    handleChange(meals[activeDay].day, "catering", "1")
                  }
                  className={`p-4 sm:p-6 border-2 rounded-lg text-left transition-all ${
                    meals[activeDay].catering === "1"
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Catering 1</h4>
                    {meals[activeDay].catering === "1" ? (
                      <Check className="w-5 h-5 text-gray-900" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Full meal: 1 main dish + 2 salads + 2 sides
                  </p>
                </button>

                <button
                  onClick={() =>
                    handleChange(meals[activeDay].day, "catering", "2")
                  }
                  className={`p-4 sm:p-6 border-2 rounded-lg text-left transition-all ${
                    meals[activeDay].catering === "2"
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Catering 2</h4>
                    {meals[activeDay].catering === "2" ? (
                      <Check className="w-5 h-5 text-gray-900" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Simple meal: 1 main dish only
                  </p>
                </button>
              </div>
            </div>

            {/* Meal Selection */}

            {meals[activeDay].catering && (
              <div className="space-y-6 sm:space-y-8">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Select Your Meals
                </h3>
                {show && (
                  <div className="space-y-6 sm:space-y-8">
                    {categories.map((category) => {
                      // Show all categories for catering 1, only main for catering 2
                      if (
                        meals[activeDay].catering === "2" &&
                        category.key !== "main"
                      ) {
                        return null;
                      }

                      return (
                        <div
                          key={category.key}
                          className="space-y-3 sm:space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                              {category.label}
                            </label>
                            <div className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">
                              {meals[activeDay][category.key]
                                ? "SELECTED"
                                : "PENDING"}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {options[category.key].map((option) => {
                              const isSelected =
                                meals[activeDay][category.key] === option;
                              return (
                                <button
                                  key={option}
                                  onClick={() =>
                                    handleChange(
                                      meals[activeDay].day,
                                      category.key,
                                      option
                                    )
                                  }
                                  className={`w-full flex items-center justify-between p-3 sm:p-4 border-2 rounded-lg text-left text-sm transition-all ${
                                    isSelected
                                      ? "border-gray-900 bg-gray-50 shadow-sm"
                                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  <span
                                    className={`font-medium ${
                                      isSelected
                                        ? "text-gray-900"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {option}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {isSelected ? (
                                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" />
                                    ) : (
                                      <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 sm:mt-8 gap-4">
          <button
            onClick={() => setActiveDay(Math.max(0, activeDay - 1))}
            disabled={activeDay === 0}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            ← <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex gap-1 sm:gap-2">
            {days.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                  index === activeDay ? "bg-gray-900 scale-125" : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          {activeDay < days.length - 1 ? (
            <button
              onClick={() => setActiveDay(activeDay + 1)}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <span className="hidden sm:inline">Next</span>{" "}
              <ChevronRight className="w-4 h-4" />
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
        {/* Orders Overview */}
        <div className="mt-12 sm:mt-16 space-y-8 sm:space-y-12">
          {/* Current Week */}
          <div>
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <span className="px-3 sm:px-4 py-1 sm:py-2 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full">
                Current Week
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              {days.map((day) => {
                const m = currentWeekMeals[day] || {};
                return (
                  <div
                    key={day}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-all duration-200"
                  >
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-3 sm:mb-4 pb-2 border-b border-gray-100">
                      {day}
                    </h3>
                    {m.catering && (
                      <div className="mb-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          Catering {m.catering}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">
                          Main
                        </span>
                        <span className="text-sm text-gray-900 font-medium truncate ml-2">
                          {m.main || <span className="text-gray-400">—</span>}
                        </span>
                      </div>
                      {m.catering === "1" && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Salad 1
                            </span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.salad1 || (
                                <span className="text-gray-400">—</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Salad 2
                            </span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.salad2 || (
                                <span className="text-gray-400">—</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Side 1
                            </span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.side1 || (
                                <span className="text-gray-400">—</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Side 2
                            </span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.side2 || (
                                <span className="text-gray-400">—</span>
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Week */}
          <div>
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <span className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                Next Week
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              {days.map((day) => {
                const m = nextWeekMeals[day] || {};
                return (
                  <div
                    key={day}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-all duration-200"
                  >
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-3 sm:mb-4 pb-2 border-b border-gray-100">
                      {day}
                    </h3>
                    {m.catering && (
                      <div className="mb-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          Catering {m.catering}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">
                          Main
                        </span>
                        <span className="text-sm text-gray-900 font-medium truncate ml-2">
                          {m.main || <span className="text-gray-400">—</span>}
                        </span>
                      </div>
                      {m.catering === "1" && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Salad 1
                            </span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.salad1 || (
                                <span className="text-gray-400">—</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Salad 2
                            </span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.salad2 || (
                                <span className="text-gray-400">—</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Side 1
                            </span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.side1 || (
                                <span className="text-gray-400">—</span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">
                              Side 2
                            </span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.side2 || (
                                <span className="text-gray-400">—</span>
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
