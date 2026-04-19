# Delivery Tracker

This repository contains a backend-first delivery tracking system with a Supabase-backed Express API in `backend/` and a React client in `frontend/`.

## Structure

- `backend/`: TypeScript API using controllers, services, repositories, domain entities, and Supabase integrations
- `frontend/`: React + Vite dashboard for authentication, delivery workflow actions, reporting, and admin user management
- `backend/supabase/schema.sql`: database schema, triggers, roles, and row-level policies

## Run

1. Add environment variables from `backend/.env.example` and `frontend/.env.example`
2. Install dependencies in the workspace root
3. Run the backend and frontend separately

## Core Workflow

`Unassigned -> Assigned -> In Progress -> Delivered -> Completed`
