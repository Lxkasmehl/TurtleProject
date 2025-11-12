// Simple JSON-based database for development (no build tools required)
// This works on Windows without admin rights
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
try {
  mkdirSync(dataDir, { recursive: true });
} catch (error) {
  // Directory might already exist, ignore error
}

const dbPath = path.join(dataDir, 'auth.json');

interface User {
  id: number;
  email: string;
  password_hash?: string;
  name: string | null;
  google_id: string | null;
  role: 'community' | 'admin';
  created_at: string;
  updated_at: string;
}

interface Database {
  users: User[];
  nextId: number;
}

// Load or create database
function loadDatabase(): Database {
  if (existsSync(dbPath)) {
    try {
      const data = readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading database, creating new one:', error);
    }
  }

  return {
    users: [],
    nextId: 1,
  };
}

// Save database
function saveDatabase(db: Database): void {
  writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
}

let database = loadDatabase();

// Wrapper to match better-sqlite3 API
class DatabaseWrapper {
  prepare(sql: string) {
    return {
      get: (...params: any[]) => {
        return this.executeQuery(sql, params, 'get');
      },
      run: (...params: any[]) => {
        return this.executeQuery(sql, params, 'run');
      },
      all: (...params: any[]) => {
        return this.executeQuery(sql, params, 'all');
      },
    };
  }

  private executeQuery(sql: string, params: any[], mode: 'get' | 'run' | 'all'): any {
    const upperSql = sql.trim().toUpperCase();

    // SELECT queries
    if (upperSql.startsWith('SELECT')) {
      let results = [...database.users];

      // Simple WHERE clause parsing
      if (sql.includes('WHERE')) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && params.length > 0) {
          const column = whereMatch[1];
          const value = params[0];
          results = results.filter((row: any) => row[column] === value);
        }
      }

      // ORDER BY
      if (sql.includes('ORDER BY')) {
        const orderMatch = sql.match(/ORDER BY\s+(\w+)\s+(ASC|DESC)/i);
        if (orderMatch) {
          const column = orderMatch[1];
          const direction = orderMatch[2].toUpperCase();
          results.sort((a: any, b: any) => {
            const aVal = a[column];
            const bVal = b[column];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return direction === 'DESC' ? -comparison : comparison;
          });
        }
      }

      if (mode === 'get') {
        return results[0] || null;
      }
      return results;
    }

    // INSERT queries
    if (upperSql.startsWith('INSERT')) {
      const insertMatch = sql.match(
        /INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i
      );
      if (insertMatch) {
        const table = insertMatch[1];
        const columns = insertMatch[2].split(',').map((c) => c.trim());
        const values = insertMatch[3].split(',').map((v) => v.trim());

        if (table === 'users') {
          const user: User = {
            id: database.nextId++,
            email: '',
            password_hash: undefined,
            name: null,
            google_id: null,
            role: 'community',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          columns.forEach((col, index) => {
            const value =
              params[index] !== undefined
                ? params[index]
                : values[index] === '?'
                ? null
                : values[index];
            if (col === 'email') user.email = value;
            else if (col === 'password_hash') user.password_hash = value;
            else if (col === 'name') user.name = value;
            else if (col === 'google_id') user.google_id = value;
            else if (col === 'role') user.role = value;
          });

          database.users.push(user);
          saveDatabase(database);

          return {
            lastInsertRowid: user.id,
          };
        }
      }
    }

    // UPDATE queries
    if (upperSql.startsWith('UPDATE')) {
      // Match UPDATE with optional WHERE clause
      const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (updateMatch) {
        const table = updateMatch[1];
        const setClause = updateMatch[2].trim();
        const whereClause = updateMatch[3]?.trim();

        if (table === 'users') {
          // Parse SET clause to get columns and parameter positions
          const setParts = setClause.split(',').map((p) => p.trim());
          const setColumns: { col: string; paramIndex: number }[] = [];
          let paramIndex = 0;

          setParts.forEach((part) => {
            const setMatch = part.match(/(\w+)\s*=\s*(.+)/);
            if (setMatch) {
              const col = setMatch[1];
              const valueExpr = setMatch[2].trim();
              if (valueExpr === '?') {
                setColumns.push({ col, paramIndex });
                paramIndex++;
              } else if (valueExpr === 'CURRENT_TIMESTAMP' && col === 'updated_at') {
                // Handle CURRENT_TIMESTAMP
                setColumns.push({ col: 'updated_at', paramIndex: -1 });
              }
            }
          });

          // Find WHERE parameter index (comes after SET parameters)
          const whereParamIndex = paramIndex;

          let updated = 0;
          database.users.forEach((user) => {
            let matches = true;

            // Check WHERE clause
            if (whereClause) {
              const whereMatch = whereClause.match(/(\w+)\s*=\s*\?/);
              if (whereMatch) {
                const column = whereMatch[1];
                const value = params[whereParamIndex];
                matches = (user as any)[column] === value;
              }
            }

            if (matches) {
              // Apply SET clause updates
              setColumns.forEach(({ col, paramIndex: idx }) => {
                if (col === 'role' && idx >= 0) {
                  user.role = params[idx] as 'community' | 'admin';
                } else if (col === 'password_hash' && idx >= 0) {
                  user.password_hash = params[idx];
                } else if (col === 'name' && idx >= 0) {
                  user.name = params[idx];
                } else if (col === 'google_id' && idx >= 0) {
                  user.google_id = params[idx];
                } else if (col === 'updated_at') {
                  if (idx === -1) {
                    // CURRENT_TIMESTAMP
                    user.updated_at = new Date().toISOString();
                  } else {
                    user.updated_at = params[idx];
                  }
                }
              });
              updated++;
            }
          });

          if (updated > 0) {
            saveDatabase(database);
            // Reload database to ensure consistency
            database = loadDatabase();
          }
        }
      }
    }

    // CREATE TABLE - just ensure structure exists
    if (upperSql.startsWith('CREATE')) {
      // Tables are created implicitly, just ensure structure
      return;
    }

    // CREATE INDEX - no-op for JSON
    if (upperSql.startsWith('CREATE INDEX')) {
      return;
    }

    return { lastInsertRowid: database.nextId - 1 };
  }

  exec(sql: string) {
    // For CREATE TABLE and CREATE INDEX, just ensure structure
    const upperSql = sql.trim().toUpperCase();
    if (upperSql.startsWith('CREATE TABLE') || upperSql.startsWith('CREATE INDEX')) {
      // Structure is implicit in JSON
      return;
    }
  }

  pragma(setting: string) {
    // No-op for JSON database
    return;
  }
}

// Initialize database structure
const db = new DatabaseWrapper();

// Create users table structure (implicit in JSON)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    google_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'community' CHECK(role IN ('community', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create indexes (no-op for JSON)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
`);

export default db;
