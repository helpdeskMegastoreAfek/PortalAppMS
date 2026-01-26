'use client';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, ChevronLeft, ChevronRight, Save, 
  Utensils, Leaf, Carrot, Home, Menu, Sparkles,
  Clock, X, AlertCircle, Heart, Star, Trash2, Plus
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

// --- Utility Helpers ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function getWeekId(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  const diffDays = Math.floor((sunday - new Date(sunday.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return `${sunday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function getReadableDateRange(weekId) {
  if (!weekId) return "";
  const [yearStr, weekStr] = weekId.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simpleDate.getDay();
  const sunday = new Date(simpleDate);
  sunday.setDate(simpleDate.getDate() - dayOfWeek);
  const thursday = new Date(sunday);
  thursday.setDate(sunday.getDate() + 4);
  const format = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${format(sunday)} - ${format(thursday)}`;
}

const getGradient = (str) => {
  const gradients = [
    'from-orange-100 to-orange-50', 'from-rose-100 to-rose-50',
    'from-emerald-100 to-emerald-50', 'from-blue-100 to-blue-50',
    'from-amber-100 to-amber-50', 'from-indigo-100 to-indigo-50',
  ];
  return gradients[str.length % gradients.length];
};

// --- Data ---
const menuOptions = {
  main: [
    { id: 'm1', name: 'תבשיל בקר ביין', description: 'בבישול ארוך עם ירקות שורש', tags: ['gf'], emoji: '🥩' },
    { id: 'm2', name: 'חזה עוף בגריל', description: 'עשבי תיבול ולימון', tags: ['protein', 'gf'], emoji: '🍗' },
    { id: 'm3', name: 'שניצל ביתי', description: 'ציפוי פריך וזהוב', tags: [], emoji: '🥘' },
    { id: 'm4', name: 'סלמון בתנור', description: 'עשבי תיבול ושמן זית', tags: ['gf', 'healthy'], emoji: '🐟' },
    { id: 'm5', name: 'קציצות עדשים', description: 'ברוטב עגבניות (טבעוני)', tags: ['vegan', 'healthy'], emoji: '🧆' },
    { id: 'm6', name: 'מוקפץ תאילנדי', description: 'אטריות אורז וטופו', tags: ['spicy', 'gf'], emoji: '🍜' },
  ],
  sides: [
    { id: 'sd1', name: 'אורז לבן', description: 'קלאסי', tags: ['vegan', 'gf'] },
    { id: 'sd2', name: 'פירה', description: 'חלבי/פרווה', tags: ['gf'] },
    { id: 'sd3', name: 'שעועית', description: 'מוקפצת שום', tags: ['vegan'] },
    { id: 'sd4', name: 'תפו"א', description: 'בתנור', tags: ['vegan'] },
    { id: 'sd5', name: 'מג׳דרה', description: 'עדשים', tags: ['vegan'] },
    { id: 'sd6', name: 'אנטיפסטי', description: 'ירקות', tags: ['healthy'] },
  ],
  salads: [
    { id: 'sl1', name: 'סלט ישראלי', description: '', tags: ['healthy'] },
    { id: 'sl2', name: 'סלט כרוב', description: '', tags: ['vegan'] },
    { id: 'sl3', name: 'סלט גזר', description: 'חריף', tags: ['spicy'] },
    { id: 'sl4', name: 'סלט סלק', description: '', tags: ['vegan'] },
    { id: 'sl5', name: 'חומוס', description: '', tags: ['vegan'] },
    { id: 'sl6', name: 'טחינה', description: '', tags: ['vegan'] },
  ]
};

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
const dayNamesHebrew = { 'Sun': 'ראשון', 'Mon': 'שני', 'Tue': 'שלישי', 'Wed': 'רביעי', 'Thu': 'חמישי' };

// --- Sub-Components ---

const TagIcon = ({ type }) => {
  const tags = {
    vegan: { label: 'טבעוני', color: 'text-green-700 bg-green-100' },
    spicy: { label: 'חריף', color: 'text-red-700 bg-red-100' },
    gf: { label: 'ללא גלוטן', color: 'text-amber-700 bg-amber-100' },
    healthy: { label: 'בריא', color: 'text-blue-700 bg-blue-100' },
    protein: { label: 'חלבון', color: 'text-rose-700 bg-rose-100' },
  };
  const tag = tags[type];
  if (!tag) return null;
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tag.color}`}>{tag.label}</span>;
};

// Selection Card
const SelectionCard = ({ item, isSelected, onToggle, type = 'regular' }) => {
  const isMain = type === 'main';
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => onToggle(item.name)}
      className={cn(
        "group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 border shadow-sm",
        isSelected 
          ? "border-black ring-1 ring-black shadow-md bg-white" 
          : "border-gray-100 bg-white hover:shadow-md hover:border-gray-200"
      )}
    >
      {isMain && (
        <div className={cn("h-24 w-full bg-gradient-to-br flex items-center justify-center text-4xl", getGradient(item.name))}>
          {item.emoji || '🍽️'}
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <h3 className={cn("font-bold text-gray-900 leading-tight", isMain ? "text-lg mb-1" : "text-base mb-1")}>
              {item.name}
            </h3>
            {item.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>}
            <div className="flex flex-wrap gap-1 mt-auto">
              {item.tags?.map(tag => <TagIcon key={tag} type={tag} />)}
            </div>
          </div>
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected ? "bg-black border-black text-white" : "border-gray-300 bg-transparent"
          )}>
            {isSelected && <Check size={14} strokeWidth={4} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Star Rating Component
const StarRating = ({ rating, setRating }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setRating(star)}
          className={cn(
            "text-2xl transition-transform hover:scale-110",
            star <= rating ? "text-yellow-400" : "text-gray-200"
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
};

// Feedback Modal (New)
const FeedbackModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  // Mock data for previous week
  const itemsToRate = [
    { name: 'שניצל ביתי', day: 'ראשון' },
    { name: 'מוקפץ תאילנדי', day: 'שני' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        dir="rtl"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
            <Star className="w-10 h-10 mx-auto mb-2 text-yellow-300 fill-yellow-300" />
            <h2 className="text-2xl font-bold">איך היה האוכל?</h2>
            <p className="text-white/80 text-sm">דעתך חשובה למטבח שלנו</p>
        </div>
        
        <div className="p-6 space-y-6">
            {itemsToRate.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b pb-4 last:border-0">
                    <div>
                        <div className="font-bold text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-500">אכלת ביום {item.day}</div>
                    </div>
                    <StarRating rating={0} setRating={()=>{}} /> 
                    {/* In real app, manage state for each item */}
                </div>
            ))}
            <textarea 
                placeholder="הערות נוספות לשף..." 
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:ring-2 ring-indigo-500 outline-none resize-none h-20"
            ></textarea>
        </div>
        
        <div className="p-4 bg-gray-50 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-200 rounded-xl">לא עכשיו</button>
            <button onClick={() => { toast.success('תודה על הדירוג!'); onClose(); }} className="flex-1 py-3 bg-black text-white font-bold rounded-xl shadow-lg">שלח דירוג</button>
        </div>
      </motion.div>
    </div>
  );
};

// Summary Modal
const SummaryModal = ({ isOpen, onClose, meals, onConfirm }) => {
  if (!isOpen) return null;
  
  const count = meals.filter(m => m.main).length;
  const skipped = meals.filter(m => m.isSkipped).length;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-end sm:items-center pointer-events-none">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
      />
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl z-10 pointer-events-auto overflow-hidden max-h-[85vh] flex flex-col"
        dir="rtl"
      >
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
           <div>
             <h3 className="text-xl font-black text-gray-900">אישור הזמנה</h3>
             <p className="text-sm text-gray-500">נבחרו {count} ארוחות ({skipped} ימי חופש)</p>
           </div>
           <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-500 hover:bg-gray-100"><X size={20}/></button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3 bg-gray-50/50 flex-1">
          {meals.map((meal, i) => (
             <div key={i} className="flex gap-4 p-3 bg-white rounded-xl border border-gray-100 items-center">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {dayNamesHebrew[meal.day][0]}
                </div>
                <div className="flex-1">
                   <div className="font-bold text-gray-800 text-sm">{dayNamesHebrew[meal.day]}</div>
                   <div className="text-xs text-gray-500 truncate">
                      {meal.isSkipped ? 'יום חופש / עבודה מהבית' : meal.main || 'לא נבחרה מנה'}
                   </div>
                </div>
                {meal.main && <Check size={16} className="text-green-500"/>}
                {meal.isSkipped && <Home size={16} className="text-gray-400"/>}
                {!meal.main && !meal.isSkipped && <AlertCircle size={16} className="text-red-400"/>}
             </div>
          ))}
        </div>

        <div className="p-4 border-t bg-white pb-8 sm:pb-4">
           <button 
             onClick={onConfirm}
             className="w-full py-4 rounded-xl bg-black text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
           >
             <span>שלח הזמנה למטבח</span>
             <Save size={20} />
           </button>
        </div>
      </motion.div>
    </div>
  );
};

// Favorites Bar (New)
const FavoritesBar = ({ favorites, onLoadFavorite, onDeleteFavorite, onSaveCurrent }) => {
  return (
    <div className="mt-4 px-4 lg:px-0">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
        {/* Save Button */}
        <button 
          onClick={onSaveCurrent}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-full border border-rose-100 font-bold text-sm hover:bg-rose-100 transition-colors whitespace-nowrap shrink-0"
        >
          <Heart size={16} className="fill-current" />
          {t('saveCombination')}
        </button>

        {/* List of Favorites */}
        {favorites.map((fav) => (
          <div key={fav.id} className="flex items-center bg-white border border-gray-200 rounded-full pl-1 pr-3 py-1 shrink-0 shadow-sm hover:shadow-md transition-shadow group">
            <button 
              onClick={() => onLoadFavorite(fav)}
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 px-2"
            >
              {fav.name}
            </button>
            <button 
              onClick={() => onDeleteFavorite(fav.id)}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        
        {favorites.length === 0 && (
          <span className="text-xs text-gray-400 italic">{t('saveYourRegularMeals')}</span>
        )}
      </div>
    </div>
  );
};

// Bottom Floating Dock
const FloatingDock = ({ activeDay, days, onNext, onPrev, currentMeal, onOpenSummary }) => {
  const isLastDay = activeDay === days.length - 1;
  return (
    <div className="fixed bottom-6 inset-x-0 mx-auto px-4 z-40 max-w-md w-full">
      <div className="bg-black/90 text-white backdrop-blur-xl rounded-full p-2 shadow-2xl flex items-center justify-between pl-4 pr-2">
        <div className="flex flex-col text-right pl-4 border-l border-white/20">
          <span className="text-[10px] text-gray-400 font-medium">{dayNamesHebrew[days[activeDay]]}</span>
          <span className="text-sm font-bold truncate max-w-[120px]">
            {currentMeal.isSkipped ? 'יום חופש' : currentMeal.main || 'טרם נבחר'}
          </span>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={onPrev} disabled={activeDay === 0}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
                <ChevronRight size={20} />
            </button>
            <button 
                onClick={() => { if (!isLastDay) onNext(); else onOpenSummary(); }}
                className={cn(
                    "h-10 px-5 rounded-full flex items-center gap-2 font-bold transition-transform active:scale-95",
                    isLastDay ? "bg-green-500 text-white" : "bg-white text-black"
                )}
            >
                {isLastDay ? t('finish') : t('next')}
                {isLastDay ? <Check size={16} /> : <ChevronLeft size={16} />}
            </button>
        </div>
      </div>
    </div>
  );
};

// Days Horizontal Scroll
const DaySelector = ({ days, activeDay, setActiveDay, meals }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.children[activeDay];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeDay]);

  return (
    <div className="bg-white sticky top-0 z-20 pb-2 pt-2 border-b border-gray-100/50 backdrop-blur-sm bg-white/80">
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto px-4 py-2 scrollbar-hide snap-x">
        {days.map((day, idx) => {
          const isActive = activeDay === idx;
          const meal = meals[idx];
          return (
            <button
              key={day}
              onClick={() => setActiveDay(idx)}
              className={cn(
                "flex-shrink-0 snap-center flex flex-col items-center gap-1.5 min-w-[64px] transition-all",
                isActive ? "opacity-100 scale-105" : "opacity-60 hover:opacity-100"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center border-[3px] transition-all relative shadow-sm",
                isActive 
                  ? "border-black bg-black text-white" 
                  : meal.isSkipped
                    ? "border-gray-200 bg-gray-100 text-gray-400"
                    : meal.main
                      ? "border-green-500 bg-white text-green-600"
                      : "border-gray-200 bg-white text-gray-700"
              )}>
                 {meal.isSkipped ? <Home size={20} /> : <span className="text-lg font-bold">{idx + 1}</span>}
                 {meal.main && !isActive && !meal.isSkipped && (
                   <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-0.5 border-2 border-white">
                     <Check size={10} strokeWidth={4} />
                   </div>
                 )}
              </div>
              <span className={cn("text-xs font-medium", isActive ? "text-black font-bold" : "text-gray-500")}>
                {dayNamesHebrew[day]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Main App Component
export default function MealOrdering() {
  const { t } = useTranslation();
  const [meals, setMeals] = useState(days.map((day) => ({ day, main: '', salad1: '', salad2: '', side1: '', side2: '', isSkipped: false })));
  const [activeDay, setActiveDay] = useState(0);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false); // Feedback State
  const [favorites, setFavorites] = useState([]); // Favorites State

  const nextWeekId = getWeekId(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const readableDate = getReadableDateRange(nextWeekId);

  useEffect(() => {
    // Load Favorites from LocalStorage
    const savedFavs = localStorage.getItem('mealFavorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    const init = async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { setIsLoading(false); return; }
        const userData = JSON.parse(userStr);
        setUser(userData);
        // Simulate Fetch
        setTimeout(() => setIsLoading(false), 800);
    };
    init();
  }, [nextWeekId]);

  const handleSelection = (category, itemName) => {
    if (meals[activeDay].isSkipped) return;
    const currentMeal = meals[activeDay];
    let updates = {};

    if (category === 'main') {
      updates = { main: currentMeal.main === itemName ? '' : itemName };
    } 
    else {
      const field1 = category === 'sides' ? 'side1' : 'salad1';
      const field2 = category === 'sides' ? 'side2' : 'salad2';
      const isSelected = currentMeal[field1] === itemName || currentMeal[field2] === itemName;
      if (isSelected) {
        updates = { [field1]: currentMeal[field1] === itemName ? '' : currentMeal[field1], [field2]: currentMeal[field2] === itemName ? '' : currentMeal[field2] };
      } else {
        if (!currentMeal[field1]) updates = { [field1]: itemName };
        else if (!currentMeal[field2]) updates = { [field2]: itemName };
        else { toast(t('maxTwoSelections') || 'מקסימום 2 בחירות', { icon: '✋', style: { borderRadius: '10px', background: '#333', color: '#fff'} }); return; }
      }
    }
    setMeals(prev => prev.map((meal, idx) => idx === activeDay ? { ...meal, ...updates } : meal));
  };

  const handleSkipDay = () => {
    setMeals(prev => prev.map((meal, idx) => {
      if (idx !== activeDay) return meal;
      return { ...meal, isSkipped: !meal.isSkipped, main: '', side1: '', side2: '', salad1: '', salad2: '' };
    }));
  };

  // --- Favorites Logic ---
  const handleSaveFavorite = () => {
    const current = meals[activeDay];
    if (current.isSkipped || !current.main) {
      toast.error(t('selectMainBeforeSave') || 'בחר מנה עיקרית לפני שמירה');
      return;
    }
    const name = window.prompt('תן שם לשילוב הזה (למשל: שניצל ופירה)');
    if (!name) return;

    const newFav = {
      id: Date.now(),
      name,
      main: current.main,
      side1: current.side1,
      side2: current.side2,
      salad1: current.salad1,
      salad2: current.salad2
    };

    const updatedFavs = [...favorites, newFav];
    setFavorites(updatedFavs);
    localStorage.setItem('mealFavorites', JSON.stringify(updatedFavs));
    toast.success(t('addedToFavorites') || 'נוסף למועדפים!');
  };

  const handleLoadFavorite = (fav) => {
    setMeals(prev => prev.map((meal, idx) => {
      if (idx !== activeDay) return meal;
      return {
        ...meal,
        isSkipped: false,
        main: fav.main,
        side1: fav.side1,
        side2: fav.side2,
        salad1: fav.salad1,
        salad2: fav.salad2
      };
    }));
    toast.success(`נטען: ${fav.name}`);
  };

  const handleDeleteFavorite = (id) => {
    if(!window.confirm(t('deleteFavoriteConfirm') || 'למחוק את המועדף הזה?')) return;
    const updated = favorites.filter(f => f.id !== id);
    setFavorites(updated);
    localStorage.setItem('mealFavorites', JSON.stringify(updated));
  };

  const handleConfirmSubmit = async () => {
    const toastId =       toast.loading(t('sendingOrder') || 'שולח הזמנה...');
    setTimeout(() => {
        toast.success(t('orderReceivedSuccessfully') || 'ההזמנה התקבלה בהצלחה!', { id: toastId });
        setIsSummaryOpen(false);
    }, 1500);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>;

  const currentMeal = meals[activeDay];
  const progress = (meals.filter(m => m.main || m.isSkipped).length / 5) * 100;

  return (
    <>
    <AnimatePresence>
        {isMobileMenuOpen && (
             <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                 <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="absolute right-0 h-full w-64 bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
                    <Sidebar user={user} />
                 </motion.div>
             </div>
        )}
    </AnimatePresence>
    
    <SummaryModal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} meals={meals} onConfirm={handleConfirmSubmit} />
    <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-32" dir="rtl">
      <Toaster position="top-center" />
      
      {/* Mobile Header */}
      <div className="bg-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm lg:hidden">
        <div className="flex items-center gap-2">
           <h1 className="text-xl font-black tracking-tight">FoodApp</h1>
           <button onClick={() => setIsFeedbackOpen(true)} className="text-yellow-500 bg-yellow-50 p-1.5 rounded-full"><Star size={16} className="fill-current"/></button>
        </div>
        <div className="flex gap-3 items-center">
            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-md">{Math.round(progress)}%</span>
            <Menu className="text-gray-700" onClick={() => setIsMobileMenuOpen(true)}/>
        </div>
      </div>

      <div className="max-w-md mx-auto lg:max-w-6xl lg:flex lg:gap-8 lg:mt-8">
        
        <div className="hidden lg:block w-64 shrink-0"><Sidebar user={user} /></div>

        <main className="flex-1 lg:bg-white lg:rounded-3xl lg:p-8 lg:shadow-sm">
            
            <div className="hidden lg:flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-4xl font-black mb-2">מה אוכלים?</h1>
                    <div className="flex items-center gap-3">
                         <p className="text-gray-500">תכנון ארוחות: {readableDate}</p>
                         <button onClick={() => setIsFeedbackOpen(true)} className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1 transition-colors">
                             <Star size={16} className="fill-indigo-600" />
                             {t('rateMealsFromLastWeek')}
                         </button>
                    </div>
                </div>
                <div className="bg-black text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                    <Clock size={16} /> סגירה בחמישי 11:00
                </div>
            </div>

            <DaySelector days={days} activeDay={activeDay} setActiveDay={setActiveDay} meals={meals} />
            
            <FavoritesBar 
                favorites={favorites} 
                onLoadFavorite={handleLoadFavorite} 
                onSaveCurrent={handleSaveFavorite}
                onDeleteFavorite={handleDeleteFavorite}
            />

            <div className="px-4 lg:px-0 mt-6">
                 <button onClick={handleSkipDay} className={cn("w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all shadow-sm", currentMeal.isSkipped ? "bg-black text-white" : "bg-white text-gray-600 border border-gray-100 lg:border-gray-200")}>
                    <span className="font-bold text-sm flex items-center gap-2">{currentMeal.isSkipped ? <Home size={18}/> : <Utensils size={18}/>}{currentMeal.isSkipped ? 'אני בחופש ביום זה' : 'אני מזמין אוכל'}</span>
                    <div className={cn("w-10 h-6 rounded-full p-1 transition-colors flex items-center", currentMeal.isSkipped ? "bg-gray-700 justify-end" : "bg-gray-200 justify-start")}><div className="w-4 h-4 bg-white rounded-full shadow-sm"></div></div>
                 </button>
            </div>

            <AnimatePresence mode="wait">
                {currentMeal.isSkipped ? (
                    <motion.div key="skipped" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Sparkles className="text-gray-400" size={40} /></div>
                        <h3 className="text-xl font-bold mb-2">יום חופש נעים!</h3>
                        <p className="text-gray-500 text-sm">{t('thisDayMarkedAsNoMeal')}</p>
                    </motion.div>
                ) : (
                    <motion.div key={activeDay} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 lg:px-0 space-y-8">
                        <section>
                            <h2 className="text-lg font-black text-gray-900 mb-4 px-1">מנה עיקרית</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {menuOptions.main.map(item => (<SelectionCard key={item.id} item={item} type="main" isSelected={currentMeal.main === item.name} onToggle={(name) => handleSelection('main', name)}/>))}
                            </div>
                        </section>
                        <section>
                            <h2 className="text-lg font-black text-gray-900 mb-4 px-1">תוספות <span className="text-sm font-normal text-gray-400">(עד 2)</span></h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {menuOptions.sides.map(item => (<SelectionCard key={item.id} item={item} isSelected={currentMeal.side1 === item.name || currentMeal.side2 === item.name} onToggle={(name) => handleSelection('sides', name)}/>))}
                            </div>
                        </section>
                        <section>
                            <h2 className="text-lg font-black text-gray-900 mb-4 px-1">{t('salads')} <span className="text-sm font-normal text-gray-400">{t('upToTwo')}</span></h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {menuOptions.salads.map(item => (<SelectionCard key={item.id} item={item} isSelected={currentMeal.salad1 === item.name || currentMeal.salad2 === item.name} onToggle={(name) => handleSelection('salads', name)}/>))}
                            </div>
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
      </div>

      <FloatingDock activeDay={activeDay} days={days} onNext={() => setActiveDay(p => p + 1)} onPrev={() => setActiveDay(p => p - 1)} currentMeal={currentMeal} onOpenSummary={() => setIsSummaryOpen(true)} />
    </div>
    </>
  );
}