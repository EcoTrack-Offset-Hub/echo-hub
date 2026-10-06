-- Migration 003: Add status column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'Active';
