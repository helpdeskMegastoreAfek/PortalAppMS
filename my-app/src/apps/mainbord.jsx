import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import {
  Utensils,
  Package,
  Laptop2,
  Wrench,
  ShieldCheck,
  ArrowRight,
  PackageOpen,
  File,
  Camera,
  Code,
  RefreshCcw,
  ChartNoAxesCombined,
  Search,
  X,
  Star,
  Grid3x3,
  List,
  Filter,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

const getApps = (t) => [
    {
      title: t('mealOrdering'),
      description: t('orderDailyMeals'),
      icon: <Utensils className="w-6 h-6" />,
      link: '/meal',
      accent: 'border-l-orange-400',
      gradient: 'from-orange-50 to-orange-100/50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      category: 'meal',
    },
    {
      title: 'Admin Meal Ordering',
      description: t('manageDailyMeals'),
      icon: <Utensils className="w-6 h-6" />,
      link: '/adminMeal',
      accent: 'border-l-orange-400',
      gradient: 'from-orange-50 to-orange-100/50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      category: 'meal',
    },
    {
      title: t('boxCoolerInventory'),
      description: t('trackBoxesCoolers'),
      icon: <Package className="w-6 h-6" />,
      link: '/boxes',
      accent: 'border-l-blue-400',
      gradient: 'from-blue-50 to-blue-100/50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      category: 'inventory',
    },
    {
      title: t('adminBoxInventory'),
      description: t('addManageBoxInventory'),
      icon: <PackageOpen className="w-6 h-6" />,
      link: '/adminBox',
      accent: 'border-l-blue-400',
      gradient: 'from-blue-50 to-blue-100/50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      category: 'inventory',
    },
    {
      title: t('dashboardBoxWaves'),
      description: t('submitTrackITRequests'),
      icon: <Laptop2 className="w-6 h-6" />,
      link: '/Dashboard',
      accent: 'border-l-green-400',
      gradient: 'from-green-50 to-green-100/50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      category: 'dashboard',
    },
    {
      title: t('statistics'),
      description: t('submitTrackServiceRequests'),
      icon: <ChartNoAxesCombined className="w-6 h-6" />,
      link: '/statistics',
      accent: 'border-l-purple-400',
      gradient: 'from-purple-50 to-purple-100/50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      category: 'analytics',
    },
    {
      title: t('invoices'),
      description: t('managementDataInvoices'),
      icon: <File className="w-6 h-6" />,
      link: '/invoice',
      accent: 'border-l-yellow-400',
      gradient: 'from-yellow-50 to-yellow-100/50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      category: 'finance',
    },
    {
      title: t('scanner'),
      description: t('documentScanner'),
      icon: <Camera className="w-6 h-6" />,
      link: '/invoiceUploader',
      accent: 'border-l-lime-400',
      gradient: 'from-lime-50 to-lime-100/50',
      iconBg: 'bg-lime-100',
      iconColor: 'text-lime-600',
      category: 'tools',
    },
    {
      title: t('dataSyncWMS'),
      description: t('synchronizeDataWMS'),
      icon: <RefreshCcw className="w-6 h-6" />,
      link: '/DataSyncPage',
      accent: 'border-l-emerald-400',
      gradient: 'from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      category: 'tools',
    },
    {
      title: 'Box & Cooler Inventory Test',
      description: t('testEnvironmentBoxInventory'),
      icon: <Code className="w-6 h-6" />,
      link: '/BoxInventoryNew',
      accent: 'border-l-emerald-400',
      gradient: 'from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      category: 'development',
    },
    {
      title: t('developer'),
      description: t('addManagePagesLogs'),
      icon: <Code className="w-6 h-6" />,
      link: '/developer',
      accent: 'border-l-emerald-400',
      gradient: 'from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      category: 'development',
    },
    {
      title: t('adminPanel'),
      description: 'Add and manage user access',
      icon: <ShieldCheck className="w-6 h-6" />,
      link: '/admin',
      accent: 'border-l-red-400',
      gradient: 'from-red-50 to-red-100/50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      adminOnly: true,
      category: 'admin',
    },
];

const getCategories = (t) => [
    { id: 'all', label: t('allApps') },
    { id: 'meal', label: 'Meal' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'finance', label: 'Finance' },
    { id: 'tools', label: 'Tools' },
    { id: 'development', label: 'Development' },
    { id: 'admin', label: 'Admin' },
];

export default function EmployeePortal() {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user'));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'category', 'usage'
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('appFavorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentApps, setRecentApps] = useState(() => {
    const saved = localStorage.getItem('recentApps');
    return saved ? JSON.parse(saved) : [];
  });
  const [appUsage, setAppUsage] = useState(() => {
    const saved = localStorage.getItem('appUsage');
    return saved ? JSON.parse(saved) : {};
  });

  const apps = getApps(t);
  const categories = getCategories(t);

  const toggleFavorite = (link) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(link)
        ? prev.filter(f => f !== link)
        : [...prev, link];
      localStorage.setItem('appFavorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Track app usage when clicking on an app
  const trackAppUsage = (link) => {
    // Update usage count
    setAppUsage(prev => {
      const newUsage = { ...prev, [link]: (prev[link] || 0) + 1 };
      localStorage.setItem('appUsage', JSON.stringify(newUsage));
      return newUsage;
    });

    // Update recent apps (keep last 5)
    setRecentApps(prev => {
      const filtered = prev.filter(app => app !== link);
      const newRecent = [link, ...filtered].slice(0, 5);
      localStorage.setItem('recentApps', JSON.stringify(newRecent));
      return newRecent;
    });
  };

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('app-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredApps = useMemo(() => {
    let filtered = apps.filter((app) => {
      // Role-based filtering
      if (app.adminOnly && user?.role !== 'admin' && user?.role !== 'developer')
        return false;
      if (!(user?.role === 'admin' || user?.role === 'developer') && !user?.allowedApps?.includes(app.link))
        return false;

      // Search filtering
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const searchable = `${app.title} ${app.description}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }

      // Category filtering
      if (selectedCategory !== 'all' && app.category !== selectedCategory)
        return false;

      return true;
    });

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'usage') {
        const usageA = appUsage[a.link] || 0;
        const usageB = appUsage[b.link] || 0;
        return usageB - usageA;
      } else if (sortBy === 'category') {
        return a.category.localeCompare(b.category);
      }
      return 0;
    });

    return filtered;
  }, [user, searchTerm, selectedCategory, sortBy, appUsage, apps]);

  const favoriteApps = useMemo(() => {
    return filteredApps.filter(app => favorites.includes(app.link));
  }, [filteredApps, favorites]);

  const recentAppsList = useMemo(() => {
    return filteredApps.filter(app => recentApps.includes(app.link));
  }, [filteredApps, recentApps]);

  const regularApps = useMemo(() => {
    return filteredApps.filter(app => 
      !favorites.includes(app.link) && !recentApps.includes(app.link)
    );
  }, [filteredApps, favorites, recentApps]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Welcome Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <span className="text-2xl sm:text-3xl font-bold text-white">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 mb-3 sm:mb-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
            Welcome back,{' '}
            <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {user?.username}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-top-4 duration-500 delay-200">
            Choose from your available applications to get started with your daily tasks
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-sm text-blue-700 animate-in fade-in duration-500 delay-300">
            <Package className="w-4 h-4" />
            <span className="font-medium">{filteredApps.length}</span>
            <span>applications available</span>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="app-search"
              type="text"
              placeholder={`${t('searchApps')} (Ctrl+K)`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-gray-900 placeholder-gray-400 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Category Filters and View Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Category Filters */}
            <div className="relative w-full sm:flex-1 min-w-0">
              <div 
                className="flex items-center gap-2 overflow-x-scroll overflow-y-hidden pb-3 w-full scroll-smooth"
                style={{ 
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d1d5db transparent'
                }}
              >
                {categories.map((cat) => {
                  const count = cat.id === 'all' 
                    ? filteredApps.length 
                    : filteredApps.filter(a => a.category === cat.id).length;
                  if (count === 0 && cat.id !== 'all') return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`
                        flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                        ${selectedCategory === cat.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }
                      `}
                    >
                      {cat.label}
                      {count > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                          selectedCategory === cat.id ? 'bg-blue-500' : 'bg-gray-200'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Scroll indicator gradient */}
              <div className="absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none sm:hidden"></div>
            </div>

            {/* View Mode Toggle and Sort */}
            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="name">Sort by Name</option>
                  <option value="category">Sort by Category</option>
                  <option value="usage">Sort by Usage</option>
                </select>
                <ArrowUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Grid view"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Apps Section */}
        {recentAppsList.length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Recently Used</h2>
              <span className="text-sm text-gray-500">({recentAppsList.length})</span>
            </div>
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              : "space-y-3"
            }>
              {recentAppsList.map((app, index) => (
                <AppCard
                  key={app.link}
                  app={app}
                  index={index}
                  viewMode={viewMode}
                  isFavorite={favorites.includes(app.link)}
                  onToggleFavorite={toggleFavorite}
                  onTrackUsage={trackAppUsage}
                  usageCount={appUsage[app.link] || 0}
                  isRecent={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Favorites Section */}
        {favoriteApps.length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <h2 className="text-xl font-semibold text-gray-900">Favorites</h2>
              <span className="text-sm text-gray-500">({favoriteApps.length})</span>
            </div>
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              : "space-y-3"
            }>
              {favoriteApps.map((app, index) => (
                <AppCard
                  key={app.link}
                  app={app}
                  index={index}
                  viewMode={viewMode}
                  isFavorite={true}
                  onToggleFavorite={toggleFavorite}
                  onTrackUsage={trackAppUsage}
                  usageCount={appUsage[app.link] || 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Apps Section */}
        {regularApps.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
            {favoriteApps.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900">{t('allApps')}</h2>
                <span className="text-sm text-gray-500">({regularApps.length})</span>
              </div>
            )}
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              : "space-y-3"
            }>
              {regularApps.map((app, index) => (
                <AppCard
                  key={app.link}
                  app={app}
                  index={index}
                  viewMode={viewMode}
                  isFavorite={false}
                  onToggleFavorite={toggleFavorite}
                  onTrackUsage={trackAppUsage}
                  usageCount={appUsage[app.link] || 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredApps.length === 0 && (
          <div className="text-center py-16 sm:py-20 animate-in fade-in duration-500">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
              {t('noAppsFound')}
            </h3>
            <p className="text-base sm:text-lg text-gray-600 max-w-md mx-auto leading-relaxed mb-4">
              {searchTerm 
                ? t('tryAdjustingFilters')
                : t('tryAdjustingFilters')
              }
            </p>
            {(searchTerm || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        )}

        {/* Empty State - No apps at all */}
        {apps.filter((app) => {
          if (app.adminOnly && user?.role !== 'admin' && user?.role !== 'developer')
            return false;
          return (user?.role === 'admin' || user?.role === 'developer') || user?.allowedApps?.includes(app.link);
        }).length === 0 && (
          <div className="text-center py-16 sm:py-20 animate-in fade-in duration-500">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
              No applications available
            </h3>
            <p className="text-base sm:text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
              Contact your administrator to request access to applications.
            </p>
          </div>
        )}

        {/* System Status */}
        {filteredApps.length > 0 && (
          <div className="mt-12 sm:mt-16 text-center animate-in fade-in duration-500 delay-600">
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-full shadow-sm border border-gray-200">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <span className="text-sm text-gray-600 font-medium">
                System status: All services operational
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// App Card Component
function AppCard({ app, index, viewMode, isFavorite, onToggleFavorite, onTrackUsage, usageCount = 0, isRecent = false }) {
  const handleClick = () => {
    if (onTrackUsage) {
      onTrackUsage(app.link);
    }
  };

  const isPopular = usageCount >= 10;
  const isNew = false; // Can be extended with a 'new' property in app data

  if (viewMode === 'list') {
    // List view - simpler layout
    return (
      <a
        href={app.link}
        onClick={handleClick}
        className="group block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
          <div className="p-4 flex items-center gap-4">
            <div className={`p-3 ${app.iconBg} rounded-xl flex-shrink-0`}>
              <div className={app.iconColor}>{app.icon}</div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 leading-tight mb-1">
                {app.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-1">
                {app.description || 'No description available'}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(app.link);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                isFavorite
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Star className={`w-3 h-3 ${isFavorite ? 'fill-white' : ''}`} />
              {isFavorite ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </a>
    );
  }

  // Grid view - card design similar to job listings
  return (
    <a
      href={app.link}
      onClick={handleClick}
      className="group block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col">
        {/* Top Section - Logo and Save Button */}
        <div className="p-5 pb-4 flex items-start justify-between">
          <div className={`w-14 h-14 ${app.iconBg} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <div className={app.iconColor}>{app.icon}</div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(app.link);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              isFavorite
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Star className={`w-3 h-3 ${isFavorite ? 'fill-white' : ''}`} />
            {isFavorite ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Middle Section - Title, Badges, Description */}
        <div className="px-5 pb-4 flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
            {app.title}
          </h3>
          
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isRecent && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-normal rounded border border-gray-200">
                Recent
              </span>
            )}
            {isPopular && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-normal rounded border border-gray-200">
                Popular
              </span>
            )}
            {usageCount > 0 && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-normal rounded border border-gray-200">
                {usageCount} uses
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {app.description || 'No description available'}
          </p>
        </div>

        {/* Bottom Section - Category and Action Button */}
        <div className="px-5 pb-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 capitalize">{app.category}</span>
              {usageCount > 0 && (
                <span className="text-xs text-gray-400 mt-0.5">
                  Used {usageCount} {usageCount === 1 ? 'time' : 'times'}
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick();
                window.location.href = app.link;
              }}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Open app
            </button>
          </div>
        </div>
      </div>
    </a>
  );
}
