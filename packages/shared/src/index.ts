// web 与命令行共用的接口类型和客户端逻辑。
// generated/ 由 server 的 `cargo test` 从 server/src/api 导出，不要手改。
export type * from './generated/api';
export {
  LANGUAGES,
  LANGUAGE_NAMES,
  isLanguage,
  languageName,
} from './languages';
export {
  type TokenizedText,
  parseLrc,
  readableText,
  spansFromTokens,
  spansText,
  tokensFromSpans,
} from './lyrics';
export { PERMISSIONS, hasPermission } from './permissions';
