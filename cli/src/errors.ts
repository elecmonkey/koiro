/**
 * 退出码是 skill 与 agent 之间的约定：
 * 0 成功；1 本地失败；2 参数错误；3 需要登录；4 无权限；5 资源不存在；
 * 6 冲突；7 网络失败；8 服务端或响应异常；130 已取消
 */
export class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly exitCode = 2,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function usage(message: string, details?: unknown): never {
  throw new CliError('usage', message, 2, details);
}
