// 每次跑某一条 E2E 流程前手动执行一次：node scripts/seed.ts <scenario>
// 负责：确认 schema 存在（没有就应用一次 migrations）、清空业务表、插入这条流程要用的初始数据。
// 只用 psql 操作数据库，不依赖任何 npm 的 Postgres 客户端。
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ACCOUNTS } from '../fixtures/accounts.ts';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(
    '请先 export DATABASE_URL 指向 docker-compose 起的测试库（见 .env.server.example）',
  );
  process.exit(1);
}

const MIGRATION_FILE = fileURLToPath(
  new URL('../../../server/migrations/0001_init.sql', import.meta.url),
);

const SCENARIOS = [
  'create-song',
  'playlist-ownership',
  'avatar-permissions',
  'delete-user-with-content',
] as const;
type Scenario = (typeof SCENARIOS)[number];

function psql(sql: string): string {
  return execFileSync(
    'psql',
    [DATABASE_URL!, '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql],
    {
      encoding: 'utf8',
    },
  );
}

/** 与 server/src/auth/password.rs 的 `hash_password` 兼容：Node scryptSync 默认参数 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/** 这批测试数据里用到的字符串都是我们自己写的常量，单引号转义就够用，不需要真正的参数化 */
function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function ensureSchema() {
  const exists = psql("SELECT to_regclass('public.users') IS NOT NULL").trim();
  if (exists === 't') return;
  console.log('users 表不存在，先跑一遍 migrations ...');
  execFileSync(
    'psql',
    [DATABASE_URL!, '-v', 'ON_ERROR_STOP=1', '-f', MIGRATION_FILE],
    { stdio: 'inherit' },
  );
}

function reset() {
  // song_playlists/lyrics/audio_versions 都是 songs/playlists 的 ON DELETE CASCADE 子表
  psql('TRUNCATE TABLE songs, playlists, users CASCADE');
}

function createUser(
  email: string,
  displayName: string,
  password: string,
  permissionBits: number,
): string {
  const id = randomUUID();
  psql(
    `INSERT INTO users (id, email, display_name, password_hash, permissions)
     VALUES ('${id}', ${sqlString(email)}, ${sqlString(displayName)}, ${sqlString(hashPassword(password))}, ${permissionBits})`,
  );
  return id;
}

/** img/、music/ 前缀即可通过后端的 key 校验；这批种子歌曲不需要对象真的存在于对象存储，
 * 列表页用得到标题/数量，详情页的封面会是张裂图，这批 flow 不断言封面 */
function createSong(creatorId: string, title: string): string {
  const songId = randomUUID();
  psql(
    `INSERT INTO songs (id, title, description, staff, cover_object_id, created_by)
     VALUES ('${songId}', ${sqlString(title)}, '', '[]'::jsonb, 'img/seed-placeholder.jpg', '${creatorId}')`,
  );
  psql(
    `INSERT INTO audio_versions (id, song_id, name, position, is_default, object_id)
     VALUES ('${randomUUID()}', '${songId}', '主版本', 0, true, 'music/seed-placeholder.mp3')`,
  );
  return songId;
}

const VIEW = 1;
const DOWNLOAD = 2;
const UPLOAD = 4;
const ADMIN = 8;
const UPLOADER_BITS = VIEW | DOWNLOAD | UPLOAD;
const ADMIN_BITS = VIEW | DOWNLOAD | UPLOAD | ADMIN;

function seed(scenario: Scenario) {
  ensureSchema();
  reset();

  const a = createUser(
    ACCOUNTS.uploaderA.email,
    ACCOUNTS.uploaderA.displayName,
    ACCOUNTS.uploaderA.password,
    UPLOADER_BITS,
  );
  const b = createUser(
    ACCOUNTS.uploaderB.email,
    ACCOUNTS.uploaderB.displayName,
    ACCOUNTS.uploaderB.password,
    UPLOADER_BITS,
  );
  createUser(
    ACCOUNTS.admin.email,
    ACCOUNTS.admin.displayName,
    ACCOUNTS.admin.password,
    ADMIN_BITS,
  );

  switch (scenario) {
    case 'create-song':
    case 'avatar-permissions':
      // 这两条流程只需要三个干净的账号，不需要预置内容
      break;
    case 'playlist-ownership':
      createSong(a, '种子曲目一');
      createSong(a, '种子曲目二');
      break;
    case 'delete-user-with-content':
      createSong(b, '种子曲目：B 的孤品');
      break;
  }

  console.log(`已为场景 "${scenario}" 重置数据库并写入种子数据`);
}

const scenario = process.argv[2] as Scenario | undefined;
if (!scenario || !SCENARIOS.includes(scenario)) {
  console.error(`用法：node scripts/seed.ts <${SCENARIOS.join(' | ')}>`);
  process.exit(1);
}
seed(scenario);
