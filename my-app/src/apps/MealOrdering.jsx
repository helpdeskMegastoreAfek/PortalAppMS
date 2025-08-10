'use client';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import toast, { Toaster } from 'react-hot-toast';
import MealSelectionForm from '../components/MealSelectionForm';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
// const options = {
//   main: ['Chicken', 'Beef', 'Fish', 'Vegan'],
//   salad1: ['Cucumber', 'Tomato', 'Coleslaw'],
//   salad2: ['Corn', 'Greek', 'Caesar'],
//   side1: ['Rice', 'Potatoes', 'Pasta'],
//   side2: ['Beans', 'Lentils', 'Couscous'],
// };
const allOptions = {
  catering1: {
    main: [
      {
        id: 'c1-beef-stew',
        name: 'תבשיל בקר פרימיום',
        description: 'תבשיל עשיר עם ירקות שורש ויין אדום.',
        imageUrl: '/images/beef-stew.jpg',
        tags: ['פרימיום'],
      },
      {
        id: 'c1-salmon-dill',
        name: 'סלמון אפוי בשמיר',
        description: 'פילה סלמון ברוטב שמנת לימון.',
        imageUrl: '/images/salmon-dill.jpg',
        tags: ['דג'],
      },
    ],
    salad1: [
      {
        id: 'c1-greek-salad',
        name: 'סלט יווני',
        description: 'ירקות טריים, זיתים ופטה.',
        imageUrl: '/images/greek-salad.jpg',
        tags: ['צמחוני'],
      },
    ],
    salad2: [
      {
        id: 'c1-tabbouleh-salad',
        name: 'סלט טאבולה',
        description: 'בורגול, פטרוזיליה ונענע.',
        imageUrl: '/images/tabbouleh-salad.jpg',
        tags: ['טבעוני'],
      },
    ],
    side1: [
      {
        id: 'c1-potato-gratin',
        name: 'גראטן תפו"א',
        description: 'פרוסות תפו"א אפויות בשמנת.',
        imageUrl: '/images/potato-gratin.jpg',
        tags: [],
      },
    ],
  },
  catering2: {
    main: [
      {
        id: 'c2-chicken-teriyaki',
        name: 'עוף טריאקי',
        description: 'חזה עוף בגלייז טריאקי.',
        imageUrl: '/images/chicken-teriyaki.jpg',
        tags: ['פשוט וטעים'],
      },
      {
        id: 'c2-lentil-curry',
        name: 'קארי עדשים',
        description: 'קארי הודי על בסיס עדשים.',
        imageUrl: '/images/lentil-curry.jpg',
        tags: ['טבעוני'],
      },
      {
        id: 'c2-schnitzel',
        name: 'שניצל קלאסי',
        description: 'חזה עוף בציפוי פריך.',
        imageUrl: '/images/schnitzel.jpg',
        tags: [],
      },
    ],
  },
};
const categories = [
  { key: 'main', label: 'Main' },
  { key: 'salad1', label: 'Salad 1' },
  { key: 'salad2', label: 'Salad 2' },
  { key: 'side1', label: 'Side 1' },
  { key: 'side2', label: 'Side 2' },
];

function getWeekId(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  const janFirst = new Date(sunday.getFullYear(), 0, 1);
  const janFirstDay = janFirst.getDay();
  const firstSunday = new Date(janFirst);
  firstSunday.setDate(janFirst.getDate() - janFirstDay);
  const diffDays = Math.floor((sunday - firstSunday) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return `${sunday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

export default function MealOrderingForm() {
  // --- State Management ---
  const [meals, setMeals] = useState(
    days.map((day) => ({
      day,
      catering: '',
      main: '',
      salad1: '',
      salad2: '',
      side1: '',
      side2: '',
    }))
  );
  const [activeDay, setActiveDay] = useState(0);
  const [orders, setOrders] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showFirstTimeForm, setShowFirstTimeForm] = useState(false);

  // --- Computed Values ---
  const [user, setUser] = useState(null);
  useEffect(() => {
    const userFromStorage = localStorage.getItem('user');
    if (userFromStorage) setUser(JSON.parse(userFromStorage));
  }, []);
  const userId = user?._id;

  const currentWeekId = getWeekId();
  const nextWeekId = getWeekId(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const today = new Date();
  const currentDayIndex = today.getDay();
  const allowEdit = currentDayIndex >= 0 && currentDayIndex <= 3;

  const hasNextWeekOrder = !!orders[nextWeekId];
  const nextWeekMeals = orders[nextWeekId] || {};
  const currentWeekMeals = orders[currentWeekId] || {};

  const handleChange = (day, field, value) => {
    if (!allowEdit && !showFirstTimeForm) return;

    setMeals((prev) =>
      prev.map((meal) => {
        if (meal.day === day) {
          const updatedMeal = { ...meal, [field]: value };
          if (field === 'catering') {
            return { ...updatedMeal, main: '', salad1: '', salad2: '', side1: '', side2: '' };
          }
          return updatedMeal;
        }
        return meal;
      })
    );
  };

  const isDayComplete = (meal) => {
    if (!meal.catering) return false;
    if (meal.catering === '1')
      return meal.main && meal.salad1 && meal.salad2 && meal.side1 && meal.side2;
    if (meal.catering === '2') return meal.main;
    return false;
  };

  const getProgress = () => {
    const completedDays = meals.filter(isDayComplete).length;
    return Math.round((completedDays / days.length) * 100);
  };

  const handleSubmit = async () => {
    if (!meals.every(isDayComplete)) {
      toast.error('Please complete all meal selections before submitting.');
      return;
    }
    try {
      const response = await fetch('https://172.20.0.49:3000/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, weekId: nextWeekId, username: user.username, meals }),
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Server error');

      toast.success('Order submitted successfully!');

      setOrders((prev) => ({
        ...prev,
        [nextWeekId]: Object.fromEntries(meals.map((m) => [m.day, m])),
      }));

      if (showFirstTimeForm) {
        setShowFirstTimeForm(false);
      }
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!userId) return;

    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/api/meals/${userId}`);
        const data = await res.json();

        if (data.length === 0) {
          setShowFirstTimeForm(true);
        } else {
          const structured = {};
          data.forEach((entry) => {
            const weekId = entry.weekId || entry.week;
            if (!structured[weekId]) structured[weekId] = {};
            if (Array.isArray(entry.meals)) {
              entry.meals.forEach((meal) => {
                structured[weekId][meal.day] = meal;
              });
            }
          });
          setOrders(structured);
        }
      } catch (err) {
        toast.error('Failed to load user data.', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 animate-pulse">Loading your meal plan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <Sidebar user={user} />
      <Toaster position="top-center" />

      {/* Modal for First-Time User */}
      {showFirstTimeForm && (
        <div className="fixed inset-0 z-39 flex items-center justify-center p-4" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Aboard!</h2>
              <p className="text-gray-600 mt-1">
                To get started, please set up your meal plan for the upcoming week.
              </p>
            </div>
            <div className="p-6 overflow-y-auto">
              <MealSelectionForm
                days={days}
                meals={meals}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                handleChange={handleChange}
                isDayComplete={isDayComplete}
                categories={categories}
                options={allOptions}
                handleSubmit={handleSubmit}
                allowEdit={true} // New user can always edit
                getProgress={getProgress}
                show={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <div
        className={`max-w-6xl mx-auto p-4 sm:p-6 lg:ml-64 transition-filter duration-300 ${showFirstTimeForm ? 'blur-md pointer-events-none' : ''}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Meal Planner</h1>
            <p className="text-gray-600 mt-1">Order meals for next week and view your schedule.</p>
          </div>
          {!showFirstTimeForm && !hasNextWeekOrder && allowEdit && (
            <div className="flex items-center gap-4">
              <div className="text-center sm:text-right">
                <div className="text-sm text-gray-500">Order Progress</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{getProgress()}%</div>
              </div>
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-gray-200 rounded-full flex items-center justify-center">
                <div className="text-sm sm:text-lg font-bold text-gray-600">
                  {activeDay + 1}/{days.length}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form for existing user */}
        {!showFirstTimeForm && !hasNextWeekOrder && allowEdit && (
          <MealSelectionForm
            days={days}
            meals={meals}
            activeDay={activeDay}
            setActiveDay={setActiveDay}
            handleChange={handleChange}
            isDayComplete={isDayComplete}
            categories={categories}
            options={allOptions}
            handleSubmit={handleSubmit}
            allowEdit={allowEdit}
            getProgress={getProgress}
            show={true}
          />
        )}

        {/* Message if ordering window is closed */}
        {!showFirstTimeForm && !hasNextWeekOrder && !allowEdit && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-center mb-8">
            <h3 className="font-semibold">The ordering window for next week has closed.</h3>
          </div>
        )}

        {/* Message if order is already confirmed */}
        {hasNextWeekOrder && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-center mb-8">
            <h3 className="font-semibold">Your order for next week is confirmed!</h3>
            <p className="text-sm mt-1">You can view the details below.</p>
          </div>
        )}

        {/* Orders Overview */}
        <div className="mt-12 sm:mt-16 space-y-8 sm:space-y-12">
          {/* Next Week */}
          {hasNextWeekOrder && (
            <div>
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                  Next Week's Order
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                {days.map((day) => {
                  const m = nextWeekMeals[day] || {};
                  return (
                    <div
                      key={day}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
                    >
                      <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-3 pb-2 border-b border-gray-100">
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
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">Main</span>
                          <span className="text-sm text-gray-900 font-medium truncate ml-2">
                            {m.main || '—'}
                          </span>
                        </div>
                        {m.catering === '1' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Salad 1</span>
                              <span className="text-sm text-gray-900 font-medium truncate ml-2">
                                {m.salad1 || '—'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Salad 2</span>
                              <span className="text-sm text-gray-900 font-medium truncate ml-2">
                                {m.salad2 || '—'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Side 1</span>
                              <span className="text-sm text-gray-900 font-medium truncate ml-2">
                                {m.side1 || '—'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-500">Side 2</span>
                              <span className="text-sm text-gray-900 font-medium truncate ml-2">
                                {m.side2 || '—'}
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
          )}

          {/* Current Week */}
          <div>
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <span className="px-3 sm:px-4 py-1 sm:py-2 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full">
                This Week's Meals
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              {days.map((day) => {
                const m = currentWeekMeals[day] || {};
                return (
                  <div
                    key={day}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
                  >
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-3 pb-2 border-b border-gray-100">
                      {day}
                    </h3>
                    {m.catering ? (
                      <>
                        <div className="mb-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            Catering {m.catering}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-500">Main</span>
                            <span className="text-sm text-gray-900 font-medium truncate ml-2">
                              {m.main || '—'}
                            </span>
                          </div>
                          {m.catering === '1' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-500">Salad 1</span>
                                <span className="text-sm text-gray-900 font-medium truncate ml-2">
                                  {m.salad1 || '—'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-500">Salad 2</span>
                                <span className="text-sm text-gray-900 font-medium truncate ml-2">
                                  {m.salad2 || '—'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-500">Side 1</span>
                                <span className="text-sm text-gray-900 font-medium truncate ml-2">
                                  {m.side1 || '—'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-500">Side 2</span>
                                <span className="text-sm text-gray-900 font-medium truncate ml-2">
                                  {m.side2 || '—'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No meal ordered for this day.</p>
                    )}
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
