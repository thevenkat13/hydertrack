// server.js
// HyderTrack backend using real Hyderabad Metro topology, realistic timings, station-count fares, and real rail distance.

const express = require('express');
const cors = require('cors');
const { PriorityQueue } = require('@datastructures-js/priority-queue');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Real Hyderabad Metro corridors (order matters). Coordinates included where commonly published.
// Interchanges: Ameerpet (Red <-> Blue), MG Bus Station (Red <-> Green), Parade Ground (Blue) <-> JBS Parade Ground (Green).
const corridors = {
  "Red Line": [
    { name: "Miyapur", lat: 17.4948, lon: 78.3973 },
    { name: "JNTU College", lat: 17.4895, lon: 78.4029 },
    { name: "KPHB Colony", lat: 17.4842, lon: 78.4087 },
    { name: "Kukatpally", lat: 17.4789, lon: 78.4144 },
    { name: "Balanagar", lat: 17.4736, lon: 78.4201 },
    { name: "Moosapet", lat: 17.4684, lon: 78.4258 },
    { name: "Bharat Nagar", lat: 17.4631, lon: 78.4315 },
    { name: "Erragadda", lat: 17.4578, lon: 78.4371 },
    { name: "ESI Hospital", lat: 17.4525, lon: 78.4428 },
    { name: "SR Nagar", lat: 17.4472, lon: 78.4485 },
    { name: "Ameerpet", lat: 17.43782, lon: 78.446865 }, // Interchange (Red/Blue)
    { name: "Punjagutta", lat: 17.4366, lon: 78.4599 },
    { name: "Irrum Manzil", lat: 17.4314, lon: 78.4656 },
    { name: "Khairatabad", lat: 17.4261, lon: 78.4713 },
    { name: "Lakdi-ka-pul", lat: 17.4208, lon: 78.4770 },
    { name: "Assembly", lat: 17.4155, lon: 78.4827 },
    { name: "Nampally", lat: 17.4102, lon: 78.4884 },
    { name: "Gandhi Bhavan", lat: 17.4050, lon: 78.4941 },
    { name: "Osmania Medical College", lat: 17.3997, lon: 78.4998 },
    { name: "MG Bus Station", lat: 17.38594, lon: 78.48125 }, // Interchange (Red/Green)
    { name: "Malakpet", lat: 17.3891, lon: 78.5111 },
    { name: "New Market", lat: 17.3838, lon: 78.5168 },
    { name: "Musarambagh", lat: 17.3785, lon: 78.5225 },
    { name: "Dilsukhnagar", lat: 17.3733, lon: 78.5282 },
    { name: "Chaitanyapuri", lat: 17.3680, lon: 78.5339 },
    { name: "Victoria Memorial", lat: 17.3627, lon: 78.5396 },
    { name: "LB Nagar", lat: 17.3540, lon: 78.5451 }
  ],
  "Blue Line": [
    { name: "Nagole", lat: 17.3892, lon: 78.5504 },
    { name: "Uppal", lat: 17.4030, lon: 78.5590 },
    { name: "Survey of India", lat: 17.4020, lon: 78.5475 },
    { name: "NGRI", lat: 17.4027, lon: 78.5395 },
    { name: "Habsiguda", lat: 17.4073, lon: 78.5330 },
    { name: "Tarnaka", lat: 17.4222, lon: 78.5325 },
    { name: "Mettuguda", lat: 17.4339, lon: 78.5205 },
    { name: "Secunderabad East", lat: 17.4390, lon: 78.5076 },
    { name: "Parade Ground", lat: 17.4466, lon: 78.5013 }, // Interchange via JBS to Green
    { name: "Paradise", lat: 17.4442, lon: 78.4872 },
    { name: "Rasoolpura", lat: 17.4406, lon: 78.4783 },
    { name: "Prakash Nagar", lat: 17.4365, lon: 78.4691 },
    { name: "Begumpet", lat: 17.4349, lon: 78.4597 },
    { name: "Ameerpet", lat: 17.43782, lon: 78.446865 }, // Interchange (Blue/Red)
    { name: "Madhura Nagar", lat: 17.4371, lon: 78.4370 },
    { name: "Yousufguda", lat: 17.4333, lon: 78.4300 },
    { name: "Jubilee Hills Check Post", lat: 17.4350, lon: 78.4209 },
    { name: "Peddamma Gudi", lat: 17.4374, lon: 78.4140 },
    { name: "Madhapur", lat: 17.4415, lon: 78.4029 },
    { name: "Durgam Cheruvu", lat: 17.4426, lon: 78.3958 },
    { name: "Hitec City", lat: 17.4455, lon: 78.3877 },
    { name: "Raidurg", lat: 17.4408, lon: 78.3816 }
  ],
  "Green Line": [
    { name: "JBS Parade Ground", lat: 17.4466, lon: 78.5013 },
    { name: "Secunderabad West", lat: 17.4451, lon: 78.4988 },
    { name: "Gandhi Hospital", lat: 17.4380, lon: 78.4937 },
    { name: "Musheerabad", lat: 17.4303, lon: 78.4921 },
    { name: "RTC X Roads", lat: 17.4213, lon: 78.4896 },
    { name: "Chikkadpally", lat: 17.4130, lon: 78.4882 },
    { name: "Narayanguda", lat: 17.4049, lon: 78.4871 },
    { name: "Sultan Bazar", lat: 17.3965, lon: 78.4852 },
    { name: "MG Bus Station", lat: 17.38594, lon: 78.48125 } // Interchange (Green/Red)
  ]
};

// Flatten to station array with line metadata
const metroStationsData = [];
let idCounter = 1;
for (const [line, stations] of Object.entries(corridors)) {
  stations.forEach(s => {
    metroStationsData.push({
      id: idCounter++,
      name: s.name,
      latitude: s.lat ?? null,
      longitude: s.lon ?? null,
      line_name: line,
      line_color: line === "Red Line" ? "#E41E26" : line === "Blue Line" ? "#0078C1" : "#008B45"
    });
  });
}

// Maps for graph
const stationMap = new Map();
const metroGraph = new Map();

const keyOf = (name, line) => `${name}|${line}`;

// Initialize nodes
metroStationsData.forEach(s => {
  const key = keyOf(s.name, s.line_name);
  stationMap.set(key, s);
  metroGraph.set(key, []);
});

// Build contiguous ride edges with fixed per-hop time including dwell
const DEFAULT_HOP_MIN = 2.5; // minutes per adjacent-station ride incl. dwell

for (const [line, orderedStations] of Object.entries(corridors)) {
  for (let i = 0; i < orderedStations.length - 1; i++) {
    const a = keyOf(orderedStations[i].name, line);
    const b = keyOf(orderedStations[i + 1].name, line);
    if (metroGraph.has(a) && metroGraph.has(b)) {
      metroGraph.get(a).push({ node: b, time: DEFAULT_HOP_MIN, type: 'ride' });
      metroGraph.get(b).push({ node: a, time: DEFAULT_HOP_MIN, type: 'ride' });
    }
  }
}

// Add interchange transfers with realistic walk penalties
const addTransfer = (nameA, lineA, nameB, lineB, minutes) => {
  const a = keyOf(nameA, lineA);
  const b = keyOf(nameB, lineB);
  if (metroGraph.has(a) && metroGraph.has(b)) {
    metroGraph.get(a).push({ node: b, time: minutes, type: 'transfer' });
    metroGraph.get(b).push({ node: a, time: minutes, type: 'transfer' });
  }
};

// Interchanges
addTransfer("Ameerpet", "Red Line", "Ameerpet", "Blue Line", 2);
addTransfer("MG Bus Station", "Red Line", "MG Bus Station", "Green Line", 2);
addTransfer("Parade Ground", "Blue Line", "JBS Parade Ground", "Green Line", 2);

// Great-circle distance in km between two coordinates
const haversineKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 == null || lon1 == null ||
    lat2 == null || lon2 == null
  ) return 0;
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Dijkstra shortest-time path
const findShortestPath = (originName, destinationName) => {
  const times = new Map();
  const prev = new Map();
  const pq = new PriorityQueue((a, b) => a.time < b.time);

  // normalize names for matching
  const norm = s => s.trim().toLowerCase();

  // Initialize distances
  metroGraph.forEach((_, key) => times.set(key, Infinity));

  const startNodes = metroStationsData
    .filter(s => norm(s.name) === norm(originName))
    .map(s => keyOf(s.name, s.line_name));

  const targetSet = new Set(
    metroStationsData
      .filter(s => norm(s.name) === norm(destinationName))
      .map(s => keyOf(s.name, s.line_name))
  );

  if (startNodes.length === 0 || targetSet.size === 0) {
    return { path: [], time: Infinity, hops: 0 };
  }

  startNodes.forEach(n => {
    times.set(n, 0);
    pq.enqueue({ node: n, time: 0 });
  });

  let finalNode = null;

  while (!pq.isEmpty()) {
    const { node: u } = pq.dequeue();

    if (targetSet.has(u)) {
      finalNode = u;
      break;
    }

    const edges = metroGraph.get(u) || [];
    for (const edge of edges) {
      const v = edge.node;
      const newTime = times.get(u) + edge.time;
      if (newTime < (times.get(v) ?? Infinity)) {
        times.set(v, newTime);
        prev.set(v, u);
        pq.enqueue({ node: v, time: newTime });
      }
    }
  }

  if (!finalNode) return { path: [], time: Infinity, hops: 0 };

  // Reconstruct path
  const path = [];
  let curr = finalNode;
  while (curr) {
    path.unshift(stationMap.get(curr));
    curr = prev.get(curr);
  }

  // Count distinct station transitions (compress transfers with same station name)
  const compressed = path.filter((s, i) => i === 0 || s.name !== path[i - 1].name);
  const hops = Math.max(0, compressed.length - 1);

  return { path, time: times.get(finalNode), hops };
};

// Turn-by-turn instructions
const generateInstructions = (path) => {
  if (path.length < 2) return [];
  const out = [];
  let entry = path[0];
  let stops = 0;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const isTransfer = prev.name === curr.name && prev.line_name !== curr.line_name;

    if (isTransfer) {
      if (stops > 0) {
        out.push({ type: 'ride', from: entry.name, to: prev.name, line: entry.line_name, stations: stops });
      }
      out.push({ type: 'change', station: curr.name, to_line: curr.line_name });
      entry = curr;
      stops = 0;
    } else {
      stops += 1;
    }
  }

  if (stops > 0) {
    out.push({ type: 'ride', from: entry.name, to: path[path.length - 1].name, line: entry.line_name, stations: stops });
  }

  return out.filter(inst => (inst.type === 'ride' && inst.stations >= 1) || inst.type === 'change');
};

// Sum only ride distances between consecutive stations on the path.
// Transfers (same station name on different lines) contribute 0 distance.
const computeRideDistanceKm = (path) => {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const isTransfer = prev.name === curr.name && prev.line_name !== curr.line_name;
    if (isTransfer) continue; // walking inside station, ignore for rail distance
    km += haversineKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  }
  return km;
};

// Station-count-based fare slab (single journey token)
const calculateFareByStations = (stationHops) => {
  if (stationHops <= 2) return 10;
  if (stationHops <= 4) return 15;
  if (stationHops <= 6) return 25;
  if (stationHops <= 8) return 30;
  if (stationHops <= 10) return 35;
  if (stationHops <= 14) return 40;
  if (stationHops <= 18) return 45;
  if (stationHops <= 22) return 50;
  if (stationHops <= 26) return 55;
  if (stationHops <= 30) return 60;
  return 65;
};

// API: list stations
app.get('/api/metro-stations', (_, res) => {
  res.json(metroStationsData);
});

// API: directions
app.post('/api/directions', (req, res) => {
  const { origin, destination } = req.body || {};
  if (!origin || !destination || origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
    return res.status(400).json({ error: 'Origin and destination are invalid.' });
  }

  try {
    const { path, time, hops } = findShortestPath(origin, destination);
    if (!path || path.length === 0 || !isFinite(time)) {
      return res.status(404).json({ error: 'No metro route found between these stations.' });
    }

    const instructions = generateInstructions(path);
    const fare = calculateFareByStations(hops);
    const distanceKm = computeRideDistanceKm(path);

    res.json({
      path,
      totalStations: hops + 1,                    // includes origin
      estimatedTime: Math.round(time),            // minutes
      fare,
      distance: Math.round(distanceKm * 10) / 10, // km, 1 decimal
      instructions
    });
  } catch (err) {
    console.error('Error calculating route:', err);
    return res.status(500).json({ error: 'Failed to calculate route.' });
  }
});

app.listen(PORT, () => {
  console.log(`HyderTrack Backend server running on http://localhost:${PORT}`);
});
