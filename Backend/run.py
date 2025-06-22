from app import create_app
import os
import logging
import socket
from werkzeug.serving import WSGIRequestHandler, BaseWSGIServer
import werkzeug._internal as _internal
from flask import Flask
from OpenSSL import crypto
import os

def generate_self_signed_cert():
    # Create certificates directory if it doesn't exist
    os.makedirs('certificates', exist_ok=True)
    
    cert_file = 'certificates/cert.pem'
    key_file = 'certificates/key.pem'
    
    # Check if certificates already exist
    if os.path.exists(cert_file) and os.path.exists(key_file):
        print("Certificate already exists, skipping generation.")
        return

    # Generate key
    k = crypto.PKey()
    k.generate_key(crypto.TYPE_RSA, 2048)

    # Generate certificate
    cert = crypto.X509()
    cert.get_subject().C = "US"
    cert.get_subject().ST = "California"
    cert.get_subject().L = "Localhost"
    cert.get_subject().O = "My Company"
    cert.get_subject().OU = "Development"
    cert.get_subject().CN = "localhost"
    cert.set_serial_number(1000)
    cert.gmtime_adj_notBefore(0)
    cert.gmtime_adj_notAfter(365*24*60*60)  # Valid for one year
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(k)
    cert.sign(k, 'sha256')

    # Save certificate and key in PEM format
    with open(cert_file, "wb") as f:
        f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
    
    with open(key_file, "wb") as f:
        f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k))

    print(f"Certificate generated and saved as {cert_file}, {key_file}")
    
app = create_app()

# More comprehensive solution to handle TLS handshake attempts
class TLSFriendlyWSGIRequestHandler(WSGIRequestHandler):
    def connection_dropped(self, error, environ=None):
        """Called if the connection was closed by the client."""
        if environ is None:
            environ = {}
        self.close_connection = True
        self.log("error", "Connection dropped: %s", error)

    def handle(self):
        """Handle a single HTTP request"""
        self.raw_requestline = None
        self.close_connection = True

        try:
            self.rfile = self.connection.makefile('rb', self.rbufsize)
            self.raw_requestline = self.rfile.readline(65537)
            print("RAW REQUEST LINE:", self.raw_requestline)

            # Detect if client is speaking TLS (starts with byte 0x16, which is TLS handshake)
            if self.raw_requestline.startswith(b'\x16\x03'):
                self.log_error("Received HTTPS request on HTTP port")
                self.connection.close()
                return

            if not self.raw_requestline:
                return

            if len(self.raw_requestline) > 65536:
                self.log_error("Request line too long")
                return

            if not self.parse_request():
                return

            self.run_wsgi()

        except Exception as e:
            self.log_error("Error in request handling: %s", str(e))


if __name__ == '__main__':
    # Configure logging for detailed error reporting
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Generate certificates
    generate_self_signed_cert()
    
    # Run with specific host and port settings
    app.run(
        host='127.0.0.1',
        port=5000,
        ssl_context=('certificates/cert.pem', 'certificates/key.pem'),
        debug=True
    )