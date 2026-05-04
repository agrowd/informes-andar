import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import { clientPromise } from './mongodb';
import { UserModel } from '@/models/User.postgres';
import { connectToDB, sql } from './db';
import bcrypt from 'bcryptjs';

const USE_POSTGRES = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL);

export const authOptions: NextAuthOptions = {
  adapter: !USE_POSTGRES && clientPromise ? MongoDBAdapter(clientPromise) : undefined,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('[Auth] Credenciales faltantes');
          return null;
        }

        try {
          await connectToDB();
          
          if (USE_POSTGRES && sql) {
            const user = await UserModel.findOne({ email: credentials.email });
            
            if (!user) {
              console.error(`[Auth] Usuario no encontrado: ${credentials.email}`);
              return null;
            }

            if (!(user as any).password) {
              console.error(`[Auth] Usuario sin contraseña: ${credentials.email}`);
              return null;
            }

            const isValid = await bcrypt.compare(credentials.password, (user as any).password);
            
            if (!isValid) {
              console.error(`[Auth] Contraseña incorrecta para: ${credentials.email}`);
              return null;
            }

            console.log(`[Auth] Login exitoso: ${credentials.email}`);
            return {
              id: String(user.id),
              email: user.email,
              name: user.name || undefined
            };
          } else if (!USE_POSTGRES && process.env.MONGODB_URI) {
            const { UserModel: MongoUserModel } = await import('@/models/User');
            const user = await MongoUserModel.findOne({ email: credentials.email }).lean();
            
            if (!user || !(user as any).password) {
              console.error(`[Auth] Usuario no encontrado o sin contraseña: ${credentials.email}`);
              return null;
            }

            const isValid = await bcrypt.compare(credentials.password, (user as any).password);
            
            if (!isValid) {
              console.error(`[Auth] Contraseña incorrecta para: ${credentials.email}`);
              return null;
            }

            console.log(`[Auth] Login exitoso: ${credentials.email}`);
            return {
              id: String((user as any)._id),
              email: user.email,
              name: user.name || undefined
            };
          } else {
            console.error('[Auth] Base de datos no configurada');
            return null;
          }
        } catch (error: any) {
          console.error('[Auth] Error en authorize:', error?.message || error);
          console.error('[Auth] Stack:', error?.stack);
          return null;
        }
      }
    })
  ],
  session: { strategy: 'jwt', maxAge: 30 * 60 }, // 30 minutos
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Al hacer login, obtener o crear usuario en la base de datos
      if (user?.email) {
        try {
          await connectToDB();
          
          if (USE_POSTGRES && sql) {
            // Buscar usuario en Postgres
            let dbUser = await UserModel.findOne({ email: user.email });
            
            // Si no existe, crearlo como FACILITADOR por defecto
            if (!dbUser) {
              try {
                dbUser = await UserModel.create({
                  email: user.email,
                  name: user.name || undefined,
                  role: 'FACILITADOR'
                });
              } catch (createError: any) {
                console.error('[Auth] Error creando usuario:', createError?.message);
                // Si falla la creación, intentar buscar de nuevo (puede haber sido creado por otra petición)
                dbUser = await UserModel.findOne({ email: user.email });
                if (!dbUser) throw createError;
              }
            }
            
            // Verificar si es Natoh (usuario especial)
            const email = user.email.toLowerCase();
            const isNatoh = email.includes('natoh') || email.includes('nato');
            
            (token as any).role = isNatoh ? 'ADMIN' : (dbUser.role || 'FACILITADOR');
            (token as any).userId = dbUser.id;
            (token as any).isNatoh = isNatoh;
          } else if (!USE_POSTGRES && process.env.MONGODB_URI) {
            // MongoDB fallback
            const { UserModel: MongoUserModel } = await import('@/models/User');
            let dbUser = await MongoUserModel.findOne({ email: user.email }).lean();
            
            if (!dbUser) {
              try {
                dbUser = await MongoUserModel.create({
                  email: user.email,
                  name: user.name,
                  role: 'FACILITADOR'
                });
              } catch (createError: any) {
                console.error('[Auth] Error creando usuario MongoDB:', createError?.message);
                dbUser = await MongoUserModel.findOne({ email: user.email }).lean();
                if (!dbUser) throw createError;
              }
            }
            
            const email = user.email.toLowerCase();
            const isNatoh = email.includes('natoh') || email.includes('nato');
            
            (token as any).role = isNatoh ? 'ADMIN' : ((dbUser as any).role || 'FACILITADOR');
            (token as any).userId = String((dbUser as any)._id);
            (token as any).isNatoh = isNatoh;
          } else {
            console.error('[Auth] Base de datos no configurada');
            // Fallback: verificar si es Natoh por email
            const email = user.email.toLowerCase();
            const isNatoh = email.includes('natoh') || email.includes('nato');
            (token as any).role = isNatoh ? 'ADMIN' : 'FACILITADOR';
            (token as any).isNatoh = isNatoh;
          }
        } catch (error: any) {
          console.error('[Auth] Error obteniendo rol del usuario:', error?.message || error);
          console.error('[Auth] Stack:', error?.stack);
          // Fallback: verificar si es Natoh por email
          const email = user.email.toLowerCase();
          const isNatoh = email.includes('natoh') || email.includes('nato');
          (token as any).role = isNatoh ? 'ADMIN' : 'FACILITADOR';
          (token as any).isNatoh = isNatoh;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).userId || token.sub;
        (session.user as any).role = (token as any).role || 'FACILITADOR';
        (session.user as any).isNatoh = (token as any).isNatoh || false;
      }
      return session;
    }
  }
};


