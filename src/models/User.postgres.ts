import { sql } from '@vercel/postgres';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'DIRECTOR' | 'COORDINACION' | 'FACILITADOR';
  password?: string | null;
  created_at: Date;
  updated_at: Date;
}

export const UserModel = {
  async findOne(filter: { email?: string; id?: number }): Promise<User | null> {
    if (filter.email) {
      const result = await sql`SELECT * FROM users WHERE email = ${filter.email} LIMIT 1`;
      return result.rows[0] as User | null;
    }
    if (filter.id) {
      const result = await sql`SELECT * FROM users WHERE id = ${filter.id} LIMIT 1`;
      return result.rows[0] as User | null;
    }
    return null;
  },

  async find(filter: { role?: string } = {}): Promise<User[]> {
    if (filter.role) {
      const result = await sql`SELECT id, name, email FROM users WHERE role = ${filter.role}`;
      return result.rows as User[];
    }
    const result = await sql`SELECT id, name, email FROM users`;
    return result.rows as User[];
  },

  async create(data: { email: string; name?: string; role?: string }): Promise<User> {
    const result = await sql`
      INSERT INTO users (email, name, role)
      VALUES (${data.email}, ${data.name || null}, ${data.role || 'FACILITADOR'})
      RETURNING *
    `;
    return result.rows[0] as User;
  },

  async update(id: number, data: Partial<{ name: string; role: string }>): Promise<User> {
    if (data.name !== undefined && data.role !== undefined) {
      const result = await sql`
        UPDATE users 
        SET name = ${data.name}, role = ${data.role}
        WHERE id = ${id}
        RETURNING *
      `;
      return result.rows[0] as User;
    }
    if (data.name !== undefined) {
      const result = await sql`
        UPDATE users 
        SET name = ${data.name}
        WHERE id = ${id}
        RETURNING *
      `;
      return result.rows[0] as User;
    }
    if (data.role !== undefined) {
      const result = await sql`
        UPDATE users 
        SET role = ${data.role}
        WHERE id = ${id}
        RETURNING *
      `;
      return result.rows[0] as User;
    }
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return result.rows[0] as User;
  }
};

