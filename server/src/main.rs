use std::time::Duration;

use axum::Router;
use clap::{Parser, Subcommand};
use tokio::net::TcpListener;
use tower_http::{timeout::TimeoutLayer, trace::TraceLayer};
use tracing_subscriber::EnvFilter;

use koiro_server::{cli, config::Config, db, routes, state::AppState, storage::Storage};

#[derive(Parser)]
#[command(version, about = "Koiro server")]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    /// 启动 HTTP 服务（默认）
    Serve,
    /// 执行数据库 migration
    Migrate,
    /// 对象存储维护
    #[command(subcommand)]
    Storage(cli::storage::StorageCommand),
    /// 用户管理
    #[command(subcommand)]
    User(cli::users::UserCommand),
    /// 曲库体检
    #[command(subcommand)]
    Songs(cli::songs::SongCommand),
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // .env 是可选的：生产环境直接用真实环境变量
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| "koiro_server=info,tower_http=info".into()),
        )
        .init();

    let cli = Cli::parse();
    let config = Config::from_env()?;
    let pool = db::connect(&config.database_url).await?;

    match cli.command.unwrap_or(Command::Serve) {
        Command::Migrate => {
            db::MIGRATOR.run(&pool).await?;
            tracing::info!("migrations applied");
            Ok(())
        }
        Command::Storage(command) => {
            db::ensure_migrated(&pool).await?;
            cli::storage::run(command, &Storage::new(&config.s3), &pool).await
        }
        Command::User(command) => {
            db::ensure_migrated(&pool).await?;
            cli::users::run(command, &pool).await
        }
        Command::Songs(command) => {
            db::ensure_migrated(&pool).await?;
            cli::songs::run(command, &pool).await
        }
        Command::Serve => {
            db::ensure_migrated(&pool).await?;
            serve(AppState::new(pool, config)?).await
        }
    }
}

async fn serve(state: AppState) -> anyhow::Result<()> {
    let app = Router::new()
        .nest("/api", routes::router())
        .with_state(state.clone())
        .layer(TraceLayer::new_for_http())
        .layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ));

    let listener = TcpListener::bind(&state.config.bind).await?;
    tracing::info!("listening on {}", listener.local_addr()?);
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut s) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            s.recv().await;
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}
