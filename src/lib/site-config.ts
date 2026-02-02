/**
 * 获取站点名称
 * 从环境变量 NEXT_PUBLIC_SITE_NAME 读取，如果未设置则默认为 "Koiro"
 */
export function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME || "Koiro";
}
