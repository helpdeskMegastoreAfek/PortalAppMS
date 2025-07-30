'use client';

import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { Switch, FormControlLabel, FormGroup } from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL;

function PermissionSwitch({ name, checked, onChange, label }) {
  return (
    <FormControlLabel
      control={<Switch name={name} checked={checked} onChange={onChange} size="small" />}
      label={label}
      labelPlacement="start"
      className="w-full flex items-center justify-between text-sm"
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
  const permissions = editedData.permissions || {
    viewFinancials: false,
    editInvoices: false,
    undoInvoice: false,
    deleteInvoices: false,
  };

  // handler לשינוי של checkboxes
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
    fetch(`${API_URL}/api/getUsers`)
      .then((res) => res.json())
      .then((data) => setUsers(data));
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
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'users_export.csv');
  };

  const handleSaveEdit = async () => {
    const res = await fetch(`${API_URL}/api/getUsers/${editingUser._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editedData),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((user) => (user._id === updated._id ? updated : user)));
      setEditingUser(null);
    }
  };

  const handleDelete = async (id) => {
    const userToDelete = users.find((u) => u._id === id);
    if (userToDelete.role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        setErrorMsg('The last admin in the system cannot be deleted!');
        return;
      }
    }

    const res = await fetch(`${API_URL}/api/getUsers/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setUsers(users.filter((u) => u._id !== id));
      setConfirmDelete(null);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage and organize your team members</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Disable">Disabled</option>
            </select>
          </div>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">{filtered.length}</span> of{' '}
          <span className="font-medium text-gray-900">{users.length}</span> users
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Org Unit
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.updatedAt?.split('T')[0]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {u.orgUnit || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openResetModal(u)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-colors"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Reset password
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditedData(u);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit User: {editingUser.username}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Update user information and permissions</p>
            </div>

            <div className="px-6 py-6 space-y-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">User Name</label>
              <div>
                <input
                  type="text"
                  value={editedData.username}
                  onChange={(e) => setEditedData({ ...editedData, username: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter user name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editedData.email ?? ''}
                  onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter email address"
                />
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={editedData.password ?? ""}
                  onChange={(e) =>
                    setEditedData({ ...editedData, password: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter new password"
                />
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editedData.status}
                  onChange={(e) => setEditedData({ ...editedData, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                >
                  <option value="Active">Active</option>
                  <option value="Disable">Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Unit
                </label>
                <input
                  type="text"
                  value={editedData.orgUnit ?? ''}
                  onChange={(e) => setEditedData({ ...editedData, orgUnit: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter organization unit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={editedData.role}
                  onChange={(e) => setEditedData({ ...editedData, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="ml-6 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Applications
              </label>
              <div className="pr-8">
                {appOptions.map((app) => (
                  <FormGroup key={app.value}>
                    <PermissionSwitch
                      type="checkbox"
                      checked={editedData.allowedApps?.includes(app.value)}
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
                    ></PermissionSwitch>
                  </FormGroup>
                ))}
              </div>
              {/* Invoice Panel Permissions */}
              {editedData.allowedApps?.includes('/invoice') && (
                <div className="pl-4 pr-8 pt-6 border-t border-gray-200">
                  <h3 className="text-medium font-medium text-gray-800 mb-3">
                    Invoice Panel Permissions
                  </h3>
                  <FormGroup className="space-y-2">
                    <PermissionSwitch
                      name="viewFinancials"
                      checked={permissions.viewFinancials}
                      onChange={handlePermissionChange}
                      label="View financial summary"
                    ></PermissionSwitch>
                    <PermissionSwitch
                      name="editInvoices"
                      checked={permissions.editInvoices}
                      onChange={handlePermissionChange}
                      label="Edit invoices"
                    ></PermissionSwitch>
                    <PermissionSwitch
                      name="undoInvoice"
                      checked={permissions.undoInvoice}
                      onChange={handlePermissionChange}
                      label="Undo"
                    ></PermissionSwitch>
                    <PermissionSwitch
                      name="deleteInvoices"
                      checked={permissions.deleteInvoices}
                      onChange={handlePermissionChange}
                      label="Delete invoices (Only Developers)"
                    ></PermissionSwitch>
                  </FormGroup>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
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
                <h2 className="text-lg font-bold mb-4">
                  Temporary password for {resetUser.username}
                </h2>
                <p className="font-mono bg-slate-100 p-2 rounded text-center mb-4">
                  {tempPassword}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Pass this password to the user. It is valid until changed by them.
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setResetModalOpen(false)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 backdrop-blur-xs  bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all">
            <div className="px-6 py-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to delete{' '}
                    <span className="font-medium">{confirmDelete.username}</span>? This action
                    cannot be undone.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <svg
                      className="w-5 h-5 text-red-400 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="ml-2">
                      <p className="text-sm text-red-800">{errorMsg}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={() => {
                  setErrorMsg('');
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete._id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors shadow-sm"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
