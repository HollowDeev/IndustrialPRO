const url = 'https://lfhoccwgartcsfpjoaan.supabase.co/rest/v1/usuarios?id=eq.c57dbcfd-99be-478b-a752-9ffce96a952e';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmaG9jY3dnYXJ0Y3NmcGpvYWFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk2NjI1MSwiZXhwIjoyMDk4NTQyMjUxfQ.ZSmQx0-2yYYIEUzZBRFrca_8Iu75R07gb3KGOOF35S8';

async function update() {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ is_super_admin: true })
  });
  console.log(await res.text());
}
update();
