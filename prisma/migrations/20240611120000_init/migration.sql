-- CreateEnum
CREATE TABLE IF NOT EXISTS "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" TEXT NOT NULL UNIQUE,
    "project_name" TEXT NOT NULL,
    "client" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "pm" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "planned_effort_h" REAL NOT NULL,
    "coeff" REAL,
    "adjusted_effort_h" REAL NOT NULL,
    "priority" INTEGER,
    "tags" TEXT,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProcessMaster" (
    "process_code" TEXT NOT NULL PRIMARY KEY,
    "process_name" TEXT NOT NULL,
    "default_coeff" REAL NOT NULL,
    "description" TEXT
);

CREATE TABLE IF NOT EXISTS "MonthlyPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "week_start" DATETIME NOT NULL,
    "project_id" INTEGER NOT NULL,
    "task_name" TEXT NOT NULL,
    "assignee" TEXT NOT NULL,
    "process_code" TEXT NOT NULL,
    "planned_h" REAL NOT NULL,
    "coeff" REAL NOT NULL,
    "adjusted_h" REAL NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyPlan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyPlan_process_code_fkey" FOREIGN KEY ("process_code") REFERENCES "ProcessMaster"("process_code") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Resource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assignee" TEXT NOT NULL UNIQUE,
    "role" TEXT,
    "base_capacity_h_per_month" REAL NOT NULL,
    "holiday_hours" REAL NOT NULL,
    "availability_h" REAL NOT NULL,
    "allocated_h" REAL NOT NULL,
    "utilization" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MiscTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "task_id" TEXT NOT NULL UNIQUE,
    "task_name" TEXT NOT NULL,
    "assignee" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "planned_h" REAL NOT NULL,
    "coeff" REAL NOT NULL,
    "adjusted_h" REAL NOT NULL,
    "note" TEXT,
    "process_code" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MiscTask_process_code_fkey" FOREIGN KEY ("process_code") REFERENCES "ProcessMaster"("process_code") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT
);

CREATE TABLE IF NOT EXISTS "Holiday" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL UNIQUE,
    "name" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "author" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diff_json" TEXT
);

CREATE INDEX IF NOT EXISTS "MonthlyPlan_date_idx" ON "MonthlyPlan" ("date");
CREATE INDEX IF NOT EXISTS "MonthlyPlan_assignee_idx" ON "MonthlyPlan" ("assignee");
CREATE INDEX IF NOT EXISTS "MiscTask_assignee_idx" ON "MiscTask" ("assignee");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_idx" ON "AuditLog" ("entity");
