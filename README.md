# 📦 Future Forward Delivery Tracker

A full-stack delivery management platform built for **Future Forward**, enabling end-to-end tracking of deliveries across multiple roles — from creation to approval.

## Overview

The system supports four distinct roles, each with a tailored dashboard experience:

| Role | Capabilities |
|---|---|
| **Admin** | View platform-wide statistics, monitor all runner performance (deliveries & distance covered) |
| **Delivery Creator** | Create new delivery tasks, track delivery progress |
| **Runner** | Claim & fulfill deliveries, log distance traveled (km) |
| **Approver** | Review completed deliveries, approve or reject them |

### Delivery Workflow

```
Unassigned → Assigned → In Progress → Delivered → Approved / Rejected
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Express.js, TypeScript (Clean Architecture)
- **Database & Auth**: Supabase (PostgreSQL + Row Level Security)
- **Hosting**: Vercel (Frontend & Backend)

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── domain/          # Entities, enums, errors
│   │   ├── application/     # Services, DTOs, interfaces
│   │   ├── infrastructure/  # Supabase repositories
│   │   └── presentation/    # Controllers, routes, middleware
│   └── supabase/            # SQL schema & RLS policies
├── frontend/
│   └── src/
│       ├── api/             # API client
│       ├── components/      # LoginScreen, Dashboard
│       ├── context/         # Auth context provider
│       └── styles/          # Global CSS
```
