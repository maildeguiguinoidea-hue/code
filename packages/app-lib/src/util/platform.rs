//! Platform-related code
use daedalus::minecraft::{Os, OsRule};

// Bit width
#[cfg(target_pointer_width = "64")]
pub const ARCH_WIDTH: &str = "64";

#[cfg(target_pointer_width = "32")]
pub const ARCH_WIDTH: &str = "32";

// Platform rule handling
pub fn os_rule(
    rule: &OsRule,
    java_arch: &str,
    // Minecraft updated over 1.18.2 (supports MacOS Natively)
    minecraft_updated: bool,
) -> bool {
    let mut rule_match = true;

    if let Some(ref arch) = rule.arch {
        rule_match &= !matches!(arch.as_str(), "x86" | "arm");
    }

    if let Some(name) = &rule.name {
        if minecraft_updated
            && (name != &Os::LinuxArm64 || name != &Os::LinuxArm32)
        {
            rule_match &= Os::native() == name.get_os()
                || &Os::native_arch(java_arch) == name;
        } else {
            rule_match &= &Os::native_arch(java_arch) == name;
        }
    }

    // `rule.version` is ignored because it's not usually seen on real recent
    // Minecraft version manifests, its alleged regex syntax is undefined and is
    // likely to not match `Regex`'s, and the way to get the value to match it
    // against is allegedly calling `System.getProperty("os.version")`, which
    // on Windows the OpenJDK implements by fetching the kernel32.dll version,
    // an approach that no public Rust library implements. Moreover, launchers
    // such as PrismLauncher also ignore this field. Code references:
    // - https://github.com/openjdk/jdk/blob/948ade8e7003a41683600428c8e3155c7ed798db/src/java.base/windows/native/libjava/java_props_md.c#L556
    // - https://github.com/PrismLauncher/PrismLauncher/blob/1c20faccf88999474af70db098a4c10e7a03af33/launcher/minecraft/Rule.h#L77
    // - https://github.com/FillZpp/sys-info-rs/blob/60ecf1470a5b7c90242f429934a3bacb6023ec4d/c/windows.c#L23-L38

    rule_match
}

pub fn classpath_separator(java_arch: &str) -> &'static str {
    match Os::native_arch(java_arch) {
        Os::Osx
        | Os::OsxArm64
        | Os::Linux
        | Os::LinuxArm32
        | Os::LinuxArm64
        | Os::Unknown => ":",
        Os::Windows | Os::WindowsArm64 => ";",
    }
}

/// Environment changes that undo what an AppImage sets up for its own process.
///
/// An AppImage passes its bundled libraries to every program it starts through
/// `LD_LIBRARY_PATH` and related variables. Programs that open files or folders
/// with the system's `xdg-open`, such as the game's "Open Pack Folder" button,
/// then fail to load `gio` and fall back to the web browser. Others, like a
/// `PYTHONHOME` pointing into the AppImage, crash the file manager outright.
///
/// Any variable whose value points inside the AppImage is cleaned: path lists
/// keep only their entries from outside it, and other values are removed.
///
/// Each entry is a variable and its new value, where `None` means remove it.
/// Outside an AppImage this returns nothing.
pub fn appimage_free_env()
-> Vec<(std::ffi::OsString, Option<std::ffi::OsString>)> {
    #[cfg(target_os = "linux")]
    {
        use std::path::{Path, PathBuf};

        /// Set by the AppImage's GTK hook for the app alone
        const APPIMAGE_ONLY_VARS: &[&str] = &[
            "GDK_BACKEND",
            "GDK_PIXBUF_MODULE_FILE",
            "GIO_EXTRA_MODULES",
            "GI_TYPELIB_PATH",
            "GSETTINGS_SCHEMA_DIR",
            "GTK_DATA_PREFIX",
            "GTK_EXE_PREFIX",
            "GTK_IM_MODULE_FILE",
            "GTK_PATH",
            "GTK_THEME",
        ];
        if std::env::var_os("APPIMAGE").is_none() {
            return Vec::new();
        }
        let Some(appdir) = std::env::var_os("APPDIR") else {
            return Vec::new();
        };
        let appdir = Path::new(&appdir);

        let mut changes: Vec<_> = APPIMAGE_ONLY_VARS
            .iter()
            .map(|var| ((*var).into(), None))
            .collect();
        for (var, value) in std::env::vars_os() {
            if APPIMAGE_ONLY_VARS.iter().any(|only| var == *only)
                || !std::env::split_paths(&value)
                    .any(|dir| dir.starts_with(appdir))
            {
                continue;
            }
            let kept: Vec<PathBuf> = std::env::split_paths(&value)
                .filter(|dir| {
                    !dir.as_os_str().is_empty() && !dir.starts_with(appdir)
                })
                .collect();
            let new_value = if kept.is_empty() {
                None
            } else {
                std::env::join_paths(kept).ok()
            };
            changes.push((var, new_value));
        }
        changes
    }

    #[cfg(not(target_os = "linux"))]
    Vec::new()
}
