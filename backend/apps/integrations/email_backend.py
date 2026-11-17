import smtplib
from django.core.mail.backends.smtp import EmailBackend

class GmailEmailBackend(EmailBackend):
    def open(self):
        if self.connection:
            return False
        
        # Force local_hostname to 127.0.0.1 to avoid Gmail rejecting 'localhost'
        connection_params = {"local_hostname": "127.0.0.1"}
        
        self.connection = smtplib.SMTP(
            self.host,
            self.port,
            **connection_params
        )
        
        if self.use_tls:
            self.connection.starttls()
            
        if self.username and self.password:
            self.connection.login(self.username, self.password)
            
        return True