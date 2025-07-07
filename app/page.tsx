'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  CloudRain, 
  Thermometer, 
  Wind, 
  Zap, 
  Globe,
  TrendingUp,
  Users,
  Check,
  ArrowRight,
  Star,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { weatherXM } from '../lib/weatherxm';

export default function HomePage() {
  const [stats, setStats] = useState({
    totalStations: 8000,
    totalPolicies: 1247,
    totalPayouts: 892,
    averageRisk: 23
  });

  const [weatherData, setWeatherData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching demo data
    const fetchDemoData = async () => {
      try {
        // This would normally fetch from WeatherXM API
        const mockWeatherData = {
          temperature: 24.5,
          precipitation: 2.3,
          humidity: 67,
          windSpeed: 8.2,
          location: "Demo Farm, California",
          stationId: "demo-001"
        };
        setWeatherData(mockWeatherData);
      } catch (error) {
        console.error('Error fetching demo data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDemoData();
  }, []);

  const features = [
    {
      icon: <Shield className="w-8 h-8 text-blue-500" />,
      title: "Parametric Insurance",
      description: "Instant payouts based on weather thresholds. No claims process required.",
      stats: "99.9% automation"
    },
    {
      icon: <CloudRain className="w-8 h-8 text-green-500" />,
      title: "WeatherXM Integration",
      description: "Hyperlocal weather data from 8000+ stations worldwide.",
      stats: "8000+ stations"
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Instant Payouts",
      description: "Automated payouts within minutes when triggers are activated.",
      stats: "< 5 min payout"
    },
    {
      icon: <Globe className="w-8 h-8 text-purple-500" />,
      title: "Global Coverage",
      description: "Supporting farmers worldwide with multi-language interface.",
      stats: "50+ countries"
    }
  ];

  const cropTypes = [
    { name: "Wheat", icon: "🌾", coverage: "$2.5M" },
    { name: "Corn", icon: "🌽", coverage: "$3.8M" },
    { name: "Rice", icon: "🍚", coverage: "$1.9M" },
    { name: "Soybeans", icon: "🫘", coverage: "$2.1M" }
  ];

  const testimonials = [
    {
      name: "Maria Santos",
      location: "Brazil",
      crop: "Coffee",
      quote: "AgriGuard saved my farm during the drought. The payout was instant and fair.",
      rating: 5
    },
    {
      name: "John Mitchell",
      location: "Iowa, USA",
      crop: "Corn",
      quote: "Finally, insurance that actually works. No paperwork, no waiting.",
      rating: 5
    },
    {
      name: "Priya Sharma",
      location: "India",
      crop: "Rice",
      quote: "The weather data is incredibly accurate. I trust AgriGuard with my livelihood.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">AgriGuard</span>
              <span className="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                Powered by WeatherXM
              </span>
            </div>
            <div className="flex space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-green-600">
                Dashboard
              </Link>
              <Link href="/insurance" className="text-gray-700 hover:text-green-600">
                Get Insurance
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-green-600">
                About
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Protect Your Crops with
              <span className="text-green-600"> Smart Insurance</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Parametric crop insurance powered by WeatherXM's network of 8000+ weather stations. 
              Get instant payouts when weather threatens your harvest.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link 
                href="/insurance" 
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center"
              >
                Get Protected Now
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link 
                href="/demo" 
                className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold border-2 border-green-600 hover:bg-green-50 transition-colors"
              >
                View Demo
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Live Weather Widget */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Live Weather Data</h3>
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm">Live</span>
              </div>
            </div>
            
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : weatherData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">{weatherData.location}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Thermometer className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm">{weatherData.temperature}°C</span>
                  </div>
                  <div className="flex items-center">
                    <CloudRain className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm">{weatherData.precipitation}mm</span>
                  </div>
                  <div className="flex items-center">
                    <Wind className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm">{weatherData.windSpeed} m/s</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm">💧 {weatherData.humidity}%</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-2">
                  Station ID: {weatherData.stationId}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                Unable to load weather data
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Weather Stations", value: stats.totalStations.toLocaleString() },
              { label: "Active Policies", value: stats.totalPolicies.toLocaleString() },
              { label: "Payouts Made", value: stats.totalPayouts.toLocaleString() },
              { label: "Avg Risk Score", value: `${stats.averageRisk}%` }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <div className="text-3xl font-bold text-green-600 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose AgriGuard?
            </h2>
            <p className="text-xl text-gray-600">
              Built on WeatherXM's decentralized weather network
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="text-sm font-medium text-green-600">{feature.stats}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Crop Types Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Supported Crops
            </h2>
            <p className="text-xl text-gray-600">
              Tailored insurance for different crop types
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cropTypes.map((crop, index) => (
              <motion.div 
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <div className="text-4xl mb-4">{crop.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{crop.name}</h3>
                <p className="text-green-600 font-medium">{crop.coverage} covered</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by Farmers Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from real farmers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div 
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-4">
                  "{testimonial.quote}"
                </blockquote>
                <div className="text-sm text-gray-600">
                  <strong>{testimonial.name}</strong><br />
                  {testimonial.location} • {testimonial.crop}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Protect Your Harvest?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of farmers already protected by AgriGuard
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/insurance" 
              className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Get Started Today
            </Link>
            <Link 
              href="/contact" 
              className="bg-transparent text-white px-8 py-3 rounded-lg font-semibold border-2 border-white hover:bg-white hover:text-green-600 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Shield className="h-8 w-8 text-green-400" />
                <span className="ml-2 text-xl font-bold">AgriGuard</span>
              </div>
              <p className="text-gray-400 mb-4">
                Protecting farmers worldwide with parametric insurance powered by WeatherXM.
              </p>
              <div className="text-sm text-gray-500">
                Built for Protocol Labs Hackathon 2024
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/dashboard">Dashboard</Link></li>
                <li><Link href="/insurance">Get Insurance</Link></li>
                <li><Link href="/claims">Claims</Link></li>
                <li><Link href="/stations">Weather Stations</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/docs">Documentation</Link></li>
                <li><Link href="/api">API</Link></li>
                <li><Link href="/support">Support</Link></li>
                <li><Link href="/blog">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about">About</Link></li>
                <li><Link href="/careers">Careers</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/privacy">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AgriGuard. Built with ❤️ using WeatherXM data.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 