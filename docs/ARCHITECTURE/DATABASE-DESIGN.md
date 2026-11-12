# Database Design — Finishing BOQ & Cost Estimation System

**Version:** 1.0 Draft  
**Last reviewed:** 12 November 2026

---

## 1. Purpose

This document specifies a scalable data model for the project, covering:
- Entities and relationships.
- Versioning of drawings and BOQs.
- Synchronization and conflict-resolution mechanism.
- Backup and restore path.

---

## 2. Overview (ER summary)

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  projects    │      │  buildings   │      │    rooms     │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                      │                      │
       │                      │                      │
       ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  drawings    │─────▶│ drawing_types│      │  dimensions  │
└──────┬───────┘      └──────────────┘      └──────────────┘
       │
       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   items      │◀────▶│    boq       │      │   costs      │
└──────────────┘      └──────────────┘      └──────────────┘
       │
       ▼
┌──────────────┐      ┌──────────────┐
│  audits      │─────▶│  sync_states │
└──────────────┘      └──────────────┘
```

---

## 3. Core Entities & Relationships

| Entity | Key fields | Relationships |
|--------|-----------|---------------|
| `projects` | id, code, name, location, project_type, state | 1 → N buildings |
| `buildings` | id, project_id, code, name, address | N → 1 projects |
| `rooms` | id, building_id, code, name, area_m2, height_m | N → 1 building |
| `drawings` | id, project_id, parent_id (for group), version, name, file_path | N → 1 project |
| `drawing_types` | id, code (plan, section), description | 1 → N drawings (optional reference) |
| `dimensions` | id, room_id, type (wall, floor, opening), value, unit, source | N → 1 room |
| `items` | id, project_id, boq_id, code, description, unit, quantity, cost_total | N → 1 project/boq |
| `boq` | id, project_id, version, is_internal, created_at | 1 → N items; N → 1 project |
| `audit` | id, project_id, user_id, entity_type, entity_id, payload, created_at | — |
| `sync_states` | id, project_id, version, status | — |

---

## 4. Detailed Tables

### 4.1 `projects`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID / Serial PK | |
| code | varchar | Project code |
| name | varchar | Name |
| location | varchar | Site / address |
| project_type | varchar | apt, villa |
| state | varchar | draft, active, completed |
| created_at | timestamp | |
| updated_at | timestamp | |

### 4.2 `buildings`
| Column | Type | Description |
|--------|------|-------------|
| id | PK | |
| project_id | FK → projects | |
| code | varchar | |
| name | varchar | |
| address | varchar | |

### 4.3 `rooms`
| Column | Type | Description |
|--------|------|-------------|
| id | PK | |
| building_id | FK → buildings | |
| code | varchar | e.g. RM-01 |
| name | varchar | |
| area_m2 | numeric | |

### 4.4 `drawings`
| Column | Type | Description |
|--------|------|-------------|
| id | PK | |
| project_id | FK | |
| parent_id | FK (self) | grouping |
| version | integer | incremented on each version |
| name | varchar | file name |
| file_path | varchar | local/cloud path |
| type | varchar | plan, section, elevation |
| status | varchar | raw, processed, failed |

### 4.5 `drawing_types`
Cross-reference catalog for common drawing type codes.

### 4.6 `dimensions`
| Column | Type | Description |
|--------|------|-------------|
| id | PK | |
| room_id | FK → rooms | |
| type | varchar | wall, opening, floor |
| value | numeric | |
| unit | varchar | m, m2 |
| source | varchar | extracted / written |

### 4.7 `boq`
| Column | Type | Description |
|--------|------|-------------|
| id | PK | |
| project_id | FK | |
| version | integer | |
| is_internal | boolean | true = internal, false = client |
| created_at | timestamp | |

### 4.8 `items`
| Column | Type | Description |
|--------|------|-------------|
| id | PK | |
| boq_id | FK → boq | |
| code | varchar | Unique within project |
| description | varchar | Technical description |
| unit | varchar | m2, pcs |
| quantity | numeric | |
| cost_total | numeric | |
| status | varchar | verified, tentative, needs_review |

### 4.9 `audit`
| Column | Type | Description |
|--------|------|-------------|
| id | PK | |
| project_id | FK | |
| user_id | FK | |
| entity_type | varchar | |
| entity_id | FK | |
| payload | jsonb | old/new |
| created_at | timestamp | |

### 4.10 `sync_states`
| Column | Type | Description |
|--------|------|-------------|
| id | PK | |
| project_id | FK | |
| last_sync_at | timestamp | |
| last_sync_token | varchar | for collision-friendly sync |

---

## 5. Versioning & BOQ versioning

### 5.1 Drawings
- Each "upload" is a new row `drawings` with a `version` integer.
- Old versions are **not** deleted; they are marked as archived.
- Rollback: point `current_version` to an older version (soft delete).

### 5.2 BOQ
- `boq.version` is incremented on each "check" (save).
- Previous BOQ snapshots are retained **in full** (including all items).

---

## 6. Synchronization & Conflict Resolution

This is an **offline-first** system. On reconnect:
1. Local edits are the latest work.
2. Cloud changes are applied; a **conflict record** is created when timestamps overlap.
3. Resolution is a combination of:
   - *Last-write with decision log* (most common for audit fields), or
   - *User-driven merge* (for meaningful differences).

The `audit` table records every decision with the user, timestamp, and reason. Restore or deletion is never automatic.

---

## 7. Backup & Restore

- **Local:** scheduled SQLite snapshot to `backups/` (retain 30 days).
- **Cloud:** a copy is made after each sync (retain 90 days).
- **Restore:** restore a point-in-time snapshot; restore to a new project copy for testing.

---

## 8. Scalability Notes

- `drawings` may reach hundreds per project → use pagination, file storage outside DB.
- `items` may be tens of thousands → index (`boq_id`, `code`), partition if needed.
- `dimensions` are lower volume → linear.

---

*Last updated: 12 November 2026*
