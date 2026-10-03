//! 用户管理命令。
//!
//! 只提供不影响运行中服务缓存的操作：新建用户（首次访问时才进缓存）与重设密码（缓存不含密码）。
//! 修改权限、昵称请在网页管理后台进行，否则运行中的服务看不到变化。

use std::io::{self, BufRead, Write};

use anyhow::{Context, bail};
use clap::Subcommand;
use sqlx::PgPool;

use crate::auth::hash_password;

#[derive(Subcommand)]
pub enum UserCommand {
    /// 交互式创建用户
    Add,
    /// 重设用户密码
    Passwd { email: String },
}

pub async fn run(command: UserCommand, pool: &PgPool) -> anyhow::Result<()> {
    match command {
        UserCommand::Add => add(pool).await,
        UserCommand::Passwd { email } => passwd(pool, &email).await,
    }
}

fn ask(prompt: &str) -> anyhow::Result<String> {
    print!("{prompt}");
    io::stdout().flush()?;
    let mut line = String::new();
    io::stdin().lock().read_line(&mut line)?;
    Ok(line.trim().to_owned())
}

fn ask_password() -> anyhow::Result<String> {
    let password = rpassword::prompt_password("密码: ")?;
    if password.chars().count() < 6 {
        bail!("密码至少 6 位");
    }
    if rpassword::prompt_password("确认密码: ")? != password {
        bail!("两次输入的密码不一致");
    }
    Ok(password)
}

async fn add(pool: &PgPool) -> anyhow::Result<()> {
    let email = ask("邮箱: ")?;
    if email.is_empty() {
        bail!("邮箱不能为空");
    }
    let display_name = match ask("昵称（留空则使用邮箱）: ")? {
        name if name.is_empty() => email.clone(),
        name => name,
    };
    let password = ask_password()?;
    let mut permissions = 0;
    for (name, bit) in [("VIEW", 1), ("DOWNLOAD", 2), ("UPLOAD", 4), ("ADMIN", 8)] {
        if ask(&format!("授予 {name} 权限？(y/N): "))?.eq_ignore_ascii_case("y") {
            permissions |= bit;
        }
    }

    let password_hash = hash_password(&password);
    let id = sqlx::query_scalar!(
        r#"INSERT INTO users (email, display_name, password_hash, permissions) VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING RETURNING id"#,
        email,
        display_name,
        password_hash,
        permissions
    )
    .fetch_optional(pool)
    .await?
    .context("该邮箱已被注册")?;
    println!("用户已创建：{id} {email}（{display_name}），权限 {permissions}");
    Ok(())
}

async fn passwd(pool: &PgPool, email: &str) -> anyhow::Result<()> {
    let password = ask_password()?;
    let password_hash = hash_password(&password);
    let updated = sqlx::query!(
        "UPDATE users SET password_hash = $2 WHERE email = $1",
        email,
        password_hash
    )
    .execute(pool)
    .await?
    .rows_affected();
    if updated == 0 {
        bail!("用户不存在：{email}");
    }
    println!("已重设 {email} 的密码");
    Ok(())
}
