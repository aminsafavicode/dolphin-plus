"""
Backup Archive Encryption Services for Dolphin Flow.

Provides enterprise-grade AES-256-GCM symmetric encryption for backup archives
(.dfbak) at rest, in transit, and across external replication targets.
"""

from __future__ import annotations

import hashlib
import os
import secrets
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


# 16-byte distinct magic prefix for encrypted Dolphin Flow archives
MAGIC_HEADER = b"DFBAK_ENC_V1\x00\x00\x00\x00"
NONCE_LENGTH = 12  # 96-bit nonce recommended for AES-GCM
HEADER_SIZE = len(MAGIC_HEADER) + NONCE_LENGTH


class BackupEncryptionError(Exception):
    """Raised when an encryption or decryption operation fails."""


def get_backup_encryption_key(custom_key: str | bytes | None = None) -> bytes:
    """
    Derives a consistent 32-byte (256-bit) AES key.

    Priority:
    1. Explicit custom_key parameter.
    2. settings.BACKUP_ENCRYPTION_KEY if configured.
    3. SHA-256 hash of settings.SECRET_KEY as a secure fallback.
    """
    raw_key = custom_key or getattr(settings, "BACKUP_ENCRYPTION_KEY", None) or os.getenv("BACKUP_ENCRYPTION_KEY")
    if raw_key:
        if isinstance(raw_key, str):
            raw_key_bytes = raw_key.encode("utf-8")
        else:
            raw_key_bytes = raw_key

        if len(raw_key_bytes) == 32:
            return raw_key_bytes
        # Derive 32-byte key via SHA-256
        return hashlib.sha256(raw_key_bytes).digest()

    # Fallback to hashed SECRET_KEY
    secret = getattr(settings, "SECRET_KEY", "dolphin-flow-default-secret-key")
    return hashlib.sha256(secret.encode("utf-8")).digest()


def is_archive_encrypted(file_path: Path | str) -> bool:
    """
    Checks if a backup archive has the Dolphin Flow AES-256-GCM magic header.
    """
    path = Path(file_path)
    if not path.is_file() or path.stat().st_size < HEADER_SIZE:
        return False

    try:
        with open(path, "rb") as f:
            header = f.read(len(MAGIC_HEADER))
            return header == MAGIC_HEADER
    except OSError:
        return False


def encrypt_backup_archive(
    source_path: Path | str,
    dest_path: Path | str | None = None,
    key: bytes | None = None,
) -> Path:
    """
    Encrypts a .dfbak archive using AES-256-GCM.
    If dest_path is None, an atomic replacement of source_path is performed.
    """
    src = Path(source_path)
    if not src.is_file():
        raise BackupEncryptionError(f"فایل مبدأ برای رمزنگاری وجود ندارد: {src}")

    if is_archive_encrypted(src):
        raise BackupEncryptionError("فایل مبدأ قبلاً رمزنگاری شده است.")

    aes_key = get_backup_encryption_key(key)
    aesgcm = AESGCM(aes_key)
    nonce = secrets.token_bytes(NONCE_LENGTH)

    target = Path(dest_path) if dest_path else src.with_suffix(".enc_tmp")

    try:
        with open(src, "rb") as f_in:
            plaintext = f_in.read()

        ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data=MAGIC_HEADER)

        with open(target, "wb") as f_out:
            f_out.write(MAGIC_HEADER)
            f_out.write(nonce)
            f_out.write(ciphertext)

        if dest_path is None:
            target.replace(src)
            return src
        return target
    except Exception as exc:
        if target.exists() and dest_path is None:
            target.unlink(missing_ok=True)
        raise BackupEncryptionError(f"خطا در فرآیند رمزنگاری پشتیبان: {exc}") from exc


def decrypt_backup_archive(
    source_path: Path | str,
    dest_path: Path | str | None = None,
    key: bytes | None = None,
) -> Path:
    """
    Decrypts an encrypted .dfbak archive.
    If dest_path is None, the decrypted file will be written to a temporary sibling file.
    """
    src = Path(source_path)
    if not src.is_file():
        raise BackupEncryptionError(f"فایل آرشیو برای رمزگشایی یافت نشد: {src}")

    if not is_archive_encrypted(src):
        # Already plaintext / unencrypted archive (backward-compatible)
        if dest_path and Path(dest_path) != src:
            import shutil
            shutil.copy2(src, dest_path)
            return Path(dest_path)
        return src

    aes_key = get_backup_encryption_key(key)
    aesgcm = AESGCM(aes_key)

    target = Path(dest_path) if dest_path else src.with_name(f"dec_{src.name}")

    try:
        with open(src, "rb") as f_in:
            magic = f_in.read(len(MAGIC_HEADER))
            if magic != MAGIC_HEADER:
                raise BackupEncryptionError("هدر شناسایی رمزنگاری آرشیو نامعتبر است.")
            nonce = f_in.read(NONCE_LENGTH)
            ciphertext = f_in.read()

        plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data=MAGIC_HEADER)

        with open(target, "wb") as f_out:
            f_out.write(plaintext)

        return target
    except Exception as exc:
        if target.exists() and dest_path is not None:
            target.unlink(missing_ok=True)
        raise BackupEncryptionError(f"خطا در رمزگشایی یا تطابق کلید امنیتی: {exc}") from exc
