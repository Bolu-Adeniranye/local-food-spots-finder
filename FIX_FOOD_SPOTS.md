# Fix: No Food Spots Showing on Map

## Problem
You're seeing "Failed to load food spots" error and no food spots appear on the map.

## Root Causes
1. **Missing Review Model Migration** - We just added a Review model but migrations haven't been run
2. **No Food Spots in Database** - Initial data hasn't been loaded
3. **GDAL Library Issue** (if running locally) - GeoDjango requires GDAL

## Solution

### Option 1: Using Docker (Recommended)

1. **Navigate to docker directory:**
   ```bash
   cd docker
   ```

2. **Start Docker containers:**
   ```bash
   docker-compose up -d
   ```

3. **Create migrations for Review model:**
   ```bash
   docker-compose exec django python manage.py makemigrations
   ```

4. **Run migrations:**
   ```bash
   docker-compose exec django python manage.py migrate
   ```

5. **Load initial food spots data:**
   ```bash
   docker-compose exec django python manage.py load_initial_data
   ```

6. **Restart Django container (to pick up changes):**
   ```bash
   docker-compose restart django
   ```

7. **Check if containers are running:**
   ```bash
   docker-compose ps
   ```

8. **Access the app:**
   - Open browser: http://localhost
   - Or directly: http://localhost:8000

### Option 2: Running Locally (Requires GDAL)

If you want to run locally instead of Docker:

1. **Install GDAL for Windows:**
   - Download from: https://www.lfd.uci.edu/~gohlke/pythonlibs/#gdal
   - Or use conda: `conda install -c conda-forge gdal`

2. **Set GDAL path in settings.py** (if needed):
   ```python
   GDAL_LIBRARY_PATH = r'C:\path\to\gdal\gdal.dll'
   ```

3. **Run migrations:**
   ```bash
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Load initial data:**
   ```bash
   python manage.py load_initial_data
   ```

5. **Start server:**
   ```bash
   python manage.py runserver
   ```

## Verify It's Working

1. **Check API endpoint:**
   - Open: http://localhost/api/foodspots/
   - You should see JSON data with food spots

2. **Check browser console:**
   - Open Developer Tools (F12)
   - Check Console tab for errors
   - Check Network tab to see if API calls are successful

3. **Check database:**
   ```bash
   # In Docker:
   docker-compose exec django python manage.py shell
   >>> from foodspots.apps.locations.models import FoodSpot
   >>> FoodSpot.objects.count()
   # Should return a number > 0
   ```

## Common Issues

### Issue: "Failed to load food spots" error
- **Cause:** API endpoint returning error or empty data
- **Fix:** Check if migrations ran and data is loaded

### Issue: GDAL library error
- **Cause:** Running locally without GDAL installed
- **Fix:** Use Docker instead, or install GDAL

### Issue: Database connection error
- **Cause:** PostgreSQL not running or wrong credentials
- **Fix:** Check docker-compose.yml and ensure postgis container is running

### Issue: No data after loading
- **Cause:** Migration might have failed
- **Fix:** Check Django logs: `docker-compose logs django`

## Quick Test Commands

```bash
# Check if containers are running
docker-compose ps

# View Django logs
docker-compose logs django

# Check database connection
docker-compose exec django python manage.py dbshell

# Count food spots
docker-compose exec django python manage.py shell -c "from foodspots.apps.locations.models import FoodSpot; print(FoodSpot.objects.count())"
```

