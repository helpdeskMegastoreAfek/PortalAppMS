import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Utensils,
  Package,
  Laptop2,
  Wrench,
  ShieldCheck,
  LayoutDashboard,
  ChevronsLeft,
  ChevronsRight,
  PackageOpen,
  File,
  Camera
} from 'lucide-react';

const appLinks = [
  { label: 'Main Board', path: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'Meal Ordering', path: '/meal', icon: <Utensils size={20} /> },
  {
    label: 'Box & Cooler Inventory',
    path: '/boxes',
    icon: <Package size={20} />,
  },
  {
    label: 'Admin Box Inventory',
    path: '/adminBox',
    icon: <PackageOpen size={20} />,
  },
  { label: 'IT Support Tickets', path: '/it', icon: <Laptop2 size={20} /> },
  { label: 'Service Tickets', path: '/service', icon: <Wrench size={20} /> },
  { label: 'Invoices', path: '/invoice', icon: <File size={20} /> },
  {
      label: 'Scanner',
      path: '/invoiceUploader',
      icon: <Camera size={20} />
    },

  {
    label: 'Admin Panel',
    path: '/admin',
    icon: <ShieldCheck size={20} />,
    adminOnly: true,
  },
];

const NavLink = ({ item, collapsed, location, onLinkClick }) => (
  <Link
    key={item.path}
    to={item.path}
    onClick={onLinkClick}
    className={`group relative flex items-center py-2 px-3 text-sm transition-all rounded-md
      ${collapsed ? 'justify-center' : 'gap-3'}
      ${
        location.pathname === item.path
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }
    `}
  >
    <div className="shrink-0">{item.icon}</div>
    {!collapsed && <span className="transition-opacity duration-300">{item.label}</span>}

    {/* Tooltip */}
    {collapsed && (
      <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
        {item.label}
      </span>
    )}
  </Link>
);

export default function Sidebar({ user }) {
  const location = useLocation();
  const [open, setOpen] = useState(false); // mobile sidebar
  const [collapsed, setCollapsed] = useState(true); // desktop collapse

  const adminLink = appLinks.find((app) => app.adminOnly);
  const regularLinks = appLinks.filter((app) => !app.adminOnly);

  const filteredRegularLinks = regularLinks.filter(
    (app) => user?.role === 'admin' && user?.role === 'developer' || user?.allowedApps?.includes(app.path)
  );

  const shouldShowAdminLink = user?.role === 'admin' && adminLink ||
   user?.role === 'developer' && adminLink;

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-5 z-50 bg-white border border-gray-300 p-2 rounded-md shadow-sm"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40 transition-all duration-300  
          ${open ? 'translate-x-0' : '-translate-x-full'}  
          md:translate-x-0  
          ${collapsed ? 'md:w-16' : 'md:w-60'}  
          overflow-hidden px-4 pt-4 pb-4 mb:pt-6 flex flex-col justify-between`}
      >
        {/* Top (links and toggle) */}
        <div className="flex flex-col gap-4 mt-12 md:mt-0">
          {/* Collapse toggle for desktop */}
          <div className="hidden md:flex justify-end mb-2 h-5 items-center">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-500 hover:text-gray-800 transition"
            >
              {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
            </button>
          </div>

          {/* Navigation links */}
          <nav className={`space-y-1 ${collapsed ? 'text-center' : ''}`}>
            {filteredRegularLinks.map((item) => (
              <NavLink
                key={item.path}
                item={item}
                collapsed={collapsed}
                location={location}
                onLinkClick={() => setOpen(false)}
              />
            ))}
          </nav>
        </div>

        {/* Bottom (admin link) */}
        {shouldShowAdminLink && (
          <nav className={`pt-4 border-t ${collapsed ? 'text-center' : ''}`}>
            <NavLink
              item={adminLink}
              collapsed={collapsed}
              location={location}
              onLinkClick={() => setOpen(false)}
            />
          </nav>
        )}
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/10 z-30" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
