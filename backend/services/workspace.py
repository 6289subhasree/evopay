"""Realistic record generation for attacks, plus an opt-in starter workspace.

Generated attacks write customers, devices, merchants and transactions that look
like real Indian payment traffic (cities, UPI / card / netbanking, varied amounts
and per-payment risk), so the dashboard reads like production rather than a lab.
Records stay flagged as simulated in the API (`synthetic: true`) for honesty.
"""
from __future__ import annotations

import json
import os
import random
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Callable
from uuid import uuid4

CITIES = ["Mumbai", "Delhi", "Bengaluru", "Kolkata", "Hyderabad", "Chennai", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kochi", "Indore"]
MERCHANT_NAMES = ["QuickMart", "UrbanBazaar", "MetroFuel", "ZipKart", "Spice Route Foods", "TechNest", "RailPass", "StyleHub", "PharmaPlus", "GameVault", "TravelDesk", "HomeChef"]
PLATFORMS = ["Android", "Android", "iOS", "Web"]

# Typical ticket size (₹) and payment-method mix per attack family.
PROFILES: dict[str, tuple[int, list[str]]] = {
    "card_testing": (180, ["CARD", "CARD", "CARD", "UPI"]),
    "velocity_attack": (900, ["UPI", "UPI", "CARD"]),
    "account_takeover": (14000, ["UPI", "NETBANKING", "CARD"]),
    "money_mule": (22000, ["UPI", "UPI", "NETBANKING"]),
    "merchant_collusion": (7500, ["CARD", "UPI"]),
    "refund_abuse": (3200, ["CARD", "UPI"]),
    "synthetic_identity": (9000, ["CARD", "UPI", "NETBANKING"]),
    "behavioral_mimicry": (2600, ["UPI", "UPI", "CARD"]),
    "device_rotation": (4800, ["UPI", "CARD"]),
    "composite_attack": (11000, ["UPI", "CARD", "NETBANKING"]),
}


def _status_for(score: int) -> str:
    return "ALLOWED" if score <= 30 else "VERIFY" if score <= 60 else "HOLD" if score <= 80 else "BLOCKED"


def _short() -> str:
    return uuid4().hex[:6].upper()


def insert_attack_records(connection: sqlite3.Connection, user_id: str, attack_id: str, generated: dict[str, Any], created_at: str) -> tuple[int, int, list[dict[str, Any]]]:
    """Insert the entities and payments for one generated attack. Returns (merchants, transactions, rows)."""
    rng = random.Random(attack_id)
    attack_type = str(generated.get("attack_type", "composite_attack"))
    ticket, methods = PROFILES.get(attack_type, PROFILES["composite_attack"])
    accounts = max(1, int(generated["accounts"]))
    devices = max(1, int(generated["devices"]))
    merchants = max(1, round(accounts / 2))
    count = max(1, round(accounts * float(generated["transaction_velocity"])))
    base_score = int(generated["attack_score"])
    home_city = rng.choice(CITIES)
    tag = attack_id.split("-")[-1]

    customer_ids = [f"C-{tag}{index + 1:02d}" for index in range(accounts)]
    device_ids = [f"D-{tag}{index + 1:02d}" for index in range(devices)]
    merchant_ids = [f"M-{tag}{index + 1:02d}" for index in range(merchants)]
    connection.executemany("INSERT INTO customers (id, name, city, user_id) VALUES (?, ?, ?, ?)",
                           [(item, f"Customer {item[2:]}", rng.choice(CITIES), user_id) for item in customer_ids])
    connection.executemany("INSERT INTO devices (id, platform, risk_score, user_id) VALUES (?, ?, ?, ?)",
                           [(item, rng.choice(PLATFORMS), max(5, min(99, base_score + rng.randint(-15, 8))), user_id) for item in device_ids])
    connection.executemany("INSERT INTO merchants (id, name, city, user_id) VALUES (?, ?, ?, ?)",
                           [(item, f"{rng.choice(MERCHANT_NAMES)} {item[2:]}", rng.choice(CITIES), user_id) for item in merchant_ids])

    start = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    rows = []
    for index in range(count):
        score = max(5, min(99, base_score + rng.randint(-14, 9)))
        amount = max(49, int(rng.lognormvariate(0, 0.45) * ticket))
        rows.append({
            "id": f"TXN-{tag}{index + 1:03d}",
            "customer_id": customer_ids[index % accounts],
            "merchant_id": merchant_ids[index % merchants],
            "amount": amount,
            "location": home_city if rng.random() < 0.55 else rng.choice(CITIES),
            "payment_method": rng.choice(methods),
            "risk_score": score,
            "status": _status_for(score),
            "device_id": device_ids[index % devices],
            "created_at": (start - timedelta(seconds=(count - index) * rng.randint(4, 40))).isoformat(),
        })
    connection.executemany(
        "INSERT INTO transactions (id, customer_id, merchant_id, amount, location, payment_method, risk_score, status, device_id, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [(r["id"], r["customer_id"], r["merchant_id"], r["amount"], r["location"], r["payment_method"], r["risk_score"], r["status"], r["device_id"], r["created_at"], user_id) for r in rows],
    )
    return merchants, count, rows


STARTER_ATTACKS = [("account_takeover", "Account Takeover", 1), ("money_mule", "Money Mule Network", 2), ("card_testing", "Card Testing", 1)]
INCIDENT_TITLES = {
    "account_takeover": "Account takeover from new device",
    "money_mule": "Money mule ring sharing devices",
    "card_testing": "Card testing burst on low-value payments",
}


def starter_workspace_enabled() -> bool:
    return os.getenv("EVOPAY_STARTER_WORKSPACE", "false").strip().lower() in {"1", "true", "yes", "on"}


def seed_starter_workspace(connection: sqlite3.Connection, user_id: str, generate_attack: Callable[[str, int], dict[str, Any]], audit: Callable[..., None]) -> None:
    """Give a brand-new account a lived-in workspace: three attacks, everyday payments and open incidents."""
    rng = random.Random(user_id)
    now = datetime.now(timezone.utc)
    for offset, (attack_type, name, generation) in enumerate(STARTER_ATTACKS):
        generated = generate_attack(attack_type, generation)
        attack_id = f"EV-{_short()}"
        created_at = (now - timedelta(minutes=40 * (len(STARTER_ATTACKS) - offset))).isoformat()
        merchants, count, rows = insert_attack_records(connection, user_id, attack_id, generated, created_at)
        connection.execute(
            "INSERT INTO attacks (id, name, severity, status, accounts, devices, merchants, transactions, created_at, attack_type, parameters, attack_score, detection_probability, evasion_success, generation, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (attack_id, name, "CRITICAL", "UNDER SIMULATION", generated["accounts"], generated["devices"], merchants, count, created_at, generated["attack_type"], json.dumps(generated), generated["attack_score"], generated["detection_score"], int(generated["evasion_success"]), generated["generation"], user_id),
        )
        worst = max(rows, key=lambda r: r["risk_score"])
        severity = "CRITICAL" if worst["risk_score"] > 80 else "HIGH"
        connection.execute(
            "INSERT INTO incidents (id, title, severity, status, created_at, transaction_id, attack_id, risk_score, reasons, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (f"INC-{_short()}", INCIDENT_TITLES.get(attack_type, f"{name} pattern detected"), severity, "OPEN" if offset else "INVESTIGATING", created_at, worst["id"], attack_id, worst["risk_score"], json.dumps(["High transaction velocity", "Device linked to multiple accounts"] if attack_type != "account_takeover" else ["Location changed from the usual pattern", "Behavior differs significantly from historical baseline"]), user_id),
        )
        audit(connection, user_id, "attack_generated", attack_id, generated)

    # Everyday, legitimate traffic so the picture isn't all fraud.
    customers = [f"C-{_short()}" for _ in range(8)]
    merchants = [f"M-{_short()}" for _ in range(5)]
    devices = [f"D-{_short()}" for _ in range(8)]
    connection.executemany("INSERT INTO customers (id, name, city, user_id) VALUES (?, ?, ?, ?)", [(c, f"Customer {c[2:]}", rng.choice(CITIES), user_id) for c in customers])
    connection.executemany("INSERT INTO merchants (id, name, city, user_id) VALUES (?, ?, ?, ?)", [(m, f"{rng.choice(MERCHANT_NAMES)} {m[2:5]}", rng.choice(CITIES), user_id) for m in merchants])
    connection.executemany("INSERT INTO devices (id, platform, risk_score, user_id) VALUES (?, ?, ?, ?)", [(d, rng.choice(PLATFORMS), rng.randint(5, 25), user_id) for d in devices])
    everyday = []
    for index in range(28):
        score = rng.choice([rng.randint(6, 28)] * 5 + [rng.randint(32, 55)])
        everyday.append((f"TXN-{_short()}", customers[index % 8], rng.choice(merchants), max(49, int(rng.lognormvariate(0, 0.7) * 1200)), rng.choice(CITIES), rng.choice(["UPI", "UPI", "UPI", "CARD", "NETBANKING"]), score, _status_for(score), devices[index % 8], (now - timedelta(minutes=rng.randint(1, 170))).isoformat(), user_id))
    connection.executemany("INSERT INTO transactions (id, customer_id, merchant_id, amount, location, payment_method, risk_score, status, device_id, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", everyday)
