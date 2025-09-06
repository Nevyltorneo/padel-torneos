-- Crear usuario de prueba para desarrollo
-- Este script debe ejecutarse en Supabase SQL Editor

-- Insertar usuario en auth.users (tabla de autenticación de Supabase)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'admin@test.com',
  '$2a$10$8K1p/a0dURXAm7QfSqiUdeigUwuUK0UfQOaUHEiS6.7bPezAGkTxS', -- password: "123456"
  NOW(),
  NOW(),
  NOW(),
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{}'
) ON CONFLICT (id) DO NOTHING;

-- Insertar usuario en tabla pública
INSERT INTO public.users (
  id,
  name,
  email,
  role,
  created_at,
  updated_at
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'Admin Test',
  'admin@test.com',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
