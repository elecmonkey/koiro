/** 默认项的位置；接口保证恰好有一个，这里只防空列表 */
export function defaultIndex(items: readonly { isDefault: boolean }[]): number {
  return Math.max(
    items.findIndex((item) => item.isDefault),
    0,
  );
}
