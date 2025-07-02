"use client";

import { useState } from "react";
import { LogOut, User, Lock } from "lucide-react";
import ChangePasswordModal from "./ChangePasswordModal";

export default function Header({ user }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <header className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
        <div className="text-lg font-light text-gray-900 ml-11">Dashboard</div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{user?.username}</span>
            {/* <span className="text-gray-400">({user?.role})</span> */}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Change Password"
          >
            <Lock className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {showModal && <ChangePasswordModal onClose={() => setShowModal(false)} />}
    </>
  );
}
