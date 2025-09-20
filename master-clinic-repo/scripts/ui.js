// Minimal role helpers. Most pages already check localStorage('role') inline.

export function requireRole(allowed) {
  const role = localStorage.getItem('role');
  if (!role) {
    location.href = './login.html';
    return;
  }
  if (Array.isArray(allowed) && !allowed.includes(role)) {
    alert(`Access restricted (${allowed.join(', ')})`);
    location.href = './login.html';
  }
}

export function currentRole() {
  return localStorage.getItem('role') || null;
}      
