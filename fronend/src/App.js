// src/App.js
// This is the main React component for the HyderTrack frontend.

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import ReactDOMServer from 'react-dom/server';

// --- LEAFLET ICON FIX ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- SVG ICONS for the UI ---
const IconOrigin = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>;
const IconDestination = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5c0 3.15 4.5 9.5 4.5 9.5s4.5-6.35 4.5-9.5A4.5 4.5 0 0 0 8 1.5zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>;
const IconLocation = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A31.493 31.493 0 0 1 8 14.58a31.481 31.481 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94zM8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10z"/><path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>;
const IconSwap = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/></svg>;

// --- New Metro Logo ---
const HyderTrackLogo = () => (
    <div className="logo-container">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="logo-metro-body"/>
            <path d="M4 10H20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="logo-metro-stripe"/>
            <path d="M8 14H8.01" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="logo-metro-lights"/>
            <path d="M16 14H16.01" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="logo-metro-lights"/>
        </svg>
        <span className="logo-text">
            <span className="logo-hyder">Hyder</span><span className="logo-track">Track</span>
        </span>
        <span className="logo-version">LIVE</span>
    </div>
);

// React Component to auto-fit map bounds
const FitBounds = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
};

// Main App Component
function App() {
    const [metroStations, setMetroStations] = useState([]);
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [journeyDetails, setJourneyDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [routePath, setRoutePath] = useState(null);
    const [allStationsData, setAllStationsData] = useState([]);
    const [showAllStations, setShowAllStations] = useState(true);

    const API_BASE_URL = 'https://hydertrack-backend.onrender.com';

    useEffect(() => {
        const fetchMetroStations = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/metro-stations`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setAllStationsData(data);
                const uniqueStations = Array.from(new Map(data.map(item => [item.name, item])).values());
                const sortedStations = uniqueStations.sort((a, b) => a.name.localeCompare(b.name));
                setMetroStations(sortedStations);
                if (sortedStations.length > 1) {
                    setOrigin('Bharat Nagar');
                    setDestination('Raidurg');
                }
            } catch (err) {
                setError('Could not connect to the backend server.');
            }
        };
        fetchMetroStations();
    }, []);

    const handlePlanJourney = async () => {
        setRoutePath(null);
        setJourneyDetails(null);
        if (!origin || !destination || origin === destination) {
            setError('Please select a valid origin and destination.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/directions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin, destination }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setJourneyDetails(data);
            const pathCoordinates = data.path.map(station => [station.latitude, station.longitude]);
            setRoutePath(pathCoordinates);
            setShowAllStations(false); // Hide stations on successful plan
        } catch (err) {
            setError(`Failed to calculate route: ${err.message}`);
            setShowAllStations(true); // Re-show stations if there's an error
        } finally {
            setLoading(false);
        }
    };
    
    const handleSwapStations = () => {
        setOrigin(destination);
        setDestination(origin);
    };

    const handleClearRoute = () => {
        setJourneyDetails(null);
        setRoutePath(null);
        setError(null);
        setShowAllStations(true); // Show all stations again
    };

    const mapBounds = useMemo(() => {
        if (routePath && routePath.length > 0) return L.latLngBounds(routePath);
        const originStation = metroStations.find(s => s.name === origin);
        const destinationStation = metroStations.find(s => s.name === destination);
        if (originStation && destinationStation) {
            return L.latLngBounds([originStation.latitude, originStation.longitude], [destinationStation.latitude, destinationStation.longitude]);
        }
        return L.latLngBounds([17.3850, 78.4867], [17.4948, 78.3973]);
    }, [origin, destination, metroStations, routePath]);
    
    const createStationIcon = (station) => L.divIcon({
        className: 'custom-station-icon',
        html: `<div class="station-marker" style="background-color: ${station.line_color};"></div>`,
        iconSize: [12, 12],
    });
    
    const originStation = useMemo(() => metroStations.find(s => s.name === origin), [metroStations, origin]);
    const destinationStation = useMemo(() => metroStations.find(s => s.name === destination), [metroStations, destination]);

    const originIcon = L.divIcon({
        html: ReactDOMServer.renderToString(<IconOrigin />),
        className: 'custom-map-icon origin-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });

    const destinationIcon = L.divIcon({
        html: ReactDOMServer.renderToString(<IconDestination />),
        className: 'custom-map-icon destination-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });

    return (
        <div className="app-grid">
            <header className="main-header">
                <HyderTrackLogo />
                <div className="header-info">
                    <span>STATUS: OPERATIONAL</span>
                    <span>DATA: ESTIMATED</span>
                </div>
            </header>
            
            <div className="control-panel">
                <div className="input-group-wrapper">
                    <div className="input-group">
                        <label htmlFor="origin"><IconOrigin /> ORIGIN</label>
                        <select id="origin" value={origin} onChange={e => setOrigin(e.target.value)} disabled={metroStations.length === 0}>
                            {metroStations.map(s => <option key={`o-${s.id}`} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    <button onClick={handleSwapStations} className="swap-button" title="Swap origin and destination"><IconSwap/></button>
                    <div className="input-group">
                        <label htmlFor="destination"><IconDestination /> DESTINATION</label>
                        <select id="destination" value={destination} onChange={e => setDestination(e.target.value)} disabled={metroStations.length === 0}>
                            {metroStations.map(s => <option key={`d-${s.id}`} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="button-group">
                    <button className="execute-button" onClick={handlePlanJourney} disabled={loading || metroStations.length === 0}>
                        {loading ? 'CALCULATING...' : 'PLAN JOURNEY'}
                    </button>
                    {journeyDetails && (
                        <button className="clear-button" onClick={handleClearRoute}>
                            CLEAR
                        </button>
                    )}
                </div>
            </div>
            
            <main className="results-panel">
                <h2 className="panel-header">
                    Route Details
                    {journeyDetails && origin && destination && 
                        <span className="route-header-stations">: {origin} &rarr; {destination}</span>
                    }
                </h2>
                <div className="panel-content">
                    {error && <p className="error-message">{error}</p>}
                    {loading && <p className="loader">CALCULATING METRO ROUTE...</p>}
                    {!loading && !error && !journeyDetails && <p className="placeholder">SELECT ORIGIN & DESTINATION TO BEGIN.</p>}
                    {journeyDetails && (
                        <div className="journey-details-container">
                            <div className="journey-summary">
                                <div><span>Stations</span><strong>{journeyDetails.totalStations}</strong></div>
                                <div><span>Time</span><strong>~{journeyDetails.estimatedTime} min</strong></div>
                                <div><span>Distance</span><strong>~{journeyDetails.distance} KM</strong></div>
                                <div><span>Est. Fare</span><strong>~₹{journeyDetails.fare}</strong></div>
                            </div>
                            <div className="journey-instructions">
                                {journeyDetails.instructions.map((inst, index) => {
                                    if(inst.type === 'ride') {
                                        const lineColor = allStationsData.find(s=>s.line_name === inst.line)?.line_color || '#cccccc';
                                        return (
                                            <div key={index} className="instruction-card ride">
                                                <div className="line-indicator" style={{backgroundColor: lineColor}}></div>
                                                <div className="instruction-content">
                                                    <p>Board at <strong>{inst.from}</strong></p>
                                                    <p>Ride {inst.stations} stops on the <strong style={{color: lineColor}}>{inst.line}</strong></p>
                                                    <p>Get down at <strong>{inst.to}</strong></p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    if(inst.type === 'change') {
                                        const toLineColor = allStationsData.find(s=>s.line_name === inst.to_line)?.line_color || '#cccccc';
                                        return (
                                            <div key={index} className="instruction-card change">
                                                <div className="line-indicator" style={{backgroundColor: toLineColor}}></div>
                                                <div className="instruction-content">
                                                    <p>INTERCHANGE at <strong>{inst.station}</strong></p>
                                                    <p>Switch to the <strong style={{color: toLineColor}}>{inst.to_line}</strong></p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
            
            <aside className="map-panel">
                <h2 className="panel-header">Live Map</h2>
                <MapContainer center={[17.43, 78.44]} zoom={12} className="map-view" scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' />
                    
                    {showAllStations && metroStations.map(station => (
                        <Marker 
                            key={`${station.id}-${station.name}`}
                            position={[station.latitude, station.longitude]}
                            icon={createStationIcon(station)}
                        >
                            <Popup>{station.name} ({station.line_name})</Popup>
                            <Tooltip permanent direction="top" offset={[0, -10]} opacity={0.8} className="station-tooltip">
                                {station.name}
                            </Tooltip>
                        </Marker>
                    ))}
                    
                    {originStation && (
                        <Marker position={[originStation.latitude, originStation.longitude]} icon={originIcon}>
                           <Popup>Origin: {originStation.name}</Popup>
                           <Tooltip permanent direction="right" offset={[12, 0]} className="od-tooltip origin-tooltip">
                                {originStation.name}
                           </Tooltip>
                        </Marker>
                    )}
                    {destinationStation && (
                         <Marker position={[destinationStation.latitude, destinationStation.longitude]} icon={destinationIcon}>
                           <Popup>Destination: {destinationStation.name}</Popup>
                           <Tooltip permanent direction="right" offset={[12, 0]} className="od-tooltip destination-tooltip">
                                {destinationStation.name}
                           </Tooltip>
                        </Marker>
                    )}

                    {routePath && 
                        <Polyline 
                            key={origin + destination} 
                            pathOptions={{ 
                                className: 'animated-route',
                                color: 'var(--accent-color)', 
                                weight: 5, 
                                opacity: 0.8 
                            }} 
                            positions={routePath} 
                        />
                    }
                    <FitBounds bounds={mapBounds} />
                </MapContainer>
            </aside>
        </div>
    );
}

export default App;
