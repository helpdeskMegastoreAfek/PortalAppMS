'use client';

import { useState } from 'react';
import { Button } from '../components/ui/Button';
import UserManager from '../components/UserManager';
import {
  ChevronsDown,
  ChevronsUp,
  UserPlus,
  Users,
  User as UserIcon,
  Mail,
  Lock,
  Shield,
  Building2,
  Grid3x3,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import toast, { Toaster } from 'react-hot-toast';
import { Switch, FormControlLabel, FormGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL;

function PermissionSwitch({ name, checked, onChange, label, className = '' }) {
  return (
    <FormControlLabel
      control={<Switch name={name} checked={checked} onChange={onChange} size="small" />}
      label={label}
      labelPlacement="start"
      className={`w-full flex items-center justify-between text-sm ${className}`}
      sx={{
        '& .MuiFormControlLabel-label': {
          color: className.includes('text-white') ? 'white' : 'inherit',
        },
      }}
    />
  );
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [status, setStatus] = useState('Active');
  const [orgUnit, setOrgUnit] = useState('');
  const [allowedApps, setAllowedApps] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [reloadUsers, setReloadUsers] = useState(0); // refresh trigger
  const [permissions, setPermissions] = useState({
    viewFinancials: false,
    editInvoices: false,
    undoInvoice: false,
    deleteInvoices: false,
  });

  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.role !== 'admin' && user?.role !== 'developer') {
    window.location.href = '/';
    return null;
  }

  const appOptions = [
    { label: t('mainBoard'), value: '/' },
    { label: t('mealOrdering'), value: '/meal' },
    { label: t('boxCoolerInventory'), value: '/boxes' },
    { label: t('itSupportTickets'), value: '/it' },
    { label: 'Service Tickets', value: '/service' },
    { label: t('adminBoxInventory'), value: '/adminBox' },
    { label: t('invoices'), value: '/invoice' },
    { label: t('statistics'), value: '/statistics' },
    { label: t('dataSyncWMS'), value: '/DataSyncPage' },
    { label: t('developer'), value: '/developer' },
    { label: t('adminPanel'), value: '/admin' },
  ];

  const toggleApp = (value) => {
    setAllowedApps((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handlePermissionChange = (e) => {
    const { name, checked } = e.target;
    setPermissions((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async () => {
    if (!username || !password || !email) {
      toast.error(t('pleaseFillAllRequiredFields'));
      return;
    }

    const permissionLoad = {
      username,
      password,
      email,
      role,
      status,
      orgUnit,
      allowedApps,
      permissions,
    };

    // console.log('Sending this payload to server:', permissionLoad);

    toast.promise(
      fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionLoad),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unknown error');

        setUsername('');
        setPassword('');
        setEmail('');
        setOrgUnit('');
        setRole('user');
        setStatus('Active');
        setAllowedApps([]);
        setShowForm(false);
        setReloadUsers((prev) => prev + 1);
        setPermissions({
          viewFinancials: false,
          editInvoices: false,
          undoInvoice: false,
          deleteInvoices: false,
        });
        return t('userCreatedSuccessfully');
      }),
      {
        loading: t('creatingUser'),
        success: (msg) => msg,
        error: (err) => `${t('errorCreatingUser')}: ${err.message}`,
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster position="top-center" />
      <Header user={user} />
      <Sidebar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-900 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">{t('adminPanelTitle')}</h1>
          </div>
          <p className="text-gray-600 ml-14">{t('manageUsersPermissions')}</p>
        </div>

        {/* Toggle Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg shadow-sm transition-all duration-200 ${
              showForm
                ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-md'
                : 'bg-white text-gray-900 border border-gray-300 hover:border-gray-400 hover:shadow-md'
            }`}
          >
            {showForm ? (
              <>
                <ChevronsUp size={18} />
                <span>{t('hideForm')}</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>{t('addNewUser')}</span>
              </>
            )}
          </Button>
        </div>

        {/* Add User Form */}
        {showForm && (
          <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-white" />
                <h2 className="text-lg font-semibold text-white">{t('addNewUser')}</h2>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Basic Info Section */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <UserIcon className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    {t('basicInformation')}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                      {t('username')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                      placeholder={t('enterUsername')}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Mail className="w-4 h-4 text-gray-500" />
                      {t('email')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Lock className="w-4 h-4 text-gray-500" />
                    {t('password')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder={t('enterPassword')}
                  />
                </div>
              </div>

              {/* Role and Status Section */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <Shield className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    {t('roleStatus')}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t('role')}</label>
                    <div className="relative">
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                      >
                        <option value="user">{t('userRole')}</option>
                        <option value="admin">{t('admin')}</option>
                        <option value="developer">{t('developer')}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronsDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t('status')}</label>
                    <div className="relative">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                      >
                        <option value="Active">{t('active')}</option>
                        <option value="Disable">{t('disable')}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronsDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {status === 'Active' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-xs text-gray-500">
                        {status === 'Active' ? t('userCanLogin') : t('userAccessDisabled')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Unit */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <Building2 className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    {t('organization')}
                  </h3>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('orgUnit')}
                  </label>
                  <input
                    type="text"
                    value={orgUnit}
                    onChange={(e) => setOrgUnit(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="/IT/Support"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('optionalSpecifyOrgUnit')}</p>
                </div>
              </div>

              {/* Applications Section */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <Grid3x3 className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    {t('allowedApplications')}
                  </h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-4">
                    {t('selectApplicationsUserCanAccess')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {appOptions.map((app) => {
                      const isSelected = allowedApps.includes(app.value);
                      return (
                        <div
                          key={app.value}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gray-900 border-gray-900'
                              : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleApp(app.value)}
                        >
                          <FormGroup>
                            <PermissionSwitch
                              checked={isSelected}
                              onChange={() => toggleApp(app.value)}
                              label={app.label}
                              className={isSelected ? 'text-white' : ''}
                            />
                          </FormGroup>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Invoice Permissions Section */}
              {allowedApps.includes('/invoice') && (
                <div className="p-5 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                      {t('invoicePanelPermissions')}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <FormGroup className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <PermissionSwitch
                          name="viewFinancials"
                          checked={permissions.viewFinancials}
                          onChange={handlePermissionChange}
                          label={t('viewFinancialSummary')}
                        />
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <PermissionSwitch
                          name="editInvoices"
                          checked={permissions.editInvoices}
                          onChange={handlePermissionChange}
                          label={t('editInvoices')}
                        />
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <PermissionSwitch
                          name="undoInvoice"
                          checked={permissions.undoInvoice}
                          onChange={handlePermissionChange}
                          label={t('undoInvoices')}
                        />
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <PermissionSwitch
                          name="deleteInvoices"
                          checked={permissions.deleteInvoices}
                          onChange={handlePermissionChange}
                          label={t('deleteInvoices')}
                        />
                      </div>
                    </FormGroup>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200 flex items-center justify-end gap-4">
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setUsername('');
                    setPassword('');
                    setEmail('');
                    setOrgUnit('');
                    setRole('user');
                    setStatus('Active');
                    setAllowedApps([]);
                    setPermissions({
                      viewFinancials: false,
                      editInvoices: false,
                      undoInvoice: false,
                      deleteInvoices: false,
                    });
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="px-8 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  <span>{t('createUser')}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-white" />
              <h2 className="text-lg font-semibold text-white">{t('userManagement')}</h2>
            </div>
          </div>
          <div>
            <UserManager
              loggedInUser={user}
              refreshTrigger={reloadUsers}
              appOptions={appOptions}
              permissions={permissions}
              handlePermissionChange={handlePermissionChange}
              allowedApps={allowedApps}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
