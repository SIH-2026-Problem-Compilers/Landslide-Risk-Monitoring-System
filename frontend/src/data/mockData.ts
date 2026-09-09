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

// ---------------------------------------------------------------------------
// North Eastern Region (India) prototype data.
// Zone ids rz-001..rz-013 match backend/app/zones.py so the LHASA API and the
// map/predictions views stay in sync across all 8 NER states.
// ---------------------------------------------------------------------------

// ---- Dashboard Summary ----
export const dashboardSummary: DashboardSummary = {
  totalActiveAlerts: 18,
  highRiskZones: 6,
  moderateRiskZones: 7,
  sensorStationsOnline: 96,
  roadsBlocked: 9,
  citizenReports: 41,
  lastUpdated: new Date().toISOString(),
};

// ---- Risk Zones (13 across all 8 NER states) ----
export const riskZones: RiskZone[] = [
  {
    id: 'rz-001',
    name: 'Bomdila Slopes',
    district: 'West Kameng',
    state: 'Arunachal Pradesh',
    latitude: 27.08,
    longitude: 92.42,
    riskScore: 41,
    severity: 'moderate',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 95400,
    description: 'Steep slope failures along Bomdila–Dirang stretch of the BCT Road.',
    factors: ['Monsoon rainfall', 'Road-cut destabilization', 'Steep gradients'],
  },
  {
    id: 'rz-002',
    name: 'Itanagar Hills',
    district: 'Papum Pare',
    state: 'Arunachal Pradesh',
    latitude: 27.10,
    longitude: 93.62,
    riskScore: 39,
    severity: 'moderate',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 176500,
    description: 'Urban hill slopes around Itanagar capital complex.',
    factors: ['Urban hill cutting', 'Drainage congestion', 'Moderate rainfall'],
  },
  {
    id: 'rz-003',
    name: 'Haflong Highlands',
    district: 'Dima Hasao',
    state: 'Assam',
    latitude: 25.16,
    longitude: 93.02,
    riskScore: 54,
    severity: 'high',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 213000,
    description: 'Frequent NH-6 blockades near Haflong on soft shales and sandstones.',
    factors: ['Soft geology', 'Heavy monsoon rain', 'NH-6 cut slopes'],
  },
  {
    id: 'rz-004',
    name: 'Senapati Ridge',
    district: 'Senapati',
    state: 'Manipur',
    latitude: 25.26,
    longitude: 94.03,
    riskScore: 44,
    severity: 'moderate',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 380000,
    description: 'NH-2 corridor slips between Kangpokpi and Senapati.',
    factors: ['NH-2 cut slopes', 'Clay-rich soils', 'Seasonal rain'],
  },
  {
    id: 'rz-005',
    name: 'Shillong Plateau Edge',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    latitude: 25.57,
    longitude: 91.88,
    riskScore: 75,
    severity: 'high',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 383000,
    description: 'Marginal slopes around Shillong city; very high seasonal rainfall.',
    factors: ['Extreme rainfall', 'Steep laterite slopes', 'Dense settlements'],
  },
  {
    id: 'rz-006',
    name: 'Tura Ridge',
    district: 'West Garo Hills',
    state: 'Meghalaya',
    latitude: 25.51,
    longitude: 90.22,
    riskScore: 40,
    severity: 'moderate',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 642000,
    description: 'Tura–Rongram ridge slopes prone to monsoon slips.',
    factors: ['Monsoon rain', 'Shifting cultivation slopes'],
  },
  {
    id: 'rz-007',
    name: 'Aizawl Escarpment',
    district: 'Aizawl',
    state: 'Mizoram',
    latitude: 23.73,
    longitude: 92.72,
    riskScore: 94,
    severity: 'severe',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 400000,
    description: 'Dense city on steep shale escarpments; chronic monsoon slope failures.',
    factors: ['Very steep shale slopes', 'High rainfall', 'Dense urban load'],
  },
  {
    id: 'rz-008',
    name: 'Lunglei Ghats',
    district: 'Lunglei',
    state: 'Mizoram',
    latitude: 22.88,
    longitude: 92.73,
    riskScore: 62,
    severity: 'high',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 161000,
    description: 'Hill-town slopes on friable Bhuban shales.',
    factors: ['Friable shales', 'Heavy rainfall', 'Steep gradients'],
  },
  {
    id: 'rz-009',
    name: 'Kohima Ridge',
    district: 'Kohima',
    state: 'Nagaland',
    latitude: 25.67,
    longitude: 94.11,
    riskScore: 68,
    severity: 'high',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 270000,
    description: 'NH-29 & city ridge slips with legacy road cutting.',
    factors: ['Road cutting', 'High rainfall', 'Weathered phyllites'],
  },
  {
    id: 'rz-010',
    name: 'Phek Escarpment',
    district: 'Phek',
    state: 'Nagaland',
    latitude: 25.67,
    longitude: 94.45,
    riskScore: 46,
    severity: 'moderate',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 163000,
    description: 'Escarpment slopes along Pfutsero–Phek road.',
    factors: ['Steep escarpments', 'Moderate rainfall'],
  },
  {
    id: 'rz-011',
    name: 'Mangan NH-10 Corridor',
    district: 'Mangan',
    state: 'Sikkim',
    latitude: 27.51,
    longitude: 88.53,
    riskScore: 89,
    severity: 'severe',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 43700,
    description: 'NH-10 Teesta valley corridor with chronic landslide hotspots.',
    factors: ['Teesta valley instability', 'Cloudburst rainfall', 'NH-10 cuts'],
  },
  {
    id: 'rz-012',
    name: 'Gangtok Escarpment',
    district: 'Gangtok',
    state: 'Sikkim',
    latitude: 27.33,
    longitude: 88.62,
    riskScore: 44,
    severity: 'moderate',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 283000,
    description: 'Built-up escarpment above Gangtok town.',
    factors: ['Urban load', 'Monsoon rain', 'Steep slopes'],
  },
  {
    id: 'rz-013',
    name: 'Dhalai Slopes',
    district: 'Dhalai',
    state: 'Tripura',
    latitude: 23.93,
    longitude: 91.85,
    riskScore: 36,
    severity: 'moderate',
    lastUpdated: '2026-09-08T06:00:00Z',
    population: 378000,
    description: 'Red-soil hill slopes in Dhalai district.',
    factors: ['Red soil erosion', 'Monsoon rainfall', 'Hill cutting'],
  },
];

// ---- Alerts ----
export const alerts: Alert[] = [
  {
    id: 'al-001',
    title: 'Severe Landslide Warning - Aizawl',
    message: 'LHASA estimates >90% landslide probability. Notify district disaster management for evacuation prep.',
    severity: 'emergency',
    district: 'Aizawl',
    status: 'active',
    createdAt: '2026-09-08T06:10:00Z',
    updatedAt: '2026-09-08T06:10:00Z',
    source: 'ML Prediction Service (LHASA)',
  },
  {
    id: 'al-002',
    title: 'High Risk - Mangan NH-10',
    message: 'Teesta valley corridor risk elevated. Monitor NH-10 blockades closely.',
    severity: 'critical',
    district: 'Mangan',
    status: 'active',
    createdAt: '2026-09-08T06:05:00Z',
    updatedAt: '2026-09-08T06:05:00Z',
    source: 'ML Prediction Service (LHASA)',
  },
  {
    id: 'al-003',
    title: 'High Risk - Shillong Plateau Edge',
    message: 'Risk score above 70 with heavy monsoon rainfall. Step up patrols on marginal slopes.',
    severity: 'critical',
    district: 'East Khasi Hills',
    status: 'active',
    createdAt: '2026-09-08T06:00:00Z',
    updatedAt: '2026-09-08T06:00:00Z',
    source: 'ML Prediction Service (LHASA)',
  },
  {
    id: 'al-004',
    title: 'Road Blocked - NH-6 Haflong',
    message: 'Debris blocking NH-6 near Haflong. Diversion via Maibang advised.',
    severity: 'warning',
    district: 'Dima Hasao',
    status: 'active',
    createdAt: '2026-09-08T05:40:00Z',
    updatedAt: '2026-09-08T05:40:00Z',
    source: 'Field Report',
  },
  {
    id: 'al-005',
    title: 'Heavy Rainfall Alert - Kohima',
    message: 'IMD outlook: heavy rain next 24h. Saturation approaching thresholds.',
    severity: 'warning',
    district: 'Kohima',
    status: 'active',
    createdAt: '2026-09-08T05:30:00Z',
    updatedAt: '2026-09-08T05:30:00Z',
    source: 'IMD Weather Feed',
  },
  {
    id: 'al-006',
    title: 'Sensor Offline - Lunglei',
    message: 'Soil moisture sensor LGL-S01 offline. Maintenance required.',
    severity: 'info',
    district: 'Lunglei',
    status: 'acknowledged',
    createdAt: '2026-09-08T04:00:00Z',
    updatedAt: '2026-09-08T04:30:00Z',
    source: 'Sensor Network',
  },
];

// ---- Sensors ----
export const sensors: Sensor[] = [
  { id: 'SNS-001', name: 'Aizawl Soil Moisture A', type: 'soil_moisture', status: 'online', latitude: 23.74, longitude: 92.72, district: 'Aizawl', lastReading: 86, unit: '%', lastUpdated: '2026-09-08T06:20:00Z', batteryLevel: 93 },
  { id: 'SNS-002', name: 'Mangan Rain Gauge', type: 'rainfall', status: 'online', latitude: 27.52, longitude: 88.54, district: 'Mangan', lastReading: 48, unit: 'mm/hr', lastUpdated: '2026-09-08T06:18:00Z', batteryLevel: 88 },
  { id: 'SNS-003', name: 'Shillong Rainfall Gauge', type: 'rainfall', status: 'online', latitude: 25.58, longitude: 91.89, district: 'East Khasi Hills', lastReading: 55, unit: 'mm/hr', lastUpdated: '2026-09-08T06:15:00Z', batteryLevel: 91 },
  { id: 'SNS-004', name: 'Kohima Tilt Sensor', type: 'tilt', status: 'warning', latitude: 25.66, longitude: 94.10, district: 'Kohima', lastReading: 3.8, unit: '°', lastUpdated: '2026-09-08T06:10:00Z', batteryLevel: 52 },
  { id: 'SNS-005', name: 'Haflong Moisture B', type: 'soil_moisture', status: 'offline', latitude: 25.17, longitude: 93.01, district: 'Dima Hasao', lastReading: 0, unit: '%', lastUpdated: '2026-09-07T18:00:00Z', batteryLevel: 9 },
  { id: 'SNS-006', name: 'Lunglei Rainfall', type: 'rainfall', status: 'online', latitude: 22.89, longitude: 92.74, district: 'Lunglei', lastReading: 39, unit: 'mm/hr', lastUpdated: '2026-09-08T06:12:00Z', batteryLevel: 78 },
  { id: 'SNS-007', name: 'Gangtok Seismic', type: 'seismic', status: 'online', latitude: 27.34, longitude: 88.63, district: 'Gangtok', lastReading: 0.2, unit: 'RMS', lastUpdated: '2026-09-08T06:05:00Z', batteryLevel: 84 },
  { id: 'SNS-008', name: 'Senapati Moisture', type: 'soil_moisture', status: 'online', latitude: 25.27, longitude: 94.02, district: 'Senapati', lastReading: 58, unit: '%', lastUpdated: '2026-09-08T05:55:00Z', batteryLevel: 71 },
  { id: 'SNS-009', name: 'Tura Tilt', type: 'tilt', status: 'online', latitude: 25.52, longitude: 90.21, district: 'West Garo Hills', lastReading: 1.2, unit: '°', lastUpdated: '2026-09-08T05:50:00Z', batteryLevel: 90 },
  { id: 'SNS-010', name: 'Bomdila Rainfall', type: 'rainfall', status: 'online', latitude: 27.09, longitude: 92.41, district: 'West Kameng', lastReading: 18, unit: 'mm/hr', lastUpdated: '2026-09-08T05:45:00Z', batteryLevel: 82 },
  { id: 'SNS-011', name: 'Dhalai Soil Moisture', type: 'soil_moisture', status: 'online', latitude: 23.94, longitude: 91.86, district: 'Dhalai', lastReading: 47, unit: '%', lastUpdated: '2026-09-08T05:40:00Z', batteryLevel: 76 },
  { id: 'SNS-012', name: 'Itanagar Rain Gauge', type: 'rainfall', status: 'maintenance', latitude: 27.11, longitude: 93.63, district: 'Papum Pare', lastReading: 12, unit: 'mm/hr', lastUpdated: '2026-09-08T05:00:00Z', batteryLevel: 40 },
];

// ---- Citizen Reports ----
export const citizenReports: CitizenReport[] = [
  { id: 'cr-001', reporterName: 'Lalremruata', type: 'crack', district: 'Aizawl', description: 'Ground cracks widening on the slope above the Chanmari colony after heavy rain.', latitude: 23.735, longitude: 92.715, status: 'verified', images: [], createdAt: '2026-09-08T05:00:00Z', updatedAt: '2026-09-08T05:50:00Z' },
  { id: 'cr-002', reporterName: 'Passang Sherpa', type: 'road_blockage', district: 'Mangan', description: 'NH-10 blocked by fresh debris between Mangan and Singhik.', latitude: 27.52, longitude: 88.52, status: 'investigating', images: [], createdAt: '2026-09-08T04:30:00Z', updatedAt: '2026-09-08T05:00:00Z' },
  { id: 'cr-003', reporterName: 'Ibankutlang Jyrwa', type: 'slope_movement', district: 'East Khasi Hills', description: 'Trees leaning on the slope above Laitumkhrah; soil visibly shifting.', latitude: 25.58, longitude: 91.87, status: 'pending', images: [], createdAt: '2026-09-08T04:00:00Z', updatedAt: '2026-09-08T04:00:00Z' },
  { id: 'cr-004', reporterName: 'Kevi Vadeo', type: 'flooding', district: 'Kohima', description: 'Water logging and minor slides along NH-29 near Sechu.', latitude: 25.70, longitude: 94.05, status: 'resolved', images: [], createdAt: '2026-09-07T15:00:00Z', updatedAt: '2026-09-08T03:00:00Z' },
  { id: 'cr-005', reporterName: 'Deepjyoti Baruah', type: 'rockfall', district: 'Dima Hasao', description: 'Rockfall on NH-6 near Jatinga; large boulders on carriageway.', latitude: 25.23, longitude: 92.96, status: 'verified', images: [], createdAt: '2026-09-08T03:30:00Z', updatedAt: '2026-09-08T04:40:00Z' },
  { id: 'cr-006', reporterName: 'Lalrinchhani', type: 'landslide', district: 'Lunglei', description: 'Slope failure above the Lunglei town road; half the lane buried.', latitude: 22.885, longitude: 92.735, status: 'investigating', images: [], createdAt: '2026-09-08T02:00:00Z', updatedAt: '2026-09-08T03:20:00Z' },
];

// ---- Roads ----
export const roads: Road[] = [
  { id: 'rd-001', name: 'NH-10 Teesta Valley', from: 'Mangan', to: 'Singhik', district: 'Mangan', status: 'fully_blocked', reason: 'Landslide debris at km 42', lastUpdated: '2026-09-08T06:00:00Z', alternativeRoute: 'Use Chungthang–Lachen road where open', coordinates: [[27.52, 88.54], [27.56, 88.56], [27.60, 88.58]] },
  { id: 'rd-002', name: 'NH-6 Haflong Section', from: 'Jatinga', to: 'Haflong', district: 'Dima Hasao', status: 'partially_blocked', reason: 'Single lane open after rockfall', lastUpdated: '2026-09-08T05:45:00Z', alternativeRoute: 'Maibang–Langting diversion', coordinates: [[25.23, 92.96], [25.20, 92.99], [25.16, 93.02]] },
  { id: 'rd-003', name: 'Aizawl–Lengpui Road', from: 'Aizawl', to: 'Lengpui', district: 'Aizawl', status: 'partially_blocked', reason: 'Cut slope slip at 12 Mile', lastUpdated: '2026-09-08T05:30:00Z', coordinates: [[23.73, 92.72], [23.72, 92.68], [23.70, 92.62]] },
  { id: 'rd-004', name: 'NH-40 Shillong Bypass', from: 'Shillong', to: 'Jowai', district: 'East Khasi Hills', status: 'open', lastUpdated: '2026-09-08T06:00:00Z', coordinates: [[25.58, 91.88], [25.55, 91.95], [25.52, 92.05]] },
  { id: 'rd-005', name: 'NH-29 Kohima–Imphal', from: 'Kohima', to: 'Senapati', district: 'Kohima', status: 'partially_blocked', reason: 'Slide near Sechu; convoy movement', lastUpdated: '2026-09-08T05:00:00Z', coordinates: [[25.67, 94.11], [25.55, 94.05], [25.40, 94.03]] },
  { id: 'rd-006', name: 'Bomdila–Dirang BCT Road', from: 'Bomdila', to: 'Dirang', district: 'West Kameng', status: 'open', lastUpdated: '2026-09-08T05:50:00Z', coordinates: [[27.08, 92.42], [27.15, 92.40], [27.22, 92.38]] },
  { id: 'rd-007', name: 'Lunglei–Hnahthial Road', from: 'Lunglei', to: 'Hnahthial', district: 'Lunglei', status: 'open', lastUpdated: '2026-09-08T05:40:00Z', coordinates: [[22.88, 92.73], [22.90, 92.78], [22.93, 92.84]] },
  { id: 'rd-008', name: 'Tura–Rongram Road', from: 'Tura', to: 'Rongram', district: 'West Garo Hills', status: 'open', lastUpdated: '2026-09-08T05:30:00Z', coordinates: [[25.51, 90.22], [25.53, 90.25], [25.55, 90.29]] },
];

// ---- Notifications ----
export const notifications: Notification[] = [
  { id: 'nt-001', title: 'Emergency Evacuation - Aizawl', message: 'Immediate preparedness for Chanmari & adjoining slopes.', channel: 'sms', recipients: 4200, sent: 4200, delivered: 3980, failed: 46, sentAt: '2026-09-08T06:10:00Z', status: 'delivered' },
  { id: 'nt-002', title: 'High Risk Alert - Mangan', message: 'NH-10 corridor risk elevated. Stay alert.', channel: 'email', recipients: 640, sent: 640, delivered: 631, failed: 9, sentAt: '2026-09-08T06:00:00Z', status: 'delivered' },
  { id: 'nt-003', title: 'Weather Warning - Kohima', message: 'Heavy rain expected. Prepare for possible slides.', channel: 'whatsapp', recipients: 5600, sent: 5600, delivered: 5120, failed: 480, sentAt: '2026-09-08T05:30:00Z', status: 'partial' },
  { id: 'nt-004', title: 'Road Closure Notice - NH-10', message: 'NH-10 Mangan–Singhik closed. Use alternatives.', channel: 'ivr', recipients: 1800, sent: 1800, delivered: 1762, failed: 38, sentAt: '2026-09-08T05:00:00Z', status: 'delivered' },
  { id: 'nt-005', title: 'Moderate Risk - Haflong', message: 'Monitor NH-6 corridor and stay prepared.', channel: 'sms', recipients: 1200, sent: 1200, delivered: 1150, failed: 50, sentAt: '2026-09-08T04:30:00Z', status: 'delivered' },
];

export const notificationStats: NotificationStats = {
  totalSent: 29480,
  totalDelivered: 26840,
  totalFailed: 623,
  byChannel: {
    sms: { sent: 13400, delivered: 12400, failed: 260 },
    email: { sent: 6200, delivered: 6080, failed: 45 },
    whatsapp: { sent: 6900, delivered: 6100, failed: 330 },
    ivr: { sent: 2980, delivered: 2260, failed: 58 },
  },
};

// ---- ML Predictions (fallback only; API serves live model output) ----
export const predictions: Prediction[] = [
  { id: 'pr-001', zoneId: 'rz-007', zoneName: 'Aizawl Escarpment', riskScore: 94, probability: 0.90, severity: 'severe', confidence: 0.94, timestamp: '2026-09-08T06:00:00Z', factors: ['Rainfall 92mm', 'Soil moisture 86%', 'Steep shale slopes', 'Historical activity'] },
  { id: 'pr-002', zoneId: 'rz-011', zoneName: 'Mangan NH-10 Corridor', riskScore: 89, probability: 0.85, severity: 'severe', confidence: 0.91, timestamp: '2026-09-08T06:00:00Z', factors: ['Teesta valley instability', 'Rainfall 74mm', 'NH-10 cut slopes'] },
  { id: 'pr-003', zoneId: 'rz-005', zoneName: 'Shillong Plateau Edge', riskScore: 75, probability: 0.70, severity: 'high', confidence: 0.88, timestamp: '2026-09-08T05:30:00Z', factors: ['Rainfall 68mm', 'Soil saturation 78%', 'Marginal slopes'] },
  { id: 'pr-004', zoneId: 'rz-009', zoneName: 'Kohima Ridge', riskScore: 68, probability: 0.63, severity: 'high', confidence: 0.85, timestamp: '2026-09-08T05:30:00Z', factors: ['Road cutting', 'Rainfall accumulation', 'Weathered phyllites'] },
  { id: 'pr-005', zoneId: 'rz-003', zoneName: 'Haflong Highlands', riskScore: 54, probability: 0.49, severity: 'high', confidence: 0.82, timestamp: '2026-09-08T05:00:00Z', factors: ['Soft geology', 'NH-6 cut slopes', 'Monsoon rain'] },
  { id: 'pr-006', zoneId: 'rz-008', zoneName: 'Lunglei Ghats', riskScore: 62, probability: 0.57, severity: 'high', confidence: 0.84, timestamp: '2026-09-08T05:00:00Z', factors: ['Friable shales', 'Rainfall 44mm', 'Steep gradients'] },
];

export const forecasts: Forecast[] = [
  { period: '24h', riskScore: 86, probability: 0.81, severity: 'high', rainfall: 95, factors: ['IMD: heavy rain over Meghalaya–Mizoram', 'Soil saturation high'] },
  { period: '48h', riskScore: 68, probability: 0.62, severity: 'high', rainfall: 55, factors: ['Rain expected to moderate', 'Saturation persists'] },
  { period: '72h', riskScore: 45, probability: 0.40, severity: 'moderate', rainfall: 22, factors: ['Rain decreasing', 'Gradual drainage expected'] },
];

export const aiRecommendations: AIRecommendation[] = [
  { id: 'rec-001', priority: 'high', title: 'Evacuation Readiness - Aizawl Escarpment', description: 'Prepare evacuation of Chanmari and adjoining marginal slopes. LHASA probability >90%.', targetZones: ['Aizawl Escarpment'], createdAt: '2026-09-08T06:00:00Z' },
  { id: 'rec-002', priority: 'high', title: 'Road Closure & Diversion - NH-10 Mangan', description: 'Keep NH-10 Mangan–Singhik closed; deploy traffic management at diversion points.', targetZones: ['Mangan NH-10 Corridor'], createdAt: '2026-09-08T06:00:00Z' },
  { id: 'rec-003', priority: 'medium', title: 'Enhanced Monitoring - Shillong Plateau Edge', description: 'Increase sensor polling frequency; deploy field inspection on marginal slopes.', targetZones: ['Shillong Plateau Edge'], createdAt: '2026-09-08T05:30:00Z' },
  { id: 'rec-004', priority: 'medium', title: 'Community Alert - Kohima Ridge', description: 'Issue community notices for NH-29 corridor settlements. Prepare shelter locations.', targetZones: ['Kohima Ridge'], createdAt: '2026-09-08T05:30:00Z' },
  { id: 'rec-005', priority: 'low', title: 'Sensor Maintenance - Haflong & Lunglei', description: 'Restore offline soil moisture sensors (HFL-S01, LGL-S01).', targetZones: ['Haflong Highlands', 'Lunglei Ghats'], createdAt: '2026-09-08T05:00:00Z' },
];

// ---- Historical Events (documented NER incidents) ----
export const historicalEvents: HistoricalEvent[] = [
  { id: 'he-001', name: 'Mangan NH-10 Blockade', date: '2025-07-11', district: 'Mangan', state: 'Sikkim', severity: 'severe', casualties: 3, displaced: 1200, description: 'Cloudburst-triggered slides on NH-10 isolated upper Teesta valley for days.', latitude: 27.52, longitude: 88.55, triggers: ['Cloudburst', 'Teesta valley instability'], areaAffected: 3.1 },
  { id: 'he-002', name: 'Aizawl Escarpment Slides', date: '2024-08-21', district: 'Aizawl', state: 'Mizoram', severity: 'severe', casualties: 5, displaced: 2100, description: 'Prolonged monsoon triggered multiple slope failures in the hill capital.', latitude: 23.73, longitude: 92.72, triggers: ['Extended monsoon', 'Shale weathering', 'Urban load'], areaAffected: 1.9 },
  { id: 'he-003', name: 'NH-6 Haflong Slips', date: '2024-07-28', district: 'Dima Hasao', state: 'Assam', severity: 'high', casualties: 2, displaced: 900, description: 'Repeated debris falls severed NH-6 (Silchar–Lumding) connectivity.', latitude: 25.16, longitude: 93.02, triggers: ['Soft geology', 'Road cut destabilization'], areaAffected: 1.4 },
  { id: 'he-004', name: 'Shillong Marginal Slope Failure', date: '2023-06-24', district: 'East Khasi Hills', state: 'Meghalaya', severity: 'high', casualties: 0, displaced: 600, description: 'Retaining wall and marginal slope collapse during the monsoon onset.', latitude: 25.57, longitude: 91.89, triggers: ['Extreme rainfall', 'Unplanned hill cutting'], areaAffected: 0.6 },
  { id: 'he-005', name: 'Kohima NH-29 Slip', date: '2022-07-09', district: 'Kohima', state: 'Nagaland', severity: 'moderate', casualties: 1, displaced: 450, description: 'Cut-slope failure along NH-29 restricted convoy movement.', latitude: 25.67, longitude: 94.10, triggers: ['Rainfall', 'Road cut slopes'], areaAffected: 0.5 },
  { id: 'he-006', name: 'Lunglei Town Slide', date: '2022-06-17', district: 'Lunglei', state: 'Mizoram', severity: 'moderate', casualties: 2, displaced: 380, description: 'Slope above the town road gave way after intense rain.', latitude: 22.88, longitude: 92.73, triggers: ['Friable shales', 'Intense rainfall'], areaAffected: 0.4 },
];

// ---- Emergency Zones ----
export const emergencyZones: EmergencyZone[] = [
  { id: 'ez-001', name: 'Aizawl Evacuation Zone', district: 'Aizawl', populationAtRisk: 126000, priorityRank: 1, severity: 'severe', infrastructureImpact: ['NH-6 spur', 'Water supply', 'Schools (14)', 'Civil hospital'], hospitals: 2, shelters: 8, latitude: 23.73, longitude: 92.72 },
  { id: 'ez-002', name: 'Mangan NH-10 Zone', district: 'Mangan', populationAtRisk: 22400, priorityRank: 2, severity: 'severe', infrastructureImpact: ['NH-10', 'Bridges (3)', 'Power lines'], hospitals: 1, shelters: 2, latitude: 27.52, longitude: 88.53 },
  { id: 'ez-003', name: 'Shillong Plateau Zone', district: 'East Khasi Hills', populationAtRisk: 143000, priorityRank: 3, severity: 'high', infrastructureImpact: ['NH-40', 'Water supply', 'Schools (9)'], hospitals: 3, shelters: 6, latitude: 25.57, longitude: 91.88 },
  { id: 'ez-004', name: 'Kohima Ridge Zone', district: 'Kohima', populationAtRisk: 96000, priorityRank: 4, severity: 'high', infrastructureImpact: ['NH-29', 'Road network', 'Schools (6)'], hospitals: 1, shelters: 4, latitude: 25.67, longitude: 94.11 },
  { id: 'ez-005', name: 'Haflong Corridor Zone', district: 'Dima Hasao', populationAtRisk: 81000, priorityRank: 5, severity: 'high', infrastructureImpact: ['NH-6', 'Railway (Lumding–Silchar)', 'Power grid'], hospitals: 1, shelters: 3, latitude: 25.16, longitude: 93.02 },
];

// ---- Analytics Data ----
export const riskTrends: RiskTrend[] = [
  { date: 'Sep 02', riskScore: 41, rainfall: 32, alerts: 4 },
  { date: 'Sep 03', riskScore: 47, rainfall: 41, alerts: 6 },
  { date: 'Sep 04', riskScore: 52, rainfall: 50, alerts: 8 },
  { date: 'Sep 05', riskScore: 58, rainfall: 62, alerts: 11 },
  { date: 'Sep 06', riskScore: 66, rainfall: 74, alerts: 14 },
  { date: 'Sep 07', riskScore: 74, rainfall: 86, alerts: 17 },
  { date: 'Sep 08', riskScore: 81, rainfall: 98, alerts: 21 },
];

export const districtRiskData: DistrictRisk[] = [
  { district: 'Aizawl', low: 0, moderate: 1, high: 3, severe: 3 },
  { district: 'Mangan', low: 1, moderate: 2, high: 3, severe: 2 },
  { district: 'East Khasi Hills', low: 1, moderate: 2, high: 3, severe: 1 },
  { district: 'Kohima', low: 2, moderate: 3, high: 2, severe: 1 },
  { district: 'Dima Hasao', low: 2, moderate: 3, high: 2, severe: 1 },
  { district: 'Lunglei', low: 2, moderate: 2, high: 2, severe: 0 },
  { district: 'Senapati', low: 3, moderate: 2, high: 1, severe: 0 },
  { district: 'West Garo Hills', low: 3, moderate: 2, high: 1, severe: 0 },
];

export const severityDistribution: SeverityDistribution[] = [
  { name: 'Low', value: 14, color: '#22c55e' },
  { name: 'Moderate', value: 24, color: '#eab308' },
  { name: 'High', value: 17, color: '#f97316' },
  { name: 'Severe', value: 8, color: '#ef4444' },
];

export const rainfallVsRisk: RiskTrend[] = [
  { date: 'Week 1', riskScore: 38, rainfall: 52, alerts: 4 },
  { date: 'Week 2', riskScore: 46, rainfall: 66, alerts: 7 },
  { date: 'Week 3', riskScore: 58, rainfall: 84, alerts: 11 },
  { date: 'Week 4', riskScore: 67, rainfall: 98, alerts: 15 },
  { date: 'Week 5', riskScore: 74, rainfall: 108, alerts: 19 },
  { date: 'Week 6', riskScore: 81, rainfall: 116, alerts: 22 },
];
