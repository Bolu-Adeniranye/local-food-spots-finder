from django.contrib.gis import admin
from .models import FoodSpot, Review


@admin.register(FoodSpot)
class FoodSpotAdmin(admin.GISModelAdmin):
    """
    Admin interface for FoodSpot with map widget.
    """
    list_display = ['name', 'cuisine_type', 'rating', 'price_range', 'address', 'is_active']
    list_filter = ['cuisine_type', 'rating', 'price_range', 'is_active']
    search_fields = ['name', 'address', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'cuisine_type', 'description')
        }),
        ('Location', {
            'fields': ('address', 'location')
        }),
        ('Contact', {
            'fields': ('phone', 'website')
        }),
        ('Details', {
            'fields': ('rating', 'price_range', 'opening_hours')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )
    
    # Map widget configuration
    default_lon = -6.260310
    default_lat = 53.349805
    default_zoom = 12


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """
    Admin interface for Review model.
    """
    list_display = ['reviewer_name', 'foodspot', 'rating', 'created_at', 'is_approved']
    list_filter = ['rating', 'is_approved', 'created_at']
    search_fields = ['reviewer_name', 'reviewer_email', 'comment', 'foodspot__name']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_approved']
    
    fieldsets = (
        ('Review Information', {
            'fields': ('foodspot', 'reviewer_name', 'reviewer_email')
        }),
        ('Review Content', {
            'fields': ('rating', 'comment')
        }),
        ('Status', {
            'fields': ('is_approved', 'created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('foodspot')