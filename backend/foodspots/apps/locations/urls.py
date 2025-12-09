from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FoodSpotViewSet, ReviewViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'foodspots', FoodSpotViewSet, basename='foodspot')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    path('', include(router.urls)),
]