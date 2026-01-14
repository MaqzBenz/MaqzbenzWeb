-- MaqzbenzWeb Database Initialization Script
-- PostgreSQL version

-- Create database (run this manually or via docker-compose)
-- CREATE DATABASE maqzbenz;

-- Connect to the database
-- \c maqzbenz;

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE visibility_type AS ENUM ('public', 'private', 'shared');
CREATE TYPE media_type AS ENUM ('image', 'video');
CREATE TYPE activity_type AS ENUM ('cycling', 'hiking', 'driving', 'other');

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: memories (souvenirs géolocalisés)
CREATE TABLE memories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_name VARCHAR(255),
    visibility visibility_type DEFAULT 'private',
    share_token VARCHAR(64) UNIQUE,
    tags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: memory_media
CREATE TABLE memory_media (
    id SERIAL PRIMARY KEY,
    memory_id INT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    media_type media_type NOT NULL,
    thumbnail_path VARCHAR(500),
    exif_date TIMESTAMP,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: tours_360 (parcours 360°)
CREATE TABLE tours_360 (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type activity_type,
    video_path VARCHAR(500) NOT NULL,
    gpx_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    distance_km DECIMAL(10, 2),
    elevation_gain INT,
    duration_seconds INT,
    max_speed DECIMAL(5, 2),
    max_altitude INT,
    recorded_at TIMESTAMP,
    visibility visibility_type DEFAULT 'private',
    share_token VARCHAR(64) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: tour_hotspots
CREATE TABLE tour_hotspots (
    id SERIAL PRIMARY KEY,
    tour_id INT NOT NULL REFERENCES tours_360(id) ON DELETE CASCADE,
    timestamp_seconds INT NOT NULL,
    pitch DECIMAL(5, 2),
    yaw DECIMAL(5, 2),
    title VARCHAR(255),
    description TEXT,
    icon VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_memories_visibility ON memories(visibility);
CREATE INDEX idx_memories_location ON memories(latitude, longitude);
CREATE INDEX idx_memory_media_memory_id ON memory_media(memory_id);
CREATE INDEX idx_tours_visibility ON tours_360(visibility);
CREATE INDEX idx_tour_hotspots_tour_id ON tour_hotspots(tour_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_360_updated_at BEFORE UPDATE ON tours_360
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - CHANGE THIS!)
-- Password hash for 'admin123' using bcrypt with salt rounds 10
INSERT INTO users (username, email, password_hash, role) VALUES 
    ('admin', 'admin@maqzbenz.local', '$2b$10$rKvVPHq8c8YvzM.XYz1k3.J9jG9pYQxWqL0eY7hCbvJ5YPkKQZuZe', 'admin');

-- Sample data for testing (optional, can be removed in production)
INSERT INTO memories (title, description, latitude, longitude, location_name, visibility, tags) VALUES 
    ('Premier Souvenir', 'Un moment mémorable', 48.8566, 2.3522, 'Paris, France', 'public', '["voyage", "paris"]'),
    ('Vacances d''été', 'Belle plage', 43.2965, 5.3698, 'Marseille, France', 'private', '["vacances", "plage"]');

INSERT INTO tours_360 (title, description, activity_type, video_path, gpx_path, visibility) VALUES 
    ('Balade à vélo - Paris', 'Tour de la Seine', 'cycling', '/media/videos360/sample_paris.mp4', '/media/gpx/sample_paris.gpx', 'public');
