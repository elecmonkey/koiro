/** 日期（不含时间），如 "2026/1/1" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN');
}
