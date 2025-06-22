from datetime import datetime, timedelta, timezone
import json
from flask import current_app
from redis import Redis, ConnectionPool
from cryptography.fernet import Fernet, InvalidToken
import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
from typing import Optional
from cryptography.exceptions import InvalidKey
import json.decoder


class TokenEncryptionError(Exception):
    """Custom exception for token encryption errors"""
    pass


class RedisTokenStorage:
    def __init__(self):
        # Below commented part is for when reddis paid subscription is used
        # Create a connection pool for Redis
        #ssl_params = None
        #if current_app.config['REDIS_SSL']:
           # ssl_params = {
               # 'ssl_cert_reqs': current_app.config['REDIS_SSL_CERT_REQS']
           # }

       # pool = ConnectionPool(
        #    host=current_app.config['REDIS_HOST'],
        #    port=current_app.config['REDIS_PORT'],
        #    password=current_app.config['REDIS_PASSWORD'],
        #    db=0,
        #    #ssl=current_app.config['REDIS_SSL'], <--- Needs paid subscription for this to work
        #    max_connections=10  # Adjust based on your application’s load
       # )
        # For Free redis subscription >>>
        pool = ConnectionPool(
        host=current_app.config['REDIS_HOST'],
        port=current_app.config['REDIS_PORT'],
        password=current_app.config['REDIS_PASSWORD'],
        db=0,
        # Do not use SSL in free tier
        max_connections=10
        )


        self.redis_client = Redis(connection_pool=pool)
        self.token_prefix = 'user_token:'
        self.token_expiry = timedelta(hours=1)  # Default expiry time
        self.encryption_key = current_app.config['TOKEN_ENCRYPTION_KEY'].encode()

    def _derive_key(self, salt: bytes) -> bytes:
        """Generate a key from the encryption key and salt"""
        try:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            return base64.urlsafe_b64encode(kdf.derive(self.encryption_key))
        except InvalidKey as e:
            raise TokenEncryptionError(f"Invalid key provided during key derivation: {e}") from e
        except Exception as e:
            current_app.logger.error(f"Error deriving key from salt in _derive_key method: {e}")
            raise TokenEncryptionError(f"Error deriving key from salt: {e}") from e

    def _generate_fernet_key_with_salt(self):
        """Generate a new Fernet-compatible key using a fresh random salt"""
        salt = os.urandom(16)  # 16-byte salt
        key = self._derive_key(salt)
        return Fernet(key), salt

    def _get_token_key(self, user_id: str) -> str:
        return f"{self.token_prefix}{user_id}"

    def store_tokens(self, user_id: str, tokens: dict, token_expiry: Optional[timedelta] = None) -> None:
        """Store encrypted user tokens in Redis"""
        token_expiry_time = datetime.utcnow() + timedelta(seconds=tokens.get('expires_in', 3600))  # Use UTC consistently
        token_data = {
            'access_token': tokens.get('access_token'),
            'id_token': tokens.get('id_token'),
            'refresh_token': tokens.get('refresh_token'),
            'expires_in': tokens.get('expires_in'),
            'token_expiry': token_expiry_time.isoformat()
        }

        fernet, salt = self._generate_fernet_key_with_salt()

        encrypted_data = fernet.encrypt(json.dumps(token_data).encode())
        token_key = self._get_token_key(user_id)

        # Using pipeline to combine Redis calls for performance
        with self.redis_client.pipeline() as pipe:
            pipe.hset(token_key, mapping={
                'salt': base64.urlsafe_b64encode(salt).decode(),
                'encrypted_data': encrypted_data
            })
            
            # Convert to integer timestamp (seconds) and pass to Redis
            expiration_timestamp = int((token_expiry_time if token_expiry else token_expiry_time + self.token_expiry).timestamp())
            pipe.expireat(token_key, expiration_timestamp)

            pipe.execute()

        current_app.logger.info(f"Token stored for user {user_id}")


    def get_tokens(self, user_id: str) -> Optional[dict]:
        """Retrieve and decrypt user tokens from Redis"""
        token_key = self._get_token_key(user_id)
        encrypted_data = self.redis_client.hget(token_key, 'encrypted_data')
        salt = self.redis_client.hget(token_key, 'salt')

        if not encrypted_data or not salt:
            current_app.logger.debug(f"No token data found for user {user_id}")  # Use debug for info-level logs
            return None

        try:
            encrypted_bytes = encrypted_data
            salt = base64.urlsafe_b64decode(salt)  # Decode salt from base64
            key = self._derive_key(salt)
            fernet = Fernet(key)

            decrypted_data = fernet.decrypt(encrypted_bytes)
            tokens = json.loads(decrypted_data.decode())
            tokens['token_expiry'] = datetime.fromisoformat(tokens['token_expiry']).astimezone(timezone.utc)
            return tokens
        except json.decoder.JSONDecodeError as e:
            current_app.logger.error(f"Error decoding JSON in token data for user {user_id}: {e}")
            raise TokenEncryptionError(f"Failed to decode JSON token data for user {user_id}") from e
        except InvalidToken as e:
            current_app.logger.error(f"Invalid token error for user {user_id}: {e}")
            raise TokenEncryptionError(f"Invalid token for user {user_id}") from e
        except Exception as e:
            current_app.logger.error(f"Error decrypting token data for user {user_id}: {e}")
            raise TokenEncryptionError(f"Failed to decrypt token for user {user_id}") from e

    def delete_tokens(self, user_id: str, reason: Optional[str] = "No longer needed") -> None:
        """Delete user tokens from Redis"""
        token_key = self._get_token_key(user_id)
        self.redis_client.delete(token_key)
        current_app.logger.info(f"Token deleted for user {user_id}. Reason: {reason}")

    def is_token_valid(self, user_id: str) -> bool:
        """Check if user's token is still valid"""
        tokens = self.get_tokens(user_id)
        if not tokens:
            return False

        return datetime.utcnow() < tokens['token_expiry']  # Use UTC consistently
