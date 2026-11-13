# buggy.py — sample input for the "code-reviewer" bot.
# Contains intentional defects for demonstration.

import sqlite3


def get_user(username, db_path="users.db"):
    conn = sqlite3.connect(db_path)
    # BUG: SQL injection — the name is interpolated directly into the query.
    query = f"SELECT * FROM users WHERE name = '{username}'"
    cur = conn.execute(query)
    return cur.fetchall()


def add_item(item, items=[]):
    # BUG: mutable default argument — the same list is shared across calls.
    items.append(item)
    return items


def divide(a, b):
    # RISK: division by zero not handled.
    return a / b


def process(data):
    # SECURITY: eval() on potentially untrusted input.
    return eval(data)