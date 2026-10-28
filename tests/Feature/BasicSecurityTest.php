<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BasicSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_portal_shell_is_available_to_guests(): void
    {
        $response = $this->get('/');
        $response->assertOk();
        $response->assertSee('csrf-token', false);
    }

    public function test_the_shell_declares_the_kai_favicon_and_the_files_exist(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('rel="icon" href="/favicon.ico', false)
            ->assertSee('rel="apple-touch-icon" href="/apple-touch-icon.png', false);

        foreach (['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon.png'] as $file) {
            $this->assertFileExists(public_path($file));
            $this->assertGreaterThan(0, filesize(public_path($file)));
        }
        $this->assertSame("\x89PNG", substr((string) file_get_contents(public_path('apple-touch-icon.png')), 0, 4));
    }

    public function test_guest_is_rejected_from_api_state(): void
    {
        $response = $this->getJson('/api/state');
        $response->assertUnauthorized();
    }

    public function test_api_requests_return_json_errors(): void
    {
        $response = $this->postJson('/api/login', ['username' => 'nobody@example.test', 'password' => 'wrong-password'], ['X-Lang' => 'id']);
        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Email atau password tidak sesuai.');
    }

    public function test_validation_messages_follow_the_selected_language(): void
    {
        $this->postJson('/api/login', [], ['X-Lang' => 'id'])->assertUnprocessable()->assertJsonPath('errors.username.0', 'email wajib diisi.');
        $this->postJson('/api/login', [], ['X-Lang' => 'en'])->assertUnprocessable()->assertJsonPath('errors.username.0', 'The email field is required.');
    }

    public function test_server_messages_follow_the_selected_language(): void
    {
        $bad = ['username' => 'nobody@example.test', 'password' => 'wrong-password'];
        $this->postJson('/api/login', $bad, ['X-Lang' => 'id'])->assertStatus(422)->assertJsonPath('message', 'Email atau password tidak sesuai.');
        $this->postJson('/api/login', $bad, ['X-Lang' => 'en'])->assertStatus(422)->assertJsonPath('message', 'Email or password is incorrect.');
    }

    public function test_csp_is_sent_and_frontend_has_no_inline_handlers(): void
    {
        $res = $this->get('/')->assertOk();
        $this->assertStringContainsString("script-src 'self';", $res->headers->get('Content-Security-Policy'));
        $this->assertStringNotContainsString("'unsafe-inline'", explode('style-src', $res->headers->get('Content-Security-Policy'))[0]);
        foreach ([resource_path('views/portal.blade.php'), resource_path('js/portal.js'), resource_path('js/i18n.js'), resource_path('js/qr.js')] as $file) {
            $this->assertSame(0, preg_match('/\son(?:click|change|input|submit|keydown|keyup|load|error)\s*=\s*["\']/i', preg_replace('/data:image\/[^"\'`]+/', '', file_get_contents($file))), $file.' memakai handler inline, yang diblokir CSP.');
        }
        $this->assertSame(0, preg_match('/<script(?![^>]*\ssrc=)[^>]*>/i', file_get_contents(resource_path('views/portal.blade.php'))), 'portal.blade.php memuat skrip inline.');
    }
}
