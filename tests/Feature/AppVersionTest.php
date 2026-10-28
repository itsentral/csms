<?php

namespace Tests\Feature;

use App\Services\AppVersion;
use Tests\TestCase;

class AppVersionTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        AppVersion::flush();
        $this->dir = sys_get_temp_dir().'/appversion-'.bin2hex(random_bytes(4));
        mkdir($this->dir.'/refs/heads', 0777, true);
    }

    protected function tearDown(): void
    {
        AppVersion::flush();
        exec('rm -rf '.escapeshellarg($this->dir));
        parent::tearDown();
    }

    public function test_it_reads_the_commit_from_a_branch_ref(): void
    {
        file_put_contents($this->dir.'/HEAD', "ref: refs/heads/main\n");
        file_put_contents($this->dir.'/refs/heads/main', "1d2ea1d0123456789abcdef0123456789abcdef0\n");

        $this->assertSame('1d2ea1d', AppVersion::fromGit($this->dir));
    }

    public function test_it_reads_the_commit_from_packed_refs_and_a_detached_head(): void
    {
        file_put_contents($this->dir.'/HEAD', "ref: refs/heads/main\n");
        file_put_contents($this->dir.'/packed-refs', "# pack-refs\nabcdef0123456789abcdef0123456789abcdef01 refs/heads/main\n");
        $this->assertSame('abcdef0', AppVersion::fromGit($this->dir));

        file_put_contents($this->dir.'/HEAD', "9787545abcdef0123456789abcdef0123456789a\n");
        $this->assertSame('9787545', AppVersion::fromGit($this->dir));
    }

    public function test_it_ignores_malformed_data(): void
    {
        file_put_contents($this->dir.'/HEAD', "ref: refs/heads/../../etc/passwd\n");
        $this->assertNull(AppVersion::fromGit($this->dir));

        file_put_contents($this->dir.'/HEAD', "not a hash\n");
        $this->assertNull(AppVersion::fromGit($this->dir));
        $this->assertNull(AppVersion::normalize('<script>alert(1)</script>'));
    }

    public function test_it_falls_back_to_the_revision_file_written_by_the_deploy_script(): void
    {
        mkdir($this->dir.'/cache');
        file_put_contents($this->dir.'/cache/revision.txt', "9787545\n");
        config(['rchsems.commit' => null]);
        $this->app->useBootstrapPath($this->dir);

        $this->assertSame('9787545', AppVersion::commit());
    }

    public function test_the_configured_commit_is_shown_on_the_login_shell(): void
    {
        config(['rchsems.commit' => 'ABCDEF1234']);

        $this->get('/')
            ->assertOk()
            ->assertSee('name="app-version" content="abcdef1"', false)
            ->assertSee('Versi abcdef1');
    }
}
