use serde::Serialize;
use std::fs;
use walkdir::WalkDir;

#[derive(Serialize, Clone)]
pub struct SearchResult {
    pub file: String,
    pub line: u32,
    pub col: u32,
    pub text: String,
    pub match_text: String,
}

/// Directories to always skip when searching.
const SKIP_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "__pycache__",
    ".julia",
    "dist",
    ".next",
    ".vscode",
];

/// Maximum total results to return.
const MAX_RESULTS: usize = 5000;

/// Maximum file size (in bytes) to search — skip very large files.
const MAX_FILE_SIZE: u64 = 2 * 1024 * 1024; // 2 MB

fn is_likely_binary(buf: &[u8]) -> bool {
    buf.iter().take(512).any(|&b| b == 0)
}

#[tauri::command]
pub fn fs_search_files(
    workspace: String,
    query: String,
    is_regex: bool,
    case_sensitive: bool,
    file_glob: Option<String>,
) -> Result<Vec<SearchResult>, String> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let re = if is_regex {
        regex::RegexBuilder::new(&query)
            .case_insensitive(!case_sensitive)
            .build()
            .map_err(|e| format!("Invalid regex: {}", e))?
    } else {
        let escaped = regex::escape(&query);
        regex::RegexBuilder::new(&escaped)
            .case_insensitive(!case_sensitive)
            .build()
            .map_err(|e| format!("Search error: {}", e))?
    };

    // Compile optional glob filter
    let glob_pattern = file_glob.as_deref().and_then(|g| {
        glob::Pattern::new(g).ok()
    });

    let mut results = Vec::new();

    for entry in WalkDir::new(&workspace)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() {
                let name = e.file_name().to_string_lossy();
                // Skip hidden directories (except the root ".")
                if name.starts_with('.') && name != "." {
                    return false;
                }
                // Skip known noisy directories
                !SKIP_DIRS.contains(&name.as_ref())
            } else {
                true
            }
        })
    {
        if results.len() >= MAX_RESULTS {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();

        // Check file size
        if let Ok(meta) = path.metadata() {
            if meta.len() > MAX_FILE_SIZE {
                continue;
            }
        }

        // Check glob filter
        if let Some(ref pat) = glob_pattern {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            if !pat.matches(&name) {
                continue;
            }
        }

        // Read file
        let content = match fs::read(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // Skip binary files
        if is_likely_binary(&content) {
            continue;
        }

        let text = match String::from_utf8(content) {
            Ok(t) => t,
            Err(_) => continue,
        };

        let file_path = path.to_string_lossy().to_string();

        for (line_idx, line) in text.lines().enumerate() {
            if results.len() >= MAX_RESULTS {
                break;
            }
            if let Some(m) = re.find(line) {
                results.push(SearchResult {
                    file: file_path.clone(),
                    line: (line_idx + 1) as u32,
                    col: (m.start() + 1) as u32,
                    text: line.to_string(),
                    match_text: m.as_str().to_string(),
                });
            }
        }
    }

    Ok(results)
}
