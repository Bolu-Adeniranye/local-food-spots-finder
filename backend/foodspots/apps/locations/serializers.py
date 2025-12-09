from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import FoodSpot, Review


class FoodSpotSerializer(GeoFeatureModelSerializer):
    """
    GeoJSON serializer for FoodSpot model.
    Outputs in GeoJSON format for easy mapping with Leaflet.
    """
    
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    cuisine_display = serializers.CharField(source='get_cuisine_type_display', read_only=True)
    price_display = serializers.CharField(source='get_price_range_display', read_only=True)
    
    class Meta:
        model = FoodSpot
        geo_field = 'location'
        fields = [
            'id', 'name', 'cuisine_type', 'cuisine_display', 
            'description', 'address', 'phone', 'website',
            'rating', 'price_range', 'price_display', 'opening_hours',
            'latitude', 'longitude', 'is_active', 'created_at'
        ]
    
    def get_latitude(self, obj):
        return obj.location.y if obj.location else None
    
    def get_longitude(self, obj):
        return obj.location.x if obj.location else None


class FoodSpotListSerializer(serializers.ModelSerializer):
    """
    Simple list serializer without GeoJSON format.
    """
    
    cuisine_display = serializers.CharField(source='get_cuisine_type_display', read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    
    class Meta:
        model = FoodSpot
        fields = [
            'id', 'name', 'cuisine_type', 'cuisine_display',
            'address', 'rating', 'price_range', 'latitude', 'longitude',
            'review_count', 'average_rating', 'description', 'phone', 'opening_hours'
        ]
    
    def get_latitude(self, obj):
        return obj.location.y if obj.location else None
    
    def get_longitude(self, obj):
        return obj.location.x if obj.location else None
    
    def get_review_count(self, obj):
        # Get from annotation if available (from queryset annotation)
        # Use getattr to avoid triggering the @property method
        try:
            # Check if annotation exists (from queryset)
            if hasattr(obj, '_state') and hasattr(obj, 'review_count'):
                # Try to get the annotated value directly
                count = getattr(obj, 'review_count', None)
                if count is not None:
                    return int(count)
        except:
            pass
        # Fallback: return 0 if no reviews
        return 0
    
    def get_average_rating(self, obj):
        # Get from annotation if available (from queryset annotation)
        try:
            # Check if annotation exists (from queryset)
            if hasattr(obj, '_state') and hasattr(obj, 'average_rating'):
                # Try to get the annotated value directly
                avg = getattr(obj, 'average_rating', None)
                if avg is not None:
                    return float(avg)
        except:
            pass
        # Fallback: use model's default rating
        return float(obj.rating) if obj.rating else 0.0


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for Review model.
    """
    
    class Meta:
        model = Review
        fields = [
            'id', 'foodspot', 'reviewer_name', 'reviewer_email',
            'rating', 'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Auto-approve reviews (can be changed to require moderation)
        validated_data['is_approved'] = True
        return super().create(validated_data)


class ReviewListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing reviews.
    """
    
    class Meta:
        model = Review
        fields = [
            'id', 'reviewer_name', 'rating', 'comment', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']