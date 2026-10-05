// Gerado do projeto Supabase "aproxima" (luqvtkraekxwdxzwboxn) em 05/10/2026.
// Regerar após cada migration: npx supabase gen types typescript --project-id luqvtkraekxwdxzwboxn > src/types/database.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          antes: Json | null
          depois: Json | null
          id: number
          ocorreu_em: string
          operacao: string
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          antes?: Json | null
          depois?: Json | null
          id?: never
          ocorreu_em?: string
          operacao: string
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          antes?: Json | null
          depois?: Json | null
          id?: never
          ocorreu_em?: string
          operacao?: string
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          avaliacoes_google: number | null
          avaliacoes_mes_antes: number | null
          cidade: string
          codigo: string | null
          concorrente_avaliacoes: number | null
          concorrente_nome: string | null
          concorrente_nota: number | null
          contato_nome: string | null
          created_at: string
          created_by: string | null
          descartado_em: string | null
          email: string | null
          endereco: string | null
          etapa: string
          google_url: string | null
          id: string
          instagram: string | null
          interesse: string | null
          motivo_descarte: string | null
          nome: string
          nota_google: number | null
          numero: number
          observacoes: string | null
          origem: string | null
          proximo_followup: string | null
          responsavel_id: string | null
          segmento: string | null
          site_url: string | null
          telefone: string | null
          tem_site: boolean | null
          updated_at: string
        }
        Insert: {
          avaliacoes_google?: number | null
          avaliacoes_mes_antes?: number | null
          cidade: string
          codigo?: string | null
          concorrente_avaliacoes?: number | null
          concorrente_nome?: string | null
          concorrente_nota?: number | null
          contato_nome?: string | null
          created_at?: string
          created_by?: string | null
          descartado_em?: string | null
          email?: string | null
          endereco?: string | null
          etapa?: string
          google_url?: string | null
          id?: string
          instagram?: string | null
          interesse?: string | null
          motivo_descarte?: string | null
          nome: string
          nota_google?: number | null
          numero?: never
          observacoes?: string | null
          origem?: string | null
          proximo_followup?: string | null
          responsavel_id?: string | null
          segmento?: string | null
          site_url?: string | null
          telefone?: string | null
          tem_site?: boolean | null
          updated_at?: string
        }
        Update: {
          avaliacoes_google?: number | null
          avaliacoes_mes_antes?: number | null
          cidade?: string
          codigo?: string | null
          concorrente_avaliacoes?: number | null
          concorrente_nome?: string | null
          concorrente_nota?: number | null
          contato_nome?: string | null
          created_at?: string
          created_by?: string | null
          descartado_em?: string | null
          email?: string | null
          endereco?: string | null
          etapa?: string
          google_url?: string | null
          id?: string
          instagram?: string | null
          interesse?: string | null
          motivo_descarte?: string | null
          nome?: string
          nota_google?: number | null
          numero?: never
          observacoes?: string | null
          origem?: string | null
          proximo_followup?: string | null
          responsavel_id?: string | null
          segmento?: string | null
          site_url?: string | null
          telefone?: string | null
          tem_site?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "clientes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_retiradas_socios"
            referencedColumns: ["socio_id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          estoque_minimo: number
          id: boolean
          janela_toque_segundos: number
          limite_toques_dia: number
          taxa_credito_pct: number
          taxa_debito_pct: number
          updated_at: string
        }
        Insert: {
          estoque_minimo?: number
          id?: boolean
          janela_toque_segundos?: number
          limite_toques_dia?: number
          taxa_credito_pct?: number
          taxa_debito_pct?: number
          updated_at?: string
        }
        Update: {
          estoque_minimo?: number
          id?: boolean
          janela_toque_segundos?: number
          limite_toques_dia?: number
          taxa_credito_pct?: number
          taxa_debito_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      interacoes: {
        Row: {
          canal: string
          cliente_id: string
          created_at: string
          created_by: string | null
          id: string
          ocorreu_em: string
          proximo_followup: string | null
          proximo_passo: string | null
          resumo: string
          updated_at: string
        }
        Insert: {
          canal: string
          cliente_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          ocorreu_em?: string
          proximo_followup?: string | null
          proximo_passo?: string | null
          resumo: string
          updated_at?: string
        }
        Update: {
          canal?: string
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ocorreu_em?: string
          proximo_followup?: string | null
          proximo_passo?: string | null
          resumo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          cancelado_em: string | null
          categoria: string
          cliente_id: string | null
          created_at: string
          created_by: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          lote_id: string | null
          motivo_cancelamento: string | null
          pago_em: string | null
          parcela: number | null
          parcelas: number | null
          socio_id: string | null
          tipo: string
          updated_at: string
          valor: number
          vencimento: string
          venda_id: string | null
        }
        Insert: {
          cancelado_em?: string | null
          categoria: string
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: string
          lote_id?: string | null
          motivo_cancelamento?: string | null
          pago_em?: string | null
          parcela?: number | null
          parcelas?: number | null
          socio_id?: string | null
          tipo: string
          updated_at?: string
          valor: number
          vencimento: string
          venda_id?: string | null
        }
        Update: {
          cancelado_em?: string | null
          categoria?: string
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          lote_id?: string | null
          motivo_cancelamento?: string | null
          pago_em?: string | null
          parcela?: number | null
          parcelas?: number | null
          socio_id?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
          vencimento?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lancamentos_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "v_retiradas_socios"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "lancamentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "v_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          codigo: string | null
          created_at: string
          created_by: string | null
          custo_total: number | null
          custo_unitario: number | null
          data_compra: string
          forma_pagamento: string | null
          fornecedor: string
          frete: number
          id: string
          numero: number
          observacoes: string | null
          outras_taxas: number
          quantidade: number
          updated_at: string
          valor_pago: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          data_compra?: string
          forma_pagamento?: string | null
          fornecedor: string
          frete?: number
          id?: string
          numero?: never
          observacoes?: string | null
          outras_taxas?: number
          quantidade: number
          updated_at?: string
          valor_pago: number
        }
        Update: {
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          data_compra?: string
          forma_pagamento?: string | null
          fornecedor?: string
          frete?: number
          id?: string
          numero?: never
          observacoes?: string | null
          outras_taxas?: number
          quantidade?: number
          updated_at?: string
          valor_pago?: number
        }
        Relationships: []
      }
      membros: {
        Row: {
          ativo: boolean
          created_at: string
          nome: string
          papel: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          nome: string
          papel?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          nome?: string
          papel?: string
          user_id?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_by: string | null
          id: number
          motivo: string | null
          ocorreu_em: string
          placa_id: string
          status_de: string | null
          status_para: string
          venda_id: string | null
        }
        Insert: {
          created_by?: string | null
          id?: never
          motivo?: string | null
          ocorreu_em?: string
          placa_id: string
          status_de?: string | null
          status_para: string
          venda_id?: string | null
        }
        Update: {
          created_by?: string | null
          id?: never
          motivo?: string | null
          ocorreu_em?: string
          placa_id?: string
          status_de?: string | null
          status_para?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_placa_id_fkey"
            columns: ["placa_id"]
            isOneToOne: false
            referencedRelation: "placas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_placa_id_fkey"
            columns: ["placa_id"]
            isOneToOne: false
            referencedRelation: "v_placas"
            referencedColumns: ["id"]
          },
        ]
      }
      placas: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          codigo: string | null
          created_at: string
          created_by: string | null
          destino_url: string | null
          gravada_em: string | null
          id: string
          instalada_em: string | null
          lote_id: string
          numero: number
          responsavel_id: string | null
          status: string
          token: string
          updated_at: string
          venda_id: string | null
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          destino_url?: string | null
          gravada_em?: string | null
          id?: string
          instalada_em?: string | null
          lote_id: string
          numero?: never
          responsavel_id?: string | null
          status?: string
          token?: string
          updated_at?: string
          venda_id?: string | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          destino_url?: string | null
          gravada_em?: string | null
          id?: string
          instalada_em?: string | null
          lote_id?: string
          numero?: never
          responsavel_id?: string | null
          status?: string
          token?: string
          updated_at?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "placas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_retiradas_socios"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "placas_venda_fk"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "v_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placas_venda_fk"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          created_by: string | null
          custo_padrao: number
          descricao: string | null
          id: string
          nome: string
          preco_padrao: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          created_by?: string | null
          custo_padrao?: number
          descricao?: string | null
          id?: string
          nome: string
          preco_padrao?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string | null
          custo_padrao?: number
          descricao?: string | null
          id?: string
          nome?: string
          preco_padrao?: number
          updated_at?: string
        }
        Relationships: []
      }
      projeto_pendencias: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          pedido_em: string
          projeto_id: string
          resolvido_em: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          pedido_em?: string
          projeto_id: string
          resolvido_em?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          pedido_em?: string
          projeto_id?: string
          resolvido_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_pendencias_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_pendencias_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_pendencias_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_resultado_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      projeto_revisoes: {
        Row: {
          avaliacoes: number | null
          created_at: string
          created_by: string | null
          data_prevista: string
          id: string
          marco: string
          nota: number | null
          observacoes: string | null
          projeto_id: string
          realizado_em: string | null
          updated_at: string
        }
        Insert: {
          avaliacoes?: number | null
          created_at?: string
          created_by?: string | null
          data_prevista: string
          id?: string
          marco: string
          nota?: number | null
          observacoes?: string | null
          projeto_id: string
          realizado_em?: string | null
          updated_at?: string
        }
        Update: {
          avaliacoes?: number | null
          created_at?: string
          created_by?: string | null
          data_prevista?: string
          id?: string
          marco?: string
          nota?: number | null
          observacoes?: string | null
          projeto_id?: string
          realizado_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_revisoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_revisoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_revisoes_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_resultado_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      projeto_tarefas: {
        Row: {
          created_at: string
          created_by: string | null
          feito_em: string | null
          feito_por: string | null
          grupo: string
          id: string
          ordem: number
          projeto_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          feito_em?: string | null
          feito_por?: string | null
          grupo: string
          id?: string
          ordem?: number
          projeto_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          feito_em?: string | null
          feito_por?: string | null
          grupo?: string
          id?: string
          ordem?: number
          projeto_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "v_resultado_projeto"
            referencedColumns: ["projeto_id"]
          },
        ]
      }
      projetos: {
        Row: {
          baseline_avaliacoes: number | null
          baseline_avaliacoes_mes: number | null
          baseline_nota: number | null
          cliente_id: string
          created_at: string
          created_by: string | null
          entregue_em: string | null
          id: string
          observacoes: string | null
          prazo: string | null
          responsavel_id: string | null
          status: string
          updated_at: string
          upsell_google: string
          upsell_motivo_recusa: string | null
          upsell_oferecer_em: string | null
          upsell_site: string
          venda_id: string
        }
        Insert: {
          baseline_avaliacoes?: number | null
          baseline_avaliacoes_mes?: number | null
          baseline_nota?: number | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          entregue_em?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          upsell_google?: string
          upsell_motivo_recusa?: string | null
          upsell_oferecer_em?: string | null
          upsell_site?: string
          venda_id: string
        }
        Update: {
          baseline_avaliacoes?: number | null
          baseline_avaliacoes_mes?: number | null
          baseline_nota?: number | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          entregue_em?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          upsell_google?: string
          upsell_motivo_recusa?: string | null
          upsell_oferecer_em?: string | null
          upsell_site?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projetos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_retiradas_socios"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "projetos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: true
            referencedRelation: "v_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: true
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      toques_placa: {
        Row: {
          id: number
          ocorreu_em: string
          placa_id: string
        }
        Insert: {
          id?: never
          ocorreu_em?: string
          placa_id: string
        }
        Update: {
          id?: never
          ocorreu_em?: string
          placa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toques_placa_placa_id_fkey"
            columns: ["placa_id"]
            isOneToOne: false
            referencedRelation: "placas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toques_placa_placa_id_fkey"
            columns: ["placa_id"]
            isOneToOne: false
            referencedRelation: "v_placas"
            referencedColumns: ["id"]
          },
        ]
      }
      venda_itens: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          preco_unitario: number | null
          produto_id: string
          quantidade: number
          updated_at: string
          venda_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          preco_unitario?: number | null
          produto_id: string
          quantidade: number
          updated_at?: string
          venda_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          preco_unitario?: number | null
          produto_id?: string
          quantidade?: number
          updated_at?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "v_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          cancelada_em: string | null
          cliente_id: string
          codigo: string | null
          confirmada_em: string | null
          created_at: string
          created_by: string | null
          custo_placas: number | null
          custo_servicos: number | null
          data_venda: string
          desconto: number
          e_upsell: boolean | null
          entrada: number
          forma_pagamento: string
          id: string
          lucro: number | null
          motivo_cancelamento: string | null
          numero: number
          observacoes: string | null
          parcelas: number
          primeiro_vencimento: string | null
          status: string
          taxa_cartao_pct: number
          taxa_valor: number | null
          total: number | null
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          cancelada_em?: string | null
          cliente_id: string
          codigo?: string | null
          confirmada_em?: string | null
          created_at?: string
          created_by?: string | null
          custo_placas?: number | null
          custo_servicos?: number | null
          data_venda?: string
          desconto?: number
          e_upsell?: boolean | null
          entrada?: number
          forma_pagamento?: string
          id?: string
          lucro?: number | null
          motivo_cancelamento?: string | null
          numero?: never
          observacoes?: string | null
          parcelas?: number
          primeiro_vencimento?: string | null
          status?: string
          taxa_cartao_pct?: number
          taxa_valor?: number | null
          total?: number | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          cancelada_em?: string | null
          cliente_id?: string
          codigo?: string | null
          confirmada_em?: string | null
          created_at?: string
          created_by?: string | null
          custo_placas?: number | null
          custo_servicos?: number | null
          data_venda?: string
          desconto?: number
          e_upsell?: boolean | null
          entrada?: number
          forma_pagamento?: string
          id?: string
          lucro?: number | null
          motivo_cancelamento?: string | null
          numero?: never
          observacoes?: string | null
          parcelas?: number
          primeiro_vencimento?: string | null
          status?: string
          taxa_cartao_pct?: number
          taxa_valor?: number | null
          total?: number | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_retiradas_socios"
            referencedColumns: ["socio_id"]
          },
        ]
      }
    }
    Views: {
      v_estoque_resumo: {
        Row: {
          abaixo_minimo: boolean | null
          aguardando_instalacao: number | null
          custo_medio_disponiveis: number | null
          defeito: number | null
          demonstracao: number | null
          disponiveis: number | null
          estoque_minimo: number | null
          instaladas: number | null
          perdidas: number | null
          reservadas: number | null
          total: number | null
        }
        Relationships: []
      }
      v_lotes: {
        Row: {
          codigo: string | null
          custo_por_placa: number | null
          custo_total: number | null
          data_compra: string | null
          demonstracao: number | null
          disponiveis: number | null
          em_clientes: number | null
          fornecedor: string | null
          frete: number | null
          frete_por_placa: number | null
          id: string | null
          outras_taxas: number | null
          perdas: number | null
          quantidade: number | null
          valor_pago: number | null
        }
        Relationships: []
      }
      v_painel_hoje: {
        Row: {
          detalhe: string | null
          gravidade: string | null
          quando: string | null
          ref_id: string | null
          ref_tabela: string | null
          responsavel_id: string | null
          tipo: string | null
          titulo: string | null
        }
        Relationships: []
      }
      v_placas: {
        Row: {
          ativo: boolean | null
          cliente_cidade: string | null
          cliente_id: string | null
          cliente_nome: string | null
          codigo: string | null
          custo: number | null
          destino_url: string | null
          gravada_em: string | null
          id: string | null
          instalada_em: string | null
          lote_codigo: string | null
          lote_id: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          token: string | null
          toques_30d: number | null
          toques_total: number | null
          updated_at: string | null
          venda_codigo: string | null
          venda_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "placas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "placas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_retiradas_socios"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "placas_venda_fk"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "v_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placas_venda_fk"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_projetos: {
        Row: {
          atrasado: boolean | null
          cliente_cidade: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          data_venda: string | null
          entregue_em: string | null
          id: string | null
          itens_resumo: string | null
          pendencias_abertas: number | null
          prazo: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          tarefas_feitas: number | null
          tarefas_total: number | null
          updated_at: string | null
          upsell_em_aberto: boolean | null
          upsell_google: string | null
          upsell_oferecer_em: string | null
          upsell_site: string | null
          venda_codigo: string | null
          venda_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projetos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "v_retiradas_socios"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "projetos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: true
            referencedRelation: "v_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: true
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_resultado_mensal: {
        Row: {
          caixa_pago: number | null
          caixa_recebido: number | null
          caixa_retiradas: number | null
          custo_placas: number | null
          custo_servicos: number | null
          despesas_operacionais: number | null
          faturamento: number | null
          lucro_liquido: number | null
          lucro_vendas: number | null
          mes: string | null
          outras_receitas: number | null
          taxas_cartao: number | null
          vendas: number | null
        }
        Relationships: []
      }
      v_resultado_projeto: {
        Row: {
          avaliacoes_atuais: number | null
          avaliacoes_ganhas: number | null
          avaliacoes_mes_depois: number | null
          baseline_avaliacoes: number | null
          baseline_avaliacoes_mes: number | null
          baseline_nota: number | null
          concorrente_avaliacoes: number | null
          concorrente_nome: string | null
          concorrente_nota: number | null
          data_venda: string | null
          nota_atual: number | null
          projeto_id: string | null
          toques_30d: number | null
          toques_60d: number | null
          toques_90d: number | null
          toques_total: number | null
          ultima_revisao_em: string | null
          ultima_revisao_marco: string | null
        }
        Relationships: []
      }
      v_retiradas_socios: {
        Row: {
          lucro_acumulado: number | null
          nome: string | null
          parte: number | null
          retirado: number | null
          saldo: number | null
          socio_id: string | null
        }
        Relationships: []
      }
      v_vendas: {
        Row: {
          cancelada_em: string | null
          cliente_cidade: string | null
          cliente_id: string | null
          cliente_nome: string | null
          codigo: string | null
          confirmada_em: string | null
          custo: number | null
          data_venda: string | null
          desconto: number | null
          e_upsell: boolean | null
          forma_pagamento: string | null
          id: string | null
          itens_resumo: string | null
          lucro: number | null
          margem_pct: number | null
          motivo_cancelamento: string | null
          observacoes: string | null
          parcelas: number | null
          qtd_placas: number | null
          recebido: number | null
          situacao_pagamento: string | null
          status: string | null
          taxa: number | null
          tem_servico: boolean | null
          total: number | null
          vendedor_id: string | null
          vendedor_nome: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "v_retiradas_socios"
            referencedColumns: ["socio_id"]
          },
        ]
      }
    }
    Functions: {
      ajustar_placa: {
        Args: {
          p_motivo?: string
          p_novo_status: string
          p_placa_id: string
          p_responsavel?: string
        }
        Returns: {
          ativo: boolean
          cliente_id: string | null
          codigo: string | null
          created_at: string
          created_by: string | null
          destino_url: string | null
          gravada_em: string | null
          id: string
          instalada_em: string | null
          lote_id: string
          numero: number
          responsavel_id: string | null
          status: string
          token: string
          updated_at: string
          venda_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "placas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancelar_venda: {
        Args: { p_motivo: string; p_venda_id: string }
        Returns: {
          cancelada_em: string | null
          cliente_id: string
          codigo: string | null
          confirmada_em: string | null
          created_at: string
          created_by: string | null
          custo_placas: number | null
          custo_servicos: number | null
          data_venda: string
          desconto: number
          e_upsell: boolean | null
          entrada: number
          forma_pagamento: string
          id: string
          lucro: number | null
          motivo_cancelamento: string | null
          numero: number
          observacoes: string | null
          parcelas: number
          primeiro_vencimento: string | null
          status: string
          taxa_cartao_pct: number
          taxa_valor: number | null
          total: number | null
          updated_at: string
          vendedor_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vendas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirmar_venda: {
        Args: { p_venda_id: string }
        Returns: {
          cancelada_em: string | null
          cliente_id: string
          codigo: string | null
          confirmada_em: string | null
          created_at: string
          created_by: string | null
          custo_placas: number | null
          custo_servicos: number | null
          data_venda: string
          desconto: number
          e_upsell: boolean | null
          entrada: number
          forma_pagamento: string
          id: string
          lucro: number | null
          motivo_cancelamento: string | null
          numero: number
          observacoes: string | null
          parcelas: number
          primeiro_vencimento: string | null
          status: string
          taxa_cartao_pct: number
          taxa_valor: number | null
          total: number | null
          updated_at: string
          vendedor_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vendas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      importar_leads: { Args: { p_linhas: Json }; Returns: Json }
      painel_indicadores: {
        Args: {
          p_cidade?: string
          p_fim: string
          p_inicio: string
          p_vendedor?: string
        }
        Returns: Json
      }
      registrar_lote: {
        Args: {
          p_data_compra?: string
          p_forma?: string
          p_fornecedor: string
          p_frete?: number
          p_observacoes?: string
          p_outras_taxas?: number
          p_pago?: boolean
          p_quantidade: number
          p_valor_pago: number
        }
        Returns: {
          codigo: string | null
          created_at: string
          created_by: string | null
          custo_total: number | null
          custo_unitario: number | null
          data_compra: string
          forma_pagamento: string | null
          fornecedor: string
          frete: number
          id: string
          numero: number
          observacoes: string | null
          outras_taxas: number
          quantidade: number
          updated_at: string
          valor_pago: number
        }
        SetofOptions: {
          from: "*"
          to: "lotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_toque: { Args: { p_token: string }; Returns: string }
      trocar_placa_reservada: {
        Args: {
          p_placa_atual: string
          p_placa_nova: string
          p_venda_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
