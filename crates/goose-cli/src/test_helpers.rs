#[cfg(test)]
pub fn run_with_tmp_dir<F: FnOnce() -> T, T>(func: F) -> T {
    let profile = r#"
{
    "profile_items": {
        "default": {
            "provider": "databricks",
            "model": "claude-3-5-sonnet-2",
            "additional_systems": []
        }
    }
}"#;

    run_profile_with_tmp_dir(profile, func)
}

pub fn run_profile_with_tmp_dir<F: FnOnce() -> T, T>(profile: &str, func: F) -> T {
    use std::ffi::OsStr;
    use std::fs;
    use tempfile::tempdir;

    // Helper function to set up a temporary home directory for testing, returns path of that temp dir.
    // Also creates a profiles.json from the passed in profile argument

    let temp_dir = tempdir().unwrap();

    let temp_dir_path = temp_dir.path().to_path_buf();
    println!(
        "Created temporary home directory: {}",
        temp_dir_path.display()
    );
    let profile_path = temp_dir_path
        .join(".config")
        .join("goose")
        .join("profiles.json");
    fs::create_dir_all(profile_path.parent().unwrap()).unwrap();
    fs::write(&profile_path, profile).unwrap();

    temp_env::with_vars(
        [
            ("HOME", Some(temp_dir_path.as_os_str())),
            ("DATABRICKS_HOST", Some(OsStr::new("tmp_host_url"))),
        ],
        func,
    )
}
