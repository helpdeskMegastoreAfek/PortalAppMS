import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// Your App Components
import EmployeePortal from './apps/mainbord';
// import MealOrdering from './apps/MealOrdering';
import BoxInventory from './apps/BoxInventory';
import ITSupport from './apps/ITSupport';
import Service from './apps/ServiceTickets'; // This component uses DatePicker
import Login from './pages/Login';
import AdminPanel from './apps/AdminPanel';
import AdminBoxInventory from './apps/AdminBoxInventory';
import Invoice from './apps/Invoice';
// import AdminMealOrdering from "./apps/AdminMealOrdering";
import InvoiceUploader from './components/InvoiceUploader';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<EmployeePortal />} />
          {/* <Route path="/meal" element={<MealOrdering />} /> */}
          <Route path="/boxes" element={<BoxInventory />} />
          <Route path="/it" element={<ITSupport />} />
          <Route path="/service" element={<Service />} />
          <Route path="/adminBox" element={<AdminBoxInventory />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/invoice" element={<Invoice />} />
          {/* <Route path="/adminMeal" element={<AdminMealOrdering />} /> */}
          <Route path="/invoiceUploader" element={<InvoiceUploader />} />
        </Routes>
      </BrowserRouter>
    </LocalizationProvider>
  </React.StrictMode>
);
