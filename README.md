# 🍽️ FoodSpot - Restaurant Finder

A location-based services (LBS) Progressive Web Application (PWA) for discovering restaurants and food establishments in Dublin. Built with Django, PostGIS, Leaflet.js, and modern web technologies.

---

## ✨ Features

### Core Functionality
- **Interactive Map**: Leaflet.js-powered map with OpenStreetMap tiles centered on Dublin
- **Multiple Cuisine Types**: Filter restaurants by cuisine (Italian, Asian, Irish, American, etc.)
- **Real-time Search**: Search restaurants by name, cuisine, or location
- **User Location**: Click anywhere on map, use GPS, or search by address
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Progressive Web App (PWA)**: Installable app with offline support

### Spatial Queries (PostGIS)
1. **Nearest Restaurants** - Find closest dining options using `ST_Distance` with distance calculation
2. **Radius Search** - Discover all restaurants within X meters using `ST_DWithin`
3. **Polygon Search** - Draw custom search areas on the map to find restaurants within bounds
4. **Cuisine-Based Search** - Filter by cuisine type with calculated distances

### Enhanced Features (CA2)
- **Review System**: Users can rate and review restaurants with comments
- **Favorites/Bookmarks**: Save favorite restaurants locally
- **Advanced Filtering**: Filter by price range (€, €€, €€€, €€€€) and minimum rating
- **Search by Name**: Full-text search across restaurant names, descriptions, and addresses
- **Statistics Dashboard**: View comprehensive statistics about restaurants
- **Sorting Options**: Sort results by distance, rating, or name
- **Share Functionality**: Share restaurants via Web Share API or clipboard
- **Dark Mode**: Toggle between light and dark themes
- **Offline Support**: Service worker caches content for offline access
- **Distance Visualization**: Visual distance lines from user location to restaurants

### Additional Features
- **Restaurant Information**: Detailed popups with ratings, cuisine type, and contact details
- **Distance Display**: Accurate distance calculation in kilometers and meters
- **Custom Markers**: Visual indicators showing different cuisine types and favorites
- **Opening Hours**: Display restaurant availability and operating hours
- **Price Range**: Filter by budget (€, €€, €€€, €€€€)
- **Review Counts**: See how many reviews each restaurant has
- **Average Ratings**: Calculated from user reviews

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 4.2 (Python 3.11)
- **Database**: PostgreSQL 15 with PostGIS 3.3 extension
- **API**: Django REST Framework with GIS support
- **GIS**: GeoDjango with spatial database support
- **Authentication**: Django Admin for content management

### Frontend
- **Mapping**: Leaflet.js 1.9.4
- **Tiles**: OpenStreetMap
- **Icons**: Font Awesome 6.4.2
- **JavaScript**: Vanilla ES6+ (no framework dependencies)
- **UI Framework**: Bootstrap 5.3.2
- **PWA**: Service Worker API, Web App Manifest

### Deployment
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (reverse proxy)
- **Database Admin**: PgAdmin 4
- **Application Server**: Gunicorn (production-ready)

---

## 📋 Prerequisites

### For Docker Deployment (Recommended)
- Docker Desktop 20.10+ or Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 5GB free disk space

### For Local Development
- Python 3.11+
- PostgreSQL 15+ with PostGIS 3.3+
- GDAL library (for GeoDjango)
- pip and virtualenv

---

## 🚀 Quick Start (Docker)

### 1. Clone the Repository
```bash
git clone https://github.com/Bolu-Adeniranye/foodspot
cd foodspot
```

### 2. Navigate to Docker Directory
```bash
cd docker
```

### 3. Start All Services
```bash
docker-compose up --build
```

This will:
- Create PostgreSQL database with PostGIS extension
- Set up PgAdmin4 for database management
- Build and run Django application
- Configure Nginx reverse proxy
- Run migrations automatically
- Load sample restaurant data (15 food spots)

### 4. Access the Application

| Service | URL | 
|---------|-----|
| **Main Application** | http://localhost |
| **Django Admin** | http://localhost/admin | 
| **PgAdmin4** | http://localhost:5050 |
| **API Root** | http://localhost/api/foodspots/ |

**Default Admin Credentials:**
- Create a superuser: `docker-compose exec django python manage.py createsuperuser`

### 5. Install as PWA (Mobile)
1. Open http://localhost on your mobile device
2. Tap the browser menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. The app will work offline after first load

### 6. Stop Services
```bash
# Stop containers
docker-compose stop

# Remove containers
docker-compose down

# Remove everything including data
docker-compose down -v
```

---

## 🔌 API Endpoints

### Base URL
```
http://localhost/api/foodspots/
```

### Available Endpoints

#### 1. List All Food Spots
```http
GET /api/foodspots/
GET /api/foodspots/?cuisine_type=italian
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Mario's Italian Kitchen",
    "cuisine_type": "italian",
    "cuisine_display": "Italian",
    "address": "123 Grafton Street, Dublin 2",
    "rating": "4.5",
    "price_range": "€€",
    "latitude": 53.349805,
    "longitude": -6.26031,
    "review_count": 0,
    "average_rating": 4.5,
    "description": "Authentic Italian cuisine...",
    "phone": "+353 1 234 5678",
    "opening_hours": "11:00 AM - 11:00 PM"
  }
]
```

#### 2. Find Nearest Food Spots
```http
POST /api/foodspots/nearest/
Content-Type: application/json

{
  "latitude": 53.3498,
  "longitude": -6.2603,
  "limit": 10
}
```

**Parameters:**
- `latitude` (required): Latitude
- `longitude` (required): Longitude
- `limit` (optional): Number of results (default: 10)

**Response includes:** `distance_meters` and `distance_km` for each result

#### 3. Food Spots Within Radius
```http
POST /api/foodspots/within_radius/
Content-Type: application/json

{
  "latitude": 53.3498,
  "longitude": -6.2603,
  "radius_meters": 1000,
  "cuisine_type": "italian"  // optional
}
```

**Parameters:**
- `latitude` (required): Latitude
- `longitude` (required): Longitude
- `radius_meters` (required): Radius in meters (500-5000)
- `cuisine_type` (optional): Filter by cuisine type

#### 4. Food Spots Within Polygon
```http
POST /api/foodspots/within_bounds/
Content-Type: application/json

{
  "bounds": [
    [lat1, lng1],
    [lat2, lng2],
    [lat3, lng3],
    [lat4, lng4]
  ]
}
```

#### 5. Search Food Spots
```http
GET /api/foodspots/search/?q=pizza&min_rating=4.0&cuisine_type=italian
```

**Parameters:**
- `q` (required): Search query (searches name, description, address)
- `min_rating` (optional): Minimum rating filter
- `cuisine_type` (optional): Filter by cuisine type
- `price_range` (optional): Filter by price range

#### 6. Get Statistics
```http
GET /api/foodspots/statistics/
```

**Response:**
```json
{
  "total_spots": 15,
  "average_rating": 4.5,
  "by_cuisine": {
    "italian": 2,
    "chinese": 1,
    "mexican": 1
  },
  "by_price_range": {
    "€": 3,
    "€€": 10,
    "€€€": 2
  },
  "rating_distribution": {
    "5": 0,
    "4-5": 12,
    "3-4": 3,
    "below_3": 0
  }
}
```

#### 7. Get Cuisine Categories
```http
GET /api/foodspots/categories/
```

#### 8. Reviews Endpoints

**Get Reviews for a Food Spot:**
```http
GET /api/foodspots/{id}/reviews/
```

**Create a Review:**
```http
POST /api/foodspots/{id}/reviews/
Content-Type: application/json

{
  "reviewer_name": "John Doe",
  "reviewer_email": "john@example.com",  // optional
  "rating": 4.5,
  "comment": "Great food and service!"
}
```

**List All Reviews:**
```http
GET /api/reviews/
GET /api/reviews/by_foodspot/?foodspot_id=1
```

**Create Review (Alternative):**
```http
POST /api/reviews/
Content-Type: application/json

{
  "foodspot": 1,
  "reviewer_name": "Jane Smith",
  "rating": 5.0,
  "comment": "Excellent experience!"
}
```

---

## 🗄️ Database Schema

### FoodSpot Model

| Field | Type | Description | PostGIS |
|-------|------|-------------|---------|
| id | Integer | Primary key | - |
| name | CharField(200) | Restaurant name | - |
| cuisine_type | CharField(50) | Cuisine category | - |
| description | TextField | Restaurant details | - |
| address | CharField(300) | Full address | - |
| phone | CharField(20) | Contact phone | - |
| website | URLField | Restaurant website | - |
| **location** | **PointField** | **Lat/Lng coordinates** | **✓ SRID 4326** |
| price_range | CharField(10) | €, €€, €€€, €€€€ | - |
| rating | DecimalField(2,1) | Default rating (0-5) | - |
| opening_hours | CharField(100) | Operating hours | - |
| is_active | BooleanField | Active status | - |
| created_at | DateTimeField | Creation timestamp | - |
| updated_at | DateTimeField | Update timestamp | - |

### Review Model (CA2 Addition)

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| foodspot | ForeignKey | Reference to FoodSpot |
| reviewer_name | CharField(100) | Reviewer's name |
| reviewer_email | EmailField | Reviewer's email (optional) |
| rating | DecimalField(2,1) | Rating (1.0-5.0) |
| comment | TextField(1000) | Review comment |
| is_approved | BooleanField | Moderation flag |
| created_at | DateTimeField | Creation timestamp |
| updated_at | DateTimeField | Update timestamp |

### Spatial Features
- **Coordinate System**: WGS84 (SRID 4326)
- **Spatial Index**: GiST index on `location` field
- **Spatial Functions**:
  - `ST_Distance()` - Calculate distance between points
  - `ST_DWithin()` - Find points within radius
  - `ST_Within()` - Find points within polygon

### Database Testing
```sql
-- Check PostGIS installation
SELECT PostGIS_Version();

-- Count food spots by cuisine
SELECT cuisine_type, COUNT(*) 
FROM locations_foodspot 
GROUP BY cuisine_type;

-- Test spatial query
SELECT name, ST_AsText(location) 
FROM locations_foodspot 
LIMIT 5;

-- View reviews
SELECT r.reviewer_name, r.rating, f.name 
FROM locations_review r
JOIN locations_foodspot f ON r.foodspot_id = f.id
ORDER BY r.created_at DESC;
```

---

## 📱 Progressive Web App (PWA) Features

### Installation
- **Desktop**: Click the install prompt in the browser address bar
- **Mobile**: Use "Add to Home Screen" from browser menu
- **Offline Support**: App works offline after first load
- **Service Worker**: Caches API responses and static assets

### PWA Capabilities
- ✅ Installable on any device
- ✅ Offline functionality
- ✅ App-like experience
- ✅ Fast loading with caching
- ✅ Responsive design
- ✅ Push notifications (ready for implementation)

### Manifest Features
- App icons (72x72 to 512x512)
- Theme colors matching app design
- Shortcuts for quick actions
- Share target support

---

## 🎨 User Interface Features

### Dark Mode
- Toggle between light and dark themes
- Preference saved in localStorage
- Smooth theme transitions

### Search & Filter
- **Text Search**: Search by restaurant name, description, or address
- **Cuisine Filter**: Dropdown with all cuisine types
- **Price Range**: Multi-select checkboxes (€, €€, €€€, €€€€)
- **Rating Filter**: Slider to set minimum rating (0-5)
- **Combined Filters**: All filters work together

### Sorting
- Sort by distance (when location pin is set)
- Sort by rating (highest first)
- Sort by name (alphabetical)

### Favorites
- Click heart icon to save favorites
- Stored in browser localStorage
- View all favorites in dedicated modal
- Favorites marked with red heart icon on map

### Statistics Dashboard
- Total food spots count
- Average rating across all spots
- Distribution by cuisine type
- Distribution by price range
- Rating distribution breakdown

---

## 🔧 Development

### Running Migrations
```bash
# In Docker
docker-compose exec django python manage.py makemigrations
docker-compose exec django python manage.py migrate

# Locally
python manage.py makemigrations
python manage.py migrate
```

### Loading Initial Data
```bash
# In Docker
docker-compose exec django python manage.py load_initial_data

# Clear and reload
docker-compose exec django python manage.py load_initial_data --clear

# Locally
python manage.py load_initial_data
```

### Creating Admin User
```bash
# In Docker
docker-compose exec django python manage.py createsuperuser

# Locally
python manage.py createsuperuser
```

### Generating PWA Icons
Icons are pre-generated in `backend/static/icons/`. To regenerate:
```bash
cd backend
python generate_icons.py
```

### Static Files
```bash
# Collect static files
docker-compose exec django python manage.py collectstatic --noinput
```

---

## 🧪 Testing the Application

### 1. Test Spatial Queries
1. Click "Drop Your Location" button
2. Click anywhere on the map
3. Click "Find Nearest Spots" - should show nearest restaurants with distance lines
4. Click "Search in Radius" - should show restaurants within selected radius
5. Click "Draw Search Area" - draw a polygon and find restaurants within

### 2. Test Search & Filters
1. Type a restaurant name in search box
2. Select a cuisine type from dropdown
3. Adjust price range checkboxes
4. Move rating slider
5. Verify results update in real-time

### 3. Test Reviews
1. Click on any restaurant marker
2. Click "Reviews" button in popup
3. View existing reviews
4. Submit a new review
5. Verify review appears in list

### 4. Test PWA Features
1. Open browser DevTools (F12)
2. Go to Application tab
3. Check Service Worker is registered
4. Check Cache Storage has entries
5. Disable network (offline mode)
6. Verify app still loads

### 5. Test Favorites
1. Click heart icon on any restaurant
2. Check favorites count in navbar
3. Click "Favorites" button
4. Verify restaurant appears in list
5. Remove favorite and verify it's removed

---

## 📊 Project Structure

```
food-spots-finder/
├── backend/
│   ├── foodspots/
│   │   ├── apps/
│   │   │   └── locations/
│   │   │       ├── models.py          # FoodSpot & Review models
│   │   │       ├── views.py          # API viewsets
│   │   │       ├── serializers.py    # DRF serializers
│   │   │       ├── urls.py           # API routes
│   │   │       ├── admin.py          # Django admin
│   │   │       └── management/       # Custom commands
│   │   ├── settings.py               # Django settings
│   │   └── urls.py                   # Main URL config
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css            # Enhanced styles with dark mode
│   │   ├── js/
│   │   │   ├── app.js               # Main application logic
│   │   │   └── service-worker.js    # PWA service worker
│   │   ├── icons/                   # PWA icons (8 sizes)
│   │   └── manifest.json            # PWA manifest
│   ├── templates/
│   │   └── index.html               # Main HTML template
│   └── requirements.txt
├── docker/
│   ├── docker-compose.yml           # Multi-container setup
│   ├── Dockerfile.django            # Django container
│   ├── Dockerfile.nginx             # Nginx container
│   └── nginx.conf                   # Nginx configuration
└── README.md
```

---

## 🐛 Known Limitations

- Sample data limited to Dublin area (15 restaurants)
- Radius search limited to 5km maximum in UI 
- Geocoding depends on external APIs (not implemented)
- Reviews require manual approval in admin
- Offline mode caches API responses but may show stale data
- Service worker cache requires manual update for new versions

---

### Environment Variables
```env
SECRET_KEY=your-secure-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com
DB_NAME=foodspots_db
DB_USER=postgres
DB_PASSWORD=secure-password
DB_HOST=postgis
DB_PORT=5432
```

---

## 📝 Changelog

### CA2 Enhancements (Current Version)
- Added Progressive Web App (PWA) support
- Implemented review system with ratings and comments
- Added favorites/bookmarks functionality
- Enhanced search with full-text search capability
- Added advanced filtering (price range, rating)
- Implemented statistics dashboard
- Added dark mode support
- Added sorting capabilities
- Implemented share functionality
- Added offline support with service worker
- Enhanced UI with better animations and responsiveness
- Added distance visualization on map
- Improved error handling and user feedback

### CA1 Features (Base Version)
- Basic food spots finder
- Spatial queries (nearest, radius, polygon)
- Interactive map with Leaflet.js
- Django REST Framework API
- PostGIS spatial database
- Docker deployment setup

---

## 👤 Author

**Moboluwarin Adeniranye**
- Student ID: C22480424
- Email: C22480424@mytudublin.ie
