use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    pub name: String,
    pub full_name: String,
    pub default_branch: String,
    pub url: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullRequest {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub author: String,
    pub source_branch: String,
    pub target_branch: String,
    pub url: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub author: String,
    pub labels: Vec<String>,
    pub url: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CiCheck {
    pub name: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub url: Option<String>,
}

#[async_trait]
pub trait GitProvider: Send + Sync {
    async fn get_repo_info(&self, token: &str) -> Result<RepoInfo, String>;
    async fn list_pull_requests(&self, token: &str, state: &str) -> Result<Vec<PullRequest>, String>;
    async fn create_pull_request(
        &self,
        token: &str,
        title: &str,
        body: &str,
        source: &str,
        target: &str,
    ) -> Result<PullRequest, String>;
    async fn merge_pull_request(&self, token: &str, number: u64) -> Result<(), String>;
    async fn list_issues(&self, token: &str, state: &str) -> Result<Vec<Issue>, String>;
    async fn create_issue(
        &self,
        token: &str,
        title: &str,
        body: &str,
        labels: Vec<String>,
    ) -> Result<Issue, String>;
    async fn get_ci_status(&self, token: &str, ref_name: &str) -> Result<Vec<CiCheck>, String>;
}

/// Detect the git provider from a remote URL
pub fn detect_provider(remote_url: &str) -> Option<String> {
    if remote_url.contains("github.com") {
        Some("github".to_string())
    } else if remote_url.contains("gitlab.com") || remote_url.contains("gitlab.") {
        Some("gitlab".to_string())
    } else {
        // Could be Gitea or unknown — we'll try Gitea later via API check
        Some("gitea".to_string())
    }
}

/// Parse owner/repo from a remote URL (SSH or HTTPS)
pub fn parse_owner_repo(remote_url: &str) -> Option<(String, String)> {
    // HTTPS: https://github.com/owner/repo.git
    // SSH: git@github.com:owner/repo.git
    let url = remote_url.trim_end_matches(".git").trim_end_matches('/');

    if url.contains("://") {
        // HTTPS format
        let parts: Vec<&str> = url.split('/').collect();
        if parts.len() >= 2 {
            let repo = parts[parts.len() - 1];
            let owner = parts[parts.len() - 2];
            return Some((owner.to_string(), repo.to_string()));
        }
    } else if url.contains(':') {
        // SSH format: git@host:owner/repo
        if let Some(path) = url.split(':').last() {
            let parts: Vec<&str> = path.split('/').collect();
            if parts.len() == 2 {
                return Some((parts[0].to_string(), parts[1].to_string()));
            }
        }
    }
    None
}

/// Extract the base API URL from a remote URL for self-hosted instances
pub fn extract_api_base(remote_url: &str) -> String {
    if remote_url.contains("github.com") {
        return "https://api.github.com".to_string();
    }
    if remote_url.contains("gitlab.com") {
        return "https://gitlab.com".to_string();
    }
    // For self-hosted, extract the host
    if remote_url.contains("://") {
        if let Ok(parsed) = url::Url::parse(remote_url) {
            if let Some(host) = parsed.host_str() {
                let scheme = parsed.scheme();
                let port = parsed
                    .port()
                    .map(|p| format!(":{}", p))
                    .unwrap_or_default();
                return format!("{}://{}{}", scheme, host, port);
            }
        }
    } else if remote_url.contains('@') && remote_url.contains(':') {
        // SSH format: git@host:owner/repo — assume HTTPS API
        if let Some(host_part) = remote_url.split('@').nth(1) {
            if let Some(host) = host_part.split(':').next() {
                return format!("https://{}", host);
            }
        }
    }
    "https://localhost".to_string()
}

// ─── Helper to get remote URL from workspace ────────────────────────────────

fn get_origin_url(workspace_path: &str) -> Result<String, String> {
    let repo = git2::Repository::open(workspace_path).map_err(|e| e.to_string())?;
    let remote = repo
        .find_remote("origin")
        .map_err(|e| format!("No origin remote: {}", e))?;
    remote
        .url()
        .map(|s| s.to_string())
        .ok_or_else(|| "Remote URL is not valid UTF-8".to_string())
}

fn get_provider_and_token(workspace_path: &str) -> Result<(String, String, String, String), String> {
    let url = get_origin_url(workspace_path)?;
    let provider = detect_provider(&url).ok_or("Could not detect git provider")?;
    let token = crate::git_auth::get_stored_token_for_remote(&url).ok_or(format!(
        "No token stored for {} — configure a PAT in Settings > Git Providers",
        provider
    ))?;
    let (owner, repo) =
        parse_owner_repo(&url).ok_or("Could not parse owner/repo from remote URL")?;
    Ok((provider, token, owner, repo))
}

// ─── Tauri Commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn git_provider_detect(workspace_path: String) -> Result<Option<String>, String> {
    match get_origin_url(&workspace_path) {
        Ok(url) => Ok(detect_provider(&url)),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub async fn git_provider_repo_info(workspace_path: String) -> Result<RepoInfo, String> {
    let (provider, token, owner, repo) = get_provider_and_token(&workspace_path)?;
    let url = get_origin_url(&workspace_path)?;
    let api_base = extract_api_base(&url);
    match provider.as_str() {
        "github" => {
            crate::git_github::GithubProvider::new(&api_base, &owner, &repo)
                .get_repo_info(&token)
                .await
        }
        "gitlab" => {
            crate::git_gitlab::GitlabProvider::new(&api_base, &owner, &repo)
                .get_repo_info(&token)
                .await
        }
        "gitea" => {
            crate::git_gitea::GiteaProvider::new(&api_base, &owner, &repo)
                .get_repo_info(&token)
                .await
        }
        _ => Err("Unknown provider".to_string()),
    }
}

#[tauri::command]
pub async fn git_provider_list_prs(
    workspace_path: String,
    state: String,
) -> Result<Vec<PullRequest>, String> {
    let (provider, token, owner, repo) = get_provider_and_token(&workspace_path)?;
    let url = get_origin_url(&workspace_path)?;
    let api_base = extract_api_base(&url);
    match provider.as_str() {
        "github" => {
            crate::git_github::GithubProvider::new(&api_base, &owner, &repo)
                .list_pull_requests(&token, &state)
                .await
        }
        "gitlab" => {
            crate::git_gitlab::GitlabProvider::new(&api_base, &owner, &repo)
                .list_pull_requests(&token, &state)
                .await
        }
        "gitea" => {
            crate::git_gitea::GiteaProvider::new(&api_base, &owner, &repo)
                .list_pull_requests(&token, &state)
                .await
        }
        _ => Err("Unknown provider".to_string()),
    }
}

#[tauri::command]
pub async fn git_provider_create_pr(
    workspace_path: String,
    title: String,
    body: String,
    source: String,
    target: String,
) -> Result<PullRequest, String> {
    let (provider, token, owner, repo) = get_provider_and_token(&workspace_path)?;
    let url = get_origin_url(&workspace_path)?;
    let api_base = extract_api_base(&url);
    match provider.as_str() {
        "github" => {
            crate::git_github::GithubProvider::new(&api_base, &owner, &repo)
                .create_pull_request(&token, &title, &body, &source, &target)
                .await
        }
        "gitlab" => {
            crate::git_gitlab::GitlabProvider::new(&api_base, &owner, &repo)
                .create_pull_request(&token, &title, &body, &source, &target)
                .await
        }
        "gitea" => {
            crate::git_gitea::GiteaProvider::new(&api_base, &owner, &repo)
                .create_pull_request(&token, &title, &body, &source, &target)
                .await
        }
        _ => Err("Unknown provider".to_string()),
    }
}

#[tauri::command]
pub async fn git_provider_merge_pr(workspace_path: String, number: u64) -> Result<(), String> {
    let (provider, token, owner, repo) = get_provider_and_token(&workspace_path)?;
    let url = get_origin_url(&workspace_path)?;
    let api_base = extract_api_base(&url);
    match provider.as_str() {
        "github" => {
            crate::git_github::GithubProvider::new(&api_base, &owner, &repo)
                .merge_pull_request(&token, number)
                .await
        }
        "gitlab" => {
            crate::git_gitlab::GitlabProvider::new(&api_base, &owner, &repo)
                .merge_pull_request(&token, number)
                .await
        }
        "gitea" => {
            crate::git_gitea::GiteaProvider::new(&api_base, &owner, &repo)
                .merge_pull_request(&token, number)
                .await
        }
        _ => Err("Unknown provider".to_string()),
    }
}

#[tauri::command]
pub async fn git_provider_list_issues(
    workspace_path: String,
    state: String,
) -> Result<Vec<Issue>, String> {
    let (provider, token, owner, repo) = get_provider_and_token(&workspace_path)?;
    let url = get_origin_url(&workspace_path)?;
    let api_base = extract_api_base(&url);
    match provider.as_str() {
        "github" => {
            crate::git_github::GithubProvider::new(&api_base, &owner, &repo)
                .list_issues(&token, &state)
                .await
        }
        "gitlab" => {
            crate::git_gitlab::GitlabProvider::new(&api_base, &owner, &repo)
                .list_issues(&token, &state)
                .await
        }
        "gitea" => {
            crate::git_gitea::GiteaProvider::new(&api_base, &owner, &repo)
                .list_issues(&token, &state)
                .await
        }
        _ => Err("Unknown provider".to_string()),
    }
}

#[tauri::command]
pub async fn git_provider_create_issue(
    workspace_path: String,
    title: String,
    body: String,
    labels: Vec<String>,
) -> Result<Issue, String> {
    let (provider, token, owner, repo) = get_provider_and_token(&workspace_path)?;
    let url = get_origin_url(&workspace_path)?;
    let api_base = extract_api_base(&url);
    match provider.as_str() {
        "github" => {
            crate::git_github::GithubProvider::new(&api_base, &owner, &repo)
                .create_issue(&token, &title, &body, labels)
                .await
        }
        "gitlab" => {
            crate::git_gitlab::GitlabProvider::new(&api_base, &owner, &repo)
                .create_issue(&token, &title, &body, labels)
                .await
        }
        "gitea" => {
            crate::git_gitea::GiteaProvider::new(&api_base, &owner, &repo)
                .create_issue(&token, &title, &body, labels)
                .await
        }
        _ => Err("Unknown provider".to_string()),
    }
}

#[tauri::command]
pub async fn git_provider_ci_status(
    workspace_path: String,
    ref_name: String,
) -> Result<Vec<CiCheck>, String> {
    let (provider, token, owner, repo) = get_provider_and_token(&workspace_path)?;
    let url = get_origin_url(&workspace_path)?;
    let api_base = extract_api_base(&url);
    match provider.as_str() {
        "github" => {
            crate::git_github::GithubProvider::new(&api_base, &owner, &repo)
                .get_ci_status(&token, &ref_name)
                .await
        }
        "gitlab" => {
            crate::git_gitlab::GitlabProvider::new(&api_base, &owner, &repo)
                .get_ci_status(&token, &ref_name)
                .await
        }
        "gitea" => {
            crate::git_gitea::GiteaProvider::new(&api_base, &owner, &repo)
                .get_ci_status(&token, &ref_name)
                .await
        }
        _ => Err("Unknown provider".to_string()),
    }
}
