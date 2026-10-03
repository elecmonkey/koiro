//! 命令行登录的一次性授权码：只存在进程内存里（单实例部署），有容量上限与过期时间

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use uuid::Uuid;

use crate::error::AppError;

pub struct CliGrant {
    pub user_id: Uuid,
    /// 授权时密码哈希的摘要；兑换前改过密码则作废
    pub credential_fingerprint: String,
    pub code_challenge: String,
    pub redirect_uri: String,
}

struct PendingGrant {
    grant: CliGrant,
    expires_at: Instant,
}

#[derive(Clone)]
pub struct CliCodes {
    entries: Arc<Mutex<HashMap<String, PendingGrant>>>,
    capacity: usize,
    ttl: Duration,
}

impl Default for CliCodes {
    fn default() -> Self {
        Self::new(1_000, Duration::from_secs(120))
    }
}

impl CliCodes {
    pub fn new(capacity: usize, ttl: Duration) -> Self {
        Self {
            entries: Arc::new(Mutex::new(HashMap::new())),
            capacity,
            ttl,
        }
    }

    pub fn insert(&self, code_hash: String, grant: CliGrant) -> Result<(), AppError> {
        self.insert_at(code_hash, grant, Instant::now())
    }

    fn insert_at(&self, code_hash: String, grant: CliGrant, now: Instant) -> Result<(), AppError> {
        let mut entries = self
            .entries
            .lock()
            .map_err(|_| anyhow::anyhow!("CLI grant store lock poisoned"))?;
        // 同一用户重新发起时替换掉旧的；不为别人的请求挤掉仍有效的授权
        entries.retain(|_, pending| pending.expires_at > now && pending.grant.user_id != grant.user_id);
        if entries.len() >= self.capacity {
            return Err(AppError::BadRequest("待完成的命令行登录过多，请稍后再试".into()));
        }
        entries.insert(
            code_hash,
            PendingGrant {
                grant,
                expires_at: now + self.ttl,
            },
        );
        Ok(())
    }

    /// 校验通过才移除；绑定不符时授权码保持原样，过期的直接删除
    pub fn consume(
        &self,
        code_hash: &str,
        challenge: &str,
        redirect_uri: &str,
    ) -> Result<CliGrant, AppError> {
        self.consume_at(code_hash, challenge, redirect_uri, Instant::now())
    }

    fn consume_at(
        &self,
        code_hash: &str,
        challenge: &str,
        redirect_uri: &str,
        now: Instant,
    ) -> Result<CliGrant, AppError> {
        let invalid = || AppError::Unauthorized("授权码无效或已过期");
        let mut entries = self
            .entries
            .lock()
            .map_err(|_| anyhow::anyhow!("CLI grant store lock poisoned"))?;
        let pending = entries.get(code_hash).ok_or_else(invalid)?;
        if pending.expires_at <= now {
            entries.remove(code_hash);
            return Err(invalid());
        }
        if pending.grant.code_challenge != challenge || pending.grant.redirect_uri != redirect_uri {
            return Err(invalid());
        }
        // 校验与移除在同一把锁内完成，中间没有 await
        Ok(entries
            .remove(code_hash)
            .expect("checked under the same lock")
            .grant)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CALLBACK: &str = "http://127.0.0.1:56333/callback";

    fn grant(user_id: Uuid) -> CliGrant {
        CliGrant {
            user_id,
            credential_fingerprint: "fingerprint".into(),
            code_challenge: "challenge".into(),
            redirect_uri: CALLBACK.into(),
        }
    }

    #[test]
    fn mismatched_bindings_do_not_consume() {
        let store = CliCodes::default();
        let user = Uuid::new_v4();
        store.insert("code".into(), grant(user)).unwrap();
        assert!(store.consume("code", "wrong", CALLBACK).is_err());
        assert!(
            store
                .consume("code", "challenge", "http://127.0.0.1:1/callback")
                .is_err()
        );
        assert_eq!(
            store.consume("code", "challenge", CALLBACK).unwrap().user_id,
            user
        );
        assert!(store.consume("code", "challenge", CALLBACK).is_err());
    }

    #[test]
    fn expired_codes_are_rejected_and_free_capacity() {
        let now = Instant::now();
        let ttl = Duration::from_secs(120);
        let store = CliCodes::new(1, ttl);
        store.insert_at("old".into(), grant(Uuid::new_v4()), now).unwrap();
        assert!(store.consume_at("old", "challenge", CALLBACK, now + ttl).is_err());
        store
            .insert_at("fresh".into(), grant(Uuid::new_v4()), now + ttl * 2)
            .unwrap();
        assert!(
            store
                .consume_at("fresh", "challenge", CALLBACK, now + ttl * 2)
                .is_ok()
        );
    }

    #[test]
    fn capacity_allows_replacing_own_grant() {
        let store = CliCodes::new(1, Duration::from_secs(120));
        let user = Uuid::new_v4();
        store.insert("first".into(), grant(user)).unwrap();
        assert!(store.insert("other".into(), grant(Uuid::new_v4())).is_err());
        store.insert("replacement".into(), grant(user)).unwrap();
        assert!(store.consume("first", "challenge", CALLBACK).is_err());
        assert!(store.consume("replacement", "challenge", CALLBACK).is_ok());
    }
}
