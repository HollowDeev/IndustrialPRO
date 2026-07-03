async function testLogin() {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maraltoingenierie@gmail.com', password: 'salemeviado2023' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}
testLogin();
