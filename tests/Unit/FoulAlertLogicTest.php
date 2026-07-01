<?php

namespace Tests\Unit;

use App\Http\Controllers\Admin\AdminMatchController;
use PHPUnit\Framework\TestCase;

class FoulAlertLogicTest extends TestCase
{
    public function test_returns_warning_for_fourth_foul(): void
    {
        $controller = new AdminMatchController();
        $method = new \ReflectionMethod($controller, 'resolveFoulAlertType');
        $method->setAccessible(true);

        $this->assertSame('foul_limit_warning', $method->invoke($controller, 4));
    }

    public function test_returns_disqualification_for_fifth_foul(): void
    {
        $controller = new AdminMatchController();
        $method = new \ReflectionMethod($controller, 'resolveFoulAlertType');
        $method->setAccessible(true);

        $this->assertSame('foul_disqualification', $method->invoke($controller, 5));
    }

    public function test_returns_null_for_other_foul_counts(): void
    {
        $controller = new AdminMatchController();
        $method = new \ReflectionMethod($controller, 'resolveFoulAlertType');
        $method->setAccessible(true);

        $this->assertNull($method->invoke($controller, 3));
        $this->assertNull($method->invoke($controller, 6));
    }
}
