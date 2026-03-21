use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "modified" | "added" | "deleted" | "untracked" | "renamed"
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommitInfo {
    pub id: String,
    pub message: String,
    pub author: String,
    pub time: i64,
}

fn open_repo(workspace_path: &str) -> Result<git2::Repository, String> {
    git2::Repository::open(workspace_path).map_err(|e| format!("Not a git repository: {}", e))
}

#[tauri::command]
pub fn git_is_repo(workspace_path: String) -> bool {
    git2::Repository::open(&workspace_path).is_ok()
}

#[tauri::command]
pub fn git_branch_current(workspace_path: String) -> Result<String, String> {
    let repo = open_repo(&workspace_path)?;
    let head = repo.head().map_err(|e| e.to_string())?;
    Ok(head
        .shorthand()
        .unwrap_or("HEAD (detached)")
        .to_string())
}

#[tauri::command]
pub fn git_branches(workspace_path: String) -> Result<Vec<String>, String> {
    let repo = open_repo(&workspace_path)?;
    let branches = repo
        .branches(Some(git2::BranchType::Local))
        .map_err(|e| e.to_string())?;

    let mut names = Vec::new();
    for branch in branches {
        let (branch, _) = branch.map_err(|e| e.to_string())?;
        if let Some(name) = branch.name().map_err(|e| e.to_string())? {
            names.push(name.to_string());
        }
    }
    Ok(names)
}

#[tauri::command]
pub fn git_status(workspace_path: String) -> Result<Vec<GitFileStatus>, String> {
    let repo = open_repo(&workspace_path)?;
    let statuses = repo
        .statuses(Some(
            git2::StatusOptions::new()
                .include_untracked(true)
                .recurse_untracked_dirs(true),
        ))
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let st = entry.status();

        if st.contains(git2::Status::INDEX_NEW) {
            results.push(GitFileStatus { path: path.clone(), status: "added".into(), staged: true });
        }
        if st.contains(git2::Status::INDEX_MODIFIED) {
            results.push(GitFileStatus { path: path.clone(), status: "modified".into(), staged: true });
        }
        if st.contains(git2::Status::INDEX_DELETED) {
            results.push(GitFileStatus { path: path.clone(), status: "deleted".into(), staged: true });
        }
        if st.contains(git2::Status::INDEX_RENAMED) {
            results.push(GitFileStatus { path: path.clone(), status: "renamed".into(), staged: true });
        }
        if st.contains(git2::Status::WT_MODIFIED) {
            results.push(GitFileStatus { path: path.clone(), status: "modified".into(), staged: false });
        }
        if st.contains(git2::Status::WT_DELETED) {
            results.push(GitFileStatus { path: path.clone(), status: "deleted".into(), staged: false });
        }
        if st.contains(git2::Status::WT_NEW) {
            results.push(GitFileStatus { path: path.clone(), status: "untracked".into(), staged: false });
        }
        if st.contains(git2::Status::WT_RENAMED) {
            results.push(GitFileStatus { path: path.clone(), status: "renamed".into(), staged: false });
        }
    }
    Ok(results)
}

#[tauri::command]
pub fn git_diff(workspace_path: String, file_path: Option<String>) -> Result<String, String> {
    let repo = open_repo(&workspace_path)?;
    let mut opts = git2::DiffOptions::new();
    if let Some(ref fp) = file_path {
        opts.pathspec(fp);
    }

    let diff = repo
        .diff_index_to_workdir(None, Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let mut output = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let prefix = match line.origin() {
            '+' => "+",
            '-' => "-",
            ' ' => " ",
            _ => "",
        };
        output.push_str(prefix);
        output.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(|e| e.to_string())?;

    Ok(output)
}

#[tauri::command]
pub fn git_stage(workspace_path: String, file_paths: Vec<String>) -> Result<(), String> {
    let repo = open_repo(&workspace_path)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;

    for path in &file_paths {
        let full_path = Path::new(&workspace_path).join(path);
        if full_path.exists() {
            index.add_path(Path::new(path)).map_err(|e| e.to_string())?;
        } else {
            index.remove_path(Path::new(path)).map_err(|e| e.to_string())?;
        }
    }

    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_unstage(workspace_path: String, file_paths: Vec<String>) -> Result<(), String> {
    let repo = open_repo(&workspace_path)?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;

    let mut index = repo.index().map_err(|e| e.to_string())?;

    for path in &file_paths {
        // Reset this path in the index to match HEAD
        if let Ok(entry) = head_tree.get_path(Path::new(path)) {
            let blob = repo.find_blob(entry.id()).map_err(|e| e.to_string())?;
            index
                .add_frombuffer(
                    &git2::IndexEntry {
                        ctime: git2::IndexTime::new(0, 0),
                        mtime: git2::IndexTime::new(0, 0),
                        dev: 0,
                        ino: 0,
                        mode: entry.filemode() as u32,
                        uid: 0,
                        gid: 0,
                        file_size: blob.size() as u32,
                        id: entry.id(),
                        flags: 0,
                        flags_extended: 0,
                        path: path.as_bytes().to_vec(),
                    },
                    blob.content(),
                )
                .map_err(|e| e.to_string())?;
        } else {
            // File didn't exist in HEAD — remove from index
            index.remove_path(Path::new(path)).map_err(|e| e.to_string())?;
        }
    }

    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_commit(workspace_path: String, message: String) -> Result<String, String> {
    let repo = open_repo(&workspace_path)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    let sig = repo.signature().map_err(|e| format!("Git signature not configured: {}", e))?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let parent = head.peel_to_commit().map_err(|e| e.to_string())?;

    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&parent])
        .map_err(|e| e.to_string())?;

    Ok(oid.to_string())
}

#[tauri::command]
pub fn git_log(workspace_path: String, limit: u32) -> Result<Vec<GitCommitInfo>, String> {
    let repo = open_repo(&workspace_path)?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(git2::Sort::TIME)
        .map_err(|e| e.to_string())?;

    let mut commits = Vec::new();
    for (i, oid) in revwalk.enumerate() {
        if i as u32 >= limit {
            break;
        }
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        commits.push(GitCommitInfo {
            id: oid.to_string()[..8].to_string(),
            message: commit.summary().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("Unknown").to_string(),
            time: commit.time().seconds(),
        });
    }
    Ok(commits)
}

#[tauri::command]
pub fn git_checkout_branch(workspace_path: String, branch: String) -> Result<(), String> {
    let repo = open_repo(&workspace_path)?;
    let obj = repo
        .revparse_single(&format!("refs/heads/{}", branch))
        .map_err(|e| format!("Branch not found: {}", e))?;
    repo.checkout_tree(&obj, None).map_err(|e| e.to_string())?;
    repo.set_head(&format!("refs/heads/{}", branch))
        .map_err(|e| e.to_string())?;
    Ok(())
}
