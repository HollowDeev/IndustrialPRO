const url = 'https://lfhoccwgartcsfpjoaan.supabase.co/rest/v1/usuarios?select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaG9jY3dnYXJ0Y3NmcGpvYWFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk2NjI1MSwiZXhwIjoyMDk4NTQyMjUxfQ.ZSmQx0-2yYYIEUzZBRFrca_8Iu75R07gb3KGOOF35S8';

async function getUsers() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  console.log('USUARIOS NO BANCO:');
  console.log(await res.text());
  
  const authUrl = 'https://lfhoccwgartcsfpjoaan.supabase.co/auth/v1/admin/users';
  const authRes = await fetch(authUrl, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const authData = await authRes.json();
  console.log('USUARIOS NO AUTH:');
  authData.users.forEach(u => console.log(u.email, u.id));
}
getUsers();
