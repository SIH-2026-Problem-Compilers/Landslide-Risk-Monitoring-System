// ==========================================
// TypeScript Interfaces for Landslide Monitoring System
// ==========================================

// ---- Auth & Users ----
export type UserRole = 'admin' | 'disaster_officer' | 'citizen';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  district?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

// ---- Dashboard ----
export interface DashboardSummary {
  totalActiveAlerts: number;
  highRiskZones: number;
  moderateRiskZones: number;
  sensorStationsOnline: number;
  /** Total registered stations (optional for older API responses). */
  sensorStationsTotal?: number;
  roadsBlocked: number;
  citizenReports: number;
  lastUpdated: string;
}

// ---- Risk Zones ----
export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface RiskZone {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  riskScore: number;
  severity: RiskLevel;
  lastUpdated: string;
  population?: number;
  description?: string;
  factors: string[];
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

// ---- Alerts ----
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'archived';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  district: string;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  source: string;
  translations?: Record<string, { title: string; message: string }>;
}

// ---- Sensors ----
export type SensorStatus = 'online' | 'offline' | 'maintenance' | 'warning';

export type SensorLocationSource = 'sensor_gps' | 'laptop_gps' | 'manual' | 'zone' | 'unknown';

export interface Sensor {
  id: string;
  /** Station this channel belongs to (one ESP32 = one station, many channels). */
  stationId: string;
  name: string;
  type: 'soil_moisture' | 'rainfall' | 'temperature' | 'humidity' | 'tilt' | 'seismic' | 'battery';
  status: SensorStatus;
  latitude: number | null;
  longitude: number | null;
  district: string;
  state?: string;
  zoneId?: string;
  lastReading: number;
  unit: string;
  lastUpdated: string;
  /** Seconds since the station's last push (null if unknown). */
  ageSeconds?: number | null;
  /** Where the marker position came from — a sensor GPS or the laptop fallback. */
  locationSource: SensorLocationSource;
  locationAccuracyM?: number | null;
  /** True when this station is the locally connected / laptop-GPS one. */
  isLocal?: boolean;
  /** Battery telemetry % — only present when a station actually reports it. */
  batteryLevel?: number;
}

export interface SensorHeartbeatResult {
  ok: boolean;
  latitude: number;
  longitude: number;
  zoneId: string;
  zoneName: string;
  distanceKm: number;
  accuracyM: number | null;
  recordedAt: string;
}

export interface LaptopLocation {
  active: boolean;
  latitude?: number;
  longitude?: number;
  accuracyM?: number | null;
  source?: SensorLocationSource;
  zoneId?: string;
  zoneName?: string;
  distanceKm?: number;
  recordedAt?: string;
}

export interface StationReadingInput {
  sensor_type: string;
  value: number;
  unit?: string;
  channel?: string;
}

export interface StationTelemetryInput {
  station_id: string;
  name?: string;
  zone_id?: string;
  latitude?: number;
  longitude?: number;
  location_source?: SensorLocationSource;
  location_accuracy_m?: number;
  battery_level?: number;
}

export interface SensorReading {
  timestamp: string;
  value: number;
  unit: string;
}

// ---- Reports ----
export type IncidentType = 'crack' | 'road_blockage' | 'rockfall' | 'flooding' | 'slope_movement' | 'landslide';
export type ReportStatus = 'pending' | 'verified' | 'investigating' | 'resolved' | 'dismissed';

export interface CitizenReport {
  id: string;
  reporterName: string;
  reporterPhone?: string;
  type: IncidentType;
  district: string;
  description: string;
  latitude: number;
  longitude: number;
  status: ReportStatus;
  images: string[];
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFormData {
  type: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  district: string;
  images: File[];
}

// ---- Roads ----
export type RoadStatus = 'open' | 'partially_blocked' | 'fully_blocked';

export interface Road {
  id: string;
  name: string;
  from: string;
  to: string;
  district: string;
  status: RoadStatus;
  reason?: string;
  lastUpdated: string;
  alternativeRoute?: string;
  coordinates: [number, number][];
}

// ---- Notifications ----
export type NotificationChannel = 'sms' | 'email' | 'whatsapp' | 'ivr';

export interface Notification {
  id: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  recipients: number;
  sent: number;
  delivered: number;
  failed: number;
  sentAt: string;
  status: 'sent' | 'delivered' | 'partial' | 'failed';
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  byChannel: Record<NotificationChannel, { sent: number; delivered: number; failed: number }>;
}

// ---- ML Predictions ----
export interface Prediction {
  id: string;
  zoneId: string;
  zoneName: string;
  riskScore: number;
  probability: number;
  severity: RiskLevel;
  confidence: number;
  timestamp: string;
  factors: string[];
}

export interface Forecast {
  period: '24h' | '48h' | '72h';
  riskScore: number;
  probability: number;
  severity: RiskLevel;
  /** Expected rainfall in mm. Null when the data source does not report it (e.g. LHASA hazard output). */
  rainfall: number | null;
  factors: string[];
}

export interface AIRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  targetZones: string[];
  createdAt: string;
}

// ---- Historical Events ----
export interface HistoricalEvent {
  id: string;
  name: string;
  date: string;
  district: string;
  state: string;
  severity: RiskLevel;
  casualties: number;
  displaced: number;
  description: string;
  latitude: number;
  longitude: number;
  triggers: string[];
  areaAffected: number;
}

// ---- Emergency Response ----
export interface EmergencyZone {
  id: string;
  name: string;
  district: string;
  populationAtRisk: number;
  priorityRank: number;
  severity: RiskLevel;
  infrastructureImpact: string[];
  hospitals: number;
  shelters: number;
  latitude: number;
  longitude: number;
}

// ---- GIS Map ----
export interface MapLayer {
  id: string;
  name: string;
  type: 'risk_heatmap' | 'villages' | 'roads' | 'hospitals' | 'schools' | 'bridges' | 'sensors';
  visible: boolean;
}

// ---- Data Cleaning Status ----
export interface DataCleaningStatus {
  weather: 'idle' | 'processing' | 'completed' | 'error';
  sensor: 'idle' | 'processing' | 'completed' | 'error';
  satellite: 'idle' | 'processing' | 'completed' | 'error';
  lastCleaned: string;
}

// ---- Analytics ----
export interface RiskTrend {
  date: string;
  riskScore: number;
  rainfall: number;
  alerts: number;
}

export interface DistrictRisk {
  district: string;
  low: number;
  moderate: number;
  high: number;
  severe: number;
}

export interface SeverityDistribution {
  name: string;
  value: number;
  color: string;
}
