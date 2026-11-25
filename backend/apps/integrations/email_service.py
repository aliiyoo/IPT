import os
import smtplib
import ssl
from html import escape
from email.message import EmailMessage

from django.conf import settings


def send_pixelpink_transactional_email(
    to_email,
    to_name,
    subject,
    product_name,
    keys,
    order_id,
    credits_spent,
    verified_location=None,
):
    sender_email = settings.EMAIL_HOST_USER.strip()
    app_password = settings.EMAIL_HOST_PASSWORD.strip()
    if not sender_email or not app_password:
        raise RuntimeError('Gmail SMTP credentials are not configured.')

    safe_name = escape(to_name or to_email)
    safe_product_name = escape(product_name)
    safe_keys = [escape(key) for key in keys]
    safe_location = escape(str(verified_location).strip()) if verified_location else ''
    display_location = safe_location or 'Not provided'
    keys_html = ''.join(
        f"""
        <div style="background:#fff0f5;border:1px solid #ed2b70;border-radius:10px;padding:14px;margin:0 0 14px;">
            <p style="margin:0 0 8px;font-weight:700;color:#211822;font-size:14px;">{safe_product_name}</p>
            <div style="background:#fff;padding:12px 14px;border:1px dashed #ed2b70;border-radius:6px;color:#ed2b70;text-align:center;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:800;letter-spacing:3px;">
                {key}
            </div>
            <small style="display:block;margin-top:8px;color:#716871;font-size:11px;">Single-use authentic digital activation code</small>
        </div>
        """
        for key in safe_keys
    )
    plain_text = (
        f'Hello {to_name or to_email},\n\n'
        f'Your PixelPink digital keys for {product_name} are below:\n'
        + '\n'.join(safe_keys)
        + f'\n\nOrder #{order_id} · {credits_spent} credits\n'
        + f'Verified Billing Address: {verified_location or "Not provided"}\n'
        + 'Refund Policy: You have 3 days (72 hours) from the time of purchase to request a refund. The refund window closes immediately once the digital key has been revealed.\n\n'
        + 'Thank you for choosing PixelPink!'
    )
    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Your PixelPink Digital Keys</title>
</head>
<body style="margin:0;padding:24px;background:#fffaf8;color:#211822;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #eadfe4;border-radius:16px;padding:30px;">
        <div style="text-align:center;margin:0 0 24px;">
            <div style="display:inline-block;background:#ed2b70;color:#fff;font-size:20px;font-weight:900;padding:9px 16px;border-radius:10px;">PIXEL<span style="color:#ffe3ee;">PINK</span></div>
            <h1 style="margin:18px 0 5px;font-size:24px;color:#211822;">Your Digital Keys</h1>
            <p style="margin:0;color:#716871;font-size:13px;">Order #{order_id} confirmation &amp; key delivery</p>
        </div>
        <div style="border-top:2px solid #fff0f5;padding-top:20px;">
            <p style="font-size:15px;line-height:1.6;">Hello <strong>{safe_name}</strong>,</p>
            <p style="font-size:14px;line-height:1.7;color:#444;">Thank you for your purchase. Your payment is confirmed; your digital activation key{'s' if len(safe_keys) != 1 else ''} {'are' if len(safe_keys) != 1 else 'is'} below.</p>
        </div>
        <div style="margin:22px 0;">{keys_html}</div>
        <div style="background:#fbf7f9;border-radius:10px;padding:16px;color:#555;font-size:13px;line-height:1.7;">
            <p style="margin:0 0 5px;"><strong>Product:</strong> {safe_product_name}</p>
            <p style="margin:0 0 5px;"><strong>Credits charged:</strong> {credits_spent}</p>
            <p style="margin:0;"><strong>Order:</strong> #{order_id}</p>
        </div>
        <div style="background:#fff0f5;border:1px solid #f7c6d9;border-radius:10px;padding:12px 16px;margin-top:14px;font-size:13px;line-height:1.5;">
            <strong style="color:#ed2b70;">&#128205; Verified Billing Address:</strong>
            <span style="color:#211822;font-weight:600;">{display_location}</span>
        </div>
        <div style="background:#f8f7f9;border-left:3px solid #9e95a0;border-radius:6px;padding:12px 14px;margin-top:14px;font-size:12px;line-height:1.6;color:#6b636d;">
            <strong style="color:#4a434c;">&#9888;&#65039; Refund Policy:</strong> You have 3 days (72 hours) from the time of purchase to request a refund. The refund window closes immediately once the digital key has been revealed.
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f2e9ed;text-align:center;color:#8b8187;font-size:12px;">
            <p style="margin:0 0 5px;">Thank you for choosing <strong>PixelPink</strong>.</p>
            <p style="margin:0;">&copy; 2026 PixelPink Digital Storefront</p>
        </div>
    </div>
</body>
</html>"""

    message = EmailMessage()
    message.set_content(plain_text)
    message.add_alternative(html_body, subtype='html')
    message['Subject'] = subject
    message['From'] = f'PixelPink <{sender_email}>'
    message['To'] = to_email

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL(
            'smtp.gmail.com',
            465,
            context=context,
            timeout=15,
            local_hostname='127.0.0.1',
        ) as server:
            server.login(sender_email, app_password)
            server.send_message(message)
        return True
    except Exception:
        try:
            with smtplib.SMTP(
                'smtp.gmail.com',
                587,
                timeout=15,
                local_hostname='127.0.0.1',
            ) as server:
                server.starttls(context=context)
                server.login(sender_email, app_password)
                server.send_message(message)
            return True
        except Exception as exc:
            raise RuntimeError('Gmail SMTP delivery failed on ports 465 and 587.') from exc


def send_pixelpink_fulfillment_email(order, fulfillments, verified_location=None):
    customer = order.customer
    receiver_email = customer.email if customer else "customer@example.com"
    customer_name = (customer.get_full_name() or customer.username) if customer else "Valued Customer"
    safe_location = escape(str(verified_location).strip()) if verified_location else ''
    display_location = safe_location or 'Not provided'

    sender_email = os.getenv('EMAIL_HOST_USER', '').strip()
    app_password = os.getenv('EMAIL_HOST_PASSWORD', '').strip()

    if not sender_email or not app_password:
        print("--> [PixelPink Email Error] Missing credentials in .env", flush=True)
        return

    # Build key display blocks
    keys_html = ""
    for f in fulfillments:
        item = f.order_item
        key_code = f.digital_key.code
        keys_html += f"""
        <div style="background: #fff0f5; border: 1px solid #ed2b70; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
            <p style="margin: 0 0 6px; font-weight: 700; color: #211822; font-size: 14px;">{item.snapshot_name}</p>
            <div style="background: #ffffff; padding: 10px 14px; font-family: 'Courier New', Courier, monospace; font-size: 18px; letter-spacing: 3px; font-weight: 800; color: #ed2b70; border-radius: 6px; border: 1px dashed #ed2b70; text-align: center;">
                {key_code}
            </div>
            <small style="color: #716871; font-size: 11px; display: block; margin-top: 6px;">Single-use authentic digital activation code</small>
        </div>
        """

    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Your PixelPink Digital Keys</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fffaf8; margin: 0; padding: 30px; color: #211822;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 20px; border: 1px solid #eadfe4; padding: 36px; box-shadow: 0 10px 35px rgba(237, 43, 112, 0.08);">
        <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background: #ed2b70; color: #ffffff; font-weight: 900; font-size: 20px; padding: 8px 16px; border-radius: 12px; letter-spacing: 1px;">
                PIXEL<span style="color: #ffe3ee;">PINK</span>
            </div>
            <h1 style="color: #211822; font-size: 24px; margin: 16px 0 4px; font-weight: 800;">Your PixelPink Digital Keys</h1>
            <p style="color: #716871; font-size: 14px; margin: 0;">Order #{order.id} Confirmation &amp; Key Delivery</p>
        </div>
        <div style="border-top: 2px solid #fff0f5; padding-top: 20px; margin-bottom: 22px;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 12px;">Hello <strong>{customer_name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0 0 16px;">
                Welcome to <strong>PixelPink</strong>! Thank you for your purchase. Your payment has been confirmed and your unique digital activation keys are below:
            </p>
        </div>
        <div style="margin: 24px 0;">{keys_html}</div>
        <div style="background: #fbf7f9; border-radius: 12px; padding: 18px; margin-top: 24px; font-size: 13px; color: #555;">
            <p style="margin: 0 0 6px;"><strong>Order Total:</strong> PHP {order.total}</p>
            <p style="margin: 0 0 6px;"><strong>Status:</strong> Fulfilled</p>
            <p style="margin: 0 0 10px;"><strong>Activation:</strong> Enter each code in its respective platform launcher.</p>
            <p style="margin: 0; font-size: 12px; color: #777;">Need help? Contact the PixelPink support team anytime.</p>
        </div>
        <div style="background: #fff0f5; border: 1px solid #f7c6d9; border-radius: 10px; padding: 12px 16px; margin-top: 14px; font-size: 13px; line-height: 1.5;">
            <strong style="color: #ed2b70;">&#128205; Verified Billing Address:</strong>
            <span style="color: #211822; font-weight: 600;">{display_location}</span>
        </div>
        <div style="background: #f8f7f9; border-left: 3px solid #9e95a0; border-radius: 6px; padding: 12px 14px; margin-top: 14px; font-size: 12px; line-height: 1.6; color: #6b636d;">
            <strong style="color: #4a434c;">&#9888;&#65039; Refund Policy:</strong> You have 3 days (72 hours) from the time of purchase to request a refund. The refund window closes immediately once the digital key has been revealed.
        </div>
        <div style="text-align: center; margin-top: 32px; border-top: 1px solid #f2e9ed; padding-top: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0 0 4px;">Thank you for choosing <strong>PixelPink</strong>.</p>
            <p style="margin: 0;">&copy; 2025 PixelPink | Digital Storefront. All rights reserved.</p>
        </div>
    </div>
</body>
</html>"""

    msg = EmailMessage()
    msg.set_content(html_body, subtype='html')
    msg["Subject"] = "Your PixelPink Digital Keys"
    msg["From"] = f"PixelPink <{sender_email}>"
    msg["To"] = receiver_email

    context = ssl.create_default_context()

    print(f"--> [DEBUG] Attempting to send email from {sender_email} to {receiver_email}...", flush=True)
    
    try:
        # local_hostname='127.0.0.1' fixes the Django WSGI threading bug on Windows
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context, timeout=15, local_hostname='127.0.0.1') as server:
            server.login(sender_email, app_password)
            server.send_message(msg)
            print(f"--> [SUCCESS] Email sent successfully to {receiver_email}!", flush=True)
            return
    except Exception as e:
        print(f"--> [ERROR 465] {str(e)}", flush=True)
        
        print("--> [DEBUG] Attempting fallback to Port 587...", flush=True)
        try:
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=15, local_hostname='127.0.0.1') as server:
                server.starttls(context=context)
                server.login(sender_email, app_password)
                server.send_message(msg)
                print(f"--> [SUCCESS] Email sent successfully via Port 587 to {receiver_email}!", flush=True)
                return
        except Exception as fallback_e:
            print(f"--> [ERROR 587] {str(fallback_e)}", flush=True)
            # We removed 'raise' so the website doesn't crash if the firewall blocks the email.