<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Variável para controlar as notificações na página
$notificacao = null;

// Buscar todas as EQUIPES para o dropdown
$stmt_equipes = $pdo->prepare("SELECT id, nome FROM equipes ORDER BY nome ASC");
$stmt_equipes->execute();
$equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

// Buscar todos os PARTICIPANTES com contagem de cartões
$stmt_participantes = $pdo->prepare("
    SELECT 
        participantes.*, 
        equipes.nome AS nome_equipe, 
        COALESCE(SUM(CASE WHEN sumulas_eventos.tipo_evento = 'Cartão Amarelo' THEN 1 ELSE 0 END), 0) AS cartoes_amarelos,
        COALESCE(SUM(CASE WHEN sumulas_eventos.tipo_evento = 'Cartão Vermelho' THEN 1 ELSE 0 END), 0) AS cartoes_vermelhos,
        COALESCE(SUM(CASE WHEN sumulas_eventos.tipo_evento = 'Cartão Azul' THEN 1 ELSE 0 END), 0) AS cartoes_azuis
    FROM participantes 
    LEFT JOIN equipes ON equipes.id = participantes.id_equipe 
    LEFT JOIN sumulas_eventos ON sumulas_eventos.id_participante = participantes.id 
        AND sumulas_eventos.tipo_evento IN ('Cartão Amarelo', 'Cartão Vermelho', 'Cartão Azul')
    GROUP BY participantes.id
    ORDER BY participantes.nome_completo ASC
");
$stmt_participantes->execute();
$participantes = $stmt_participantes->fetchAll(PDO::FETCH_ASSOC);

// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<style>
.table-danger {
    background-color: #f8d7da !important; /* Cor vermelha clara para cartão vermelho */
}
.text-decoration-line-through {
    text-decoration: line-through; /* Riscar a linha */
}
</style>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="participantes_admin.php">Participantes</a></li>
    </ol>
</nav>

<div class="card mt-4">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="fas fa-users fa-fw me-2"></i>Participantes da Equipe</h5>
        <button type="button" class="btn btn-success btn-sm" id="btnAdicionarParticipante">
            <i class="fas fa-plus me-2"></i>Adicionar Novo Participante
        </button>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Nome Completo</th>
                        <th>Apelido</th>
                        <th>Equipe</th>
                        <th>Posição</th>
                        <th>Número</th>
                        <th>Cartões</th>
                        <th class="text-end">Ações</th>
                    </tr>
                </thead>
                <tbody id="tabela-participantes-body">
                    <?php if (count($participantes) > 0): ?>
                        <?php foreach ($participantes as $participante): ?>
                        <?php 
                            $sql = "SELECT id, src FROM fotos_participantes WHERE participante_id = :participante_id";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute(['participante_id' => $participante['id']]);
                            $fotos = $stmt->fetchAll(PDO::FETCH_ASSOC);
                            $participante["fotos"] = $fotos;

                            // Lógica para cartões
                            $classeLinha = '';
                            if ($participante['cartoes_vermelhos'] > 0) {
                                $classeLinha = 'table-danger';
                            } elseif ($participante['cartoes_amarelos'] >= 3) {
                                $classeLinha = 'text-decoration-line-through table-danger';
                            }
                        ?>
                            <tr class="<?= $classeLinha ?>">
                                <td><?= htmlspecialchars($participante['nome_completo']) ?></td>
                                <td><?= htmlspecialchars($participante['apelido'] ?? 'N/A') ?></td>
                                <td><?= htmlspecialchars($participante['nome_equipe']) ?></td>
                                <td><?= htmlspecialchars($participante['posicao'] ?? 'N/A') ?></td>
                                <td><?= htmlspecialchars($participante['numero_camisa'] ?? 'N/A') ?></td>
                                <td>
                                    <span class="badge bg-warning"><?= $participante['cartoes_amarelos'] ?> 🟨</span>
                                    <span class="badge bg-danger"><?= $participante['cartoes_vermelhos'] ?> 🟥</span>
                                    <span class="badge bg-primary"><?= $participante['cartoes_azuis'] ?> 🟦</span>
                                </td>
                                <td class="text-end">
                                    <button class="btn btn-warning btn-sm btn-editar-participante" data-participante='<?= json_encode($participante) ?>' title="Editar"><i class="fas fa-pencil-alt"></i></button>
                                    <button class="btn btn-primary btn-sm btn-editar-fotos" data-participante='<?= json_encode($participante) ?>' title="Fotos"><i class="fas fa-image"></i></button>
                                    <button class="btn btn-info btn-sm btn-gerenciar-cartoes" data-id-participante="<?= $participante['id'] ?>" data-nome-participante="<?= htmlspecialchars($participante['nome_completo']) ?>" title="Gerenciar Cartões"><i class="fas fa-id-card"></i></button>
                                    <button class="btn btn-danger btn-sm btn-excluir-participante" data-id-participante="<?= $participante['id'] ?>" data-nome-participante="<?= htmlspecialchars($participante['nome_completo']) ?>" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr><td colspan="7" class="text-center">Nenhum participante cadastrado.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal para Adicionar/Editar Participante -->
<div class="modal fade" id="modalParticipante" tabindex="-1" aria-labelledby="modalParticipanteLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalParticipanteLabel">Adicionar Participante</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formParticipante">
                    <input type="hidden" name="id" id="participante_id">
                    <div class="mb-3">
                        <label for="id_equipe" class="form-label">Equipe</label>
                        <select class="form-control" id="id_equipe" name="id_equipe" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($equipes as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="nome_completo" class="form-label">Nome Completo</label>
                        <input type="text" class="form-control" id="nome_completo" name="nome_completo" required>
                    </div>
                    <div class="mb-3">
                        <label for="apelido" class="form-label">Apelido</label>
                        <input type="text" class="form-control" id="apelido" name="apelido">
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="posicao" class="form-label">Posição</label>
                            <input type="text" class="form-control" id="posicao" name="posicao">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="numero_camisa" class="form-label">Número da Camisa</label>
                            <input type="number" class="form-control" id="numero_camisa" name="numero_camisa">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="data_nascimento" class="form-label">Data de Nascimento</label>
                        <div class="input-group">
                            <input type="date" class="form-control" id="data_nascimento" name="data_nascimento">
                            <span class="input-group-text" id="idade_label">Idade: -- anos</span>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="foto_documento_frente" class="form-label">Foto Documento (Frente)</label>
                        <input type="file" class="form-control" id="foto_documento_frente" name="foto_documento_frente" accept="image/png, image/jpeg">
                        <div id="foto_documento_frente_preview" style="margin-top: 10px;"></div>
                    </div>
                    <div class="mb-3">
                        <label for="foto_documento_verso" class="form-label">Foto Documento (Verso)</label>
                        <input type="file" class="form-control" id="foto_documento_verso" name="foto_documento_verso" accept="image/png, image/jpeg">
                        <div id="foto_documento_verso_preview" style="margin-top: 10px;"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSalvarParticipante" form="formParticipante">Salvar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal para Gerenciar Fotos -->
<div class="modal fade" id="modalFotos" tabindex="-1" aria-labelledby="modalFotosLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalFotosLabel">Fotos do Participante</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formFotos">
                    <input type="hidden" name="id" id="fotos_participante_id">
                    <input type="file" id="foto" name="foto" accept="image/png, image/jpeg" multiple style="display:none">
                    <div id="btnFoto" class="btn btn-primary">
                        <i class="fas fa-image"></i> Adicionar Fotos
                    </div>
                    <br>
                    <div id="lista_Fotos" class="mt-3 d-flex flex-wrap"></div>
                    <div id="uploadFeedback" class="mt-2"></div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSalvarFotos" form="formFotos">Salvar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal para Gerenciar Cartões -->
<div class="modal fade" id="modalCartoes" tabindex="-1" aria-labelledby="modalCartoesLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalCartoesLabel">Gerenciar Cartões</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formCartoes">
                    <input type="hidden" name="id_participante" id="cartoes_participante_id">
                    <div class="mb-3">
                        <label for="id_partida" class="form-label">Partida</label>
                        <select class="form-control" id="id_partida" name="id_partida" required>
                            <option value="">Selecione uma partida</option>
                            <?php
                            $stmt_partidas = $pdo->prepare("
                                SELECT p.id, c.nome AS campeonato_nome, ea.nome AS equipe_a, eb.nome AS equipe_b, p.data_partida 
                                FROM partidas p 
                                JOIN campeonatos c ON c.id = p.id_campeonato 
                                JOIN equipes ea ON ea.id = p.id_equipe_a 
                                JOIN equipes eb ON eb.id = p.id_equipe_b 
                                ORDER BY p.data_partida DESC
                            ");
                            $stmt_partidas->execute();
                            $partidas = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);
                            foreach ($partidas as $partida) {
                                $data = $partida['data_partida'] ? date('d/m/Y H:i', strtotime($partida['data_partida'])) : 'N/A';
                                echo "<option value=\"{$partida['id']}\">{$partida['campeonato_nome']} - {$partida['equipe_a']} vs {$partida['equipe_b']} ({$data})</option>";
                            }
                            ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="tipo_evento" class="form-label">Tipo de Cartão</label>
                        <select class="form-control" id="tipo_evento" name="tipo_evento" required>
                            <option value="">Selecione o tipo</option>
                            <option value="Cartão Amarelo">Cartão Amarelo</option>
                            <option value="Cartão Vermelho">Cartão Vermelho</option>
                            <option value="Cartão Azul">Cartão Azul</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="minuto_evento" class="form-label">Minuto do Evento</label>
                        <input type="text" class="form-control" id="minuto_evento" name="minuto_evento" placeholder="Ex: 12">
                    </div>
                    <div class="mb-3">
                        <label for="descricao" class="form-label">Descrição (Opcional)</label>
                        <textarea class="form-control" id="descricao" name="descricao"></textarea>
                    </div>
                </form>
                <div id="lista-cartoes" class="mt-3"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSalvarCartoes" form="formCartoes">Adicionar Cartão</button>
            </div>
        </div>
    </div>
</div>

<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
}
if ($notificacao): ?>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 4000, timerProgressBar: true,
            icon: '<?= htmlspecialchars($notificacao['tipo']) ?>',
            title: '<?= addslashes($notificacao['mensagem']) ?>'
        });
    });
</script>
<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('modalParticipante');
    const modal = new bootstrap.Modal(modalEl);
    const modalLabel = document.getElementById('modalParticipanteLabel');
    const btnSalvar = document.getElementById('btnSalvarParticipante');
    const form = document.getElementById('formParticipante');
    const corpoTabela = document.getElementById('tabela-participantes-body');
    const dataNascimentoInput = document.getElementById('data_nascimento');
    const idadeLabel = document.getElementById('idade_label');
    const frenteInput = document.getElementById('foto_documento_frente');
    const versoInput = document.getElementById('foto_documento_verso');
    const frentePreview = document.getElementById('foto_documento_frente_preview');
    const versoPreview = document.getElementById('foto_documento_verso_preview');
    const modalCartoesEl = document.getElementById('modalCartoes');
    const modalCartoes = new bootstrap.Modal(modalCartoesEl);
    const formCartoes = document.getElementById('formCartoes');
    const btnSalvarCartoes = document.getElementById('btnSalvarCartoes');
    const listaCartoes = document.getElementById('lista-cartoes');
    const inputFile = document.getElementById('foto');
    const listaFotos = document.getElementById('lista_Fotos');
    const formFotos = document.getElementById('formFotos');
    const btnSalvarFotos = document.getElementById('btnSalvarFotos');
    const btnFoto = document.getElementById('btnFoto');
    const uploadFeedback = document.getElementById('uploadFeedback');
    let arquivosSelecionados = [];
    let fotosExistentes = [];

    // Função para calcular a idade
    function calcularIdade(dataNascimento) {
        if (!dataNascimento) {
            idadeLabel.textContent = 'Idade: -- anos';
            return;
        }
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        idadeLabel.textContent = `Idade: ${idade} anos`;
    }

    // Função para exibir imagem de preview
    function mostrarPreviewImagem(input, previewDiv, tipo) {
        previewDiv.innerHTML = '';
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '5px';
                img.style.border = '1px solid #ccc';
                img.src = e.target.result;
                img.title = file.name;

                const btnExcluir = document.createElement('i');
                btnExcluir.className = 'fas fa-times';
                btnExcluir.style.position = 'absolute';
                btnExcluir.style.top = '2px';
                btnExcluir.style.right = '2px';
                btnExcluir.style.color = 'red';
                btnExcluir.style.cursor = 'pointer';
                btnExcluir.style.background = 'white';
                btnExcluir.style.borderRadius = '50%';
                btnExcluir.style.padding = '2px 5px';
                btnExcluir.title = 'Remover imagem';

                btnExcluir.addEventListener('click', () => {
                    input.value = '';
                    previewDiv.innerHTML = '';
                });

                const fotoDiv = document.createElement('span');
                fotoDiv.style.position = 'relative';
                fotoDiv.style.display = 'inline-block';
                fotoDiv.style.margin = '5px';
                fotoDiv.appendChild(img);
                fotoDiv.appendChild(btnExcluir);
                previewDiv.appendChild(fotoDiv);
            };
            reader.readAsDataURL(file);
        }
    }

    // Função para exibir imagem existente
    function mostrarImagemExistente(previewDiv, src, tipo) {
        if (src) {
            const fotoDiv = document.createElement('span');
            fotoDiv.style.position = 'relative';
            fotoDiv.style.display = 'inline-block';
            fotoDiv.style.margin = '5px';

            const img = document.createElement('img');
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            img.style.border = '1px solid #ccc';
            img.src = '/sgce/' + src;
            img.title = `Documento ${tipo}`;

            const btnExcluir = document.createElement('i');
            btnExcluir.className = 'fas fa-times';
            btnExcluir.style.position = 'absolute';
            btnExcluir.style.top = '2px';
            btnExcluir.style.right = '2px';
            btnExcluir.style.color = 'red';
            btnExcluir.style.cursor = 'pointer';
            btnExcluir.style.background = 'white';
            btnExcluir.style.borderRadius = '50%';
            btnExcluir.style.padding = '2px 5px';
            btnExcluir.title = 'Remover imagem';

            btnExcluir.addEventListener('click', () => {
                fetch(`/sgce/admin/excluir_documento_participante.php?participante_id=${document.getElementById('participante_id').value}&tipo=${tipo}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                .then(response => {
                    if (!response.ok) throw new Error('Erro ao excluir documento');
                    previewDiv.innerHTML = '';
                })
                .catch(err => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro ao excluir documento',
                        text: err.message,
                        confirmButtonText: 'OK'
                    });
                });
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(btnExcluir);
            previewDiv.appendChild(fotoDiv);
        }
    }

    // Função para carregar os cartões existentes do participante
    function carregarCartoes(participanteId) {
        fetch(`/sgce/admin/buscar_cartoes.php?participante_id=${participanteId}`)
            .then(response => response.json())
            .then(data => {
                listaCartoes.innerHTML = '';
                if (data.length > 0) {
                    data.forEach(cartao => {
                        const cartaoDiv = document.createElement('div');
                        cartaoDiv.className = 'border p-2 mb-2';
                        cartaoDiv.innerHTML = `
                            <strong>Partida ID:</strong> ${cartao.id_partida} | 
                            <strong>Tipo:</strong> ${cartao.tipo_evento} | 
                            <strong>Minuto:</strong> ${cartao.minuto_evento || 'N/A'} | 
                            <strong>Descrição:</strong> ${cartao.descricao || 'N/A'}
                            <button class="btn btn-danger btn-sm float-end btn-excluir-cartao" data-id="${cartao.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                        `;
                        listaCartoes.appendChild(cartaoDiv);
                    });
                } else {
                    listaCartoes.innerHTML = '<p>Nenhum cartão registrado.</p>';
                }
            })
            .catch(error => {
                Swal.fire('Erro', 'Não foi possível carregar os cartões.', 'error');
            });
    }

    // Função para validar arquivo no frontend
    function validarArquivo(file) {
        const tiposPermitidos = ['image/png', 'image/jpeg'];
        const tamanhoMaximo = 5 * 1024 * 1024; // 5MB
        if (!tiposPermitidos.includes(file.type)) {
            return `Apenas imagens PNG ou JPEG são permitidas para ${file.name}.`;
        }
        if (file.size > tamanhoMaximo) {
            return `A imagem ${file.name} excede o tamanho máximo de 5MB.`;
        }
        return null;
    }

    // Função para exibir preview de imagem nova
    function mostrarPreviewImagem(file, index) {
        const fotoDiv = document.createElement('span');
        fotoDiv.style.position = 'relative';
        fotoDiv.style.display = 'inline-block';
        fotoDiv.style.margin = '5px';

        const img = document.createElement('img');
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '5px';
        img.style.border = '1px solid #ccc';
        img.title = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);

        const btnExcluir = document.createElement('i');
        btnExcluir.className = 'fas fa-times';
        btnExcluir.style.position = 'absolute';
        btnExcluir.style.top = '2px';
        btnExcluir.style.right = '2px';
        btnExcluir.style.color = 'red';
        btnExcluir.style.cursor = 'pointer';
        btnExcluir.style.background = 'white';
        btnExcluir.style.borderRadius = '50%';
        btnExcluir.style.padding = '2px 5px';
        btnExcluir.title = 'Remover imagem';
        btnExcluir.addEventListener('click', () => {
            arquivosSelecionados.splice(index, 1);
            atualizarListaFotos();
        });

        fotoDiv.appendChild(img);
        fotoDiv.appendChild(btnExcluir);
        return fotoDiv;
    }

    // Função para exibir fotos existentes
    function mostrarFotoExistente(foto) {
        const fotoDiv = document.createElement('span');
        fotoDiv.style.position = 'relative';
        fotoDiv.style.display = 'inline-block';
        fotoDiv.style.margin = '5px';

        const img = document.createElement('img');
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '5px';
        img.style.border = '1px solid #ccc';
        img.src = '/sgce/' + foto.src;
        img.title = `ID: ${foto.id}`;

        const btnExcluir = document.createElement('i');
        btnExcluir.className = 'fas fa-times';
        btnExcluir.style.position = 'absolute';
        btnExcluir.style.top = '2px';
        btnExcluir.style.right = '2px';
        btnExcluir.style.color = 'red';
        btnExcluir.style.cursor = 'pointer';
        btnExcluir.style.background = 'white';
        btnExcluir.style.borderRadius = '50%';
        btnExcluir.style.padding = '2px 5px';
        btnExcluir.title = 'Remover imagem';

        btnExcluir.addEventListener('click', () => {
            Swal.fire({
                title: 'Tem certeza?',
                text: 'Deseja excluir esta foto? Esta ação não pode ser desfeita.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/sgce/admin/excluir_fotos_participantes.php?id=${foto.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Erro ao excluir foto');
                        fotosExistentes = fotosExistentes.filter(f => f.id !== foto.id);
                        fotoDiv.remove();
                        Swal.fire({
                            icon: 'success',
                            title: 'Foto excluída com sucesso!',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000
                        });
                    })
                    .catch(err => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Erro ao excluir foto',
                            text: err.message,
                            confirmButtonText: 'OK'
                        });
                    });
                }
            });
        });

        fotoDiv.appendChild(img);
        fotoDiv.appendChild(btnExcluir);
        return fotoDiv;
    }

    // Função para atualizar a lista de fotos
    function atualizarListaFotos() {
        listaFotos.innerHTML = '';
        // Exibir fotos existentes
        fotosExistentes.forEach(foto => {
            listaFotos.appendChild(mostrarFotoExistente(foto));
        });
        // Exibir novas fotos selecionadas
        arquivosSelecionados.forEach((file, index) => {
            const erro = validarArquivo(file);
            if (!erro) {
                listaFotos.appendChild(mostrarPreviewImagem(file, index));
            } else {
                uploadFeedback.innerHTML = `<div class="alert alert-warning">${erro}</div>`;
            }
        });
    }

    // Função para resetar formulário de participante
    const resetForm = () => {
        form.reset();
        document.getElementById('participante_id').value = '';
        document.getElementById('id_equipe').value = '';
        idadeLabel.textContent = 'Idade: -- anos';
        frentePreview.innerHTML = '';
        versoPreview.innerHTML = '';
    };

    // Listeners para preview de novas imagens
    frenteInput.addEventListener('change', () => mostrarPreviewImagem(frenteInput, frentePreview, 'frente'));
    versoInput.addEventListener('change', () => mostrarPreviewImagem(versoInput, versoPreview, 'verso'));

    // Calcular idade ao sair do campo
    dataNascimentoInput.addEventListener('change', () => {
        calcularIdade(dataNascimentoInput.value);
    });

    // Abrir modal de adicionar participante
    document.getElementById('btnAdicionarParticipante').addEventListener('click', () => {
        resetForm();
        modalLabel.textContent = 'Adicionar Novo Participante';
        btnSalvar.textContent = 'Salvar';
        modal.show();
    });

    // Abrir input de arquivo ao clicar no botão
    btnFoto.addEventListener('click', () => {
        inputFile.click();
    });

    // Manipular seleção de novas fotos
    inputFile.addEventListener('change', () => {
        uploadFeedback.innerHTML = '';
        const novosArquivos = Array.from(inputFile.files);
        novosArquivos.forEach(file => {
            const erro = validarArquivo(file);
            if (!erro) {
                if (!arquivosSelecionados.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) {
                    arquivosSelecionados.push(file);
                }
            } else {
                uploadFeedback.innerHTML += `<div class="alert alert-warning">${erro}</div>`;
            }
        });
        atualizarListaFotos();
    });

    // Enviar fotos uma a uma
    formFotos.addEventListener('submit', async (e) => {
        e.preventDefault();
        uploadFeedback.innerHTML = '';
        if (arquivosSelecionados.length === 0) {
            uploadFeedback.innerHTML = '<div class="alert alert-warning">Selecione pelo menos uma foto.</div>';
            return;
        }

        btnSalvarFotos.disabled = true;
        btnSalvarFotos.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        const participanteId = document.getElementById('fotos_participante_id').value;
        let erros = [];

        // Enviar cada foto individualmente
        for (const file of arquivosSelecionados) {
            const formData = new FormData();
            formData.append('fotos', file);

            try {
                const response = await fetch(`/sgce/admin/upload_fotos_participantes.php?participante_id=${encodeURIComponent(participanteId)}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    fotosExistentes.push({ id: data.foto_id, src: data.foto_src });
                    uploadFeedback.innerHTML += `<div class="alert alert-success">Foto ${file.name} enviada com sucesso!</div>`;
                } else {
                    erros.push(`Erro ao enviar ${file.name}: ${data.message}`);
                }
            } catch (error) {
                erros.push(`Erro de conexão ao enviar ${file.name}: ${error.message}`);
            }
        }

        if (erros.length > 0) {
            uploadFeedback.innerHTML += `<div class="alert alert-danger">${erros.join('<br>')}</div>`;
        }

        // Limpar seleção após upload
        arquivosSelecionados = [];
        inputFile.value = '';
        atualizarListaFotos();

        btnSalvarFotos.disabled = false;
        btnSalvarFotos.innerHTML = 'Salvar';
    });

    // Manipulação de eventos da tabela
    corpoTabela.addEventListener('click', (e) => {
        const editFotosButton = e.target.closest('.btn-editar-fotos');
        if (editFotosButton) {
            arquivosSelecionados = [];
            inputFile.value = '';
            listaFotos.innerHTML = '';
            uploadFeedback.innerHTML = '';
            const participanteData = JSON.parse(editFotosButton.dataset.participante);
            document.getElementById('fotos_participante_id').value = participanteData.id;
            fotosExistentes = participanteData.fotos || [];
            atualizarListaFotos();
            const modalEl = document.getElementById('modalFotos');
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }

        const editButton = e.target.closest('.btn-editar-participante');
        if (editButton) {
            resetForm();
            const participanteData = JSON.parse(editButton.dataset.participante);
            document.getElementById('participante_id').value = participanteData.id;
            document.getElementById('id_equipe').value = participanteData.id_equipe || '';
            document.getElementById('nome_completo').value = participanteData.nome_completo;
            document.getElementById('apelido').value = participanteData.apelido;
            document.getElementById('posicao').value = participanteData.posicao || '';
            document.getElementById('numero_camisa').value = participanteData.numero_camisa || '';
            document.getElementById('data_nascimento').value = participanteData.data_nascimento || '';
            calcularIdade(participanteData.data_nascimento);
            mostrarImagemExistente(frentePreview, participanteData.foto_documento_frente, 'frente');
            mostrarImagemExistente(versoPreview, participanteData.foto_documento_verso, 'verso');
            modalLabel.textContent = 'Editar Participante';
            btnSalvar.textContent = 'Salvar Alterações';
            modal.show();
        }

        const deleteButton = e.target.closest('.btn-excluir-participante');
        if (deleteButton) {
            const participanteId = deleteButton.dataset.idParticipante;
            const participanteNome = deleteButton.dataset.nomeParticipante;
            Swal.fire({
                title: 'Tem certeza?',
                html: `Deseja excluir o participante <strong>${participanteNome}</strong>?<br>Esta ação não pode ser desfeita.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = `excluir_participante_admin.php?id=${participanteId}`;
                }
            });
        }

        const gerenciarCartoesButton = e.target.closest('.btn-gerenciar-cartoes');
        if (gerenciarCartoesButton) {
            const participanteId = gerenciarCartoesButton.dataset.idParticipante;
            const participanteNome = gerenciarCartoesButton.dataset.nomeParticipante;
            document.getElementById('cartoes_participante_id').value = participanteId;
            document.getElementById('modalCartoesLabel').textContent = `Gerenciar Cartões - ${participanteNome}`;
            formCartoes.reset();
            carregarCartoes(participanteId);
            modalCartoes.show();
        }

        const excluirCartaoButton = e.target.closest('.btn-excluir-cartao');
        if (excluirCartaoButton) {
            const cartaoId = excluirCartaoButton.dataset.id;
            Swal.fire({
                title: 'Tem certeza?',
                text: 'Deseja excluir este cartão? Esta ação não pode ser desfeita.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/sgce/admin/excluir_cartao.php?id=${cartaoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Erro ao excluir cartão');
                        Swal.fire({
                            icon: 'success',
                            title: 'Cartão excluído com sucesso!',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000
                        }).then(() => {
                            carregarCartoes(document.getElementById('cartoes_participante_id').value);
                        });
                    })
                    .catch(err => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Erro ao excluir cartão',
                            text: err.message,
                            confirmButtonText: 'OK'
                        });
                    });
                }
            });
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        const formData = new FormData(form);
        fetch('salvar_participante_admin.php', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                modal.hide();
                Swal.fire({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                    icon: 'success', title: data.message
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Erro de Validação', html: data.errors.join('<br>') });
            }
        })
        .catch(error => {
            Swal.fire('Erro de Conexão', 'Não foi possível salvar os dados. Verifique sua conexão e tente novamente.', 'error');
        })
        .finally(() => {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = 'Salvar';
        });
    });

    formCartoes.addEventListener('submit', (e) => {
        e.preventDefault();
        btnSalvarCartoes.disabled = true;
        btnSalvarCartoes.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        const formData = new FormData(formCartoes);
        fetch('/sgce/admin/salvar_cartao.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: data.message,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    formCartoes.reset();
                    carregarCartoes(document.getElementById('cartoes_participante_id').value);
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao salvar cartão',
                    text: data.message,
                    confirmButtonText: 'OK'
                });
            }
        })
        .catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Erro de conexão',
                text: 'Não foi possível salvar o cartão. Verifique sua conexão e tente novamente.',
                confirmButtonText: 'OK'
            });
        })
        .finally(() => {
            btnSalvarCartoes.disabled = false;
            btnSalvarCartoes.innerHTML = 'Adicionar Cartão';
        });
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>