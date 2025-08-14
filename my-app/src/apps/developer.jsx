import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Plus, Trash2, Loader, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'; // הוספתי RefreshCw אם תרצה להחליף את הטקסט
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
            className="flex-grow h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            placeholder="e.g., Tel Aviv"
          />
          <button
            type="submit"
            disabled={!newCityName.trim()}
            className="inline-flex items-center justify-center h-10 w-10 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Plus size={20} />
          </button>
        </form>
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-800">Existing Cities ({cities.length})</h3>
        <div className="border rounded-lg max-h-72 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <Loader className="animate-spin mx-auto text-slate-400" />
            </div>
          ) : cities.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No cities added yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {cities.map((city) => (
                <li
                  key={city._id}
                  className="px-4 py-3 flex justify-between items-center group hover:bg-slate-50"
                >
                  <span className="text-slate-800">{city.name}</span>
                  <button
                    onClick={() => handleDeleteCity(city._id, city.name)}
                    className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
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
          className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? <Loader size={16} className="animate-spin" /> : 'Refresh'}
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

      <pre className="bg-gray-900 text-white font-mono text-sm p-4 rounded-lg overflow-x-auto h-96 w-full">
        <code>{loading ? 'Loading logs...' : logs || 'Log file is empty or not found.'}</code>
      </pre>
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
      <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 md:ml-15">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Developer Tools</h1>
          <p className="mt-1 text-slate-500">Manage system settings and view logs.</p>
        </header>

        <div className="max-w-6xl mx-auto">
          <Paper elevation={2} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="developer tools tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Manage Cities" id="developer-tab-0" />
                <Tab label="System Logs" id="developer-tab-1" />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <ManageCitiesPanel />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <SystemLogsPanel />
            </TabPanel>
          </Paper>
        </div>
      </div>
    </>
  );
};

export default Developer;
