import sqlite3
import os

def init_fts5(db_path=None):
    if db_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(base_dir, "data", "wiki.db")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Créer la table FTS5
    cursor.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS page_index
        USING fts5(title, content, category);
    """)

    # Vider pour éviter les doublons
    cursor.execute("DELETE FROM page_index")

    # Remplir avec les pages existantes
    cursor.execute("""
        INSERT INTO page_index(rowid, title, content, category)
        SELECT rowid, title, content, category FROM pages
    """)

    count = cursor.execute("SELECT COUNT(*) FROM page_index").fetchone()[0]
    conn.commit()
    conn.close()
    print(f"{count} pages indexées dans FTS5 ({db_path})")

if __name__ == "__main__":
    init_fts5()