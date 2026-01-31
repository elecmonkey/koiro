// Re-export everything from @koiro/s3 package
export * from "@koiro/s3";
import { getDefaultS3Client, buildObjectKey as _buildObjectKey } from "@koiro/s3";

// 保持向后兼容的导出
export const s3Client = getDefaultS3Client();

// 向后兼容的 buildObjectKey 函数
export function buildObjectKey(prefix: string, folder: string, filename: string) {
  return _buildObjectKey(prefix, folder, filename);
}
