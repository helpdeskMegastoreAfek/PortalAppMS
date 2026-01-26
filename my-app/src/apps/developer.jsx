import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Plus, Trash2, Loader, CheckCircle, AlertCircle, RefreshCw, Search, Filter, X, Info, AlertTriangle, Shield, Bell, AlertOctagon, Monitor, LogOut as LogOutIcon, Clock, Activity, Globe, Ban, Check, BarChart3, Download, Upload, FileDown, Calendar, TrendingUp, User, MapPin, Zap } from 'lucide-react';
import { Box, Tabs, Tab, Typography, Paper } from '@mui/material';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`developer-tabpanel-${index}`}
      aria-labelledby={`developer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

const ManageCitiesPanel = () => {
  // ... (כל הקוד של ManageCitiesPanel נשאר כפי שהוא)
  const [cities, setCities] = useState([]);
  const [newCityName, setNewCityName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/cities`);
      if (!res.ok) throw new Error('Failed to load cities');
      const data = await res.json();
      setCities(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCityName.trim()) return;

    const promise = fetch(`${API_URL}/api/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCityName.trim() }),
    }).then((res) => {
      if (!res.ok) {
        return res.json().then((data) => Promise.reject(data.message || 'Failed to add city'));
      }
      return res.json();
    });

    toast.promise(promise, {
      loading: 'Adding city...',
      success: (data) => {
        setNewCityName('');
        fetchCities();
        return `City "${data.name}" added successfully!`;
      },
      error: (err) => `${err.toString()}`,
    });
  };

  const handleDeleteCity = async (cityId, cityName) => {
    const promise = fetch(`${API_URL}/api/cities/${cityId}`, { method: 'DELETE' }).then((res) => {
      if (!res.ok) {
        return res.json().then((data) => Promise.reject(data.message || 'Failed to delete city'));
      }
      return res.json();
    });

    toast.promise(promise, {
      loading: `Deleting "${cityName}"...`,
      success: () => {
        fetchCities();
        return 'City deleted successfully!';
      },
      error: (err) => `${err.toString()}`,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-800">Add New City</h3>
        <form onSubmit={handleAddCity} className="flex items-center gap-2">
          <input
            type="text"
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            className="flex-grow h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
            placeholder="e.g., Tel Aviv"
          />
          <button
            type="submit"
            disabled={!newCityName.trim()}
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200 disabled:shadow-none"
          >
            <Plus size={20} />
          </button>
        </form>
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-800">Existing Cities ({cities.length})</h3>
        <div className="border border-slate-200 rounded-xl max-h-72 overflow-y-auto shadow-inner bg-gradient-to-b from-white to-slate-50/30">
          {loading ? (
            <div className="p-6 text-center">
              <Loader className="animate-spin mx-auto text-indigo-500" />
            </div>
          ) : cities.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No cities added yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {cities.map((city) => (
                <li
                  key={city._id}
                  className="px-4 py-3 flex justify-between items-center group hover:bg-slate-50/70 transition-colors duration-200"
                >
                  <span className="text-slate-800 font-medium">{city.name}</span>
                  <button
                    onClick={() => handleDeleteCity(city._id, city.name)}
                    className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all duration-200 hover:scale-110 p-1 rounded"
                    aria-label={`Delete ${city.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const SystemLogsPanel = () => {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/logs`);
      if (!res.ok) {
        throw new Error(`Failed to fetch logs: ${res.statusText}`);
      }
      const data = await res.json();
      const reversedLogs = data.logContent.split('\n').reverse().join('\n');
      setLogs(reversedLogs);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-800">Application Log (app.log)</h3>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Refresh
            </>
          )}
        </button>
      </div>

      {error && (
        <div
          className="flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-100"
          role="alert"
        >
          <AlertCircle size={20} className="mr-2" />
          <span className="font-medium">Error:</span>&nbsp;{error}
        </div>
      )}

      <div className="relative">
        <pre className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-green-400 font-mono text-sm p-6 rounded-xl overflow-x-auto h-96 w-full shadow-inner border border-gray-700/50">
          <code className="block whitespace-pre">{loading ? 'Loading logs...' : logs || 'Log file is empty or not found.'}</code>
        </pre>
        <div className="absolute top-2 right-2 flex gap-2">
          <div className="px-2 py-1 bg-gray-800/80 text-xs text-gray-400 rounded border border-gray-700/50">
            Terminal
          </div>
        </div>
      </div>
    </div>
  );
};

const SessionsManagementPanel = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'admin' || user?.role === 'developer';
  const [sessions, setSessions] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const endpoint = isAdmin ? '/api/sessions/all' : '/api/sessions/my-sessions';
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch sessions: ${res.statusText}`);
      }
      const data = await res.json();
      
      if (isAdmin) {
        // Admin view - all users' sessions
        setSessions(data.sessions || []);
        setActiveCount(data.sessions?.length || 0);
        setTotalCount(data.sessions?.length || 0);
      } else {
        // Regular user view
        setSessions(data.sessions || []);
        setActiveCount(data.activeCount || 0);
        setTotalCount(data.totalCount || 0);
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTerminateSession = async (sessionId) => {
    // Check if this is the current session
    const currentSession = sessions.find(s => s.isCurrent);
    const isCurrentSession = currentSession?._id === sessionId;
    
    if (!confirm(isCurrentSession 
      ? 'Are you sure you want to terminate your current session? You will be logged out.'
      : 'Are you sure you want to terminate this session?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to terminate session');
      }

      const data = await res.json();
      
      // If current session was terminated, logout user
      if (data.isCurrentSession || isCurrentSession) {
        toast.success('Session terminated. Logging out...');
        
        // Clear local storage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('rememberedUsername');
        localStorage.removeItem('rememberMe');
        
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      } else {
        toast.success('Session terminated successfully');
        fetchSessions();
      }
    } catch (e) {
      toast.error(e.message || 'Failed to terminate session');
    }
  };

  const handleTerminateAllOthers = async () => {
    if (!confirm('Are you sure you want to terminate all other sessions? You will remain logged in on this device.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/sessions/terminate-all-others`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      });

      if (!res.ok) {
        throw new Error('Failed to terminate sessions');
      }

      const data = await res.json();
      toast.success(`${data.terminatedCount} session(s) terminated successfully`);
      fetchSessions();
    } catch (e) {
      toast.error(e.message || 'Failed to terminate sessions');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute(s) ago`;
    if (diffHours < 24) return `${diffHours} hour(s) ago`;
    if (diffDays < 7) return `${diffDays} day(s) ago`;
    return date.toLocaleString('he-IL');
  };

  const getOtherSessionsCount = () => {
    return sessions.filter(s => !s.isCurrent).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-800">
            {isAdmin ? 'All Active Sessions' : 'My Sessions'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin 
              ? 'View and manage all active sessions across all users'
              : 'Manage your active sessions and devices'}
          </p>
          {!isAdmin && (
            <p className="text-xs text-slate-400 mt-1">
              {activeCount} active / {totalCount} total sessions
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {!isAdmin && getOtherSessionsCount() > 0 && (
            <button
              onClick={handleTerminateAllOthers}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-red-700 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 border border-red-200/50 shadow-sm hover:shadow transition-all duration-200"
            >
              <LogOutIcon size={16} />
              Terminate All Others
            </button>
          )}
          {!isAdmin && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Active only
            </label>
          )}
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-100" role="alert">
          <AlertCircle size={20} className="mr-2" />
          <span className="font-medium">Error:</span>&nbsp;{error}
        </div>
      )}

      {!error && !loading && sessions.length === 0 && (
        <div className="flex items-center justify-center p-8 text-slate-500 rounded-lg border-2 border-dashed border-slate-300">
          <div className="text-center">
            <Monitor size={32} className="mx-auto mb-2 text-slate-400" />
            <p>No sessions found.</p>
          </div>
        </div>
      )}

      {!error && !loading && !showActiveOnly && sessions.filter(s => s.isActive).length === 0 && sessions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">No active sessions. Showing inactive sessions.</span>
          </div>
        </div>
      )}

      {!error && !loading && sessions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Device</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">IP Address</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Last Activity</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sessions
                  .filter(session => !isAdmin && showActiveOnly ? session.isActive : true)
                  .map((session) => (
                  <tr 
                    key={session._id} 
                    className={`hover:bg-slate-50/70 transition-all duration-200 ${session.isCurrent ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-l-4 border-indigo-500' : ''} ${!session.isActive ? 'opacity-60' : ''}`}
                  >
                    {isAdmin && session.userId && (
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">
                            {session.userId.username || session.userId.email || 'Unknown'}
                          </div>
                          {session.userId.email && (
                            <div className="text-xs text-slate-500">{session.userId.email}</div>
                          )}
                          {session.userId.role && (
                            <div className="text-xs text-slate-400">{session.userId.role}</div>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Monitor size={16} className="text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-900">{session.deviceInfo}</div>
                          <div className="text-xs text-slate-500 truncate max-w-xs">
                            {session.userAgent}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {session.ip}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-slate-400" />
                        {formatDate(session.lastActivity)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {session.isCurrent ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-300 shadow-sm">
                          Current Session
                        </span>
                      ) : session.isActive ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300 shadow-sm">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-100 to-slate-100 text-gray-600 border border-gray-300">
                          Terminated
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {session.isActive && (
                        <button
                          onClick={() => handleTerminateSession(session._id)}
                          className={`text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                            session.isCurrent 
                              ? 'text-orange-700 bg-orange-50 hover:bg-orange-100 hover:shadow-sm' 
                              : 'text-red-700 bg-red-50 hover:bg-red-100 hover:shadow-sm'
                          }`}
                        >
                          <LogOutIcon size={14} />
                          {session.isCurrent ? 'Terminate & Logout' : 'Terminate'}
                        </button>
                      )}
                      {!session.isActive && (
                        <span className="text-xs text-slate-400">Terminated</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!error && loading && (
        <div className="flex items-center justify-center p-8">
          <Loader className="animate-spin text-indigo-400" size={32} />
        </div>
      )}
    </div>
  );
};

const SecurityAlertsPanel = () => {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/logs/security/alerts?hours=24`);
      if (!res.ok) {
        throw new Error(`Failed to fetch security alerts: ${res.statusText}`);
      }
      const data = await res.json();
      setAlerts(data);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'low': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'high': return <AlertOctagon size={20} className="text-red-600" />;
      case 'medium': return <AlertTriangle size={20} className="text-orange-600" />;
      default: return <AlertCircle size={20} className="text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-800">Security Alerts</h3>
          <p className="text-sm text-slate-500 mt-1">Active security threats and suspicious activity</p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Refresh
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-100" role="alert">
          <AlertCircle size={20} className="mr-2" />
          <span className="font-medium">Error:</span>&nbsp;{error}
        </div>
      )}

      {!error && !loading && alerts && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600">Failed Logins</div>
                <AlertCircle className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
              </div>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mt-1">
                {alerts.totalFailedLogins || 0}
              </div>
              <div className="text-xs text-slate-500 mt-2">Last 24 hours</div>
            </div>
            <div className="bg-gradient-to-br from-white to-orange-50/30 p-5 rounded-xl border border-orange-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600">Suspicious IPs</div>
                <AlertTriangle className="w-4 h-4 text-orange-400 group-hover:text-orange-600 transition-colors" />
              </div>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mt-1">
                {alerts.suspiciousIPs?.length || 0}
              </div>
              <div className="text-xs text-slate-500 mt-2">5+ failed attempts</div>
            </div>
            <div className="bg-gradient-to-br from-white to-blue-50/30 p-5 rounded-xl border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600">New IP Logins</div>
                <Info className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent mt-1">
                {alerts.newIPLogins || 0}
              </div>
              <div className="text-xs text-slate-500 mt-2">Last 24 hours</div>
            </div>
            <div className="bg-gradient-to-br from-white to-red-50/30 p-5 rounded-xl border border-red-200/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-slate-600">Unauthorized Access</div>
                <AlertOctagon className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors" />
              </div>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mt-1">
                {alerts.unauthorizedAccess || 0}
              </div>
              <div className="text-xs text-slate-500 mt-2">Attempts</div>
            </div>
          </div>

          {/* Alerts List */}
          {alerts.alerts && alerts.alerts.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-slate-800">Active Alerts</h4>
              {alerts.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-5 rounded-xl border-2 shadow-sm hover:shadow-md transition-all duration-300 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold mb-2 text-base">{alert.message}</div>
                      <div className="flex items-center gap-4 text-sm opacity-90">
                        <span className="font-medium">Type: {alert.type}</span>
                        <span className="font-semibold">Count: {alert.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 text-slate-500 rounded-lg border-2 border-dashed border-slate-300">
              <div className="text-center">
                <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                <p>No active security alerts</p>
                <p className="text-sm mt-1">All systems are operating normally.</p>
              </div>
            </div>
          )}

          {/* Suspicious IPs Table */}
          {alerts.suspiciousIPs && alerts.suspiciousIPs.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200/50 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-red-50/50 to-orange-50/50">
                <h4 className="font-semibold text-slate-800">Suspicious IP Addresses</h4>
                <p className="text-sm text-slate-600 mt-1">IPs with 5+ failed login attempts</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">IP Address</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Username</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Failed Attempts</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Last Attempt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {alerts.suspiciousIPs.map((ip, index) => (
                      <tr key={index} className="hover:bg-red-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-red-600">{ip.ip}</td>
                        <td className="px-4 py-3">{ip.username || 'Unknown'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200 shadow-sm">
                            {ip.count} attempts
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(ip.lastAttempt).toLocaleString('he-IL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!error && loading && (
        <div className="flex items-center justify-center p-8">
          <Loader className="animate-spin text-indigo-400" size={32} />
        </div>
      )}
    </div>
  );
};

const SecurityLogsPanel = () => {
  const [rawLogs, setRawLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterUsername, setFilterUsername] = useState('');
  const [filterMessage, setFilterMessage] = useState('');

  const fetchSecurityLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/logs/security?limit=500`);
      if (!res.ok) {
        throw new Error(`Failed to fetch security logs: ${res.statusText}`);
      }
      const data = await res.json();
      setRawLogs(data.logs || []);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityLogs();
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return rawLogs.filter(log => {
      if (filterLevel && log.level !== filterLevel) return false;
      if (filterUsername && !log.username?.toLowerCase().includes(filterUsername.toLowerCase())) return false;
      if (filterMessage && !log.message?.toLowerCase().includes(filterMessage.toLowerCase())) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchable = `${log.username} ${log.message} ${log.attemptedPath || ''} ${log.ip || ''} ${log.role || ''}`.toLowerCase();
        if (!searchable.includes(searchLower)) return false;
      }
      return true;
    });
  }, [rawLogs, searchTerm, filterLevel, filterUsername, filterMessage]);

  // Get level badge color
  const getLevelColor = (level) => {
    switch(level) {
      case 'ERROR': return 'bg-red-100 text-red-800 border-red-200';
      case 'WARN': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get level icon
  const getLevelIcon = (level) => {
    switch(level) {
      case 'ERROR': return <AlertCircle size={14} className="text-red-600" />;
      case 'WARN': return <AlertTriangle size={14} className="text-orange-600" />;
      case 'INFO': return <Info size={14} className="text-blue-600" />;
      default: return <Shield size={14} />;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get unique values for filters
  const uniqueLevels = useMemo(() => [...new Set(rawLogs.map(l => l.level))].sort(), [rawLogs]);
  const uniqueUsernames = useMemo(() => [...new Set(rawLogs.map(l => l.username).filter(Boolean))].sort(), [rawLogs]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-800">Security Logs</h3>
          <p className="text-sm text-slate-500 mt-1">Security events and access attempts</p>
          {selectedLogs.size > 0 && (
            <p className="text-sm font-medium text-indigo-600 mt-1">
              {selectedLogs.size} log(s) selected
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {selectedLogs.size > 0 && (
            <>
              <button
                onClick={() => {
                  const selected = filteredLogs.filter((log, idx) => selectedLogs.has(log._id || idx));
                  const csv = [
                    ['Date', 'Level', 'Message', 'User', 'IP', 'Role', 'Path'].join(','),
                    ...selected.map(log => [
                      formatDate(log.createdAt),
                      log.level,
                      `"${log.message.replace(/"/g, '""')}"`,
                      log.username || '-',
                      log.ip || '-',
                      log.role || '-',
                      log.attemptedPath || '-'
                    ].join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `security-logs-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${selectedLogs.size} log(s)`);
                  setSelectedLogs(new Set());
                }}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-all duration-200"
              >
                <Download size={16} />
                Export Selected ({selectedLogs.size})
              </button>
              <button
                onClick={() => setSelectedLogs(new Set())}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition-all duration-200"
              >
                <X size={16} />
                Clear Selection
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (selectedLogs.size === filteredLogs.length) {
                setSelectedLogs(new Set());
              } else {
                setSelectedLogs(new Set(filteredLogs.map((log, idx) => log._id || idx)));
              }
            }}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all duration-200"
          >
            {selectedLogs.size === filteredLogs.length && filteredLogs.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={fetchSecurityLogs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
            />
          </div>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
          >
            <option value="">All Levels</option>
            {uniqueLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>

          {/* Username Filter */}
          <select
            value={filterUsername}
            onChange={(e) => setFilterUsername(e.target.value)}
            className="h-9 rounded-md border border-slate-300 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Users</option>
            {uniqueUsernames.map(username => (
              <option key={username} value={username}>{username}</option>
            ))}
          </select>

          {/* Message Filter */}
          <input
            type="text"
            placeholder="Filter by message..."
            value={filterMessage}
            onChange={(e) => setFilterMessage(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
          />
        </div>

        {/* Clear filters */}
        {(searchTerm || filterLevel || filterUsername || filterMessage) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterLevel('');
              setFilterUsername('');
              setFilterMessage('');
            }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all duration-200"
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-600">
        Showing {filteredLogs.length} of {rawLogs.length} logs
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-100" role="alert">
          <AlertCircle size={20} className="mr-2" />
          <span className="font-medium">Error:</span>&nbsp;{error}
        </div>
      )}

      {/* Empty state */}
      {!error && !loading && filteredLogs.length === 0 && (
        <div className="flex items-center justify-center p-8 text-slate-500 rounded-lg border-2 border-dashed border-slate-300">
          <div className="text-center">
            <AlertCircle size={32} className="mx-auto mb-2 text-slate-400" />
            <p>No security logs found.</p>
            <p className="text-sm mt-1">
              {rawLogs.length === 0 
                ? 'Security events will appear here when they occur.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {!error && !loading && filteredLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 w-12">
                    <input
                      type="checkbox"
                      checked={selectedLogs.size === filteredLogs.length && filteredLogs.length > 0}
                      onChange={() => {
                        if (selectedLogs.size === filteredLogs.length) {
                          setSelectedLogs(new Set());
                        } else {
                          setSelectedLogs(new Set(filteredLogs.map((log, idx) => log._id || idx)));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Level</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Message</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">IP</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log, index) => {
                  const logId = log._id || index;
                  const isSelected = selectedLogs.has(logId);
                  return (
                    <tr key={logId} className={`hover:bg-slate-50/70 transition-all duration-200 ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedLogs);
                            if (e.target.checked) {
                              newSelected.add(logId);
                            } else {
                              newSelected.delete(logId);
                            }
                            setSelectedLogs(newSelected);
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${getLevelColor(log.level)}`}>
                          {getLevelIcon(log.level)}
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900 max-w-md">
                        <div className="truncate" title={log.message}>
                          {log.message}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">{log.username || '-'}</div>
                        {log.role && <div className="text-xs text-slate-500">{log.role}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {log.ip || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {log.attemptedPath && (
                          <div className="text-xs text-slate-600" title={`Attempted path: ${log.attemptedPath}`}>
                            <span className="font-medium">Path:</span> {log.attemptedPath}
                          </div>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="text-xs text-slate-500 mt-1" title={JSON.stringify(log.details, null, 2)}>
                            <Info size={12} className="inline mr-1" />
                            More info
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// User Activity Tracking Panel
const UserActivityPanel = () => {
  const [activityLogs, setActivityLogs] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // timeline or chart

  // Get unique usernames from security logs
  const uniqueUsernames = useMemo(() => {
    const usernames = [...new Set(activityLogs.map(log => log.username).filter(Boolean))].sort();
    return usernames;
  }, [activityLogs]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    let filtered = activityLogs;
    
    if (selectedUser) {
      filtered = filtered.filter(log => log.username === selectedUser);
    }
    
    if (dateRange.start) {
      filtered = filtered.filter(log => new Date(log.createdAt) >= new Date(dateRange.start));
    }
    
    if (dateRange.end) {
      filtered = filtered.filter(log => new Date(log.createdAt) <= new Date(dateRange.end));
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activityLogs, selectedUser, dateRange]);

  // Activity statistics by day
  const activityByDay = useMemo(() => {
    const dayCounts = {};
    filteredActivities.forEach(log => {
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      dayCounts[date] = (dayCounts[date] || 0) + 1;
    });
    return Object.entries(dayCounts).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredActivities]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/logs/security?limit=1000`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();
      setActivityLogs(data.logs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('he-IL');
  };

  const getActivityIcon = (level) => {
    switch(level) {
      case 'ERROR': return <AlertCircle size={16} className="text-red-500" />;
      case 'WARN': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'INFO': return <Info size={16} className="text-blue-500" />;
      default: return <Activity size={16} className="text-gray-500" />;
    }
  };

  const maxCount = activityByDay.length > 0 ? Math.max(...activityByDay.map(d => d.count)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-800">User Activity Tracking</h3>
          <p className="text-sm text-slate-500 mt-1">Monitor and analyze user activities and events</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'timeline' ? 'chart' : 'timeline')}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all duration-200"
          >
            {viewMode === 'timeline' ? <BarChart3 size={16} /> : <Clock size={16} />}
            {viewMode === 'timeline' ? 'Chart View' : 'Timeline View'}
          </button>
          <button
            onClick={fetchActivities}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Users</option>
            {uniqueUsernames.map(username => (
              <option key={username} value={username}>{username}</option>
            ))}
          </select>
          
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="h-10 rounded-lg border border-slate-300 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Start Date"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="h-10 rounded-lg border border-slate-300 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-100" role="alert">
          <AlertCircle size={20} className="mr-2" />
          <span className="font-medium">Error:</span>&nbsp;{error}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-200/50">
          <div className="text-sm text-slate-600">Total Activities</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{filteredActivities.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 p-4 rounded-xl border border-green-200/50">
          <div className="text-sm text-slate-600">Unique Users</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{uniqueUsernames.length}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50/50 p-4 rounded-xl border border-orange-200/50">
          <div className="text-sm text-slate-600">Days Tracked</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{activityByDay.length}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50/50 p-4 rounded-xl border border-purple-200/50">
          <div className="text-sm text-slate-600">Avg/Day</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {activityByDay.length > 0 ? Math.round(filteredActivities.length / activityByDay.length) : 0}
          </div>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h4 className="font-semibold text-slate-800 mb-4">Activity Chart (Last 7 Days)</h4>
          <div className="flex items-end gap-2 h-64">
            {activityByDay.slice(-7).map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full h-56 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t transition-all duration-500 hover:from-indigo-600 hover:to-indigo-500"
                    style={{ height: `${(day.count / maxCount) * 100}%` }}
                    title={`${day.date}: ${day.count} activities`}
                  />
                </div>
                <div className="text-xs text-slate-600 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                  {new Date(day.date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-xs font-semibold text-indigo-600">{day.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Activity size={32} className="mx-auto mb-2 text-slate-400" />
                <p>No activities found</p>
              </div>
            ) : (
              filteredActivities.map((log, index) => (
                <div key={log._id || index} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getActivityIcon(log.level)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{log.username || 'Unknown'}</span>
                        <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-1">{log.message}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {log.ip && <span className="font-mono">{log.ip}</span>}
                        {log.role && <span>{log.role}</span>}
                        {log.attemptedPath && <span>Path: {log.attemptedPath}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// IP Management Panel
const IPManagementPanel = () => {
  const [blacklist, setBlacklist] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [newIP, setNewIP] = useState('');
  const [ipType, setIpType] = useState('blacklist');
  const [loading, setLoading] = useState(false);
  const [geoData, setGeoData] = useState({});

  // Mock data - in real app, fetch from API
  useEffect(() => {
    // Load IP lists from localStorage or API
    const savedBlacklist = localStorage.getItem('ipBlacklist');
    const savedWhitelist = localStorage.getItem('ipWhitelist');
    if (savedBlacklist) setBlacklist(JSON.parse(savedBlacklist));
    if (savedWhitelist) setWhitelist(JSON.parse(savedWhitelist));
  }, []);

  const fetchGeoIP = async (ip) => {
    try {
      // Using a free GeoIP API (you might want to use a different service)
      const res = await fetch(`https://ipapi.co/${ip}/json/`);
      if (res.ok) {
        const data = await res.json();
        return {
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          isp: data.org || 'Unknown',
          lat: data.latitude,
          lon: data.longitude
        };
      }
    } catch (e) {
      console.error('GeoIP lookup failed:', e);
    }
    return null;
  };

  const handleAddIP = async () => {
    if (!newIP.trim()) return;
    
    const ip = newIP.trim();
    const list = ipType === 'blacklist' ? blacklist : whitelist;
    
    if (list.includes(ip)) {
      toast.error('IP already exists in list');
      return;
    }

    setLoading(true);
    const geo = await fetchGeoIP(ip);
    setLoading(false);

    const newList = [...list, ip];
    if (ipType === 'blacklist') {
      setBlacklist(newList);
      localStorage.setItem('ipBlacklist', JSON.stringify(newList));
    } else {
      setWhitelist(newList);
      localStorage.setItem('ipWhitelist', JSON.stringify(newList));
    }

    if (geo) {
      setGeoData({...geoData, [ip]: geo});
    }

    toast.success(`IP ${ip} added to ${ipType}`);
    setNewIP('');
  };

  const handleRemoveIP = (ip, type) => {
    if (type === 'blacklist') {
      const newList = blacklist.filter(i => i !== ip);
      setBlacklist(newList);
      localStorage.setItem('ipBlacklist', JSON.stringify(newList));
    } else {
      const newList = whitelist.filter(i => i !== ip);
      setWhitelist(newList);
      localStorage.setItem('ipWhitelist', JSON.stringify(newList));
    }
    toast.success(`IP ${ip} removed from ${type}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-800">IP Management</h3>
          <p className="text-sm text-slate-500 mt-1">Manage IP blacklist and whitelist</p>
        </div>
      </div>

      {/* Add IP */}
      <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-xl border border-slate-200 shadow-sm">
        <h4 className="font-semibold text-slate-800 mb-4">Add IP Address</h4>
        <div className="flex gap-3">
          <select
            value={ipType}
            onChange={(e) => setIpType(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="blacklist">Blacklist</option>
            <option value="whitelist">Whitelist</option>
          </select>
          <input
            type="text"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            placeholder="e.g., 192.168.1.1 or 192.168.0.0/16"
            className="flex-1 h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddIP}
            disabled={loading || !newIP.trim()}
            className="h-10 px-6 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : 'Add IP'}
          </button>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blacklist */}
        <div className="bg-white rounded-xl border border-red-200/50 overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-r from-red-50/50 to-orange-50/50 border-b border-red-200/50">
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              <h4 className="font-semibold text-slate-800">Blacklist ({blacklist.length})</h4>
            </div>
            <p className="text-xs text-slate-600 mt-1">Blocked IP addresses</p>
          </div>
          <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {blacklist.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Ban size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm">No IPs in blacklist</p>
              </div>
            ) : (
              blacklist.map((ip, index) => (
                <div key={index} className="p-4 hover:bg-red-50/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-mono font-semibold text-red-700">{ip}</div>
                      {geoData[ip] && (
                        <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                          <MapPin size={12} />
                          <span>{geoData[ip].city}, {geoData[ip].country}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveIP(ip, 'blacklist')}
                      className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-100 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Whitelist */}
        <div className="bg-white rounded-xl border border-green-200/50 overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-r from-green-50/50 to-emerald-50/50 border-b border-green-200/50">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-slate-800">Whitelist ({whitelist.length})</h4>
            </div>
            <p className="text-xs text-slate-600 mt-1">Allowed IP addresses</p>
          </div>
          <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {whitelist.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Check size={32} className="mx-auto mb-2 text-slate-400" />
                <p className="text-sm">No IPs in whitelist</p>
              </div>
            ) : (
              whitelist.map((ip, index) => (
                <div key={index} className="p-4 hover:bg-green-50/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-mono font-semibold text-green-700">{ip}</div>
                      {geoData[ip] && (
                        <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                          <MapPin size={12} />
                          <span>{geoData[ip].city}, {geoData[ip].country}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveIP(ip, 'whitelist')}
                      className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-100 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Developer = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
      <Header user={user} />
      <Sidebar user={user} />
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 md:ml-15">
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent tracking-tight">
              Developer Tools
            </h1>
          </div>
          <p className="ml-14 text-slate-600 font-medium">Manage system settings, monitor security, and view logs</p>
        </header>

        <div className="max-w-7xl mx-auto">
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: '16px', 
              overflow: 'hidden',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease'
            }}
            className="hover:shadow-xl transition-shadow duration-300"
          >
            <Box 
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="developer tools tabs"
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: 'rgb(100, 116, 139)',
                    padding: '16px 24px',
                    minHeight: '64px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'rgb(79, 70, 229)',
                      background: 'rgba(99, 102, 241, 0.08)'
                    },
                    '&.Mui-selected': {
                      color: 'rgb(79, 70, 229)',
                      fontWeight: 700
                    }
                  },
                  '& .MuiTabs-indicator': {
                    height: '3px',
                    borderRadius: '3px 3px 0 0',
                    background: 'linear-gradient(to right, #6366f1, #8b5cf6)'
                  }
                }}
              >
                <Tab 
                  label={
                    <span className="flex items-center gap-2">
                      <span>Manage Cities</span>
                    </span>
                  } 
                  id="developer-tab-0" 
                />
                <Tab 
                  label={
                    <span className="flex items-center gap-2">
                      <span>System Logs</span>
                    </span>
                  } 
                  id="developer-tab-1" 
                />
                <Tab 
                  label={
                    <span className="flex items-center gap-2">
                      <Shield size={16} />
                      <span>Security Logs</span>
                    </span>
                  } 
                  id="developer-tab-2" 
                />
                <Tab 
                  label={
                    <span className="flex items-center gap-2">
                      <Bell size={16} />
                      <span>Security Alerts</span>
                    </span>
                  } 
                  id="developer-tab-3" 
                />
                <Tab 
                  label={
                    <span className="flex items-center gap-2">
                      <Monitor size={16} />
                      <span>Active Sessions</span>
                    </span>
                  } 
                  id="developer-tab-4" 
                />
                <Tab 
                  label={
                    <span className="flex items-center gap-2">
                      <Activity size={16} />
                      <span>User Activity</span>
                    </span>
                  } 
                  id="developer-tab-5" 
                />
                <Tab 
                  label={
                    <span className="flex items-center gap-2">
                      <Globe size={16} />
                      <span>IP Management</span>
                    </span>
                  } 
                  id="developer-tab-6" 
                />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <div className="animate-fade-in">
                <ManageCitiesPanel />
              </div>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <div className="animate-fade-in">
                <SystemLogsPanel />
              </div>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <div className="animate-fade-in">
                <SecurityLogsPanel />
              </div>
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <div className="animate-fade-in">
                <SecurityAlertsPanel />
              </div>
            </TabPanel>

            <TabPanel value={activeTab} index={4}>
              <div className="animate-fade-in">
                <SessionsManagementPanel />
              </div>
            </TabPanel>

            <TabPanel value={activeTab} index={5}>
              <div className="animate-fade-in">
                <UserActivityPanel />
              </div>
            </TabPanel>

            <TabPanel value={activeTab} index={6}>
              <div className="animate-fade-in">
                <IPManagementPanel />
              </div>
            </TabPanel>
          </Paper>
        </div>
      </div>
      
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default Developer;
