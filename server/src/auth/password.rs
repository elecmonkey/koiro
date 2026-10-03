//! 与旧版 Node 实现兼容的 scrypt 哈希：`scrypt:<salt>:<hex hash>`。
//! 参数取 Node `crypto.scryptSync` 默认值（N=2^14, r=8, p=1, 64 字节）；
//! salt 是 32 位 hex 字符串，按 UTF-8 字节参与计算（不做 hex 解码）。

use std::sync::LazyLock;

use scrypt::{Params, scrypt};
use subtle::ConstantTimeEq;

const KEY_LEN: usize = 64;

fn params() -> Params {
    Params::new(14, 8, 1).expect("valid scrypt params")
}

fn derive(password: &str, salt: &str) -> [u8; KEY_LEN] {
    let mut out = [0u8; KEY_LEN];
    scrypt(password.as_bytes(), salt.as_bytes(), &params(), &mut out).expect("valid output length");
    out
}

pub fn hash_password(password: &str) -> String {
    let salt = hex::encode(rand::random::<[u8; 16]>());
    let hash = hex::encode(derive(password, &salt));
    format!("scrypt:{salt}:{hash}")
}

pub fn verify_password(password: &str, stored: &str) -> bool {
    let mut parts = stored.splitn(3, ':');
    let (Some("scrypt"), Some(salt), Some(hash)) = (parts.next(), parts.next(), parts.next()) else {
        return false;
    };
    let Ok(expected) = hex::decode(hash) else {
        return false;
    };
    if expected.len() != KEY_LEN {
        return false;
    }
    derive(password, salt).ct_eq(&expected).into()
}

/// 用户不存在时也做一次同等开销的校验，避免通过响应时间探测邮箱是否存在
pub fn verify_dummy(password: &str) {
    static DUMMY: LazyLock<String> = LazyLock::new(|| hash_password("koiro-dummy-password"));
    let _ = verify_password(password, &DUMMY);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip() {
        let stored = hash_password("hunter2");
        assert!(verify_password("hunter2", &stored));
        assert!(!verify_password("hunter3", &stored));
    }

    #[test]
    fn verifies_node_generated_hash() {
        // node -e 'const c=require("crypto");const s="00112233445566778899aabbccddeeff";
        //   console.log(`scrypt:${s}:${c.scryptSync("koiro",s,64).toString("hex")}`)'
        let stored = include_str!("testdata/node_scrypt_hash.txt").trim();
        assert!(verify_password("koiro", stored));
        assert!(!verify_password("koiro!", stored));
    }

    #[test]
    fn rejects_malformed() {
        assert!(!verify_password("x", ""));
        assert!(!verify_password("x", "bcrypt:a:b"));
        assert!(!verify_password("x", "scrypt:salt:nothex"));
    }
}
