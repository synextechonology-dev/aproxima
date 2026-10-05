#!/usr/bin/env bash
# Uso: PGHOST=... PGPORT=... PGUSER=postgres ./rodar_testes.sh
# Cria um banco descartável, aplica stub + migration e roda os testes.
set -euo pipefail
cd "$(dirname "$0")"
DB=aproxima_teste
psql -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d $DB -f 00_stub_auth_local.sql
psql -v ON_ERROR_STOP=1 -q -d $DB -f ../migrations/20261005000000_aproxima_v2.sql
RAW=$(psql -q -d $DB -f 10_seguranca_e_regras.sql 2>&1)
OUT=$(echo "$RAW" | sed -n 's/^psql:[^ ]* NOTICE:  //p')
echo "$OUT" | grep -E '^(ok|FALHOU)' || true
echo "$RAW" | grep 'ERROR' || true
OK=$(echo "$OUT" | grep -c '^ok' || true); FAIL=$(echo "$OUT" | grep -c '^FALHOU' || true)
ERR=$(echo "$RAW" | grep -c 'ERROR' || true)
echo; echo "Resultado: $OK ok, $FAIL falhas, $ERR erros de script"
[ "$FAIL" -eq 0 ] && [ "$ERR" -eq 0 ]
