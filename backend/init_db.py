from database import create_db_and_tables, get_connection, seed_demo_database

if __name__ == "__main__":
    create_db_and_tables()
    with get_connection() as conn:
        seed_demo_database(conn)
        conn.commit()
    print("EvoPay AI SQLite database initialized and seeded.")
