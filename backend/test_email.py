import smtplib, ssl
from email.message import EmailMessage

# Use your credentials
email = "pixelpink.ph@gmail.com"
password = "ymeqlgnftezpkcpm"
recipient = "pixelpink.ph@gmail.com"

# Try connecting with SMTP_SSL on port 465
context = ssl.create_default_context()
with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
    print("Connection established. Attempting login...")
    server.login(email, password)
    print("Login successful! Sending email...")
    
    msg = EmailMessage()
    msg.set_content("This is a test email from PixelPink.")
    msg["Subject"] = "PixelPink Test Email"
    msg["From"] = email
    msg["To"] = recipient
    
    server.send_message(msg)
    print("Email sent successfully!")