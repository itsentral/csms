<?php

namespace App\Services;

/**
 * The commit of the deployed release, shown in the UI so reports can name the exact version.
 *
 * Resolution order: APP_COMMIT (config `rchsems.commit`), then `bootstrap/cache/revision.txt` (written by
 * deploy/update.sh), then the repository's own `.git` data. Git is read from files only, never executed.
 */
class AppVersion
{
    private static bool $resolved = false;

    private static ?string $commit = null;

    /** The short (7 character) commit hash, or null when it cannot be determined. */
    public static function commit(): ?string
    {
        if (! self::$resolved) {
            self::$commit = self::normalize((string) config('rchsems.commit'))
                ?? self::fromFile(app()->bootstrapPath('cache/revision.txt'))
                ?? self::fromGit(base_path('.git'));
            self::$resolved = true;
        }

        return self::$commit;
    }

    /** Forget the remembered value (used by tests). */
    public static function flush(): void
    {
        self::$resolved = false;
        self::$commit = null;
    }

    public static function normalize(string $value): ?string
    {
        $value = trim($value);

        return preg_match('/^[0-9a-f]{7,40}$/i', $value) ? strtolower(substr($value, 0, 7)) : null;
    }

    public static function fromFile(string $path): ?string
    {
        return is_file($path) && is_readable($path) ? self::normalize((string) @file_get_contents($path)) : null;
    }

    /** Reads HEAD from a git directory (or a worktree `.git` file) without running git. */
    public static function fromGit(string $gitPath): ?string
    {
        if (is_file($gitPath)) {
            // A linked worktree or submodule: ".git" is a file reading "gitdir: <path>".
            $pointer = trim((string) @file_get_contents($gitPath));
            if (! str_starts_with($pointer, 'gitdir:')) {
                return null;
            }
            $gitPath = trim(substr($pointer, 7));
        }
        $head = self::fromFile($gitPath.'/HEAD');
        if ($head !== null) {
            return $head; // detached HEAD
        }
        $headLine = is_file($gitPath.'/HEAD') ? trim((string) @file_get_contents($gitPath.'/HEAD')) : '';
        if (! preg_match('#^ref: (refs/[A-Za-z0-9._/-]+)$#', $headLine, $m) || str_contains($m[1], '..')) {
            return null;
        }
        $fromRef = self::fromFile($gitPath.'/'.$m[1]);
        if ($fromRef !== null) {
            return $fromRef;
        }
        $packed = $gitPath.'/packed-refs';
        if (is_file($packed)) {
            foreach (preg_split('/\R/', (string) @file_get_contents($packed)) as $line) {
                if (str_ends_with(trim($line), ' '.$m[1])) {
                    return self::normalize(strtok(trim($line), ' '));
                }
            }
        }

        return null;
    }
}
