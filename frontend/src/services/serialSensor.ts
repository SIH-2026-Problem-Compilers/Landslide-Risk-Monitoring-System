/**
 * USB-serial sensor bridge (Web Serial API).
 *
 * Lets the dashboard read a physically connected board (ESP32, Arduino, …)
 * straight from Chrome — no extra server or Python bridge needed. The sketch
 * prints one JSON line per reading cycle; this module parses either
 *
 *   {"station_id":"ESP32-A01","readings":[{"sensor_type":"soil_moisture","value":42.1,"unit":"%"}]}
 *   {"soil":42.1,"temperature":28.4,"humidity":61}
 *   SOIL:42.1,TEMP:28.4,HUM:61
 *
 * and hands the packet to the caller, which pairs it with the laptop's GPS
 * position before posting it to the API.
 */

export interface SerialReading {
  sensor_type: string;
  value: number;
  unit: string;
}

export interface SerialPacket {
  stationId?: string;
  name?: string;
  /** Zone configured in the sketch; used when no GPS position is available. */
  zoneId?: string;
  /** Present only when the board has its own GPS module. */
  latitude?: number;
  longitude?: number;
  readings: SerialReading[];
}

export interface SerialConnection {
  stop: () => Promise<void>;
}

interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
}

interface SerialApi {
  requestPort: () => Promise<SerialPortLike>;
  getPorts: () => Promise<SerialPortLike[]>;
}

const TYPE_ALIASES: Record<string, { type: string; unit: string }> = {
  soil: { type: 'soil_moisture', unit: '%' },
  soil_moisture: { type: 'soil_moisture', unit: '%' },
  soilmoisture: { type: 'soil_moisture', unit: '%' },
  moisture: { type: 'soil_moisture', unit: '%' },
  rain: { type: 'rainfall', unit: 'mm' },
  rainfall: { type: 'rainfall', unit: 'mm' },
  temp: { type: 'temperature', unit: '°C' },
  temperature: { type: 'temperature', unit: '°C' },
  hum: { type: 'humidity', unit: '%' },
  humidity: { type: 'humidity', unit: '%' },
  tilt: { type: 'tilt', unit: '°' },
  seismic: { type: 'seismic', unit: 'RMS' },
  battery: { type: 'battery', unit: '%' },
  batt: { type: 'battery', unit: '%' },
};

function serialApi(): SerialApi | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { serial?: SerialApi }).serial;
}

export function serialSupported(): boolean {
  return serialApi() !== undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeType(raw: string): { type: string; unit: string } | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return TYPE_ALIASES[key] ?? null;
}

function makeReading(rawType: string, rawValue: unknown, rawUnit?: unknown): SerialReading | null {
  const mapped = normalizeType(rawType);
  const value = toNumber(rawValue);
  if (!mapped || value === undefined) return null;
  return {
    sensor_type: mapped.type,
    value,
    unit: typeof rawUnit === 'string' && rawUnit ? rawUnit : mapped.unit,
  };
}

function parseObject(input: Record<string, unknown>): SerialPacket | null {
  const station =
    input.station && typeof input.station === 'object'
      ? (input.station as Record<string, unknown>)
      : {};
  const stationIdRaw =
    input.station_id ?? input.stationId ?? input.device_id ?? station.station_id ?? station.stationId;
  const nameRaw = input.name ?? input.station_name ?? station.name;
  const stationId = typeof stationIdRaw === 'string' && stationIdRaw.trim() ? stationIdRaw.trim() : undefined;
  const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : undefined;
  const latitude = toNumber(input.latitude ?? station.latitude);
  const longitude = toNumber(input.longitude ?? station.longitude);
  const zoneRaw = input.zone_id ?? station.zone_id;
  const zoneId = typeof zoneRaw === 'string' && zoneRaw.trim() ? zoneRaw.trim() : undefined;

  const readings: SerialReading[] = [];
  const list = Array.isArray(input.readings)
    ? input.readings
    : Array.isArray(input.sensors)
      ? input.sensors
      : null;

  if (list) {
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const typeRaw = item.sensor_type ?? item.type ?? item.sensor ?? item.metric;
      if (typeof typeRaw !== 'string') continue;
      const reading = makeReading(typeRaw, item.value, item.unit);
      if (reading) readings.push(reading);
    }
  } else {
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'object' && value !== null) continue;
      const reading = makeReading(key, value);
      if (reading) readings.push(reading);
    }
  }

  if (readings.length === 0) return null;
  return {
    stationId,
    name,
    zoneId,
    latitude: latitude !== undefined && longitude !== undefined ? latitude : undefined,
    longitude: latitude !== undefined && longitude !== undefined ? longitude : undefined,
    readings,
  };
}

function parseKeyValueLine(line: string): SerialPacket | null {
  const readings: SerialReading[] = [];
  for (const part of line.split(/[,;]+/)) {
    const match = part.match(/^\s*([A-Za-z_][A-Za-z0-9_ ]*)\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*([%°C]*)\s*$/i);
    if (!match) continue;
    const reading = makeReading(match[1], match[2], match[3] || undefined);
    if (reading) readings.push(reading);
  }
  if (readings.length === 0) return null;
  return { readings };
}

/** Parse a single serial line; returns null for boot logs / debug output. */
export function parseSerialLine(line: string): SerialPacket | null {
  const text = line.trim();
  if (!text) return null;

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
      return parseObject(parsed);
    } catch {
      return null;
    }
  }

  // Older firmware builds print human-readable log lines such as
  //   [soil] 45.0 %  [dht] 27.0 C / 64.0 %
  // Parse those too so an already-flashed board is detected without reflashing.
  const legacy: SerialReading[] = [];
  const soil = text.match(/\[soil\]\s*(-?\d+(?:\.\d+)?)/i);
  if (soil) {
    const reading = makeReading('soil_moisture', soil[1]);
    if (reading) legacy.push(reading);
  }
  const dht = text.match(/\[dht\]\s*(-?\d+(?:\.\d+)?)\s*C\s*\/\s*(-?\d+(?:\.\d+)?)/i);
  if (dht) {
    const temp = makeReading('temperature', dht[1]);
    const humidity = makeReading('humidity', dht[2]);
    if (temp) legacy.push(temp);
    if (humidity) legacy.push(humidity);
  }
  if (legacy.length > 0) return { readings: legacy };

  return parseKeyValueLine(text);
}

/**
 * Ask the user for a serial port and stream parsed packets until stopped.
 * Must be called from a user gesture (button click) by browser policy.
 */
export async function connectSerialStation(
  onPacket: (packet: SerialPacket) => void,
  baudRate = 115200,
): Promise<SerialConnection> {
  const serial = serialApi();
  if (!serial) {
    throw new Error('Web Serial is not available — use Chrome or Edge on localhost.');
  }

  const port = await serial.requestPort();
  await port.open({ baudRate });
  if (!port.readable) {
    await port.close();
    throw new Error('Serial port opened but no readable stream was available.');
  }

  const reader = port.readable.getReader();
  const decoder = new TextDecoder();
  let stopped = false;
  let buffer = '';

  const readLoop = (async () => {
    try {
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const packet = parseSerialLine(line);
          if (packet) onPacket(packet);
        }
      }
    } catch {
      // Port removed / permission revoked — the caller's status shows it.
    }
  })();

  return {
    stop: async () => {
      stopped = true;
      try {
        await reader.cancel();
      } catch {
        /* already closed */
      }
      try {
        await readLoop;
      } catch {
        /* ignore */
      }
      try {
        await port.close();
      } catch {
        /* already closed */
      }
    },
  };
}
