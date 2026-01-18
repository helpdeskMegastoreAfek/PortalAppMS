import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// Your App Components
import EmployeePortal from './apps/mainbord';
import MealOrdering from './apps/MealOrdering';
import BoxInventory from './apps/BoxInventory';
import ITSupport from './apps/Dashboard';
import Login from './pages/Login';
import AdminPanel from './apps/AdminPanel';
import AdminBoxInventoryNew from './apps/AdminBoxInventoryNew';
import Invoice from './apps/Invoice';
import InvoiceUploader from './components/InvoiceUploader';
import Developer from './apps/developer';
import DataSyncPage from './apps/DataSyncPage';
import BoxInventoryNew from './apps/BoxInventoryNew';
import Statistics from './apps/Statistics';
import Dashboard from './apps/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><EmployeePortal /></PrivateRoute>} />
          <Route path="/meal" element={<PrivateRoute><MealOrdering /></PrivateRoute>} />
          <Route path="/boxes" element={<PrivateRoute><BoxInventory /></PrivateRoute>} />
          <Route path="/it" element={<PrivateRoute><ITSupport /></PrivateRoute>} />
          <Route path="/adminBox" element={<PrivateRoute><AdminBoxInventoryNew /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
          <Route path="/invoice" element={<PrivateRoute><Invoice /></PrivateRoute>} />
          {/* <Route path="/adminMeal" element={<PrivateRoute><AdminMealOrdering /></PrivateRoute>} /> */}
          <Route path="/invoiceUploader" element={<PrivateRoute><InvoiceUploader /></PrivateRoute>} />
          <Route path="/DataSyncPage" element={<PrivateRoute><DataSyncPage /></PrivateRoute>} />
          <Route path="/BoxInventoryNew" element={<PrivateRoute><BoxInventoryNew /></PrivateRoute>} />
          <Route path="/developer" element={<PrivateRoute><Developer /></PrivateRoute>} />
          <Route path="/statistics" element={<PrivateRoute><Statistics /></PrivateRoute>} />
          <Route path="/Dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </LocalizationProvider>
  </React.StrictMode>
);
