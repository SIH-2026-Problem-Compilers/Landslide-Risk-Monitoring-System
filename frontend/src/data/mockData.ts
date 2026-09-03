import type {
  RiskZone,
  Alert,
  Sensor,
  CitizenReport,
  Road,
  Notification,
  NotificationStats,
  Prediction,
  Forecast,
  AIRecommendation,
  HistoricalEvent,
  EmergencyZone,
  DashboardSummary,
  RiskTrend,
  DistrictRisk,
  SeverityDistribution,
} from '../types';

// ---- Dashboard Summary ----
export const dashboardSummary: DashboardSummary = {
  totalActiveAlerts: 23,
  highRiskZones: 8,
  moderateRiskZones: 15,
  sensorStationsOnline: 142,
  roadsBlocked: 7,
  citizenReports: 34,
  lastUpdated: new Date().toISOString(),
};

// ---- Risk Zones (Nepal-focused for NER context) ----
export const riskZones: RiskZone[] = [
  {
    id: 'rz-001',
    name: 'Sindhupalchok North',
    district: 'Sindhupalchok',
    state: 'Bagmati',
    latitude: 27.85,
    longitude: 85.72,
    riskScore: 92,
    severity: 'severe',
    lastUpdated: '2026-09-03T10:30:00Z',
    population: 12400,
    description: 'Critical landslide risk due to heavy rainfall and unstable terrain.',
    factors: ['Heavy rainfall', 'Unstable geology', 'Deforestation', 'Steep slopes'],
  },
  {
    id: 'rz-002',
    name: 'Dolakha Ridge',
    district: 'Dolakha',
    state: 'Bagmati',
    latitude: 27.68,
    longitude: 86.10,
    riskScore: 78,
    severity: 'high',
    lastUpdated: '2026-09-03T09:15:00Z',
    population: 8200,
    description: 'Elevated risk from saturated soil and continuous rainfall.',
    factors: ['Saturated soil', 'Continuous rainfall', 'Hillside erosion'],
  },
  {
    id: 'rz-003',
    name: 'Makwanpur Valley',
    district: 'Makwanpur',
    state: 'Bagmati',
    latitude: 27.42,
    longitude: 84.99,
    riskScore: 65,
    severity: 'high',
    lastUpdated: '2026-09-03T08:45:00Z',
    population: 15600,
    description: 'Moderate to high risk in the valley corridor.',
    factors: ['River erosion', 'Slope instability'],
  },
  {
    id: 'rz-004',
    name: 'Gorkha Hills',
    district: 'Gorkha',
    state: 'Gandaki',
    latitude: 28.21,
    longitude: 84.63,
    riskScore: 55,
    severity: 'moderate',
    lastUpdated: '2026-09-03T07:00:00Z',
    population: 9800,
    description: 'Moderate risk zone with periodic debris flows.',
    factors: ['Debris flow', 'Road cutting', 'Monsoon pattern'],
  },
  {
    id: 'rz-005',
    name: 'Nuwakot Lowlands',
    district: 'Nuwakot',
    state: 'Bagmati',
    latitude: 27.91,
    longitude: 85.25,
    riskScore: 35,
    severity: 'low',
    lastUpdated: '2026-09-03T06:30:00Z',
    population: 6500,
    description: 'Low risk area with stable terrain.',
    factors: ['Stable geology', 'Low slope gradient'],
  },
  {
    id: 'rz-006',
    name: 'Rasuwa Corridor',
    district: 'Rasuwa',
    state: 'Bagmati',
    latitude: 28.11,
    longitude: 85.33,
    riskScore: 85,
    severity: 'severe',
    lastUpdated: '2026-09-03T10:00:00Z',
    population: 4200,
    description: 'High risk along the corridor with historical slide activity.',
    factors: ['Historical slides', 'Steep terrain', 'Road infrastructure stress'],
  },
  {
    id: 'rz-007',
    name: 'Dhading Terraces',
    district: 'Dhading',
    state: 'Bagmati',
    latitude: 27.87,
    longitude: 84.93,
    riskScore: 70,
    severity: 'high',
    lastUpdated: '2026-09-03T09:30:00Z',
    population: 11000,
    description: 'Terraced slopes with increasing saturation risk.',
    factors: ['Terrace failure', 'Rainfall accumulation', 'Irrigation leakage'],
  },
  {
    id: 'rz-008',
    name: 'Sindhuli Slopes',
    district: 'Sindhuli',
    state: 'Bagmati',
    latitude: 27.22,
    longitude: 85.97,
    riskScore: 42,
    severity: 'moderate',
    lastUpdated: '2026-09-03T08:00:00Z',
    population: 7300,
    description: 'Moderate risk along the highway corridor.',
    factors: ['Highway erosion', 'Moderate rainfall'],
  },
  {
    id: 'rz-009',
    name: 'Kavre Highlands',
    district: 'Kavrepalanchok',
    state: 'Bagmati',
    latitude: 27.58,
    longitude: 85.55,
    riskScore: 28,
    severity: 'low',
    lastUpdated: '2026-09-03T06:00:00Z',
    population: 18000,
    description: 'Low risk highland area.',
    factors: ['Favorable geology', 'Good drainage'],
  },
  {
    id: 'rz-010',
    name: 'Ramechhap Basin',
    district: 'Ramechhap',
    state: 'Bagmati',
    latitude: 27.33,
    longitude: 86.08,
    riskScore: 60,
    severity: 'moderate',
    lastUpdated: '2026-09-03T07:30:00Z',
    population: 5600,
    description: 'Moderate risk basin area.',
    factors: ['Basin accumulation', 'Clay-rich soil'],
  },
];

// ---- Alerts ----
export const alerts: Alert[] = [
  {
    id: 'al-001',
    title: 'Severe Landslide Warning - Sindhupalchok',
    message: 'Immediate evacuation recommended for northern communities. Risk score exceeded 90.',
    severity: 'emergency',
    district: 'Sindhupalchok',
    status: 'active',
    createdAt: '2026-09-03T10:30:00Z',
    updatedAt: '2026-09-03T10:30:00Z',
    source: 'ML Prediction Service',
  },
  {
    id: 'al-002',
    title: 'High Risk - Rasuwa Corridor',
    message: 'Risk score elevated to 85. Monitor road conditions closely.',
    severity: 'critical',
    district: 'Rasuwa',
    status: 'active',
    createdAt: '2026-09-03T10:00:00Z',
    updatedAt: '2026-09-03T10:00:00Z',
    source: 'Sensor Network',
  },
  {
    id: 'al-003',
    title: 'Heavy Rainfall Alert - Dolakha',
    message: 'Expected 80mm rainfall in next 12 hours. Soil saturation at critical levels.',
    severity: 'critical',
    district: 'Dolakha',
    status: 'active',
    createdAt: '2026-09-03T09:15:00Z',
    updatedAt: '2026-09-03T09:15:00Z',
    source: 'Weather Service',
  },
  {
    id: 'al-004',
    title: 'Road Blocked - Rasuwa Highway',
    message: 'Landslide debris blocking main highway. Alternative routes advised.',
    severity: 'warning',
    district: 'Rasuwa',
    status: 'active',
    createdAt: '2026-09-03T08:45:00Z',
    updatedAt: '2026-09-03T08:45:00Z',
    source: 'Field Report',
  },
  {
    id: 'al-005',
    title: 'Sensor Offline - Makwanpur',
    message: 'Soil moisture sensor MKP-S03 has gone offline. Maintenance required.',
    severity: 'info',
    district: 'Makwanpur',
    status: 'acknowledged',
    createdAt: '2026-09-03T07:00:00Z',
    updatedAt: '2026-09-03T07:30:00Z',
    source: 'Sensor Network',
  },
  {
    id: 'al-006',
    title: 'Moderate Risk - Gorkha Hills',
    message: 'Debris flow potential detected. Monitor conditions.',
    severity: 'warning',
    district: 'Gorkha',
    status: 'active',
    createdAt: '2026-09-03T06:30:00Z',
    updatedAt: '2026-09-03T06:30:00Z',
    source: 'ML Prediction Service',
  },
  {
    id: 'al-007',
    title: 'Rainfall Warning - Dhading',
    message: 'Cumulative rainfall approaching threshold. Watch for terrace failures.',
    severity: 'warning',
    district: 'Dhading',
    status: 'active',
    createdAt: '2026-09-03T06:00:00Z',
    updatedAt: '2026-09-03T06:00:00Z',
    source: 'Weather Service',
  },
  {
    id: 'al-008',
    title: 'Report Verified - Sindhuli',
    message: 'Citizen report of surface cracks verified by field team.',
    severity: 'info',
    district: 'Sindhuli',
    status: 'resolved',
    createdAt: '2026-09-02T14:00:00Z',
    updatedAt: '2026-09-03T08:00:00Z',
    source: 'Citizen Report',
  },
];

// ---- Sensors ----
export const sensors: Sensor[] = [
  { id: 'SNS-001', name: 'Sindhupalchok Soil Moisture A', type: 'soil_moisture', status: 'online', latitude: 27.86, longitude: 85.73, district: 'Sindhupalchok', lastReading: 82, unit: '%', lastUpdated: '2026-09-03T10:28:00Z', batteryLevel: 94 },
  { id: 'SNS-002', name: 'Dolakha Rainfall Gauge', type: 'rainfall', status: 'online', latitude: 27.69, longitude: 86.11, district: 'Dolakha', lastReading: 65, unit: 'mm/hr', lastUpdated: '2026-09-03T10:25:00Z', batteryLevel: 88 },
  { id: 'SNS-003', name: 'Rasuwa Tilt Sensor', type: 'tilt', status: 'warning', latitude: 28.12, longitude: 85.34, district: 'Rasuwa', lastReading: 4.2, unit: '°', lastUpdated: '2026-09-03T10:20:00Z', batteryLevel: 45 },
  { id: 'SNS-004', name: 'Makwanpur Moisture B', type: 'soil_moisture', status: 'offline', latitude: 27.43, longitude: 85.00, district: 'Makwanpur', lastReading: 0, unit: '%', lastUpdated: '2026-09-02T18:00:00Z', batteryLevel: 12 },
  { id: 'SNS-005', name: 'Gorkha Temperature', type: 'temperature', status: 'online', latitude: 28.22, longitude: 84.64, district: 'Gorkha', lastReading: 24.5, unit: '°C', lastUpdated: '2026-09-03T10:22:00Z', batteryLevel: 91 },
  { id: 'SNS-006', name: 'Dhading Rainfall', type: 'rainfall', status: 'online', latitude: 27.88, longitude: 84.94, district: 'Dhading', lastReading: 42, unit: 'mm/hr', lastUpdated: '2026-09-03T10:18:00Z', batteryLevel: 78 },
  { id: 'SNS-007', name: 'Nuwakot Seismic', type: 'seismic', status: 'online', latitude: 27.92, longitude: 85.26, district: 'Nuwakot', lastReading: 0.3, unit: 'RMS', lastUpdated: '2026-09-03T10:15:00Z', batteryLevel: 85 },
  { id: 'SNS-008', name: 'Kavre Moisture', type: 'soil_moisture', status: 'maintenance', latitude: 27.59, longitude: 85.56, district: 'Kavrepalanchok', lastReading: 45, unit: '%', lastUpdated: '2026-09-03T08:00:00Z', batteryLevel: 67 },
  { id: 'SNS-009', name: 'Sindhuli Tilt C', type: 'tilt', status: 'online', latitude: 27.23, longitude: 85.98, district: 'Sindhuli', lastReading: 1.1, unit: '°', lastUpdated: '2026-09-03T10:10:00Z', batteryLevel: 92 },
  { id: 'SNS-010', name: 'Ramechhap Soil', type: 'soil_moisture', status: 'online', latitude: 27.34, longitude: 86.09, district: 'Ramechhap', lastReading: 71, unit: '%', lastUpdated: '2026-09-03T10:05:00Z', batteryLevel: 73 },
];

// ---- Citizen Reports ----
export const citizenReports: CitizenReport[] = [
  { id: 'cr-001', reporterName: 'Ram Bahadur', type: 'crack', district: 'Sindhupalchok', description: 'Visible ground cracks appeared on the hillside above our village after yesterday\'s heavy rain.', latitude: 27.855, longitude: 85.725, status: 'verified', images: [], createdAt: '2026-09-03T08:00:00Z', updatedAt: '2026-09-03T09:00:00Z' },
  { id: 'cr-002', reporterName: 'Sita Tamang', type: 'road_blockage', district: 'Rasuwa', description: 'The main road to Dhunche is blocked by fallen rocks and debris.', latitude: 28.115, longitude: 85.335, status: 'investigating', images: [], createdAt: '2026-09-03T07:30:00Z', updatedAt: '2026-09-03T08:00:00Z' },
  { id: 'cr-003', reporterName: 'Hari Prasad', type: 'slope_movement', district: 'Dolakha', description: 'I noticed the slope near our terraces shifting. Trees are leaning at an angle.', latitude: 27.685, longitude: 86.105, status: 'pending', images: [], createdAt: '2026-09-03T06:00:00Z', updatedAt: '2026-09-03T06:00:00Z' },
  { id: 'cr-004', reporterName: 'Maya Shrestha', type: 'flooding', district: 'Dhading', description: 'The river near our settlement has risen significantly. Water entering lower houses.', latitude: 27.875, longitude: 84.935, status: 'resolved', images: [], createdAt: '2026-09-02T16:00:00Z', updatedAt: '2026-09-03T04:00:00Z' },
  { id: 'cr-005', reporterName: 'Bikash Gurung', type: 'rockfall', district: 'Gorkha', description: 'Rocks falling onto the road near Manakamana temple trail.', latitude: 28.205, longitude: 84.635, status: 'verified', images: [], createdAt: '2026-09-03T05:00:00Z', updatedAt: '2026-09-03T07:00:00Z' },
  { id: 'cr-006', reporterName: 'Anita Rai', type: 'crack', district: 'Makwanpur', description: 'Cracks developing in the foundation of our community building.', latitude: 27.415, longitude: 84.995, status: 'investigating', images: [], createdAt: '2026-09-02T20:00:00Z', updatedAt: '2026-09-03T02:00:00Z' },
  { id: 'cr-007', reporterName: 'Kamal Thing', type: 'landslide', district: 'Sindhupalchok', description: 'Small landslide blocked tributary stream above village.', latitude: 27.840, longitude: 85.710, status: 'verified', images: [], createdAt: '2026-09-03T04:00:00Z', updatedAt: '2026-09-03T05:00:00Z' },
  { id: 'cr-008', reporterName: 'Gita Poudel', type: 'slope_movement', district: 'Nuwakot', description: 'Noticeable ground movement on the hillside near the school.', latitude: 27.905, longitude: 85.255, status: 'pending', images: [], createdAt: '2026-09-03T09:00:00Z', updatedAt: '2026-09-03T09:00:00Z' },
];

// ---- Roads ----
export const roads: Road[] = [
  { id: 'rd-001', name: 'Rasuwa Highway', from: 'Dhunche', to: 'Syabrubesi', district: 'Rasuwa', status: 'fully_blocked', reason: 'Landslide debris at km 42', lastUpdated: '2026-09-03T08:00:00Z', alternativeRoute: 'Use Kalikot bypass road', coordinates: [[28.11, 85.29], [28.16, 85.33], [28.20, 85.37]] },
  { id: 'rd-002', name: 'BP Highway Section', from: 'Dolalghat', to: 'Sindhuli', district: 'Sindhuli', status: 'partially_blocked', reason: 'Single lane open after minor rockfall', lastUpdated: '2026-09-03T09:00:00Z', coordinates: [[27.56, 85.67], [27.42, 85.82], [27.22, 85.97]] },
  { id: 'rd-003', name: 'Prithvi Highway', from: 'Naubise', to: 'Dhulikhel', district: 'Kavrepalanchok', status: 'open', lastUpdated: '2026-09-03T10:00:00Z', coordinates: [[27.72, 85.33], [27.65, 85.42], [27.58, 85.55]] },
  { id: 'rd-004', name: 'Dhading Road', from: 'Malekhu', to: 'Gadi', district: 'Dhading', status: 'partially_blocked', reason: 'Mudflow across road at two points', lastUpdated: '2026-09-03T07:30:00Z', alternativeRoute: 'Use inner road via Thakre', coordinates: [[27.82, 84.87], [27.85, 84.90], [27.88, 84.94]] },
  { id: 'rd-005', name: 'Gorkha-Dhading Road', from: 'Gorkha Bazaar', to: 'Dhading Besi', district: 'Gorkha', status: 'open', lastUpdated: '2026-09-03T10:00:00Z', coordinates: [[28.21, 84.63], [28.05, 84.78], [27.87, 84.93]] },
  { id: 'rd-006', name: 'Melamchi Water Supply Road', from: 'Melamchi Bazaar', to: 'Intake', district: 'Sindhupalchok', status: 'fully_blocked', reason: 'Major landslide destroyed 200m of road', lastUpdated: '2026-09-03T06:00:00Z', coordinates: [[27.83, 85.58], [27.85, 85.62], [27.88, 85.67]] },
  { id: 'rd-007', name: 'Nuwakot-Trisuli Road', from: 'Trisuli Bazaar', to: 'Nuwakot', district: 'Nuwakot', status: 'open', lastUpdated: '2026-09-03T10:00:00Z', coordinates: [[27.89, 85.16], [27.90, 85.20], [27.91, 85.25]] },
  { id: 'rd-008', name: 'Ramechhap Road', from: 'Manthali', to: 'Ramechhap', district: 'Ramechhap', status: 'open', lastUpdated: '2026-09-03T10:00:00Z', coordinates: [[27.32, 86.03], [27.33, 86.05], [27.33, 86.08]] },
];

// ---- Notifications ----
export const notifications: Notification[] = [
  { id: 'nt-001', title: 'Emergency Evacuation - Sindhupalchok', message: 'Immediate evacuation for northern communities.', channel: 'sms', recipients: 2400, sent: 2400, delivered: 2156, failed: 44, sentAt: '2026-09-03T10:30:00Z', status: 'delivered' },
  { id: 'nt-002', title: 'High Risk Alert - Rasuwa', message: 'Risk level elevated. Stay alert.', channel: 'email', recipients: 580, sent: 580, delivered: 572, failed: 8, sentAt: '2026-09-03T10:00:00Z', status: 'delivered' },
  { id: 'nt-003', title: 'Weather Warning - Dolakha', message: 'Heavy rainfall expected. Prepare for possible landslides.', channel: 'whatsapp', recipients: 3200, sent: 3200, delivered: 2890, failed: 310, sentAt: '2026-09-03T09:15:00Z', status: 'partial' },
  { id: 'nt-004', title: 'Road Closure Notice', message: 'Rasuwa Highway closed. Use alternative routes.', channel: 'ivr', recipients: 1500, sent: 1500, delivered: 1480, failed: 20, sentAt: '2026-09-03T08:45:00Z', status: 'delivered' },
  { id: 'nt-005', title: 'Moderate Risk - Gorkha', message: 'Monitor conditions and stay prepared.', channel: 'sms', recipients: 980, sent: 980, delivered: 960, failed: 20, sentAt: '2026-09-03T06:30:00Z', status: 'delivered' },
];

export const notificationStats: NotificationStats = {
  totalSent: 25480,
  totalDelivered: 23158,
  totalFailed: 402,
  byChannel: {
    sms: { sent: 12000, delivered: 11200, failed: 180 },
    email: { sent: 5800, delivered: 5650, failed: 45 },
    whatsapp: { sent: 5100, delivered: 4500, failed: 320 },
    ivr: { sent: 2580, delivered: 2508, failed: 57 },
  },
};

// ---- ML Predictions ----
export const predictions: Prediction[] = [
  { id: 'pr-001', zoneId: 'rz-001', zoneName: 'Sindhupalchok North', riskScore: 92, probability: 0.87, severity: 'severe', confidence: 0.94, timestamp: '2026-09-03T10:30:00Z', factors: ['Rainfall 82mm', 'Soil moisture 82%', 'Steep gradient', 'Historical activity'] },
  { id: 'pr-002', zoneId: 'rz-006', zoneName: 'Rasuwa Corridor', riskScore: 85, probability: 0.79, severity: 'severe', confidence: 0.89, timestamp: '2026-09-03T10:00:00Z', factors: ['Continuous rainfall', 'Tilt sensor 4.2°', 'Road stress', 'Debris history'] },
  { id: 'pr-003', zoneId: 'rz-002', zoneName: 'Dolakha Ridge', riskScore: 78, probability: 0.72, severity: 'high', confidence: 0.91, timestamp: '2026-09-03T09:15:00Z', factors: ['Rainfall 65mm', 'Soil saturation 78%', 'Deforestation'] },
  { id: 'pr-004', zoneId: 'rz-007', zoneName: 'Dhading Terraces', riskScore: 70, probability: 0.65, severity: 'high', confidence: 0.85, timestamp: '2026-09-03T09:30:00Z', factors: ['Terrace instability', 'Rainfall accumulation'] },
  { id: 'pr-005', zoneId: 'rz-003', zoneName: 'Makwanpur Valley', riskScore: 65, probability: 0.60, severity: 'high', confidence: 0.82, timestamp: '2026-09-03T08:45:00Z', factors: ['River erosion', 'Slope movement'] },
];

export const forecasts: Forecast[] = [
  { period: '24h', riskScore: 88, probability: 0.83, severity: 'severe', rainfall: 85, factors: ['Continued heavy rainfall', 'Soil saturation approaching critical'] },
  { period: '48h', riskScore: 75, probability: 0.70, severity: 'high', rainfall: 60, factors: ['Rainfall expected to moderate', 'Saturation persists'] },
  { period: '72h', riskScore: 55, probability: 0.50, severity: 'moderate', rainfall: 30, factors: ['Rainfall decreasing', 'Gradual drainage expected'] },
];

export const aiRecommendations: AIRecommendation[] = [
  { id: 'rec-001', priority: 'high', title: 'Immediate Evacuation - Sindhupalchok North', description: 'Evacuate all residents within 2km radius of highest risk zone. Risk score 92 with 87% probability.', targetZones: ['Sindhupalchok North'], createdAt: '2026-09-03T10:30:00Z' },
  { id: 'rec-002', priority: 'high', title: 'Road Closure and Diversion - Rasuwa', description: 'Close Rasuwa Highway immediately. Deploy traffic management for alternative routes.', targetZones: ['Rasuwa Corridor'], createdAt: '2026-09-03T10:00:00Z' },
  { id: 'rec-003', priority: 'medium', title: 'Enhanced Monitoring - Dolakha Ridge', description: 'Increase sensor polling frequency to 5-minute intervals. Deploy additional tilt sensors.', targetZones: ['Dolakha Ridge'], createdAt: '2026-09-03T09:15:00Z' },
  { id: 'rec-004', priority: 'medium', title: 'Community Alert - Dhading Terraces', description: 'Issue community awareness notices for terrace farming communities. Prepare shelter locations.', targetZones: ['Dhading Terraces'], createdAt: '2026-09-03T09:30:00Z' },
  { id: 'rec-005', priority: 'low', title: 'Sensor Maintenance - Makwanpur', description: 'Schedule maintenance visit for offline sensor MKP-S03.', targetZones: ['Makwanpur Valley'], createdAt: '2026-09-03T08:00:00Z' },
];

// ---- Historical Events ----
export const historicalEvents: HistoricalEvent[] = [
  { id: 'he-001', name: 'Sindhupalchok Mega Landslide', date: '2024-09-15', district: 'Sindhupalchok', state: 'Bagmati', severity: 'severe', casualties: 12, displaced: 3500, description: 'Catastrophic landslide triggered by 3-day continuous rainfall destroyed two villages.', latitude: 27.84, longitude: 85.71, triggers: ['Heavy rainfall', 'Soil saturation', 'Steep terrain'], areaAffected: 2.5 },
  { id: 'he-002', name: 'Dolakha Highway Slide', date: '2024-07-22', district: 'Dolakha', state: 'Bagmati', severity: 'high', casualties: 3, displaced: 800, description: 'Major landslide blocked the highway and buried 5 houses.', latitude: 27.70, longitude: 86.08, triggers: ['Monsoon rainfall', 'Road cut destabilization'], areaAffected: 0.8 },
  { id: 'he-003', name: 'Rasuwa Debris Flow', date: '2023-08-10', district: 'Rasuwa', state: 'Bagmati', severity: 'high', casualties: 0, displaced: 1200, description: 'Debris flow triggered by intense rainfall damaged infrastructure.', latitude: 28.10, longitude: 85.32, triggers: ['Intense rainfall', 'Deforestation'], areaAffected: 1.2 },
  { id: 'he-004', name: 'Gorkha Hill Collapse', date: '2023-06-28', district: 'Gorkha', state: 'Gandaki', severity: 'moderate', casualties: 1, displaced: 450, description: 'Hill collapse affected farmland and a settlement.', latitude: 28.20, longitude: 84.65, triggers: ['Rainfall', 'Hillside instability'], areaAffected: 0.5 },
  { id: 'he-005', name: 'Makwanpur Valley Mudslide', date: '2022-08-05', district: 'Makwanpur', state: 'Bagmati', severity: 'moderate', casualties: 2, displaced: 600, description: 'Mudslide followed by flash flood in the valley.', latitude: 27.40, longitude: 85.01, triggers: ['Flash flood', 'River bank erosion'], areaAffected: 0.7 },
  { id: 'he-006', name: 'Dhading Terrace Failure', date: '2022-07-12', district: 'Dhading', state: 'Bagmati', severity: 'severe', casualties: 5, displaced: 1800, description: 'Multiple terrace failures after 5-day continuous rainfall.', latitude: 27.86, longitude: 84.92, triggers: ['Extended rainfall', 'Terrace irrigation', 'Clay soil'], areaAffected: 1.8 },
];

// ---- Emergency Zones ----
export const emergencyZones: EmergencyZone[] = [
  { id: 'ez-001', name: 'Sindhupalchok Evacuation Zone', district: 'Sindhupalchok', populationAtRisk: 12400, priorityRank: 1, severity: 'severe', infrastructureImpact: ['Power lines', 'Water supply', 'Schools (2)', 'Health post'], hospitals: 1, shelters: 3, latitude: 27.85, longitude: 85.72 },
  { id: 'ez-002', name: 'Rasuwa Corridor Zone', district: 'Rasuwa', populationAtRisk: 4200, priorityRank: 2, severity: 'severe', infrastructureImpact: ['Highway', 'Bridge', 'Power lines'], hospitals: 0, shelters: 1, latitude: 28.11, longitude: 85.33 },
  { id: 'ez-003', name: 'Dolakha Ridge Zone', district: 'Dolakha', populationAtRisk: 8200, priorityRank: 3, severity: 'high', infrastructureImpact: ['Road', 'Water supply', 'Schools (1)'], hospitals: 1, shelters: 2, latitude: 27.68, longitude: 86.10 },
  { id: 'ez-004', name: 'Dhading Valley Zone', district: 'Dhading', populationAtRisk: 11000, priorityRank: 4, severity: 'high', infrastructureImpact: ['Farmland', 'Water supply'], hospitals: 1, shelters: 2, latitude: 27.87, longitude: 84.93 },
  { id: 'ez-005', name: 'Makwanpur Corridor Zone', district: 'Makwanpur', populationAtRisk: 15600, priorityRank: 5, severity: 'high', infrastructureImpact: ['Highway', 'Power grid'], hospitals: 2, shelters: 3, latitude: 27.42, longitude: 84.99 },
];

// ---- Analytics Data ----
export const riskTrends: RiskTrend[] = [
  { date: 'Aug 28', riskScore: 45, rainfall: 25, alerts: 5 },
  { date: 'Aug 29', riskScore: 52, rainfall: 35, alerts: 7 },
  { date: 'Aug 30', riskScore: 58, rainfall: 42, alerts: 9 },
  { date: 'Aug 31', riskScore: 65, rainfall: 55, alerts: 12 },
  { date: 'Sep 01', riskScore: 72, rainfall: 68, alerts: 16 },
  { date: 'Sep 02', riskScore: 80, rainfall: 78, alerts: 20 },
  { date: 'Sep 03', riskScore: 88, rainfall: 85, alerts: 23 },
];

export const districtRiskData: DistrictRisk[] = [
  { district: 'Sindhupalchok', low: 2, moderate: 3, high: 4, severe: 3 },
  { district: 'Dolakha', low: 3, moderate: 4, high: 3, severe: 1 },
  { district: 'Rasuwa', low: 1, moderate: 2, high: 3, severe: 2 },
  { district: 'Gorkha', low: 4, moderate: 3, high: 1, severe: 0 },
  { district: 'Dhading', low: 3, moderate: 3, high: 2, severe: 1 },
  { district: 'Makwanpur', low: 2, moderate: 3, high: 2, severe: 1 },
  { district: 'Nuwakot', low: 3, moderate: 2, high: 1, severe: 0 },
  { district: 'Sindhuli', low: 2, moderate: 2, high: 1, severe: 0 },
];

export const severityDistribution: SeverityDistribution[] = [
  { name: 'Low', value: 20, color: '#22c55e' },
  { name: 'Moderate', value: 22, color: '#eab308' },
  { name: 'High', value: 17, color: '#f97316' },
  { name: 'Severe', value: 8, color: '#ef4444' },
];

export const rainfallVsRisk: RiskTrend[] = [
  { date: 'Week 1', riskScore: 35, rainfall: 45, alerts: 3 },
  { date: 'Week 2', riskScore: 48, rainfall: 62, alerts: 6 },
  { date: 'Week 3', riskScore: 65, rainfall: 80, alerts: 12 },
  { date: 'Week 4', riskScore: 78, rainfall: 95, alerts: 18 },
  { date: 'Week 5', riskScore: 82, rainfall: 105, alerts: 20 },
  { date: 'Week 6', riskScore: 88, rainfall: 112, alerts: 23 },
];
