/**
 * 将 staff name 格式化为显示字符串
 * @param name - 可以是 string 或 string[]
 * @returns 格式化后的字符串，多人用 "、" 连接
 */
export function formatStaffName(name: string | string[] | undefined | null): string {
  if (!name) return "";
  if (Array.isArray(name)) {
    return name.filter(Boolean).join("、");
  }
  return name;
}

/**
 * 格式化完整的 staff 标签（角色 · 姓名）
 * @param role - 角色名
 * @param name - 姓名，可以是 string 或 string[]
 * @returns 格式化后的字符串
 */
export function formatStaffLabel(role: string | undefined | null, name: string | string[] | undefined | null): string {
  const roleText = role || "Staff";
  const nameText = formatStaffName(name);
  return `${roleText} · ${nameText}`;
}
