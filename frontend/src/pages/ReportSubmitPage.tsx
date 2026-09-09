import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import {
  Upload, MapPin, Camera, X, CheckCircle, AlertTriangle, Wifi, WifiOff,
} from 'lucide-react';
import type { IncidentType } from '../types';

const incidentTypes: { value: IncidentType; label: string }[] = [
  { value: 'crack', label: 'Ground Crack' },
  { value: 'road_blockage', label: 'Road Blockage' },
  { value: 'rockfall', label: 'Rockfall' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'slope_movement', label: 'Slope Movement' },
  { value: 'landslide', label: 'Landslide' },
];

const districts = [
  'West Kameng', 'Papum Pare', 'Dima Hasao', 'Senapati',
  'East Khasi Hills', 'West Garo Hills', 'Aizawl', 'Lunglei',
  'Kohima', 'Phek', 'Mangan', 'Gangtok', 'Dhalai',
];

export function ReportSubmitPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<IncidentType>('crack');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    reportService.getOfflineQueueCount().then(setQueueCount);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages = Array.from(files).map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!district || !latitude || !longitude || !description) return;
    setSubmitting(true);
    setQueueCount((c) => c + 1);
    try {
      await reportService.submitReport({
        type,
        description,
        district,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        images: [],
      });
      setSubmitted(true);
    } catch {
      // reportService handles offline queueing automatically
    } finally {
      setSubmitting(false);
      reportService.getOfflineQueueCount().then(setQueueCount);
    }
  };

  if (submitting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <svg className="w-12 h-12 animate-spin text-aztec mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Submitting your report...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Your incident report has been received and will be reviewed by our team.
            You will be notified when the status changes.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2 bg-aztec text-white text-sm font-medium rounded-lg"
            >
              View Reports
            </button>
            <button
              onClick={() => { setSubmitted(false); setDescription(''); setImages([]); }}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Submit Report"
        subtitle="Report a landslide-related incident in your area"
        actions={
          <div className="flex items-center gap-3">
            {queueCount > 0 && (
              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                {queueCount} queued
              </span>
            )}
            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${online ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {online ? 'Online' : 'Offline — reports will queue'}
            </div>
          </div>
        }
      />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Incident Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Incident Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {incidentTypes.map((it) => (
                <button
                  key={it.value}
                  type="button"
                  onClick={() => setType(it.value)}
                  className={`p-3 rounded-lg border-2 text-sm text-left transition-all ${
                    type === it.value
                      ? 'border-aztec bg-aztec/5 text-aztec font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>

          {/* District */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">District *</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capri/30 focus:border-capri"
              required
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe what you observed (cracks, water levels, damage, etc.)"
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capri/30 focus:border-capri resize-none"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Location *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Latitude"
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capri/30 focus:border-capri"
                required
              />
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Longitude"
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-capri/30 focus:border-capri"
                required
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              Upload Images
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-capri/30 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Drag & drop images or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                style={{ position: 'relative' }}
              />
            </div>

            {/* Image Preview */}
            {images.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {images.map((img, index) => (
                  <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!district || !latitude || !longitude || !description}
              className="px-6 py-2.5 bg-aztec text-white font-medium rounded-lg text-sm hover:bg-aztec-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Submit Report
            </button>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="px-6 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
