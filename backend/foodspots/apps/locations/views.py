from django.contrib.gis.geos import Point, Polygon
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
import logging

from .models import FoodSpot, Review
from .serializers import FoodSpotListSerializer, ReviewSerializer, ReviewListSerializer

logger = logging.getLogger(__name__)


class FoodSpotViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for FoodSpot with all spatial queries
    """
    queryset = FoodSpot.objects.filter(is_active=True)
    serializer_class = FoodSpotListSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        cuisine_type = self.request.query_params.get('cuisine_type', None)
        if cuisine_type:
            queryset = queryset.filter(cuisine_type=cuisine_type)
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Get all food spots"""
        try:
            from django.db.models import Count, Avg
            queryset = self.filter_queryset(self.get_queryset())
            # Annotate with review counts and average ratings
            queryset = queryset.annotate(
                review_count=Count('reviews', filter=Q(reviews__is_approved=True)),
                average_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True))
            )
            serializer = self.get_serializer(queryset, many=True)
            logger.info(f"Returning {len(serializer.data)} food spots")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in list: {str(e)}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all cuisine categories"""
        try:
            categories = [{'value': c[0], 'label': c[1]} for c in FoodSpot.CUISINE_CHOICES]
            return Response(categories)
        except Exception as e:
            logger.error(f"Error in categories: {str(e)}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['post'])
    def nearest(self, request):
        """SPATIAL QUERY 1: Find nearest food spots"""
        try:
            lat = float(request.data.get('latitude'))
            lng = float(request.data.get('longitude'))
            limit = int(request.data.get('limit', 10))
            
            logger.info(f"Finding nearest {limit} spots to ({lat}, {lng})")
            
            from django.db.models import Count, Avg
            user_location = Point(lng, lat, srid=4326)
            
            nearest_spots = FoodSpot.objects.filter(is_active=True).annotate(
                distance=Distance('location', user_location),
                review_count=Count('reviews', filter=Q(reviews__is_approved=True)),
                average_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True))
            ).order_by('distance')[:limit]
            
            results = []
            for spot in nearest_spots:
                results.append({
                    'id': spot.id,
                    'name': spot.name,
                    'cuisine_type': spot.cuisine_type,
                    'cuisine_display': spot.get_cuisine_type_display(),
                    'description': spot.description,
                    'address': spot.address,
                    'phone': spot.phone,
                    'rating': float(spot.rating),
                    'price_range': spot.price_range,
                    'opening_hours': spot.opening_hours,
                    'latitude': spot.location.y,
                    'longitude': spot.location.x,
                    'distance_meters': round(spot.distance.m, 2),
                    'distance_km': round(spot.distance.km, 2),
                    'review_count': spot.review_count or 0,
                    'average_rating': float(spot.average_rating) if spot.average_rating else float(spot.rating)
                })
            
            logger.info(f"Found {len(results)} nearest spots")
            return Response(results)
            
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid parameters: {str(e)}")
            return Response({'error': 'Invalid latitude or longitude'}, status=400)
        except Exception as e:
            logger.error(f"Error in nearest: {str(e)}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['post'])
    def within_radius(self, request):
        """SPATIAL QUERY 2: Find spots within radius"""
        try:
            lat = float(request.data.get('latitude'))
            lng = float(request.data.get('longitude'))
            radius = float(request.data.get('radius_meters', 1000))
            cuisine_type = request.data.get('cuisine_type', None)
            
            logger.info(f"Searching within {radius}m of ({lat}, {lng}), cuisine={cuisine_type}")
            
            from django.db.models import Count, Avg
            user_location = Point(lng, lat, srid=4326)
            
            # Use buffer distance properly
            spots = FoodSpot.objects.filter(is_active=True).annotate(
                distance=Distance('location', user_location),
                review_count=Count('reviews', filter=Q(reviews__is_approved=True)),
                average_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True))
            ).filter(
                distance__lte=D(m=radius)
            ).order_by('distance')
            
            if cuisine_type:
                spots = spots.filter(cuisine_type=cuisine_type)
            
            results = []
            for spot in spots:
                results.append({
                    'id': spot.id,
                    'name': spot.name,
                    'cuisine_type': spot.cuisine_type,
                    'cuisine_display': spot.get_cuisine_type_display(),
                    'description': spot.description,
                    'address': spot.address,
                    'phone': spot.phone,
                    'rating': float(spot.rating),
                    'price_range': spot.price_range,
                    'opening_hours': spot.opening_hours,
                    'latitude': spot.location.y,
                    'longitude': spot.location.x,
                    'distance_meters': round(spot.distance.m, 2),
                    'distance_km': round(spot.distance.km, 2),
                    'review_count': spot.review_count or 0,
                    'average_rating': float(spot.average_rating) if spot.average_rating else float(spot.rating)
                })
            
            logger.info(f"Found {len(results)} spots within radius")
            return Response(results)
            
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid parameters: {str(e)}")
            return Response({'error': 'Invalid parameters'}, status=400)
        except Exception as e:
            logger.error(f"Error in within_radius: {str(e)}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['post'])
    def within_bounds(self, request):
        """SPATIAL QUERY 3: Find spots within polygon bounds"""
        try:
            bounds = request.data.get('bounds', [])
            
            if len(bounds) < 4:
                return Response({'error': 'Need at least 4 points'}, status=400)
            
            logger.info(f"Searching within polygon with {len(bounds)} points")
            
            points = [(float(c[1]), float(c[0])) for c in bounds]
            if points[0] != points[-1]:
                points.append(points[0])
            
            from django.db.models import Count, Avg
            polygon = Polygon(points, srid=4326)
            spots = FoodSpot.objects.filter(is_active=True, location__within=polygon).annotate(
                review_count=Count('reviews', filter=Q(reviews__is_approved=True)),
                average_rating=Avg('reviews__rating', filter=Q(reviews__is_approved=True))
            )
            
            results = []
            for spot in spots:
                results.append({
                    'id': spot.id,
                    'name': spot.name,
                    'cuisine_type': spot.cuisine_type,
                    'cuisine_display': spot.get_cuisine_type_display(),
                    'description': spot.description,
                    'address': spot.address,
                    'phone': spot.phone,
                    'rating': float(spot.rating),
                    'price_range': spot.price_range,
                    'opening_hours': spot.opening_hours,
                    'latitude': spot.location.y,
                    'longitude': spot.location.x,
                    'review_count': spot.review_count or 0,
                    'average_rating': float(spot.average_rating) if spot.average_rating else float(spot.rating)
                })
            
            logger.info(f"Found {len(results)} spots within bounds")
            return Response(results)
            
        except Exception as e:
            logger.error(f"Error in within_bounds: {str(e)}")
            return Response({'error': str(e)}, status=400)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search food spots by name, cuisine, or description"""
        try:
            query = request.query_params.get('q', '').strip()
            if not query:
                return Response({'error': 'Search query required'}, status=400)
            
            logger.info(f"Searching for: {query}")
            
            queryset = FoodSpot.objects.filter(is_active=True)
            
            # Search in name, description, or address
            from django.db.models import Q
            queryset = queryset.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(address__icontains=query)
            )
            
            # Optional filters
            cuisine_type = request.query_params.get('cuisine_type', None)
            if cuisine_type:
                queryset = queryset.filter(cuisine_type=cuisine_type)
            
            min_rating = request.query_params.get('min_rating', None)
            if min_rating:
                try:
                    queryset = queryset.filter(rating__gte=float(min_rating))
                except ValueError:
                    pass
            
            price_range = request.query_params.get('price_range', None)
            if price_range:
                queryset = queryset.filter(price_range=price_range)
            
            serializer = self.get_serializer(queryset, many=True)
            logger.info(f"Found {len(serializer.data)} results for query: {query}")
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error in search: {str(e)}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get statistics about food spots"""
        try:
            from django.db.models import Count, Avg, Q
            
            total = FoodSpot.objects.filter(is_active=True).count()
            
            # By cuisine
            cuisine_stats = FoodSpot.objects.filter(is_active=True).values('cuisine_type').annotate(
                count=Count('id')
            ).order_by('-count')
            
            cuisine_dict = {}
            for stat in cuisine_stats:
                cuisine_dict[stat['cuisine_type']] = stat['count']
            
            # By price range
            price_stats = FoodSpot.objects.filter(is_active=True).values('price_range').annotate(
                count=Count('id')
            ).order_by('price_range')
            
            price_dict = {}
            for stat in price_stats:
                price_dict[stat['price_range']] = stat['count']
            
            # Average rating
            avg_rating = FoodSpot.objects.filter(is_active=True).aggregate(
                avg_rating=Avg('rating')
            )['avg_rating'] or 0
            
            # Rating distribution
            rating_dist = {
                '5': FoodSpot.objects.filter(is_active=True, rating=5.0).count(),
                '4-5': FoodSpot.objects.filter(is_active=True, rating__gte=4.0, rating__lt=5.0).count(),
                '3-4': FoodSpot.objects.filter(is_active=True, rating__gte=3.0, rating__lt=4.0).count(),
                'below_3': FoodSpot.objects.filter(is_active=True, rating__lt=3.0).count(),
            }
            
            return Response({
                'total_spots': total,
                'average_rating': round(float(avg_rating), 2),
                'by_cuisine': cuisine_dict,
                'by_price_range': price_dict,
                'rating_distribution': rating_dist
            })
            
        except Exception as e:
            logger.error(f"Error in statistics: {str(e)}")
            return Response({'error': str(e)}, status=500)
    
    @action(detail=True, methods=['get', 'post'])
    def reviews(self, request, pk=None):
        """Get or create reviews for a food spot"""
        try:
            foodspot = self.get_object()
            
            if request.method == 'GET':
                # Get all approved reviews for this food spot
                reviews = Review.objects.filter(
                    foodspot=foodspot,
                    is_approved=True
                ).order_by('-created_at')
                serializer = ReviewListSerializer(reviews, many=True)
                return Response(serializer.data)
            
            elif request.method == 'POST':
                # Create a new review
                data = request.data.copy()
                data['foodspot'] = foodspot.id
                serializer = ReviewSerializer(data=data)
                
                if serializer.is_valid():
                    serializer.save()
                    logger.info(f"Review created for {foodspot.name} by {data.get('reviewer_name')}")
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                    
        except FoodSpot.DoesNotExist:
            return Response({'error': 'Food spot not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in reviews: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReviewViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for Review model.
    """
    queryset = Review.objects.filter(is_approved=True).order_by('-created_at')
    serializer_class = ReviewSerializer
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ReviewListSerializer
        return ReviewSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new review"""
        try:
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                serializer.save(is_approved=True)
                logger.info(f"Review created: {serializer.data}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating review: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def by_foodspot(self, request):
        """Get reviews for a specific food spot"""
        try:
            foodspot_id = request.query_params.get('foodspot_id')
            if not foodspot_id:
                return Response({'error': 'foodspot_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
            
            reviews = Review.objects.filter(
                foodspot_id=foodspot_id,
                is_approved=True
            ).order_by('-created_at')
            
            serializer = ReviewListSerializer(reviews, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting reviews by foodspot: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)