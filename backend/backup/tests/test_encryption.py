from pathlib import Path
from tempfile import TemporaryDirectory
from django.test import TestCase, override_settings

from backup.encryption import (
    MAGIC_HEADER,
    decrypt_backup_archive,
    encrypt_backup_archive,
    get_backup_encryption_key,
    is_archive_encrypted,
    BackupEncryptionError,
)


class BackupEncryptionTests(TestCase):
    def test_key_derivation_deterministic(self):
        k1 = get_backup_encryption_key()
        k2 = get_backup_encryption_key()
        self.assertEqual(k1, k2)
        self.assertEqual(len(k1), 32)

    def test_encrypt_and_decrypt_cycle(self):
        with TemporaryDirectory() as tmp_dir:
            sample_file = Path(tmp_dir) / "test_backup.dfbak"
            original_content = b"Dolphin Flow Enterprise Backup Archive Content \x00\x01\x02"
            sample_file.write_bytes(original_content)

            self.assertFalse(is_archive_encrypted(sample_file))

            # Encrypt in place
            encrypted_file = encrypt_backup_archive(sample_file)
            self.assertEqual(encrypted_file, sample_file)
            self.assertTrue(is_archive_encrypted(encrypted_file))
            self.assertNotEqual(encrypted_file.read_bytes(), original_content)
            self.assertTrue(encrypted_file.read_bytes().startswith(MAGIC_HEADER))

            # Decrypt to new file
            decrypted_file = Path(tmp_dir) / "restored.dfbak"
            decrypt_backup_archive(encrypted_file, decrypted_file)
            self.assertEqual(decrypted_file.read_bytes(), original_content)

    def test_decrypt_unencrypted_archive_backward_compatible(self):
        with TemporaryDirectory() as tmp_dir:
            legacy_file = Path(tmp_dir) / "legacy.dfbak"
            original_content = b"Legacy plaintext archive"
            legacy_file.write_bytes(original_content)

            out_file = Path(tmp_dir) / "output.dfbak"
            result = decrypt_backup_archive(legacy_file, out_file)
            self.assertEqual(result.read_bytes(), original_content)

    def test_decrypt_with_wrong_key_fails(self):
        with TemporaryDirectory() as tmp_dir:
            sample_file = Path(tmp_dir) / "secret.dfbak"
            sample_file.write_bytes(b"Top secret data")

            key_a = b"A" * 32
            key_b = b"B" * 32

            encrypt_backup_archive(sample_file, key=key_a)

            with self.assertRaises(BackupEncryptionError):
                decrypt_backup_archive(sample_file, key=key_b)
