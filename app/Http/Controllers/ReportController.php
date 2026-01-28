<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\User;

class ReportController extends Controller
{
    // Relatório de Inscritos por Campeonato
    public function exportInscriptions($championshipId)
    {
        $champ = Championship::findOrFail($championshipId);

        // Mock de dados para exportação
        // Em produção, usaria uma lib como Laravel Excel ou geraria CSV nativo
        $data = [
            ['Nome', 'CPF', 'Categoria', 'Time', 'Status Pagamento'],
            ['Felipe Spengler', '123.456.789-00', 'Adulto', 'Tigers FC', 'Pago'],
            ['João Silva', '987.654.321-11', 'Veterano', '-', 'Pendente'],
        ];

        // Gerar CSV na memória
        $csv = "";
        foreach ($data as $row) {
            $csv .= implode(';', $row) . "\n";
        }

        $filename = "inscritos_" . \Str::slug($champ->name) . ".csv";

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }

    // Relatório Financeiro Global
    public function financialReport()
    {
        $data = [
            ['Data', 'Descrição', 'Entrada', 'Saída', 'Saldo'],
            ['2025-01-01', 'Inscrição #1001', '150.00', '0.00', '150.00'],
            ['2025-01-02', 'Pagamento Arbitragem', '0.00', '100.00', '50.00'],
        ];

        $csv = "";
        foreach ($data as $row) {
            $csv .= implode(';', $row) . "\n";
        }

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', "attachment; filename=\"financeiro_geral.csv\"");
    }
}
