import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Brain,
  MapPin,
  Bell,
  BarChart3,
  Users,
  Mountain,
  AlertTriangle,
  Radio,
  ArrowRight,
  ChevronRight,
  Zap,
  Eye,
  Globe,
} from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI-Powered Prediction', description: 'Machine learning models analyze rainfall, soil, and seismic data to predict landslides hours in advance.' },
  { icon: MapPin, title: 'GIS Risk Mapping', description: 'Interactive maps with real-time risk zones, sensor locations, and infrastructure overlays.' },
  { icon: Radio, title: 'IoT Sensor Network', description: '142+ sensor stations monitoring soil moisture, rainfall, tilt, and seismic activity 24/7.' },
  { icon: Bell, title: 'Multi-Channel Alerts', description: 'Instant notifications via SMS, Email, WhatsApp, and IVR to reach every citizen.' },
  { icon: BarChart3, title: 'Risk Analytics', description: 'Comprehensive dashboards with trend analysis, district comparisons, and rainfall correlation.' },
  { icon: Users, title: 'Citizen Reporting', description: 'Empowering citizens to report incidents with photos and location for rapid verification.' },
];

const stats = [
  { value: '142+', label: 'Sensor Stations' },
  { value: '8', label: 'Districts Monitored' },
  { value: '24/7', label: 'Real-time Monitoring' },
  { value: '5', label: 'Alert Channels' },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-aztec rounded-xl flex items-center justify-center">
              <Mountain className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-aztec text-lg">NER</span>
              <span className="text-gray-400 text-sm ml-2 hidden sm:inline">Landslide Monitoring</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 bg-aztec text-white text-sm font-medium rounded-lg hover:bg-aztec-light transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-aztec/5 via-capri/5 to-transparent" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-capri/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-aztec/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-capri/10 text-capri-dark rounded-full text-xs font-medium mb-6">
                <Zap className="w-3.5 h-3.5" />
                AI-Powered Early Warning System
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight">
                Predict. Monitor.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-aztec to-capri">
                  Protect.
                </span>
              </h1>
              <p className="mt-6 text-lg text-gray-500 max-w-2xl leading-relaxed">
                An intelligent landslide risk monitoring and early warning system that combines
                AI predictions, real-time sensor data, and citizen reporting to safeguard
                communities against natural disasters.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3 bg-aztec text-white font-medium rounded-lg hover:bg-aztec-light transition-colors flex items-center gap-2"
                >
                  Access Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Live Demo
                </button>
              </div>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6"
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-aztec">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium mb-4">
                <AlertTriangle className="w-3.5 h-3.5" />
                The Problem
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Landslides are the deadliest natural hazard in the region
              </h2>
              <p className="mt-4 text-gray-500 leading-relaxed">
                Every monsoon season, communities face devastating landslides that destroy homes,
                block critical roads, and claim lives. Traditional monitoring methods are reactive,
                slow, and fail to reach citizens in time.
              </p>
            </motion.div>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { value: '500+', label: 'Landslides reported annually', color: 'text-red-500' },
              { value: '72 hrs', label: 'Average early warning gap', color: 'text-amber-500' },
              { value: '60%', label: 'Reports arrive too late', color: 'text-orange-500' },
            ].map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl border border-gray-200 p-8 text-center"
              >
                <p className={`text-4xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-sm text-gray-500 mt-2">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-capri/10 text-capri-dark rounded-full text-xs font-medium mb-4">
                <Eye className="w-3.5 h-3.5" />
                Key Capabilities
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Comprehensive Disaster Intelligence
              </h2>
              <p className="mt-4 text-gray-500">
                From sensor data to citizen reports, our platform unifies every signal into actionable intelligence.
              </p>
            </motion.div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-capri/20 transition-all duration-300 group"
              >
                <div className="w-11 h-11 bg-aztec/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-aztec/10 transition-colors">
                  <feature.icon className="w-5 h-5 text-aztec" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Prediction Overview */}
      <section className="py-20 px-6 bg-aztec text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs font-medium mb-4">
                <Brain className="w-3.5 h-3.5 text-capri" />
                AI Engine
              </div>
              <h2 className="text-3xl font-bold">
                Predict Landslides Before They Happen
              </h2>
              <p className="mt-4 text-white/70 leading-relaxed">
                Our ML models analyze rainfall patterns, soil moisture, seismic activity,
                terrain data, and historical events to generate risk scores with up to 94% confidence.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  '24/72-hour predictive forecasts',
                  'Real-time risk score updates',
                  'Automated AI recommendations',
                  'Multi-factor analysis engine',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white/80">
                    <ChevronRight className="w-4 h-4 text-capri" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-xs text-white/50 ml-2">prediction-engine.model</span>
              </div>
              <div className="space-y-3 font-mono text-sm">
                <p className="text-white/60">{'// Risk Assessment Output'}</p>
                <p className="text-capri">const risk = {'{'}</p>
                <p className="text-white/80 pl-4">zone: "Aizawl Escarpment",</p>
                <p className="text-white/80 pl-4">score: <span className="text-red-400">94</span>,</p>
                <p className="text-white/80 pl-4">probability: <span className="text-red-400">0.90</span>,</p>
                <p className="text-white/80 pl-4">confidence: <span className="text-green-400">0.94</span>,</p>
                <p className="text-white/80 pl-4">severity: <span className="text-red-400">"severe"</span>,</p>
                <p className="text-white/80 pl-4">action: <span className="text-amber-300">"EVACUATE"</span></p>
                <p className="text-capri">{'}'};</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Emergency Response */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-800 text-sm">Emergency Dashboard</h4>
                  <span className="text-xs text-red-500 font-medium animate-pulse">● LIVE</span>
                </div>
                <div className="space-y-3">
                  {[
                    { zone: 'Aizawl Escarpment', pop: '400,000', severity: 'severe', color: 'bg-red-500' },
                    { zone: 'Mangan NH-10', pop: '43,700', severity: 'severe', color: 'bg-red-500' },
                    { zone: 'Shillong Plateau Edge', pop: '383,000', severity: 'high', color: 'bg-orange-500' },
                    { zone: 'Haflong Highlands', pop: '213,000', severity: 'high', color: 'bg-orange-500' },
                  ].map((item) => (
                    <div key={item.zone} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{item.zone}</p>
                        <p className="text-xs text-gray-500">Pop. at risk: {item.pop}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-gray-400">{item.severity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-3xl font-bold text-gray-900">
                Emergency Response at Your Fingertips
              </h2>
              <p className="mt-4 text-gray-500 leading-relaxed">
                Coordinate evacuation, deploy resources, and communicate with citizens
                through a unified emergency response dashboard.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { value: '5', label: 'Emergency Zones', icon: Shield },
                  { value: '51,400', label: 'People at Risk', icon: Users },
                  { value: '3', label: 'Shelters Active', icon: Globe },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <item.icon className="w-4 h-4 text-aztec mb-2" />
                    <p className="text-xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-aztec to-aztec-light">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Protect Your Community?</h2>
          <p className="mt-4 text-white/70">
            Join the early warning system and help safeguard lives against landslide disasters.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-8 px-8 py-3 bg-white text-aztec font-semibold rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
          >
            Access the System
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-capri rounded-lg flex items-center justify-center">
                <Mountain className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">NER</span>
              <span className="text-sm text-gray-400">AI-Based Landslide Risk Monitoring</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 Natural Emergency Response System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
