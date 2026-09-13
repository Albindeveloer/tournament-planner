-- ============================================================
-- Tournament Planner - Local PostgreSQL Initialization
-- ============================================================

-- ============================================================
-- DATABASE USERS
-- ============================================================

CREATE USER auth_user WITH PASSWORD 'auth_dev_password';
CREATE USER tournament_user WITH PASSWORD 'tournament_dev_password';
CREATE USER auction_user WITH PASSWORD 'auction_dev_password';
CREATE USER competition_user WITH PASSWORD 'competition_dev_password';
CREATE USER notification_user WITH PASSWORD 'notification_dev_password';

-- ============================================================
-- DATABASES
-- ============================================================

CREATE DATABASE auth_db
    OWNER auth_user;

CREATE DATABASE tournament_db
    OWNER tournament_user;

CREATE DATABASE auction_db
    OWNER auction_user;

CREATE DATABASE competition_db
    OWNER competition_user;

CREATE DATABASE notification_db
    OWNER notification_user;