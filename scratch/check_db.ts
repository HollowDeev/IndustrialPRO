import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  console.log('Verificando banco de dados...')
  console.log('URL:', supabaseUrl)
  
  const { data: users, error: errUsers } = await supabase.from('usuarios').select('*')
  if (errUsers) {
    console.error('Erro ao ler usuarios:', errUsers)
  } else {
    console.log('Usuários públicos:', users)
  }

  // Tentar ler auth.users usando o admin client
  const { data: authUsers, error: errAuth } = await supabase.auth.admin.listUsers()
  if (errAuth) {
    console.error('Erro ao ler auth.users:', errAuth)
  } else {
    console.log('Usuários auth:', authUsers.users.map(u => ({ id: u.id, email: u.email, meta: u.user_metadata })))
  }
}

run()
