-- Cubby Database Initialization Script
-- This script runs when MySQL container starts for the first time

-- Set character set
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Grant permissions
GRANT ALL PRIVILEGES ON cubby.* TO 'cubby'@'%';
FLUSH PRIVILEGES;

-- Use cubby database
USE cubby;

-- Note: Tables will be created by TypeORM synchronize or migrations
-- This file is for initial setup and seed data if needed
