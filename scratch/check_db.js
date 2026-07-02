const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Verificando banco de dados...');
  console.log('URL:', supabaseUrl);
  
  const { data: users, error: errUsers } = await supabase.from('usuarios').select('*');
  if (errUsers) {
    console.error('Erro ao ler usuarios:', errUsers);
  } else {
    console.log('Usuários públicos:', users);
  }

  const { data: authUsers, error: errAuth } = await supabase.auth.admin.listUsers();
  if (errAuth) {
    console.error('Erro ao ler auth.users:', errAuth);
  } else {
    console.log('Usuários auth:', authUsers.users.map(u => ({ id: u.id, email: u.email, meta: u.user_metadata })));
  }
}

run();
