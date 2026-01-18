import { useState, useEffect, useMemo } from 'react';
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

const apps = [
    {
      title: 'Meal Ordering',
      description: 'Order your daily meals for the workweek',
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
      description: 'Manage daily meals for the workweek',
      icon: <Utensils className="w-6 h-6" />,
      link: '/adminMeal',
      accent: 'border-l-orange-400',
      gradient: 'from-orange-50 to-orange-100/50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      category: 'meal',
    },
    {
      title: 'Box & Cooler Inventory',
      description: 'Track boxes and coolers inventory',
      icon: <Package className="w-6 h-6" />,
      link: '/boxes',
      accent: 'border-l-blue-400',
      gradient: 'from-blue-50 to-blue-100/50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      category: 'inventory',
    },
    {
      title: 'Admin Panel Box Inventory',
      description: 'Add and manage Box Inventory',
      icon: <PackageOpen className="w-6 h-6" />,
      link: '/adminBox',
      accent: 'border-l-blue-400',
      gradient: 'from-blue-50 to-blue-100/50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      category: 'inventory',
    },
    {
      title: 'Dashboard Box and Waves',
      description: 'Submit and track IT support requests',
      icon: <Laptop2 className="w-6 h-6" />,
      link: '/Dashboard',
      accent: 'border-l-green-400',
      gradient: 'from-green-50 to-green-100/50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      category: 'dashboard',
    },
    {
      title: 'Statistics',
      description: 'Submit and track service requests',
      icon: <ChartNoAxesCombined className="w-6 h-6" />,
      link: '/statistics',
      accent: 'border-l-purple-400',
      gradient: 'from-purple-50 to-purple-100/50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      category: 'analytics',
    },
    {
      title: 'Invoices',
      description: 'Management data of invoices ',
      icon: <File className="w-6 h-6" />,
      link: '/invoice',
      accent: 'border-l-yellow-400',
      gradient: 'from-yellow-50 to-yellow-100/50',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      category: 'finance',
    },
    {
      title: 'Scanner',
      description: 'Document Scanner imag to data and PDF',
      icon: <Camera className="w-6 h-6" />,
      link: '/invoiceUploader',
      accent: 'border-l-lime-400',
      gradient: 'from-lime-50 to-lime-100/50',
      iconBg: 'bg-lime-100',
      iconColor: 'text-lime-600',
      category: 'tools',
    },
    {
      title: 'Data Sync WMS',
      description: 'Synchronize data with Warehouse Management System',
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
      description: 'Test environment for box inventory',
      icon: <Code className="w-6 h-6" />,
      link: '/BoxInventoryNew',
      accent: 'border-l-emerald-400',
      gradient: 'from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      category: 'development',
    },
    {
      title: 'Developer',
      description: 'Add and manage pages , logs',
      icon: <Code className="w-6 h-6" />,
      link: '/developer',
      accent: 'border-l-emerald-400',
      gradient: 'from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      category: 'development',
    },
    {
      title: 'Admin Panel',
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

const getCategories = () => [
    { id: 'all', label: 'All Apps' },
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
  }, [user, searchTerm, selectedCategory, sortBy, appUsage]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
              placeholder="Search applications... (Ctrl+K)"
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
                {getCategories().map((cat) => {
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
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
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
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
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
                <h2 className="text-xl font-semibold text-gray-900">All Applications</h2>
                <span className="text-sm text-gray-500">({regularApps.length})</span>
              </div>
            )}
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
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
              No applications found
            </h3>
            <p className="text-base sm:text-lg text-gray-600 max-w-md mx-auto leading-relaxed mb-4">
              {searchTerm 
                ? `No applications match "${searchTerm}". Try a different search term.`
                : 'No applications match the selected filters.'
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
                Clear filters
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

  return (
    <a
      href={app.link}
      onClick={handleClick}
      className={`group block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${
        viewMode === 'list' ? 'flex items-center gap-4' : ''
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`
          relative bg-white border border-gray-200 ${app.accent} border-l-4
          rounded-xl overflow-hidden
          transition-all duration-300 ease-out
          hover:shadow-xl hover:-translate-y-2 hover:border-gray-300
          cursor-pointer h-full
          before:absolute before:inset-0 before:bg-gradient-to-br ${app.gradient} before:opacity-0 before:transition-opacity before:duration-300
          hover:before:opacity-100
          ${viewMode === 'list' ? 'flex-1' : ''}
        `}
      >
        <div className={`relative ${viewMode === 'list' ? 'p-4 flex items-center gap-4' : 'p-6 sm:p-8'}`}>
          <div className={`flex items-start ${viewMode === 'list' ? 'items-center' : 'justify-between'} ${viewMode === 'list' ? 'gap-4 flex-1' : 'mb-5 sm:mb-6'}`}>
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`p-3 sm:p-4 ${app.iconBg} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-sm flex-shrink-0`}
              >
                <div className={app.iconColor}>{app.icon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className={`${viewMode === 'list' ? 'text-base' : 'text-lg sm:text-xl'} font-semibold text-gray-900 group-hover:text-gray-800 transition-colors leading-tight`}>
                    {app.title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Badges */}
                    {isRecent && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Recent
                      </span>
                    )}
                    {isPopular && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Popular
                      </span>
                    )}
                    {isNew && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        New
                      </span>
                    )}
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleFavorite(app.link);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          isFavorite
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-400 hover:text-yellow-500'
                        } transition-colors`}
                      />
                    </button>
                  </div>
                </div>
                <p className={`${viewMode === 'list' ? 'text-sm' : 'text-sm sm:text-base'} text-gray-600 leading-relaxed ${viewMode === 'list' ? 'line-clamp-1' : 'line-clamp-2'}`}>
                  {app.description || 'No description available'}
                </p>
                {usageCount > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>Used {usageCount} {usageCount === 1 ? 'time' : 'times'}</span>
                  </div>
                )}
              </div>
            </div>
            <ArrowRight
              className={`w-5 h-5 ${app.iconColor} opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 ${viewMode === 'list' ? 'ml-2' : ''}`}
            />
          </div>

          {viewMode === 'grid' && (
            <div className="mt-6 pt-4 border-t border-gray-100 group-hover:border-gray-200 transition-colors">
              <span className="text-xs sm:text-sm text-gray-500 group-hover:text-gray-700 transition-colors font-medium inline-flex items-center gap-1">
                Open app
                <ArrowRight className="w-3 h-3 inline-block group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
