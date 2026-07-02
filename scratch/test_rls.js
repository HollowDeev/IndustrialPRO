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
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

// Cliente Anônimo (simulando o navegador/middleware)
const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  console.log('Testando query de RLS com cliente anônimo...');
  
  // Fazer login como o superadmin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'maraltoingenierie@gmail.com',
    password: 'XJ@YG48#DtC$q&AS*^V*7x5@&7zobKzPgWDRK*C$3tz3CZ754jLD689%v^#G@edp!'
  });

  if (authError) {
    console.error('Erro de login:', authError.message);
    return;
  }

  console.log('Login feito com sucesso. ID:', authData.user.id);

  // Tentar fazer a query que falha com 500
  const { data, error } = await supabase
    .from('usuarios')
    .select('is_super_admin')
    .eq('id', authData.user.id)
    .single();

  if (error) {
    console.error('Erro na query de RLS:', error);
  } else {
    console.log('Resultado da query:', data);
  }
}

run();
