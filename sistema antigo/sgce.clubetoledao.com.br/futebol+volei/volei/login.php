<?php
require_once '../sgce/includes/db.php';

// Se o usuário já estiver logado, redireciona para o painel apropriado
if (isset($_SESSION['user_id'])) {
    if ($_SESSION['user_tipo'] == 'admin') {
        header("Location: /sgce/admin/index.php");
    } else {
        header("Location: /sgce/painel-equipe/index.php");
    }
    exit();
}

$erro = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'];
    $senha = $_POST['senha'];

    if (empty($email) || empty($senha)) {
        $erro = 'Por favor, preencha todos os campos.';
    } else {
        $sql = "SELECT id, nome, senha, tipo FROM usuarios WHERE email = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$email]);
        $usuario = $stmt->fetch();

        if ($usuario && password_verify($senha, $usuario['senha'])) {
            $_SESSION['user_id'] = $usuario['id'];
            $_SESSION['user_nome'] = $usuario['nome'];
            $_SESSION['user_tipo'] = $usuario['tipo'];

            if ($usuario['tipo'] == 'admin') {
                header("Location: /sgce/admin/index.php");
            } else {
                header("Location: /sgce/painel-equipe/index.php");
            }
            exit();
        } else {
            $erro = 'Email ou senha inválidos.';
        }
    }
}
?>
<!doctype html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login - SGCE</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>
    <style>
      body { background-color: #f8f9fa; font-family: 'Poppins', sans-serif; }
      .login-container { min-height: 100vh; }
      .login-card { border-radius: 1rem; border: none; max-width: 450px; }
      .login-brand-icon { font-size: 3rem; color: #0d6efd; }
    </style>
</head>
<body class="d-flex align-items-center justify-content-center login-container">
    <div class="card shadow-lg login-card w-100">
        <div class="card-body p-4 p-md-5">
            <div class="text-center mb-4">
                <i class="fas fa-trophy login-brand-icon"></i>
                <h2 class="mt-2 fw-bold">SGCE</h2>
                <p class="text-muted">Acesse seu painel para continuar</p>
            </div>
            <?php if (!empty($erro)): ?>
                <div class="alert alert-danger d-flex align-items-center" role="alert"><i class="fas fa-exclamation-triangle me-2"></i><div><?= htmlspecialchars($erro) ?></div></div>
            <?php endif; ?>
            <form method="POST">
                <div class="form-floating mb-3">
                    <input type="email" class="form-control" id="email" name="email" placeholder="nome@exemplo.com" required>
                    <label for="email"><i class="fas fa-envelope me-2"></i>Email</label>
                </div>
                <div class="form-floating mb-3">
                    <input type="password" class="form-control" id="senha" name="senha" placeholder="Senha" required>
                    <label for="senha"><i class="fas fa-lock me-2"></i>Senha</label>
                </div>
                <div class="d-grid">
                    <button type="submit" class="btn btn-primary btn-lg fw-bold"><i class="fas fa-sign-in-alt me-2"></i>Entrar</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html>