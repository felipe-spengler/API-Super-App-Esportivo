// /assets/js/script.js

// Este código já existe da resposta anterior
$(document).ready(function() {
    $('.btn-inscrever').on('click', function() {
        let botao = $(this);
        let idCampeonato = botao.data('id-campeonato');
        
        botao.prop('disabled', true).text('Processando...');

        $.ajax({
            url: '/sgce/api/inscrever_equipe.php',
            type: 'POST',
            dataType: 'json',
            data: { id_campeonato: idCampeonato },
            success: function(response) {
                if (response.sucesso) {
                    botao.closest('tr').fadeOut(); // Remove a linha da tabela
                    alert(response.mensagem);
                } else {
                    alert('Erro: ' + response.mensagem);
                    botao.prop('disabled', false).text('Inscrever Minha Equipe');
                }
            },
            error: function() {
                alert('Ocorreu um erro de comunicação. Tente novamente.');
                botao.prop('disabled', false).text('Inscrever Minha Equipe');
            }
        });
    });

    // --- NOVO CÓDIGO ABAIXO ---

    // Deleção de jogador com confirmação
    $('.btn-remover-jogador').on('click', function(e) {
        e.preventDefault(); // Impede o comportamento padrão do link/botão
        
        let botao = $(this);
        let idJogador = botao.data('id-jogador');
        
        if (confirm('Tem certeza que deseja remover este jogador? Esta ação não pode ser desfeita.')) {
            $.ajax({
                url: '/sgce/api/remover_jogador.php',
                type: 'POST',
                dataType: 'json',
                data: { id_jogador: idJogador },
                success: function(response) {
                    if (response.sucesso) {
                        botao.closest('tr').remove(); // Remove a linha da tabela da interface
                        alert(response.mensagem);
                    } else {
                        alert('Erro ao remover: ' + response.mensagem);
                    }
                },
                error: function() {
                    alert('Ocorreu um erro de comunicação.');
                }
            });
        }
    });
});