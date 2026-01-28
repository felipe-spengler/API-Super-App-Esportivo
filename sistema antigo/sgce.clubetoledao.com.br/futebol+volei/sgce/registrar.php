<?php
require_once 'includes/db.php';

$sucesso = '';
$erro = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome = trim($_POST['nome']);
    $email = trim($_POST['email']);
    $senha = $_POST['senha'];
    $confirmar_senha = $_POST['confirmar_senha'];
    $tipo = $_POST['tipo'];

    if (empty($nome) || empty($email) || empty($senha) || empty($tipo)) {
        $erro = 'Todos os campos são obrigatórios.';
    } elseif ($senha !== $confirmar_senha) {
        $erro = 'As senhas não coincidem.';
    } elseif (strlen($senha) < 6) {
        $erro = 'A senha deve ter no mínimo 6 caracteres.';
    } else {
        try {
            $stmt_check = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
            $stmt_check->execute([$email]);
            if ($stmt_check->fetch()) {
                $erro = 'Este endereço de e-mail já está em uso.';
            } else {
                $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
                $sql = "INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$nome, $email, $senha_hash, $tipo]);
                $sucesso = 'Usuário registrado com sucesso! Você já pode fazer o login.';
            }
        } catch (PDOException $e) {
            $erro = 'Erro ao registrar. Por favor, tente novamente.';
        }
    }
}
?>
<!doctype html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Registro - SGCE</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>
    <style>
      body { background-color: #f8f9fa; font-family: 'Poppins', sans-serif; }
      .register-container { min-height: 100vh; }
      .register-card { border-radius: 1rem; border: none; max-width: 500px; }
      .register-brand-icon { font-size: 3rem; color: #0d6efd; }
    </style>
</head>
<body class="d-flex align-items-center justify-content-center register-container py-4">
    <div class="card shadow-lg register-card w-100">
        <div class="card-body p-4 p-md-5">
            <div class="text-center mb-4">
                <i class="fas fa-user-plus register-brand-icon"></i>
                <h2 class="mt-2 fw-bold">Criar Conta</h2>
                <p class="text-muted">Comece a gerenciar suas competições.</p>
            </div>
            <?php if (!empty($erro)): ?>
                <div class="alert alert-danger d-flex align-items-center" role="alert"><i class="fas fa-exclamation-triangle me-2"></i><div><?= htmlspecialchars($erro) ?></div></div>
            <?php endif; ?>
            <?php if (!empty($sucesso)): ?>
                <div class="alert alert-success">
                    <h4 class="alert-heading">Sucesso!</h4>
                    <p><?= htmlspecialchars($sucesso) ?></p>
                    <hr>
                    <a href="login.php" class="btn btn-primary w-100 fw-bold">Ir para o Login</a>
                </div>
            <?php else: ?>
            <form method="POST" novalidate>
                <div class="form-floating mb-3">
                    <input type="text" class="form-control" id="nome" name="nome" placeholder="Seu nome completo" required value="<?= htmlspecialchars($_POST['nome'] ?? '') ?>">
                    <label for="nome"><i class="fas fa-user me-2"></i>Nome Completo</label>
                </div>
                <div class="form-floating mb-3">
                    <input type="email" class="form-control" id="email" name="email" placeholder="nome@exemplo.com" required value="<?= htmlspecialchars($_POST['email'] ?? '') ?>">
                    <label for="email"><i class="fas fa-envelope me-2"></i>Email</label>
                </div>
                <div class="form-floating mb-3">
                    <input type="password" class="form-control" id="senha" name="senha" placeholder="Senha" required>
                    <label for="senha"><i class="fas fa-lock me-2"></i>Senha (mín. 6 caracteres)</label>
                </div>
                <div class="form-floating mb-3">
                    <input type="password" class="form-control" id="confirmar_senha" name="confirmar_senha" placeholder="Confirme a Senha" required>
                    <label for="confirmar_senha"><i class="fas fa-check-double me-2"></i>Confirme a Senha</label>
                </div>
                <div class="form-floating mb-4">
                  <select class="form-select" id="tipo" name="tipo" required>
                    <option value="lider_equipe" selected>Quero ser um Líder de Equipe</option>
                    <option value="admin">Sou um Administrador</option>
                  </select>
                  <label for="tipo"><i class="fas fa-user-tag me-2"></i>Eu sou...</label>
                </div>
                <div class="d-grid">
                    <button type="submit" class="btn btn-primary btn-lg fw-bold"><i class="fas fa-user-plus me-2"></i>Registrar</button>
                </div>
            </form>
            <?php endif; ?>
            <div class="mt-4 text-center">
                <p class="text-muted mb-0">Já tem uma conta? <a href="login.php" class="fw-bold text-decoration-none">Faça o login aqui!</a></p>
            </div>
        </div>
    </div>
</body>
</html>