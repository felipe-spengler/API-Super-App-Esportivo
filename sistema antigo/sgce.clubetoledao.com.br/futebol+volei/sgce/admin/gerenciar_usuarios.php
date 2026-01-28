<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

$notificacao = null;

// Busca todos os usuários do banco, exceto a senha
$stmt = $pdo->query("SELECT id, nome, email, tipo FROM usuarios ORDER BY nome ASC");
$usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-user-shield fa-fw me-2"></i>Gerenciar Usuários</h1>
    <a href="javascript:history.back()" class="btn btn-outline-secondary"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
</div>

<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Usuários do Sistema</h5>
        <button type="button" class="btn btn-success btn-sm" id="btnAdicionarUsuario">
            <i class="fas fa-plus me-2"></i>Adicionar Novo Usuário
        </button>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Tipo</th>
                        <th class="text-end">Ações</th>
                    </tr>
                </thead>
                <tbody id="tabela-usuarios-body">
                    <?php foreach ($usuarios as $usuario): ?>
                        <tr>
                            <td><?= htmlspecialchars($usuario['nome']) ?></td>
                            <td><?= htmlspecialchars($usuario['email']) ?></td>
                            <td>
                                <?php if ($usuario['tipo'] == 'admin'): ?>
                                    <span class="badge bg-danger">Admin</span>
                                <?php else: ?>
                                    <span class="badge bg-primary">Líder de Equipe</span>
                                <?php endif; ?>
                            </td>
                            <td class="text-end">
                                <button class="btn btn-warning btn-sm btn-editar-usuario" 
                                        data-usuario='<?= json_encode($usuario) ?>'
                                        title="Editar">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <?php if ($usuario['id'] != $_SESSION['user_id']): // Não permite excluir a si mesmo ?>
                                <button class="btn btn-danger btn-sm btn-excluir-usuario" 
                                        data-id-usuario="<?= $usuario['id'] ?>" 
                                        data-nome-usuario="<?= htmlspecialchars($usuario['nome']) ?>"
                                        title="Excluir">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal fade" id="modalUsuario" tabindex="-1" aria-labelledby="modalUsuarioLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalUsuarioLabel">Adicionar Usuário</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formUsuario">
                    <input type="hidden" name="id" id="usuario_id">
                    <div class="mb-3">
                        <label for="nome" class="form-label">Nome Completo</label>
                        <input type="text" class="form-control" id="nome" name="nome" required>
                    </div>
                    <div class="mb-3">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" class="form-control" id="email" name="email" required>
                    </div>
                    <div class="mb-3">
                        <label for="senha" class="form-label">Senha</label>
                        <input type="password" class="form-control" id="senha" name="senha">
                        <small id="senhaHelp" class="form-text text-muted">Deixe em branco para não alterar a senha existente.</small>
                    </div>
                    <div class="mb-3">
                        <label for="tipo" class="form-label">Tipo de Usuário</label>
                        <select class="form-select" id="tipo" name="tipo" required>
                            <option value="lider_equipe">Líder de Equipe</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSalvarUsuario" form="formUsuario">Salvar</button>
            </div>
        </div>
    </div>
</div>

<?php
// Bloco para notificações que vêm de um redirecionamento (Sessão)
if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
}
if ($notificacao): ?>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 3500, timerProgressBar: true,
            icon: '<?= htmlspecialchars($notificacao['tipo']) ?>',
            title: '<?= addslashes($notificacao['mensagem']) ?>'
        });
    });
</script>
<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('modalUsuario');
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById('formUsuario');
    const modalLabel = document.getElementById('modalUsuarioLabel');
    const btnSalvar = document.getElementById('btnSalvarUsuario');

    const resetForm = () => {
        form.reset();
        document.getElementById('usuario_id').value = '';
        document.getElementById('senha').setAttribute('required', 'required');
        document.getElementById('senhaHelp').style.display = 'none';
    };

    document.getElementById('btnAdicionarUsuario').addEventListener('click', () => {
        resetForm();
        modalLabel.textContent = 'Adicionar Novo Usuário';
        btnSalvar.textContent = 'Salvar';
        modal.show();
    });

    document.getElementById('tabela-usuarios-body').addEventListener('click', (e) => {
        const editButton = e.target.closest('.btn-editar-usuario');
        if (editButton) {
            resetForm();
            const usuarioData = JSON.parse(editButton.dataset.usuario);
            
            document.getElementById('usuario_id').value = usuarioData.id;
            document.getElementById('nome').value = usuarioData.nome;
            document.getElementById('email').value = usuarioData.email;
            document.getElementById('tipo').value = usuarioData.tipo;
            document.getElementById('senha').removeAttribute('required');
            document.getElementById('senhaHelp').style.display = 'block';

            modalLabel.textContent = 'Editar Usuário';
            btnSalvar.textContent = 'Salvar Alterações';
            modal.show();
        }

        const deleteButton = e.target.closest('.btn-excluir-usuario');
        if (deleteButton) {
            const usuarioId = deleteButton.dataset.idUsuario;
            const usuarioNome = deleteButton.dataset.nomeUsuario;

            Swal.fire({
                title: 'Tem certeza?',
                html: `Deseja excluir o usuário <strong>${usuarioNome}</strong>?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = `excluir_usuario_admin.php?id=${usuarioId}`;
                }
            });
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

        fetch('salvar_usuario_admin.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                modal.hide();
                Swal.fire({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                    icon: 'success', title: data.message
                }).then(() => location.reload());
            } else {
                Swal.fire({ icon: 'error', title: 'Erro de Validação', html: data.errors.join('<br>') });
            }
        })
        .catch(error => Swal.fire('Erro!', 'Ocorreu um problema ao salvar.', 'error'))
        .finally(() => {
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar';
        });
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>