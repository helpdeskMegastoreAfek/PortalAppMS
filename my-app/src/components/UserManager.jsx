'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { Switch, FormControlLabel, FormGroup } from '@mui/material';
import {
  Search,
  Download,
  Edit,
  Trash2,
  Key,
  Filter,
  Users,
  UserCheck,
  UserX,
  Shield,
  Building2,
  Calendar,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  ChevronsDown,
  Grid3x3,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

export default function UsersTable({ refreshTrigger, appOptions }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [loadingReset, setLoadingReset] = useState(false);
  const [errorReset, setErrorReset] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const permissions = editedData.permissions || {
    viewFinancials: false,
    editInvoices: false,
    undoInvoice: false,
    deleteInvoices: false,
    csvExport: false,
  };

  const handlePermissionChange = (e) => {
    const { name, checked } = e.target;
    setEditedData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [name]: checked,
      },
    }));
  };

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/getUsers`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load users');
        setLoading(false);
      });
  }, [refreshTrigger]);
  const filtered = users.filter((u) => {
    return (
      u.username.toLowerCase().includes(search.toLowerCase()) &&
      (filterRole ? u.role === filterRole : true) &&
      (filterStatus ? u.status === filterStatus : true)
    );
  });

  const statusColor = {
    Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Disable: 'bg-red-100 text-red-800 border-red-200',
  };

  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error('No users to export');
      return;
    }
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'users_export.csv');
    toast.success(`Exported ${filtered.length} users to CSV`);
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`${API_URL}/api/getUsers/${editingUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((user) => (user._id === updated._id ? updated : user)));
        setEditingUser(null);
        toast.success('User updated successfully');
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to update user');
      }
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (id) => {
    const userToDelete = users.find((u) => u._id === id);
    if (userToDelete.role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        setErrorMsg('The last admin in the system cannot be deleted!');
        toast.error('The last admin in the system cannot be deleted!');
        return;
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/getUsers/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers(users.filter((u) => u._id !== id));
        setConfirmDelete(null);
        toast.success('User deleted successfully');
      } else {
        toast.error('Failed to delete user');
      }
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const openResetModal = (user) => {
    setResetUser(user);
    setTempPassword('');
    setErrorReset('');
    setLoadingReset(false);
    setResetModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    setLoadingReset(true);
    setErrorReset('');
    try {
      const res = await fetch(`${API_URL}/api/auth/resetPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUser._id }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      setTempPassword(json.tempPassword || json.temp_password || '');
    } catch (err) {
      console.error(err);
      setErrorReset('שגיאה באיפוס הסיסמה');
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600 mt-1">Manage and organize your team members</p>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Shield className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white transition-colors text-sm appearance-none cursor-pointer"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="developer">Developer</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white transition-colors text-sm appearance-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Disable">Disabled</option>
              </select>
            </div>
          </div>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filtered.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{users.length}</span> users
        </p>
        {(search || filterRole || filterStatus) && (
          <button
            onClick={() => {
              setSearch('');
              setFilterRole('');
              setFilterStatus('');
            }}
            className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            <span className="ml-3 text-gray-600">Loading users...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Users className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No users found</p>
            <p className="text-sm text-gray-600 text-center">
              {search || filterRole || filterStatus
                ? 'Try adjusting your filters to see more results'
                : 'No users available'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Org Unit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        statusColor[u.status] || 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          u.status === 'Active' ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                      ></div>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 capitalize">
                      <Shield className="w-3 h-3" />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {u.updatedAt?.split('T')[0] || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {u.orgUnit ? (
                        <>
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {u.orgUnit}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openResetModal(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-all border border-orange-200"
                        title="Reset password"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Reset</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditedData(u);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all border border-blue-200"
                        title="Edit user"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all border border-red-200"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 backdrop-blur-md bg-white bg-opacity-60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Edit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Edit User: {editingUser.username}
                    </h2>
                    <p className="text-sm text-gray-300 mt-0.5">
                      Update user information and permissions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="px-6 py-6 space-y-6">
                {/* Basic Information Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                    <UserCheck className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Basic Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <UserCheck className="w-4 h-4 text-gray-500" />
                        Username
                      </label>
                      <input
                        type="text"
                        value={editedData.username}
                        onChange={(e) => setEditedData({ ...editedData, username: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all text-sm"
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={editedData.email ?? ''}
                        onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all text-sm"
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Role and Status Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                    <Shield className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Role & Status
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="relative">
                        <select
                          value={editedData.status}
                          onChange={(e) =>
                            setEditedData({ ...editedData, status: e.target.value })
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all appearance-none bg-white cursor-pointer text-sm"
                        >
                          <option value="Active">Active</option>
                          <option value="Disable">Disabled</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronsDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {editedData.status === 'Active' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-xs text-gray-500">
                          {editedData.status === 'Active'
                            ? 'User can login'
                            : 'User access disabled'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <div className="relative">
                        <select
                          value={editedData.role}
                          onChange={(e) => setEditedData({ ...editedData, role: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all appearance-none bg-white cursor-pointer text-sm"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="developer">Developer</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <ChevronsDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Unit */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                    <Building2 className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      Organization
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Organization Unit
                    </label>
                    <input
                      type="text"
                      value={editedData.orgUnit ?? ''}
                      onChange={(e) =>
                        setEditedData({ ...editedData, orgUnit: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all text-sm"
                      placeholder="/IT/Support"
                    />
                  </div>
                </div>
              </div>

              {/* Applications Section */}
              <div className="px-6">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <Grid3x3 className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Allowed Applications
                  </h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 mb-4">
                    Select which applications this user can access
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto scrollbar-thin">
                    {appOptions.map((app) => {
                      const isSelected = editedData.allowedApps?.includes(app.value);
                      return (
                        <div
                          key={app.value}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gray-900 border-gray-900'
                              : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            const updatedApps = editedData.allowedApps?.includes(app.value)
                              ? editedData.allowedApps.filter((v) => v !== app.value)
                              : [...(editedData.allowedApps || []), app.value];

                            setEditedData({
                              ...editedData,
                              allowedApps: updatedApps,
                            });
                          }}
                        >
                          <FormGroup>
                            <PermissionSwitch
                              checked={isSelected}
                              onChange={() => {
                                const updatedApps = editedData.allowedApps?.includes(app.value)
                                  ? editedData.allowedApps.filter((v) => v !== app.value)
                                  : [...(editedData.allowedApps || []), app.value];

                                setEditedData({
                                  ...editedData,
                                  allowedApps: updatedApps,
                                });
                              }}
                              label={app.label}
                              className={isSelected ? 'text-white' : ''}
                            />
                          </FormGroup>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Invoice Panel Permissions */}
                {editedData.allowedApps?.includes('/invoice') && (
                  <div className="mt-6 p-5 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-blue-700" />
                      <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                        Invoice Panel Permissions
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <FormGroup className="space-y-3">
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <PermissionSwitch
                            name="viewFinancials"
                            checked={permissions.viewFinancials}
                            onChange={handlePermissionChange}
                            label="View financial summary"
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <PermissionSwitch
                            name="editInvoices"
                            checked={permissions.editInvoices}
                            onChange={handlePermissionChange}
                            label="Edit invoices"
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <PermissionSwitch
                            name="undoInvoice"
                            checked={permissions.undoInvoice}
                            onChange={handlePermissionChange}
                            label="Undo invoices"
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <PermissionSwitch
                            name="csvExport"
                            checked={permissions.csvExport}
                            onChange={handlePermissionChange}
                            label="Export CSV"
                          />
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-200">
                          <PermissionSwitch
                            name="deleteInvoices"
                            checked={permissions.deleteInvoices}
                            onChange={handlePermissionChange}
                            label="Delete invoices (Only Developers)"
                          />
                        </div>
                      </FormGroup>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-white bg-opacity-60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all animate-in zoom-in-95">
            {!tempPassword ? (
              <>
                <h2 className="text-lg font-bold mb-4">
                  Reset Password: {resetUser.username} ({resetUser.role})
                </h2>
                {errorReset && <p className="mb-2 text-sm text-red-600">{errorReset}</p>}
                <p className="mb-4 text-sm text-gray-700">
                  Click “Reset Password” to create a new temporary password.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setResetModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={loadingReset}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loadingReset ? 'Create' : 'Reset Password'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Password Reset</h2>
                        <p className="text-sm text-green-100 mt-0.5">
                          Temporary password for {resetUser?.username}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setResetModalOpen(false);
                        setTempPassword('');
                        setShowPassword(false);
                      }}
                      className="p-1.5 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="px-6 py-6">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={tempPassword}
                      readOnly
                      className="w-full px-4 py-3 font-mono bg-gray-50 border-2 border-gray-300 rounded-lg text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-4 text-center">
                    Share this password with the user. It is valid until they change it.
                  </p>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        setResetModalOpen(false);
                        setTempPassword('');
                        setShowPassword(false);
                      }}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 backdrop-blur-md bg-white bg-opacity-60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-500 to-red-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Delete User</h3>
                    <p className="text-sm text-red-100 mt-0.5">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setErrorMsg('');
                    setConfirmDelete(null);
                  }}
                  className="p-1.5 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-gray-900">{confirmDelete.username}</span>? This
                action cannot be undone.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{errorMsg}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setErrorMsg('');
                    setConfirmDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete._id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
