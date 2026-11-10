from rest_framework import serializers
from .models import Order, OrderItem, Fulfillment, RefundRequest
from apps.store.serializers import ProductVariantSerializer


class FulfillmentSerializer(serializers.ModelSerializer):
    key_code = serializers.SerializerMethodField()

    class Meta:
        model = Fulfillment
        fields = ['id', 'key_code', 'email_sent_at', 'brevo_message_id', 'created_at']

    def get_key_code(self, obj):
        order_status = obj.order_item.order.status
        # Reveal key only if order is paid or fulfilled
        if order_status in ['paid', 'fulfilled']:
            return obj.digital_key.code
        # Otherwise masked
        return "••••-••••-••••-•••• (Pending Payment)"


class RefundRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundRequest
        fields = ['id', 'order_item', 'reason', 'status', 'paymongo_refund_id', 'created_at']
        read_only_fields = ['status', 'paymongo_refund_id', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    fulfillments = FulfillmentSerializer(many=True, read_only=True)
    refund_requests = RefundRequestSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'variant', 'quantity', 'unit_price', 'snapshot_name', 'subtotal', 'fulfillments', 'refund_requests']


class OrderListSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'status', 'total', 'created_at', 'items_count']


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'status', 'total', 'paymongo_session_id', 'created_at', 'items']
