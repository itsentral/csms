<?php

namespace Tests\Feature;

use Tests\TestCase;

class BasicSecurityTest extends TestCase
{
    public function test_guest_is_redirected_to_login_from_dashboard(): void
    {
        $response = $this->get('/dashboard');
        $response->assertRedirect('/login');
    }

    public function test_login_page_is_available(): void
    {
        $response = $this->get('/login');
        $response->assertOk();
    }
}
