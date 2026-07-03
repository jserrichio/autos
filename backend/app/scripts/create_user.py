"""Bootstrap the first family user. Run with: uv run python -m app.scripts.create_user"""

import getpass

from app.core.security import hash_password
from app.database import SessionLocal
from app.models import User


def main() -> None:
    username = input("Usuario: ").strip()
    email = input("Email: ").strip()
    password = getpass.getpass("Contraseña: ")
    full_name = input("Nombre completo (opcional): ").strip() or None
    is_admin = input("¿Es administrador? (s/n): ").strip().lower() == "s"

    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == username).first():
            print(f"El usuario '{username}' ya existe.")
            return
        if db.query(User).filter(User.email == email).first():
            print(f"Ya existe un usuario con el email '{email}'.")
            return
        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            is_admin=is_admin,
        )
        db.add(user)
        db.commit()
        print(f"Usuario '{username}' creado correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
