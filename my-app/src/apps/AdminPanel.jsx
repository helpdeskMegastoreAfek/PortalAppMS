"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import UserManager from "../components/UserManager";
import { ChevronsDown, ChevronsUp } from "lucide-react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import toast, { Toaster } from "react-hot-toast";

export default function AdminPanel() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [status, setStatus] = useState("Active");
  const [orgUnit, setOrgUnit] = useState("");
  const [allowedApps, setAllowedApps] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [reloadUsers, setReloadUsers] = useState(0); // refresh trigger

  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.role !== "admin") {
    window.location.href = "/";
    return null;
  }

  const appOptions = [
    { label: "Main Board (sidebar)", value: "/" },
    { label: "Meal Ordering", value: "/meal" },
    { label: "Box & Cooler Inventory", value: "/boxes" },
    { label: "IT Support Tickets", value: "/it" },
    { label: "Service Tickets", value: "/service" },
    { label: "Admin Box Inventory", value: "/adminBox" },
    { label: "Invoice Panel", value: "/invoice" },
    { label: "Admin Panel", value: "/admin" },
  ];

  const toggleApp = (value) => {
    setAllowedApps((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async () => {
    if (!username || !password || !email) {
      toast.error("Please fill all required fields.");
      return;
    }

    toast.promise(
      fetch("api/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email,
          role,
          status,
          orgUnit,
          allowedApps,
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unknown error");

        setUsername("");
        setPassword("");
        setEmail("");
        setOrgUnit("");
        setRole("user");
        setStatus("Active");
        setAllowedApps([]);
        setShowForm(false);
        setReloadUsers((prev) => prev + 1);
        return "User created successfully!";
      }),
      {
        loading: "Creating user...",
        success: (msg) => msg,
        error: (err) => `Error: ${err.message}`,
      }
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" />
      <Header user={user} />
      <Sidebar user={user} />

      <div className="max-w-10/12 mx-auto px-6 p-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-light text-gray-900 mb-2">
            Admin Panel
          </h1>
        </div>

        {/* Toggle Button */}
        <div className="mb-8">
          <Button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border transition-colors ${
              showForm
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-900 border-gray-300 hover:border-gray-400"
            }`}
          >
            {showForm ? <ChevronsUp size={16} /> : <ChevronsDown size={16} />}
            {showForm ? "Hide Form" : "Add User"}
          </Button>
        </div>

        {/* Add User Form */}
        {showForm && (
          <div className="mb-12 border border-gray-200 bg-gray-50">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-medium text-gray-900">
                Add New User
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                />
              </div>

              {/* Role and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Disable">Disable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Organization Unit
                </label>
                <input
                  type="text"
                  value={orgUnit}
                  onChange={(e) => setOrgUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                  placeholder="/IT/Support"
                />
              </div>

              {/* Applications */}
              <div>
                <label className="block text-sm text-gray-700 mb-3">
                  Allowed Applications
                </label>
                <div className="space-y-2">
                  {appOptions.map((app) => (
                    <label
                      key={app.value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={allowedApps.includes(app.value)}
                        onChange={() => toggleApp(app.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{app.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Button
                  onClick={handleSubmit}
                  className="bg-gray-900 text-white px-6 py-2 text-sm hover:bg-gray-800 transition-colors"
                >
                  Add User
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              User Management
            </h2>
          </div>
          <div>
            <UserManager refreshTrigger={reloadUsers} appOptions={appOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
