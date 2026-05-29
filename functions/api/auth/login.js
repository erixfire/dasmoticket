import { dbFirst } from '../../utils/db.js';
import { signToken } from '../../utils/auth.js';

export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 });
    }

    const user = await dbFirst(env.DB,
      'SELECT u.*, d.name as department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.email = ? AND u.is_active = 1',
      [email]
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    // NOTE: In production use bcrypt via a Worker with the bcryptjs WASM build
    // For Edge compatibility, this example uses a simple comparison placeholder
    // Replace with: const valid = await bcrypt.compare(password, user.password_hash);
    const valid = password === 'Admin@1234' && user.password_hash.includes('placeholder');
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    const token = await signToken(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name, department_id: user.department_id },
      env.JWT_SECRET,
      parseInt(env.EXPIRY_HOURS || 8)
    );

    return new Response(JSON.stringify({
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, department_name: user.department_name }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: e.message }), { status: 500 });
  }
}
