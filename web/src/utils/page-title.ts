/**
 * 站点名称：构建时从环境变量 PUBLIC_SITE_NAME 读取，未设置则为 "Koiro"
 */
export function getSiteName(): string {
  return import.meta.env.PUBLIC_SITE_NAME || 'Koiro';
}

/** 页面标题：`<页面> - <站点名>` */
export function pageTitle(title?: string): string {
  const siteName = getSiteName();
  return title ? `${title} - ${siteName}` : siteName;
}
