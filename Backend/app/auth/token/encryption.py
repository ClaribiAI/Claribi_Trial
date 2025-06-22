"""
Encryption Service

This module provides centralized encryption utilities for the application,
implementing strong encryption for tokens and sensitive data.
"""

from flask import current_app
import base64
import hashlib
import os
import logging
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

class EncryptionService:
    """Service for encryption and decryption of sensitive data"""
    
    _encryption_key_cache = None
    
    @classmethod
    def get_encryption_key(cls, refresh=False):
        """Get the encryption key from configuration or derive from secret key
        
        Args:
            refresh: Whether to force refresh the cached key
            
        Returns:
            bytes: The encryption key suitable for Fernet
        """
        try:
            # Return cached key if available and refresh not requested
            if cls._encryption_key_cache is not None and not refresh:
                return cls._encryption_key_cache
                
            # Get key from app config
            cipher_key = current_app.config.get('TOKEN_ENCRYPTION_KEY')
            if not cipher_key:
                # Derive key from SECRET_KEY if TOKEN_ENCRYPTION_KEY not set
                cipher_key = current_app.config['SECRET_KEY']
            
            # Get salt from config or use default
            salt = current_app.config.get('ENCRYPTION_SALT', b'application-salt')
            if isinstance(salt, str):
                salt = salt.encode()
            
            # Use PBKDF2 to derive a secure key
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000
            )
            
            # Derive key using KDF
            derived_key = kdf.derive(cipher_key.encode() if isinstance(cipher_key, str) else cipher_key)
            
            # Encode for Fernet (URL-safe base64)
            encoded_key = base64.urlsafe_b64encode(derived_key)
            
            # Cache the key
            cls._encryption_key_cache = encoded_key
            
            return encoded_key
        except Exception as e:
            logger.error(f"Error getting encryption key: {str(e)}")
            raise

    @classmethod
    def encrypt_data(cls, data, key=None):
        """Encrypt data using Fernet symmetric encryption
        
        Args:
            data: The data to encrypt (string or bytes)
            key: Optional encryption key, uses default if not provided
            
        Returns:
            str: Encrypted data as a string
        """
        try:
            # Get encryption key
            encryption_key = key or cls.get_encryption_key()
            
            # Convert data to bytes if it's a string
            if isinstance(data, str):
                data = data.encode()
            
            # Create cipher and encrypt
            cipher = Fernet(encryption_key)
            encrypted_data = cipher.encrypt(data)
            
            # Return as string
            return encrypted_data.decode('utf-8')
        except Exception as e:
            logger.error(f"Error encrypting data: {str(e)}")
            return None

    @classmethod
    def decrypt_data(cls, encrypted_data, key=None):
        """Decrypt data using Fernet symmetric encryption
        
        Args:
            encrypted_data: The encrypted data (string or bytes)
            key: Optional encryption key, uses default if not provided
            
        Returns:
            str: Decrypted data as a string or None if decryption fails
        """
        try:
            # Get encryption key
            encryption_key = key or cls.get_encryption_key()
            
            # Convert to bytes if it's a string
            if isinstance(encrypted_data, str):
                encrypted_data = encrypted_data.encode()
            
            # Create cipher and decrypt
            cipher = Fernet(encryption_key)
            decrypted_data = cipher.decrypt(encrypted_data)
            
            # Return as string
            return decrypted_data.decode('utf-8')
        except InvalidToken:
            logger.warning("Invalid token provided for decryption")
            return None
        except Exception as e:
            logger.error(f"Error decrypting data: {str(e)}")
            return None
    
    @staticmethod
    def generate_secure_key():
        """Generate a new secure encryption key
        
        Returns:
            tuple: (key_bytes, key_encoded) - raw bytes and url-safe base64 encoded
        """
        key_bytes = Fernet.generate_key()
        return key_bytes, key_bytes.decode('utf-8')
        
    @staticmethod
    def rotate_encryption_key(old_key, new_key, encrypted_data):
        """Rotate encryption key by decrypting with old key and re-encrypting with new key
        
        Args:
            old_key: The old encryption key
            new_key: The new encryption key
            encrypted_data: Data encrypted with the old key
            
        Returns:
            str: Data re-encrypted with the new key
        """
        try:
            # Decrypt with old key
            old_cipher = Fernet(old_key)
            if isinstance(encrypted_data, str):
                encrypted_data = encrypted_data.encode()
                
            plaintext = old_cipher.decrypt(encrypted_data)
            
            # Re-encrypt with new key
            new_cipher = Fernet(new_key)
            new_encrypted = new_cipher.encrypt(plaintext)
            
            return new_encrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Error rotating encryption key: {str(e)}")
            return None 