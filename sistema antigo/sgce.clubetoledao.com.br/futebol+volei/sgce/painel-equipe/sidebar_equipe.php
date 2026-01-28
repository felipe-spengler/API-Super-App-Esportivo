<?php
// /painel-equipe/sidebar_equipe.php
$pagina_atual = basename($_SERVER['PHP_SELF']);
?>
<div class="d-flex" id="wrapper">
    <div id="sidebar-wrapper">
        <div class="sidebar-heading">
            <i class="fas fa-users"></i>
            <span>Painel da Equipe</span>
        </div>
        <div class="list-group list-group-flush">
            <a href="index.php" class="list-group-item <?= $pagina_atual == 'index.php' ? 'active' : '' ?>">
                <i class="fas fa-home fa-fw me-2"></i>Início
            </a>
            <a href="menu_campeonato_categoria_equipe.php" class="list-group-item <?= $pagina_atual == 'gerenciar_equipe.php' ? 'active' : '' ?>">
                <i class="fas fa-shield-alt fa-fw me-2"></i>Minhas Equipes
            </a>
            <a href="gerenciar_jogadores.php" class="list-group-item <?= $pagina_atual == 'gerenciar_jogadores.php' ? 'active' : '' ?>">
                <i class="fas fa-users-cog fa-fw me-2"></i>Jogadores
            </a>
            <a href="meus_jogos.php" class="list-group-item <?= $pagina_atual == 'meus_jogos.php' ? 'active' : '' ?>">
                <i class="fas fa-calendar-alt fa-fw me-2"></i>Meus Jogos
            </a>
            <a href="/sgce/logout.php" class="list-group-item danger-link">
                <i class="fas fa-sign-out-alt fa-fw me-2"></i>Sair
            </a>
        </div>
    </div>
    <div id="page-content-wrapper">
        <nav class="navbar navbar-expand-lg navbar-light">
            <div class="container-fluid">
                <button class="btn btn-primary" id="menu-toggle"><i class="fas fa-bars"></i></button>
                <div class="ms-auto">
                    <span class="navbar-text">
                        Equipe: <strong><?= isset($minha_equipe['nome']) ? htmlspecialchars($minha_equipe['nome']) : 'Não definida' ?></strong>
                    </span>
                </div>
            </div>
        </nav>

        <div class="container-fluid p-4">