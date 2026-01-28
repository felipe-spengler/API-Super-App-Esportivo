<?php
// /admin/sidebar.php
$pagina_atual = basename($_SERVER['PHP_SELF']);
?>
<div class="d-flex" id="wrapper">

    <div id="page-content-wrapper">
        <nav class="navbar navbar-expand-lg navbar-light">
            <div class="container-fluid">
                <div class="ms-auto">
                    <span class="navbar-text">
                        Bem-vindo, <strong><?= htmlspecialchars($_SESSION['user_nome']) ?></strong>!
                    </span>
                    <a href="/sgce/logout.php"   class="navbar-text danger-link">
                            <i class="fas fa-sign-out-alt fa-fw me-2"></i>Sair
                    </a>
                </div>
            </div>
        </nav>

        <div class="container-fluid p-4">