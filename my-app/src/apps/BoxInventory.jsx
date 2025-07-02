"use client";
import toast, { Toaster } from "react-hot-toast";
import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Package, Thermometer, Plus, Minus, Save } from "lucide-react";

const inventoryItems = [
  {
    id: "boxes",
    name: "Boxes",
    icon: <Package className="w-6 h-6" />,
    color: "from-blue-400 to-blue-600",
  },
  {
    id: "largeCoolers",
    name: "Large Coolers",
    icon: <Thermometer className="w-6 h-6" />,
    color: "from-green-400 to-green-600",
  },
  {
    id: "smallCoolers",
    name: "Small Coolers",
    icon: <Thermometer className="w-6 h-6" />,
    color: "from-purple-400 to-purple-600",
  },
];
export default function BoxInventory() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [inventory, setInventory] = useState({
    boxes: 0,
    largeCoolers: 0,
    smallCoolers: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [driverName, setDriverName] = useState("");

  const updateInventory = (id, value) => {
    setInventory((prev) => ({
      ...prev,
      [id]: Math.max(0, Number.parseInt(value) || 0),
    }));
  };

  const adjustInventory = (id, delta) => {
    setInventory((prev) => ({
      ...prev,
      [id]: Math.max(0, prev[id] + delta),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    await toast.promise(
      fetch("http://localhost:5000/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inventory,
          username: user.username,
          driverName: driverName,
        }),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to send data");
        return res.json();
      }),
      {
        loading: "Sending...",
        success: "Send successfully!",
        error: "This didn't work.",
      }
    );

    setInventory({
      boxes: 0,
      largeCoolers: 0,
      smallCoolers: 0,
    });
    setDriverName("");
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header user={user} />
      <div className="flex">
        <Sidebar user={user} />

        <main className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-3xl font-light text-gray-900 mb-2">
                Box & Cooler Inventory
              </h1>
              <p className="text-gray-600">
                Update your current inventory counts
              </p>
            </div>
            <Toaster position="top-center" />
            {/* Inventory Form */}
            <div className="bg-white border border-gray-200 p-8">
              <div className="mb-6">
                <label
                  htmlFor="driverName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Driver Name
                </label>
                <select
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white"
                >
                  <option value="">Select a driver</option>
                  <option value="מחמד יאסין">מחמד יאסין</option>
                  <option value="מחמד מרסאת">מחמד מרסאת</option>
                  <option value="מחמד נאדר">מחמד נאדר</option>
                </select>
              </div>

              <div className="space-y-8">
                {inventoryItems.map((item) => (
                  <div key={item.id} className="group">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center`}
                      >
                        {item.icon}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {item.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => adjustInventory(item.id, -1)}
                        className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        disabled={inventory[item.id] === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={inventory[item.id]}
                        onChange={(e) =>
                          updateInventory(item.id, e.target.value)
                        }
                        className="flex-1 px-4 py-3 border border-gray-300 text-center text-xl font-medium focus:outline-none focus:border-gray-500"
                      />

                      <button
                        onClick={() => adjustInventory(item.id, 1)}
                        className="w-10 h-10 border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex items-center justify-center gap-2 w-full py-3 text-sm transition-all ${
                    isSubmitting
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
