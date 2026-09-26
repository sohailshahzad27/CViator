// frontend/utils/cn.js
// Join class names, dropping falsy values. Keeps conditional Tailwind
// classes readable without pulling in a dependency.

export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default cn;
