import Header from '../components/Header';
import {
  Utensils,
  Package,
  Laptop2,
  Wrench,
  ShieldCheck,
  ArrowRight,
  PackageOpen,
  File,
  Camera,
  Code,
} from 'lucide-react';

export default function EmployeePortal() {
  const user = JSON.parse(localStorage.getItem('user'));

  const apps = [
    {
      title: 'Meal Ordering',
      description: 'Order your daily meals for the workweek',
      icon: <Utensils className="w-6 h-6" />,
      link: '/meal',
      accent: 'border-l-orange-400',
    },
    {
      title: 'Admin Meal Ordering',
      description: 'Manage daily meals for the workweek',
      icon: <Utensils className="w-6 h-6" />,
      link: '/adminMeal',
      accent: 'border-l-orange-400',
    },
    {
      title: 'Box & Cooler Inventory',
      description: 'Track boxes and coolers inventory',
      icon: <Package className="w-6 h-6" />,
      link: '/boxes',
      accent: 'border-l-blue-400',
    },
    {
      title: 'Admin Panel Box Inventory',
      description: 'Add and manage Box Inventory',
      icon: <PackageOpen className="w-6 h-6" />,
      link: '/adminBox',
      accent: 'border-l-blue-400',
    },
    {
      title: 'IT Support Tickets',
      description: 'Submit and track IT support requests',
      icon: <Laptop2 className="w-6 h-6" />,
      link: '/it',
      accent: 'border-l-green-400',
    },
    {
      title: 'Service',
      description: 'Submit and track service requests',
      icon: <Wrench className="w-6 h-6" />,
      link: '/service',
      accent: 'border-l-purple-400',
    },
    {
      title: 'Invoices',
      description: 'Management data of invoices ',
      icon: <File className="w-6 h-6" />,
      link: '/invoice',
      accent: 'border-l-yellow-400',
    },
    {
      title: 'Scanner',
      description: 'Document Scanner imag to data and PDF',
      icon: <Camera className="w-6 h-6" />,
      link: '/invoiceUploader',
      accent: 'border-l-lime-400',
    },
    {
      title: 'Developer',
      description: 'Add and manage pages , logs',
      icon: <Code className="w-6 h-6" />,
      link: '/developer',
      accent: 'border-l-emerald-400',
    },
    {
      title: 'Admin Panel',
      description: 'Add and manage user access',
      icon: <ShieldCheck className="w-6 h-6" />,
      link: '/admin',
      accent: 'border-l-red-400',
      adminOnly: true,
    },
  ];

  const filteredApps = apps.filter((app) => {
    if (app.adminOnly && user?.role !== 'admin' && app.adminOnly && user?.role !== 'developer')
      return false;
    return (
      (user?.role === 'admin' && user?.role === 'developer') ||
      user?.allowedApps?.includes(app.link)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-light text-gray-900 mb-4">
            Welcome back, <span className="font-medium">{user?.username}</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose from your available applications to get started with your daily tasks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredApps.map((app, index) => (
            <a key={index} href={app.link} className="group block">
              <div
                className={`
                bg-white border border-gray-200 ${app.accent} border-l-4
                transition-all duration-300 ease-out
                hover:shadow-lg hover:-translate-y-1 hover:border-gray-300
                cursor-pointer
              `}
              >
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-gray-50 group-hover:bg-gray-100 transition-colors duration-200">
                      {app.icon}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                      {app.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{app.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                      Click to open →
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications available</h3>
            <p className="text-gray-600">
              Contact your administrator to request access to applications.
            </p>
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            System status: All services operational
          </div>
        </div>
      </main>
    </div>
  );
}
