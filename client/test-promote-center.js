async function test() {
  try {
    const res = await fetch('http://localhost:4000/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: '+998915817711', password: 'DecodeM3' })
    });
    const { token } = await res.json();

    const promoteRes = await fetch('http://localhost:4000/api/admin/centers/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        user_id: 2,
        center_name: 'Test Center Promoted',
        max_session_users: 55
      })
    });
    const promoteData = await promoteRes.json();
    console.log("Promote response:", promoteRes.status, promoteData);
  } catch (err) {
    console.error(err);
  }
}
test();
