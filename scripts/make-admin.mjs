// Asigna el rol admin a un usuario ya registrado, buscándolo por correo.
// Uso: npm run make-admin -- correo@ejemplo.com
// Requiere VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en .env o en el entorno).
import {createClient} from '@supabase/supabase-js';

try {
  process.loadEnvFile();
} catch {
  // Sin .env: se usan las variables del entorno.
}

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error('Uso: npm run make-admin -- correo@ejemplo.com');
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {auth: {persistSession: false, autoRefreshToken: false}});

async function findUser(target) {
  for (let page = 1; ; page++) {
    const {data, error} = await supabase.auth.admin.listUsers({page, perPage: 1000});
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === target);
    if (user || data.users.length < 1000) return user;
  }
}

const user = await findUser(email);
if (!user) {
  console.error(`No existe ningún usuario con el correo ${email}. Debe registrarse primero.`);
  process.exit(1);
}

const {error} = await supabase
  .from('user_roles')
  .upsert({user_id: user.id, role: 'admin'}, {onConflict: 'user_id,role', ignoreDuplicates: true});
if (error) {
  console.error(`No se pudo asignar el rol: ${error.message}`);
  process.exit(1);
}

console.log(`${email} ahora es administrador.`);
