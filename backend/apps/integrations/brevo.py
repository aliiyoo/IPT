import os
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class BrevoError(Exception):
    pass


class BrevoClient:
    BASE_URL = "https://api.brevo.com/v3/smtp/email"

    def __init__(self, api_key=None, sender_email=None, sender_name=None):
        self.api_key = api_key or getattr(settings, 'BREVO_API_KEY', '') or os.getenv('BREVO_API_KEY', '')
        self.sender_email = sender_email or getattr(settings, 'BREVO_SENDER_EMAIL', 'noreply@pixelpink.store')
        self.sender_name = sender_name or getattr(settings, 'BREVO_SENDER_NAME', 'PixelPink Store')

    def send_transactional_email(self, to_email, to_name, subject, html_content):
        """
        Sends an email using Brevo Transactional Email API v3.
        """
        if not self.api_key:
            logger.warning(f"No BREVO_API_KEY configured. Mocking email delivery to {to_email}.")
            return f"mock_brevo_msg_{to_email.split('@')[0]}"

        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload = {
            "sender": {
                "name": self.sender_name,
                "email": self.sender_email
            },
            "to": [
                {
                    "email": to_email,
                    "name": to_name or to_email
                }
            ],
            "subject": subject,
            "htmlContent": html_content
        }

        try:
            response = requests.post(self.BASE_URL, headers=headers, json=payload, timeout=20)
            if response.status_code in (200, 201, 202):
                data = response.json()
                message_id = data.get("messageId", f"brevo_{response.status_code}")
                logger.info(f"Brevo email sent to {to_email}. Message ID: {message_id}")
                return message_id
            else:
                logger.error(f"Brevo API error {response.status_code}: {response.text}")
                raise BrevoError(f"Brevo API failed with {response.status_code}: {response.text}")
        except requests.RequestException as e:
            logger.error(f"Brevo request exception: {e}")
            raise BrevoError(f"Network error communicating with Brevo: {e}")

    def send_keys_fulfillment_email(self, order, fulfillments):
        """
        Builds the customer email with order summary and revealed digital keys.
        """
        customer = order.customer
        customer_email = customer.email or "customer@example.com"
        customer_name = customer.get_full_name() or customer.username

        # Group keys by item
        keys_html = ""
        for f in fulfillments:
            item = f.order_item
            keys_html += f"""
            <div style="background: #fff0f5; border: 1px solid #ed2b70; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <p style="margin: 0 0 6px; font-weight: bold; color: #211822;">{item.snapshot_name}</p>
                <code style="display: block; background: #ffffff; padding: 8px 12px; font-size: 15px; letter-spacing: 2px; font-weight: 700; color: #ed2b70; border-radius: 4px; border: 1px dashed #ed2b70;">
                    {f.digital_key.code}
                </code>
            </div>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Your Digital Keys</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fffaf8; margin: 0; padding: 24px; color: #211822;">
            <div style="max-width: 580px; margin: auto; background: #ffffff; border-radius: 16px; border: 1px solid #eadfe4; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #ed2b70; margin: 0; font-size: 26px;">PIXEL<span style="color: #211822;">PINK</span></h1>
                    <p style="color: #716871; font-size: 14px; margin-top: 4px;">Digital Products Delivered Instantly</p>
                </div>
                
                <h2 style="font-size: 20px; border-bottom: 2px solid #fff0f5; padding-bottom: 10px;">Your Digital Keys &amp; Licenses</h2>
                <p>Hello <strong>{customer_name}</strong>,</p>
                <p>Thank you for your purchase! Your payment for <strong>Order #{order.id}</strong> has been confirmed. Below are your instant digital activation codes:</p>
                
                <div style="margin: 20px 0;">
                    {keys_html}
                </div>

                <div style="background: #f8f9fa; border-radius: 8px; padding: 14px; margin-top: 24px; font-size: 13px; color: #555;">
                    <p style="margin: 0 0 4px;"><strong>Order Total:</strong> ₱{order.total}</p>
                    <p style="margin: 0 0 4px;"><strong>Status:</strong> Fulfilled</p>
                    <p style="margin: 0;"><strong>Need Help?</strong> You can also view and reveal your keys directly on your <a href="{settings.FRONTEND_URL}/orders/{order.id}" style="color: #ed2b70;">Order Page</a>.</p>
                </div>

                <p style="font-size: 11px; color: #999; text-align: center; margin-top: 30px;">
                    © 2025 PixelPink Digital Storefront. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

        subject = f"Your digital keys — Order #{order.id}"
        message_id = self.send_transactional_email(
            to_email=customer_email,
            to_name=customer_name,
            subject=subject,
            html_content=html_content
        )
        return message_id

    def send_vendor_sale_notification(self, vendor, order, items):
        """
        Sends an email notification to the vendor when their products are purchased.
        """
        # Find vendor email
        vendor_user = getattr(vendor, 'profiles', None)
        first_profile = vendor_user.first() if vendor_user else None
        vendor_email = first_profile.user.email if first_profile and first_profile.user.email else "vendor@pixelpink.store"

        items_summary = "".join([f"<li>{i.snapshot_name} (Qty: {i.quantity}) — ₱{i.subtotal}</li>" for i in items])

        html_content = f"""
        <h2>New Sale Alert: Order #{order.id}</h2>
        <p>Congratulations <strong>{vendor.name}</strong>,</p>
        <p>A customer has just purchased the following products from your shop:</p>
        <ul>{items_summary}</ul>
        <p>Check your <a href="{settings.FRONTEND_URL}/seller">Seller Center</a> for details.</p>
        """

        try:
            return self.send_transactional_email(
                to_email=vendor_email,
                to_name=vendor.name,
                subject=f"New Sale on PixelPink — Order #{order.id}",
                html_content=html_content
            )
        except Exception as e:
            logger.error(f"Failed to send vendor sale email: {e}")
            return None
