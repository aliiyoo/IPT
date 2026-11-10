from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from .models import Vendor, Category, Product, ProductVariant
from .serializers import (
    VendorSerializer,
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductVariantSerializer,
)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).prefetch_related('variants', 'vendor', 'category')
        vendor_slug = self.request.query_params.get('vendor')
        category_slug = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        platform = self.request.query_params.get('platform')

        if vendor_slug:
            queryset = queryset.filter(vendor__slug=vendor_slug)
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(vendor__name__icontains=search)
            )
        if platform:
            queryset = queryset.filter(variants__attributes__platform__icontains=platform).distinct()

        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).prefetch_related('variants', 'vendor', 'category')
    serializer_class = ProductDetailSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]


class VendorListView(generics.ListAPIView):
    queryset = Vendor.objects.filter(is_active=True)
    serializer_class = VendorSerializer
    permission_classes = [permissions.AllowAny]


class VendorDetailView(generics.RetrieveAPIView):
    queryset = Vendor.objects.filter(is_active=True)
    serializer_class = VendorSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]


# --- Vendor (Seller Center) Endpoints ---
class VendorProductListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_vendor(self, user):
        if hasattr(user, 'profile') and user.profile.vendor:
            return user.profile.vendor
        return None

    def get(self, request):
        vendor = self.get_vendor(request.user)
        if not vendor and not request.user.is_superuser:
            return Response({'error': 'Not authorized as a vendor.'}, status=status.HTTP_403_FORBIDDEN)
        
        products = Product.objects.filter(vendor=vendor) if vendor else Product.objects.all()
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)

    def post(self, request):
        vendor = self.get_vendor(request.user)
        if not vendor and not request.user.is_superuser:
            return Response({'error': 'Not authorized as a vendor.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if vendor:
            data['vendor_id'] = vendor.id

        category_id = data.get('category_id')
        prod = Product.objects.create(
            vendor=vendor or Vendor.objects.first(),
            category_id=category_id,
            name=data.get('name'),
            description=data.get('description', ''),
            base_price=data.get('base_price', 0),
            cover_image=data.get('cover_image', ''),
            is_digital=True,
            is_active=True
        )
        serializer = ProductDetailSerializer(prod)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VendorProductDetailUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        vendor = request.user.profile.vendor if hasattr(request.user, 'profile') else None
        try:
            prod = Product.objects.get(pk=pk)
            if vendor and prod.vendor != vendor and not request.user.is_superuser:
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        for field in ['name', 'description', 'base_price', 'cover_image', 'is_active']:
            if field in request.data:
                setattr(prod, field, request.data[field])
        prod.save()
        return Response(ProductDetailSerializer(prod).data)
