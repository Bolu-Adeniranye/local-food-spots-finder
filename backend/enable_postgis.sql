-- Run this SQL command in your Render database to enable PostGIS
-- Go to your database service → Connect → psql, then run:

CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS is installed:
SELECT PostGIS_Version();

