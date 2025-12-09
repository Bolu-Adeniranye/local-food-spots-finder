// ============================================
// Food Spots Finder - Enhanced PWA Application
// ============================================

// Global Variables
let map, userMarker = null, userLocation = null, searchCircle = null, foodSpotsLayer = null;
let drawingPolygon = false, polygonPoints = [], tempPolygon = null, drawnMarkers = [];
let distanceLines = [];
let favorites = new Set();
let currentSpots = [];
let sortOrder = 'default';

const API_BASE = '/api';
const STORAGE_KEY_FAVORITES = 'foodspots_favorites';
const STORAGE_KEY_DARKMODE = 'foodspots_darkmode';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Food Spots Finder...');
    loadFavorites();
    initDarkMode();
    initMap();
    loadCategories();
    loadAllFoodSpots();
    initEventListeners();
    initOfflineDetection();
    updateFavoritesCount();
});

// ============================================
// Map Initialization
// ============================================

function initMap() {
    console.log('🗺️ Initializing map...');
    map = L.map('map').setView([53.349805, -6.260310], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    foodSpotsLayer = L.layerGroup().addTo(map);
    map.on('click', onMapClick);
    console.log('✅ Map initialized successfully');
}

// ============================================
// Data Loading Functions
// ============================================

async function loadCategories() {
    try {
        console.log('📋 Loading categories...');
        const response = await fetch(`${API_BASE}/foodspots/categories/`);
        if (!response.ok) throw new Error('Failed to load categories');
        const categories = await response.json();
        
        const select = document.getElementById('cuisineFilter');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.value;
            option.textContent = cat.label;
            select.appendChild(option);
        });
        console.log(`✅ Loaded ${categories.length} categories`);
    } catch (error) {
        console.error('❌ Error loading categories:', error);
        showToast('Failed to load categories', 'error');
    }
}

async function loadAllFoodSpots() {
    showLoading(true);
    try {
        console.log('🔍 Loading all food spots...');
        const cuisineFilter = document.getElementById('cuisineFilter').value;
        let url = `${API_BASE}/foodspots/`;
        if (cuisineFilter) url += `?cuisine_type=${cuisineFilter}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const spots = await response.json();
        console.log(`✅ Loaded ${spots.length} food spots`);
        
        currentSpots = spots;
        applyFilters();
        
        if (Array.isArray(spots) && spots.length > 0) {
            document.getElementById('totalSpots').textContent = spots.length;
        } else {
            updateResultsInfo('No food spots available');
        }
    } catch (error) {
        console.error('❌ Error loading food spots:', error);
        showToast('Failed to load food spots', 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// Search Functions
// ============================================

async function searchByName() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        showToast('Please enter a search term', 'warning');
        return;
    }
    
    showLoading(true);
    try {
        console.log(`🔍 Searching for: ${query}`);
        let url = `${API_BASE}/foodspots/search/?q=${encodeURIComponent(query)}`;
        
        const cuisineType = document.getElementById('cuisineFilter').value;
        if (cuisineType) url += `&cuisine_type=${cuisineType}`;
        
        const minRating = document.getElementById('ratingSlider').value;
        if (minRating > 0) url += `&min_rating=${minRating}`;
        
        const priceRanges = getSelectedPriceRanges();
        if (priceRanges.length > 0) {
            // Filter client-side for price ranges
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search failed');
        
        const results = await response.json();
        console.log(`✅ Found ${results.length} results`);
        
        currentSpots = results;
        applyFilters();
        
        if (results.length === 0) {
            showToast('No results found', 'info');
        } else {
            showToast(`Found ${results.length} results`, 'success');
        }
    } catch (error) {
        console.error('❌ Error searching:', error);
        showToast('Search failed', 'error');
    } finally {
        showLoading(false);
    }
}

function getSelectedPriceRanges() {
    const prices = [];
    ['price1', 'price2', 'price3', 'price4'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox && checkbox.checked) {
            prices.push(checkbox.value);
        }
    });
    return prices;
}

function applyFilters() {
    let filtered = [...currentSpots];
    
    // Price range filter
    const priceRanges = getSelectedPriceRanges();
    if (priceRanges.length > 0) {
        filtered = filtered.filter(spot => priceRanges.includes(spot.price_range));
    }
    
    // Rating filter
    const minRating = parseFloat(document.getElementById('ratingSlider').value);
    if (minRating > 0) {
        filtered = filtered.filter(spot => parseFloat(spot.rating) >= minRating);
    }
    
    // Sort
    applySorting(filtered);
    
    // Display
    if (filtered.length > 0) {
        displayFoodSpots(filtered);
        displayResultsList(filtered);
        updateResultsInfo(`Showing ${filtered.length} food spots`);
    } else {
        displayFoodSpots([]);
        displayResultsList([]);
        updateResultsInfo('No food spots match your filters');
    }
}

// ============================================
// Display Functions
// ============================================

function displayFoodSpots(spots) {
    console.log(`🍕 Displaying ${spots.length} spots on map...`);
    foodSpotsLayer.clearLayers();
    clearDistanceLines();
    
    if (!Array.isArray(spots) || spots.length === 0) {
        console.warn('⚠️ No spots to display');
        return;
    }
    
    spots.forEach(spot => {
        try {
            const isFavorite = favorites.has(spot.id.toString());
            const iconColor = isFavorite ? '#dc3545' : '#0d6efd';
            const iconClass = isFavorite ? 'fa-heart' : 'fa-utensils';
            
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: white; border-radius: 50%; padding: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        <i class="fas ${iconClass}" style="color: ${iconColor}; font-size: 20px;"></i>
                       </div>`,
                iconSize: [35, 35],
                iconAnchor: [17, 35]
            });
            
            const marker = L.marker([spot.latitude, spot.longitude], { icon: icon }).addTo(foodSpotsLayer);
            
            const favoriteBtn = isFavorite 
                ? `<button class="btn btn-sm btn-danger mt-2" onclick="toggleFavorite(${spot.id})">
                     <i class="fas fa-heart"></i> Remove from Favorites
                   </button>`
                : `<button class="btn btn-sm btn-outline-danger mt-2" onclick="toggleFavorite(${spot.id})">
                     <i class="far fa-heart"></i> Add to Favorites
                   </button>`;
            
            const shareBtn = `<button class="btn btn-sm btn-primary mt-2" onclick="shareSpot(${spot.id})">
                                <i class="fas fa-share-alt"></i> Share
                              </button>`;
            
            const reviewsBtn = `<button class="btn btn-sm btn-info mt-2" onclick="showReviews(${spot.id}, '${spot.name.replace(/'/g, "\\'")}')">
                                  <i class="fas fa-comments"></i> Reviews
                                  ${spot.review_count ? ` <span class="badge bg-light text-dark">${spot.review_count}</span>` : ''}
                                </button>`;
            
            const popupContent = `
                <div class="popup-title">${spot.name}</div>
                <div class="popup-info"><strong>🍽️ Cuisine:</strong> ${spot.cuisine_display || spot.cuisine_type}</div>
                <div class="popup-info"><strong>⭐ Rating:</strong> <span class="popup-rating">${spot.average_rating || spot.rating}</span> ${spot.review_count ? `(${spot.review_count} reviews)` : ''}</div>
                <div class="popup-info"><strong>💰 Price:</strong> ${spot.price_range}</div>
                <div class="popup-info"><strong>📍 Address:</strong> ${spot.address}</div>
                ${spot.phone ? `<div class="popup-info"><strong>📞 Phone:</strong> ${spot.phone}</div>` : ''}
                ${spot.opening_hours ? `<div class="popup-info"><strong>🕒 Hours:</strong> ${spot.opening_hours}</div>` : ''}
                ${spot.distance_km ? `<div class="popup-info spot-distance"><strong>📏 Distance:</strong> ${spot.distance_km} km (${spot.distance_meters}m)</div>` : ''}
                <div class="d-flex flex-column gap-2 mt-2">
                    <div class="d-flex gap-2">
                        ${favoriteBtn}
                        ${shareBtn}
                    </div>
                    ${reviewsBtn}
                </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.spotData = spot;
        } catch (error) {
            console.error('❌ Error displaying spot:', spot, error);
        }
    });
    
    console.log('✅ All spots displayed on map');
}

function displayResultsList(spots) {
    const container = document.getElementById('spotsContainer');
    container.innerHTML = '';
    
    if (!Array.isArray(spots) || spots.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-3"><i class="fas fa-search fa-2x mb-2 d-block"></i>No results found</p>';
        return;
    }
    
    console.log(`📝 Displaying ${spots.length} spots in list...`);
    
    spots.forEach((spot, index) => {
        const isFavorite = favorites.has(spot.id.toString());
        const card = document.createElement('div');
        card.className = 'spot-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <h6 class="mb-1"><i class="fas fa-utensils me-2"></i>${spot.name}</h6>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-link p-0" onclick="toggleFavorite(${spot.id})" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="fas fa-heart ${isFavorite ? 'text-danger' : 'text-muted'}"></i>
                    </button>
                    ${spot.distance_km ? `<span class="badge bg-success">#${index + 1}</span>` : ''}
                </div>
            </div>
            <small class="d-block text-muted"><i class="fas fa-map-marker-alt me-1"></i>${spot.address}</small>
            <div class="mt-2">
                <span class="spot-rating">⭐ ${spot.rating}</span>
                <span class="mx-2">|</span>
                <span>💰 ${spot.price_range}</span>
            </div>
            ${spot.distance_km ? `<div class="spot-distance mt-2"><i class="fas fa-route me-1"></i>${spot.distance_km} km away (${spot.distance_meters}m)</div>` : ''}
            <span class="spot-badge mt-2">${spot.cuisine_display || spot.cuisine_type}</span>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            foodSpotsLayer.eachLayer(layer => {
                if (layer.spotData && layer.spotData.id === spot.id) {
                    map.setView(layer.getLatLng(), 16);
                    layer.openPopup();
                }
            });
        });
        
        container.appendChild(card);
    });
}

// ============================================
// Spatial Query Functions
// ============================================

function onMapClick(e) {
    const dropPinBtn = document.getElementById('dropPinBtn');
    
    if (dropPinBtn.classList.contains('active')) {
        dropUserPin(e.latlng);
        dropPinBtn.classList.remove('active');
    } else if (drawingPolygon) {
        addPolygonPoint(e.latlng);
    }
}

function dropUserPin(latlng) {
    console.log(`📍 Dropping pin at: ${latlng.lat}, ${latlng.lng}`);
    
    if (userMarker) map.removeLayer(userMarker);
    clearDistanceLines();
    
    const redIcon = L.divIcon({
        className: 'user-pin-icon',
        html: `<div style="background: #dc3545; border-radius: 50%; padding: 8px; border: 4px solid white; box-shadow: 0 4px 15px rgba(220,53,69,0.5);">
                <i class="fas fa-map-pin" style="color: white; font-size: 22px;"></i>
               </div>`,
        iconSize: [40, 45],
        iconAnchor: [20, 45]
    });
    
    userMarker = L.marker(latlng, { icon: redIcon }).addTo(map);
    userMarker.bindPopup('<b>📍 Your Location</b><br>Click search buttons to find nearby spots').openPopup();
    userLocation = latlng;
    
    document.getElementById('findNearestBtn').disabled = false;
    document.getElementById('searchRadiusBtn').disabled = false;
    
    updateResultsInfo('✅ Pin dropped! Now search for nearby spots.');
    showToast('Location pin dropped successfully!', 'success');
}

async function findNearest() {
    if (!userLocation) {
        showToast('Please drop a location pin first!', 'warning');
        return;
    }
    
    const limit = parseInt(document.getElementById('nearestLimit').value);
    console.log(`🔍 Finding nearest ${limit} spots...`);
    showLoading(true);
    clearDistanceLines();
    
    try {
        const response = await fetch(`${API_BASE}/foodspots/nearest/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                limit: limit
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Search failed');
        }
        
        const results = await response.json();
        console.log(`✅ Found ${results.length} nearest spots`);
        
        currentSpots = results;
        applyFilters();
        
        if (Array.isArray(results) && results.length > 0) {
            // Draw distance lines
            results.forEach((spot, index) => {
                const spotLatLng = L.latLng(spot.latitude, spot.longitude);
                drawDistanceLine(userLocation, spotLatLng, spot.distance_km, index);
            });
            
            updateResultsInfo(`✅ Found ${results.length} nearest spots`);
            showToast(`Found ${results.length} nearest spots!`, 'success');
            
            const bounds = L.latLngBounds([userLocation]);
            results.forEach(spot => bounds.extend([spot.latitude, spot.longitude]));
            map.fitBounds(bounds, { padding: [80, 80] });
        } else {
            updateResultsInfo('❌ No food spots found nearby');
            displayResultsList([]);
            showToast('No spots found nearby', 'info');
        }
    } catch (error) {
        console.error('❌ Error finding nearest:', error);
        showToast(`Error: ${error.message}`, 'error');
        updateResultsInfo('❌ Search failed');
    } finally {
        showLoading(false);
    }
}

async function searchWithinRadius() {
    if (!userLocation) {
        showToast('Please drop a location pin first!', 'warning');
        return;
    }
    
    const radius = document.getElementById('radiusSlider').value;
    const cuisineType = document.getElementById('cuisineFilter').value;
    
    console.log(`🔍 Searching within ${radius}m radius...`);
    showLoading(true);
    clearDistanceLines();
    
    try {
        const requestBody = {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            radius_meters: parseInt(radius)
        };
        if (cuisineType) requestBody.cuisine_type = cuisineType;
        
        const response = await fetch(`${API_BASE}/foodspots/within_radius/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Search failed');
        }
        
        const results = await response.json();
        console.log(`✅ Found ${results.length} spots within radius`);
        
        // Draw search circle
        if (searchCircle) map.removeLayer(searchCircle);
        searchCircle = L.circle(userLocation, {
            radius: parseInt(radius),
            color: '#0d6efd',
            fillColor: '#0d6efd',
            fillOpacity: 0.15,
            weight: 3,
            dashArray: '10, 10'
        }).addTo(map);
        
        currentSpots = results;
        applyFilters();
        
        if (Array.isArray(results) && results.length > 0) {
            // Draw distance lines
            results.forEach((spot, index) => {
                const spotLatLng = L.latLng(spot.latitude, spot.longitude);
                drawDistanceLine(userLocation, spotLatLng, spot.distance_km, index);
            });
            
            updateResultsInfo(`✅ Found ${results.length} spots within ${radius}m`);
            showToast(`Found ${results.length} spots in radius!`, 'success');
        } else {
            updateResultsInfo(`❌ No spots found within ${radius}m`);
            displayResultsList([]);
            showToast('No spots found in this radius', 'info');
        }
        
        map.fitBounds(searchCircle.getBounds(), { padding: [80, 80] });
    } catch (error) {
        console.error('❌ Error searching radius:', error);
        showToast(`Error: ${error.message}`, 'error');
        updateResultsInfo('❌ Search failed');
    } finally {
        showLoading(false);
    }
}

function toggleDrawBounds() {
    const btn = document.getElementById('drawBoundsBtn');
    
    if (!drawingPolygon) {
        drawingPolygon = true;
        polygonPoints = [];
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-check me-2"></i> Finish Drawing';
        updateResultsInfo('🎨 Click on map to draw search area. Click "Finish" when done.');
        showToast('Click on the map to draw your search area', 'info');
    } else {
        if (polygonPoints.length >= 3) {
            searchWithinBounds();
        } else {
            showToast('Please draw at least 3 points!', 'warning');
        }
        drawingPolygon = false;
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-draw-polygon me-2"></i> Draw Search Area';
    }
}

function addPolygonPoint(latlng) {
    console.log(`📍 Adding polygon point: ${latlng.lat}, ${latlng.lng}`);
    polygonPoints.push(latlng);
    
    if (tempPolygon) map.removeLayer(tempPolygon);
    
    if (polygonPoints.length >= 2) {
        tempPolygon = L.polygon(polygonPoints, {
            color: '#ffc107',
            fillColor: '#ffc107',
            fillOpacity: 0.2,
            weight: 3,
            dashArray: '10, 10'
        }).addTo(map);
    }
    
    const marker = L.circleMarker(latlng, {
        radius: 6,
        color: '#ffc107',
        fillColor: '#ffc107',
        fillOpacity: 1,
        weight: 2
    }).addTo(map);
    
    drawnMarkers.push(marker);
    updateResultsInfo(`📍 ${polygonPoints.length} points drawn. ${polygonPoints.length >= 3 ? 'Click "Finish" to search.' : 'Keep drawing...'}`);
}

async function searchWithinBounds() {
    console.log('🔍 Searching within drawn bounds...');
    showLoading(true);
    clearDistanceLines();
    
    try {
        const bounds = polygonPoints.map(p => [p.lat, p.lng]);
        bounds.push([polygonPoints[0].lat, polygonPoints[0].lng]);
        
        const response = await fetch(`${API_BASE}/foodspots/within_bounds/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bounds: bounds })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Search failed');
        }
        
        const results = await response.json();
        console.log(`✅ Found ${results.length} spots within bounds`);
        
        currentSpots = results;
        applyFilters();
        
        if (Array.isArray(results) && results.length > 0) {
            updateResultsInfo(`✅ Found ${results.length} spots in drawn area`);
            showToast(`Found ${results.length} spots in area!`, 'success');
        } else {
            updateResultsInfo('❌ No spots found in drawn area');
            displayResultsList([]);
            showToast('No spots found in this area', 'info');
        }
    } catch (error) {
        console.error('❌ Error searching bounds:', error);
        showToast(`Error: ${error.message}`, 'error');
        updateResultsInfo('❌ Search failed');
    } finally {
        showLoading(false);
    }
}

function clearDistanceLines() {
    distanceLines.forEach(line => map.removeLayer(line));
    distanceLines = [];
}

function drawDistanceLine(fromLatLng, toLatLng, distance, index) {
    const line = L.polyline([fromLatLng, toLatLng], {
        color: '#28a745',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10'
    }).addTo(map);
    
    const midpoint = [
        (fromLatLng.lat + toLatLng.lat) / 2,
        (fromLatLng.lng + toLatLng.lng) / 2
    ];
    
    const label = L.marker(midpoint, {
        icon: L.divIcon({
            className: 'distance-label',
            html: `<div style="background: white; padding: 4px 8px; border-radius: 12px; border: 2px solid #28a745; font-weight: bold; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">
                    #${index + 1}: ${distance.toFixed(2)} km
                   </div>`,
            iconSize: [0, 0]
        })
    }).addTo(map);
    
    distanceLines.push(line);
    distanceLines.push(label);
}

// ============================================
// Favorites Functions
// ============================================

function loadFavorites() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_FAVORITES);
        if (stored) {
            favorites = new Set(JSON.parse(stored));
            console.log(`✅ Loaded ${favorites.size} favorites`);
        }
    } catch (error) {
        console.error('❌ Error loading favorites:', error);
    }
}

function saveFavorites() {
    try {
        localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify([...favorites]));
        updateFavoritesCount();
    } catch (error) {
        console.error('❌ Error saving favorites:', error);
    }
}

function toggleFavorite(spotId) {
    const id = spotId.toString();
    if (favorites.has(id)) {
        favorites.delete(id);
        showToast('Removed from favorites', 'info');
    } else {
        favorites.add(id);
        showToast('Added to favorites', 'success');
    }
    saveFavorites();
    refreshDisplay();
}

function updateFavoritesCount() {
    const count = favorites.size;
    document.getElementById('favoritesCount').textContent = count;
}

function showFavorites() {
    const favoriteSpots = currentSpots.filter(spot => favorites.has(spot.id.toString()));
    const modal = new bootstrap.Modal(document.getElementById('favoritesModal'));
    const content = document.getElementById('favoritesContent');
    
    if (favoriteSpots.length === 0) {
        content.innerHTML = '<p class="text-muted text-center py-3">No favorites yet. Click the heart icon on any restaurant to add it!</p>';
    } else {
        content.innerHTML = favoriteSpots.map(spot => `
            <div class="card mb-2">
                <div class="card-body">
                    <h6 class="card-title">${spot.name}</h6>
                    <p class="card-text text-muted mb-2">${spot.address}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-warning text-dark">⭐ ${spot.rating}</span>
                            <span class="badge bg-info">${spot.price_range}</span>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="toggleFavorite(${spot.id}); showFavorites();">
                            <i class="fas fa-heart-broken"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    modal.show();
}

function refreshDisplay() {
    if (currentSpots.length > 0) {
        displayFoodSpots(currentSpots);
        displayResultsList(currentSpots);
    }
}

// ============================================
// Statistics Functions
// ============================================

async function showStatistics() {
    const modal = new bootstrap.Modal(document.getElementById('statsModal'));
    const content = document.getElementById('statsContent');
    content.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
    modal.show();
    
    try {
        const response = await fetch(`${API_BASE}/foodspots/statistics/`);
        if (!response.ok) throw new Error('Failed to load statistics');
        const stats = await response.json();
        
        content.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h2 class="text-primary">${stats.total_spots}</h2>
                            <p class="text-muted mb-0">Total Spots</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h2 class="text-success">${stats.average_rating}</h2>
                            <p class="text-muted mb-0">Avg Rating</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h2 class="text-info">${favorites.size}</h2>
                            <p class="text-muted mb-0">Your Favorites</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <h5 class="mb-3">By Cuisine Type</h5>
            <div class="row mb-4">
                ${Object.entries(stats.by_cuisine).map(([cuisine, count]) => `
                    <div class="col-md-6 mb-2">
                        <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                            <span>${cuisine}</span>
                            <span class="badge bg-primary">${count}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <h5 class="mb-3">By Price Range</h5>
            <div class="row mb-4">
                ${Object.entries(stats.by_price_range).map(([price, count]) => `
                    <div class="col-md-6 mb-2">
                        <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                            <span>${price}</span>
                            <span class="badge bg-success">${count}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <h5 class="mb-3">Rating Distribution</h5>
            <div class="row">
                <div class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                        <span>5.0 Stars</span>
                        <span class="badge bg-warning">${stats.rating_distribution['5']}</span>
                    </div>
                </div>
                <div class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                        <span>4.0 - 4.9 Stars</span>
                        <span class="badge bg-info">${stats.rating_distribution['4-5']}</span>
                    </div>
                </div>
                <div class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                        <span>3.0 - 3.9 Stars</span>
                        <span class="badge bg-secondary">${stats.rating_distribution['3-4']}</span>
                    </div>
                </div>
                <div class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                        <span>Below 3.0 Stars</span>
                        <span class="badge bg-danger">${stats.rating_distribution['below_3']}</span>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error loading statistics:', error);
        content.innerHTML = '<div class="alert alert-danger">Failed to load statistics</div>';
    }
}

// ============================================
// Sorting Functions
// ============================================

function applySorting(spots) {
    switch(sortOrder) {
        case 'distance':
            return spots.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
        case 'rating':
            return spots.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        case 'name':
            return spots.sort((a, b) => a.name.localeCompare(b.name));
        default:
            return spots;
    }
}

// ============================================
// Dark Mode Functions
// ============================================

function initDarkMode() {
    const isDark = localStorage.getItem(STORAGE_KEY_DARKMODE) === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeToggle').innerHTML = '<i class="fas fa-sun me-1"></i> <span class="d-none d-md-inline">Light</span>';
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem(STORAGE_KEY_DARKMODE, isDark);
    
    const btn = document.getElementById('darkModeToggle');
    if (isDark) {
        btn.innerHTML = '<i class="fas fa-sun me-1"></i> <span class="d-none d-md-inline">Light</span>';
    } else {
        btn.innerHTML = '<i class="fas fa-moon me-1"></i> <span class="d-none d-md-inline">Dark</span>';
    }
}

// ============================================
// Share Functions
// ============================================

function shareSpot(spotId) {
    const spot = currentSpots.find(s => s.id === spotId);
    if (!spot) return;
    
    const shareData = {
        title: `${spot.name} - Food Spot`,
        text: `Check out ${spot.name} at ${spot.address}! Rating: ${spot.rating}⭐`,
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(shareData).catch(err => console.log('Share failed:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        showToast('Link copied to clipboard!', 'success');
    }
}

// ============================================
// Offline Detection
// ============================================

function initOfflineDetection() {
    window.addEventListener('online', () => {
        document.getElementById('offlineIndicator').style.display = 'none';
        showToast('Back online!', 'success');
    });
    
    window.addEventListener('offline', () => {
        document.getElementById('offlineIndicator').style.display = 'block';
        showToast('You are offline', 'warning');
    });
    
    if (!navigator.onLine) {
        document.getElementById('offlineIndicator').style.display = 'block';
    }
}

// ============================================
// Utility Functions
// ============================================

function clearAll() {
    console.log('🧹 Clearing all...');
    
    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    userLocation = null;
    if (searchCircle) { map.removeLayer(searchCircle); searchCircle = null; }
    if (tempPolygon) { map.removeLayer(tempPolygon); tempPolygon = null; }
    
    clearDistanceLines();
    drawnMarkers.forEach(marker => map.removeLayer(marker));
    drawnMarkers = [];
    polygonPoints = [];
    drawingPolygon = false;
    
    document.getElementById('cuisineFilter').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('radiusSlider').value = 1000;
    document.getElementById('radiusValue').textContent = '1000';
    document.getElementById('ratingSlider').value = 0;
    document.getElementById('ratingValue').textContent = '0.0';
    document.getElementById('nearestLimit').value = 10;
    document.getElementById('findNearestBtn').disabled = true;
    document.getElementById('searchRadiusBtn').disabled = true;
    
    // Clear price filters
    ['price1', 'price2', 'price3', 'price4'].forEach(id => {
        document.getElementById(id).checked = false;
    });
    
    document.getElementById('drawBoundsBtn').classList.remove('active');
    document.getElementById('drawBoundsBtn').innerHTML = '<i class="fas fa-draw-polygon me-2"></i> Draw Search Area';
    
    loadAllFoodSpots();
    showToast('All filters cleared!', 'info');
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function updateResultsInfo(message) {
    document.getElementById('resultsCount').textContent = message;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toastNotification');
    const toastBody = document.getElementById('toastBody');
    const toastHeader = toast.querySelector('.toast-header i');
    
    const icons = {
        success: 'fa-check-circle text-success',
        error: 'fa-exclamation-circle text-danger',
        warning: 'fa-exclamation-triangle text-warning',
        info: 'fa-info-circle text-info'
    };
    
    toastHeader.className = `fas ${icons[type] || icons.info} me-2`;
    toastBody.textContent = message;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
    // Search
    document.getElementById('searchBtn').addEventListener('click', searchByName);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchByName();
    });
    
    // Filters
    document.getElementById('cuisineFilter').addEventListener('change', () => {
        if (userLocation) {
            searchWithinRadius();
        } else {
            loadAllFoodSpots();
        }
    });
    
    document.getElementById('ratingSlider').addEventListener('input', function() {
        document.getElementById('ratingValue').textContent = this.value;
        applyFilters();
    });
    
    ['price1', 'price2', 'price3', 'price4'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    
    document.getElementById('radiusSlider').addEventListener('input', function() {
        document.getElementById('radiusValue').textContent = this.value;
    });
    
    // Actions
    document.getElementById('dropPinBtn').addEventListener('click', function() {
        this.classList.toggle('active');
        updateResultsInfo(this.classList.contains('active') ? 
            '🎯 Click anywhere on the map to drop your location pin' : 
            '❌ Pin drop cancelled');
    });
    
    document.getElementById('findNearestBtn').addEventListener('click', findNearest);
    document.getElementById('searchRadiusBtn').addEventListener('click', searchWithinRadius);
    document.getElementById('drawBoundsBtn').addEventListener('click', toggleDrawBounds);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    
    // Sorting
    document.getElementById('sortDistance').addEventListener('click', () => {
        sortOrder = 'distance';
        applyFilters();
    });
    
    document.getElementById('sortRating').addEventListener('click', () => {
        sortOrder = 'rating';
        applyFilters();
    });
    
    document.getElementById('sortName').addEventListener('click', () => {
        sortOrder = 'name';
        applyFilters();
    });
    
    // Modals
    document.getElementById('statsBtn').addEventListener('click', showStatistics);
    document.getElementById('favoritesBtn').addEventListener('click', showFavorites);
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
}

// ============================================
// Review Functions
// ============================================

async function showReviews(foodspotId, foodspotName) {
    const modal = new bootstrap.Modal(document.getElementById('reviewsModal'));
    const content = document.getElementById('reviewsContent');
    const title = document.getElementById('reviewsModalTitle');
    
    title.textContent = `Reviews - ${foodspotName}`;
    content.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
    modal.show();
    
    try {
        // Load reviews
        const response = await fetch(`${API_BASE}/foodspots/${foodspotId}/reviews/`);
        if (!response.ok) throw new Error('Failed to load reviews');
        const reviews = await response.json();
        
        // Build reviews HTML
        let reviewsHTML = '';
        
        if (reviews.length === 0) {
            reviewsHTML = '<p class="text-muted text-center py-3">No reviews yet. Be the first to review!</p>';
        } else {
            reviewsHTML = reviews.map(review => `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="card-title mb-0">${review.reviewer_name}</h6>
                                <small class="text-muted">${formatDate(review.created_at)}</small>
                            </div>
                            <div class="text-warning">
                                ${generateStars(review.rating)}
                            </div>
                        </div>
                        <p class="card-text">${escapeHtml(review.comment)}</p>
                    </div>
                </div>
            `).join('');
        }
        
        // Add review form
        const formHTML = `
            <hr class="my-4">
            <h5 class="mb-3">Write a Review</h5>
            <form id="reviewForm" onsubmit="submitReview(event, ${foodspotId})">
                <div class="mb-3">
                    <label for="reviewerName" class="form-label">Your Name *</label>
                    <input type="text" class="form-control" id="reviewerName" required>
                </div>
                <div class="mb-3">
                    <label for="reviewerEmail" class="form-label">Email (optional)</label>
                    <input type="email" class="form-control" id="reviewerEmail">
                </div>
                <div class="mb-3">
                    <label for="reviewRating" class="form-label">Rating *</label>
                    <select class="form-select" id="reviewRating" required>
                        <option value="">Select rating</option>
                        <option value="5">5 - Excellent</option>
                        <option value="4.5">4.5 - Very Good</option>
                        <option value="4">4 - Good</option>
                        <option value="3.5">3.5 - Above Average</option>
                        <option value="3">3 - Average</option>
                        <option value="2.5">2.5 - Below Average</option>
                        <option value="2">2 - Poor</option>
                        <option value="1.5">1.5 - Very Poor</option>
                        <option value="1">1 - Terrible</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="reviewComment" class="form-label">Your Review *</label>
                    <textarea class="form-control" id="reviewComment" rows="4" required maxlength="1000" placeholder="Share your experience..."></textarea>
                    <small class="text-muted"><span id="charCount">0</span>/1000 characters</small>
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-paper-plane me-2"></i>Submit Review
                </button>
            </form>
        `;
        
        content.innerHTML = `
            <div id="reviewsList">
                ${reviewsHTML}
            </div>
            ${formHTML}
        `;
        
        // Character counter
        document.getElementById('reviewComment').addEventListener('input', function() {
            document.getElementById('charCount').textContent = this.value.length;
        });
        
    } catch (error) {
        console.error('❌ Error loading reviews:', error);
        content.innerHTML = '<div class="alert alert-danger">Failed to load reviews</div>';
    }
}

async function submitReview(event, foodspotId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = {
        foodspot: foodspotId,
        reviewer_name: document.getElementById('reviewerName').value.trim(),
        reviewer_email: document.getElementById('reviewerEmail').value.trim() || null,
        rating: parseFloat(document.getElementById('reviewRating').value),
        comment: document.getElementById('reviewComment').value.trim()
    };
    
    if (!formData.reviewer_name || !formData.rating || !formData.comment) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reviews/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit review');
        }
        
        showToast('Review submitted successfully!', 'success');
        form.reset();
        document.getElementById('charCount').textContent = '0';
        
        // Reload reviews
        setTimeout(() => {
            showReviews(foodspotId, document.getElementById('reviewsModalTitle').textContent.replace('Reviews - ', ''));
        }, 500);
        
        // Refresh current spots to update review counts
        if (currentSpots.length > 0) {
            loadAllFoodSpots();
        }
        
    } catch (error) {
        console.error('❌ Error submitting review:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.toggleFavorite = toggleFavorite;
window.shareSpot = shareSpot;
window.showFavorites = showFavorites;
window.showReviews = showReviews;
window.submitReview = submitReview;

console.log('✅ Food Spots Finder loaded successfully!');
