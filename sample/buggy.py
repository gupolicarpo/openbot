# buggy.py — amostra de entrada para o bot "code-reviewer".
# Contém defeitos intencionais para demonstração.

import sqlite3


def get_user(username, db_path="users.db"):
    conn = sqlite3.connect(db_path)
    # DEFEITO: injeção de SQL — o nome é interpolado direto na query.
    query = f"SELECT * FROM users WHERE name = '{username}'"
    cur = conn.execute(query)
    return cur.fetchall()


def add_item(item, items=[]):
    # DEFEITO: argumento padrão mutável — a mesma lista é compartilhada.
    items.append(item)
    return items


def divide(a, b):
    # RISCO: divisão por zero não tratada.
    return a / b


def process(data):
    # SEGURANÇA: eval() sobre entrada possivelmente não confiável.
    return eval(data)