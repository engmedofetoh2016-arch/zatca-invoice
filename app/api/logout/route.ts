export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  })
}
