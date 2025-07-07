'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  DollarSign,
  CloudRain,
  Thermometer,
  Wind,
  MapPin,
  Calendar,
  Bell,
  Download,
  Eye,
  Plus,
  BarChart3,
  LineChart
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Link from 'next/link';

interface Policy {
  id: string;
  cropType: string;
  location: string;
  stationId: string;
  coverage: number;
  premium: number;
  status: 'active' | 'expired' | 'claimed';
  startDate: string;
  endDate: string;
  triggers: Array<{
    type: string;
    description: string;
    activated: boolean;
    activatedDate?: string;
    payoutAmount?: number;
  }>;
  totalPayouts: number;
}

interface WeatherReading {
  date: string;
  temperature: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
}

interface Notification {
  id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export default function DashboardPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherReading[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock policies data
      const mockPolicies: Policy[] = [
        {
          id: 'AG001234',
          cropType: 'wheat',
          location: 'Nebraska, USA',
          stationId: 'station-001',
          coverage: 15000,
          premium: 750,
          status: 'active',
          startDate: '2024-03-15',
          endDate: '2024-09-15',
          triggers: [
            {
              type: 'drought',
              description: 'Less than 20mm rainfall in 30 days',
              activated: false
            },
            {
              type: 'heat_stress',
              description: 'Temperature above 38°C for 5 consecutive days',
              activated: true,
              activatedDate: '2024-07-20',
              payoutAmount: 3000
            }
          ],
          totalPayouts: 3000
        },
        {
          id: 'AG001235',
          cropType: 'corn',
          location: 'Iowa, USA',
          stationId: 'station-002',
          coverage: 25000,
          premium: 1200,
          status: 'active',
          startDate: '2024-04-01',
          endDate: '2024-10-01',
          triggers: [
            {
              type: 'excess_rain',
              description: 'More than 150mm rainfall in 7 days',
              activated: false
            },
            {
              type: 'drought',
              description: 'Less than 20mm rainfall in 30 days',
              activated: false
            }
          ],
          totalPayouts: 0
        }
      ];

      // Mock weather data
      const mockWeatherData: WeatherReading[] = [
        { date: '2024-01-01', temperature: 22, precipitation: 5, humidity: 65, windSpeed: 8 },
        { date: '2024-01-02', temperature: 24, precipitation: 0, humidity: 62, windSpeed: 10 },
        { date: '2024-01-03', temperature: 26, precipitation: 2, humidity: 58, windSpeed: 12 },
        { date: '2024-01-04', temperature: 28, precipitation: 0, humidity: 55, windSpeed: 9 },
        { date: '2024-01-05', temperature: 30, precipitation: 8, humidity: 68, windSpeed: 7 },
        { date: '2024-01-06', temperature: 25, precipitation: 15, humidity: 75, windSpeed: 6 },
        { date: '2024-01-07', temperature: 23, precipitation: 3, humidity: 70, windSpeed: 8 }
      ];

      // Mock notifications
      const mockNotifications: Notification[] = [
        {
          id: 'notif-001',
          type: 'success',
          title: 'Payout Processed',
          message: 'Heat stress trigger activated for Policy AG001234. $3,000 payout has been sent to your wallet.',
          date: '2024-07-20',
          read: false
        },
        {
          id: 'notif-002',
          type: 'warning',
          title: 'Weather Alert',
          message: 'High temperatures forecast for next week. Monitor your wheat crops closely.',
          date: '2024-07-18',
          read: false
        },
        {
          id: 'notif-003',
          type: 'info',
          title: 'Policy Reminder',
          message: 'Your corn insurance policy expires in 60 days. Consider renewing soon.',
          date: '2024-07-15',
          read: true
        }
      ];

      setPolicies(mockPolicies);
      setWeatherData(mockWeatherData);
      setNotifications(mockNotifications);
      setSelectedPolicy(mockPolicies[0]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const totalCoverage = policies.reduce((sum, policy) => sum + policy.coverage, 0);
  const totalPremiums = policies.reduce((sum, policy) => sum + policy.premium, 0);
  const totalPayouts = policies.reduce((sum, policy) => sum + policy.totalPayouts, 0);
  const activePolicies = policies.filter(p => p.status === 'active').length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const getCropIcon = (cropType: string) => {
    const icons: { [key: string]: string } = {
      wheat: '🌾',
      corn: '🌽',
      rice: '🍚',
      soybeans: '🫘',
      cotton: '🌸',
      coffee: '☕'
    };
    return icons[cropType] || '🌱';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'claimed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Coverage</p>
              <p className="text-2xl font-bold text-gray-900">${totalCoverage.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Policies</p>
              <p className="text-2xl font-bold text-gray-900">{activePolicies}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Payouts</p>
              <p className="text-2xl font-bold text-gray-900">${totalPayouts.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Premiums</p>
              <p className="text-2xl font-bold text-gray-900">${totalPremiums.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Weather Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white p-6 rounded-lg shadow-sm border"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weather Trends</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={weatherData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Temperature (°C)"
              />
              <Line 
                type="monotone" 
                dataKey="precipitation" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Precipitation (mm)"
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white p-6 rounded-lg shadow-sm border"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
          <span className="text-sm text-gray-500">{unreadNotifications} unread</span>
        </div>
        <div className="space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <div key={notification.id} className="flex items-start space-x-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                notification.type === 'success' ? 'bg-green-500' :
                notification.type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-500">{notification.date}</p>
                </div>
                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Policies</h2>
        <Link 
          href="/insurance"
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Policy
        </Link>
      </div>

      <div className="grid gap-6">
        {policies.map((policy) => (
          <motion.div
            key={policy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getCropIcon(policy.cropType)}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {policy.cropType.charAt(0).toUpperCase() + policy.cropType.slice(1)} Insurance
                  </h3>
                  <p className="text-sm text-gray-600">Policy #{policy.id}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(policy.status)}`}>
                  {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Coverage</p>
                <p className="font-semibold">${policy.coverage.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Premium</p>
                <p className="font-semibold">${policy.premium.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold">{policy.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Period</p>
                <p className="font-semibold">{policy.startDate} - {policy.endDate}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Triggers</h4>
              {policy.triggers.map((trigger, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      trigger.activated ? 'bg-red-500' : 'bg-gray-300'
                    }`} />
                    <span className="text-sm font-medium capitalize">
                      {trigger.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {trigger.description}
                    </span>
                  </div>
                  {trigger.activated && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        ${trigger.payoutAmount?.toLocaleString()} paid
                      </div>
                      <div className="text-xs text-gray-500">
                        {trigger.activatedDate}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Total Payouts</p>
                <p className="font-semibold text-green-600">${policy.totalPayouts.toLocaleString()}</p>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderWeather = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Weather Monitoring</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Conditions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Thermometer className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium">Temperature</span>
              </div>
              <span className="text-lg font-semibold">24°C</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CloudRain className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Precipitation</span>
              </div>
              <span className="text-lg font-semibold">2.3mm</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wind className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">Wind Speed</span>
              </div>
              <span className="text-lg font-semibold">8.2 m/s</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weather Stations</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">WeatherXM Station Alpha</p>
                  <p className="text-xs text-gray-600">2.3 km away</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">WeatherXM Station Beta</p>
                  <p className="text-xs text-gray-600">5.7 km away</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">7-Day Forecast</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weatherData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="precipitation" fill="#3b82f6" name="Precipitation (mm)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">AgriGuard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-600" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </div>
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'policies', label: 'Policies', icon: Shield },
              { id: 'weather', label: 'Weather', icon: CloudRain }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'policies' && renderPolicies()}
        {activeTab === 'weather' && renderWeather()}
      </div>
    </div>
  );
} 