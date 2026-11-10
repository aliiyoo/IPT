from django.contrib import admin
from .models import Order, OrderItem, Fulfillment, RefundRequest


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'status', 'total', 'paymongo_session_id', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('id', 'customer__username', 'paymongo_session_id')
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'snapshot_name', 'quantity', 'unit_price')
    search_fields = ('snapshot_name', 'order__id')


@admin.register(Fulfillment)
class FulfillmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_item', 'digital_key', 'email_sent_at', 'brevo_message_id', 'created_at')
    search_fields = ('order_item__id', 'brevo_message_id')


@admin.register(RefundRequest)
class RefundRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_item', 'status', 'paymongo_refund_id', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order_item__id', 'paymongo_refund_id')
