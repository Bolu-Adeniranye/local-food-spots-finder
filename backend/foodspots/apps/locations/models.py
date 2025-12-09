from django.contrib.gis.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class FoodSpot(models.Model):
    """
    Model representing a food establishment location with spatial data.
    """
    
    CUISINE_CHOICES = [
        ('italian', 'Italian'),
        ('chinese', 'Chinese'),
        ('mexican', 'Mexican'),
        ('japanese', 'Japanese'),
        ('indian', 'Indian'),
        ('american', 'American'),
        ('fast_food', 'Fast Food'),
        ('cafe', 'Cafe/Coffee Shop'),
        ('pizza', 'Pizza'),
        ('burger', 'Burgers'),
        ('seafood', 'Seafood'),
        ('vegetarian', 'Vegetarian/Vegan'),
        ('thai', 'Thai'),
        ('mediterranean', 'Mediterranean'),
        ('other', 'Other'),
    ]
    
    PRICE_CHOICES = [
        ('€', 'Budget (€)'),
        ('€€', 'Moderate (€€)'),
        ('€€€', 'Expensive (€€€)'),
        ('€€€€', 'Very Expensive (€€€€)'),
    ]
    
    # Basic Information
    name = models.CharField(max_length=200, help_text="Name of the food spot")
    cuisine_type = models.CharField(
        max_length=50, 
        choices=CUISINE_CHOICES,
        default='other',
        help_text="Type of cuisine offered"
    )
    description = models.TextField(blank=True, help_text="Brief description")
    
    # Contact & Details
    address = models.CharField(max_length=300, help_text="Street address")
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    
    # Rating & Price
    rating = models.DecimalField(
        max_digits=2, 
        decimal_places=1,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)],
        default=0.0,
        help_text="Rating out of 5"
    )
    price_range = models.CharField(
        max_length=10,
        choices=PRICE_CHOICES,
        default='€€'
    )
    
    # Operating Hours
    opening_hours = models.CharField(
        max_length=100, 
        default="9:00 AM - 10:00 PM",
        help_text="Operating hours"
    )
    
    # Spatial Data - CRITICAL for PostGIS
    location = models.PointField(
        srid=4326,  # WGS84 coordinate system
        help_text="Geographic location (longitude, latitude)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-rating', 'name']
        indexes = [
            models.Index(fields=['cuisine_type']),
            models.Index(fields=['rating']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_cuisine_type_display()})"
    
    @property
    def latitude(self):
        """Get latitude from point geometry"""
        return self.location.y if self.location else None
    
    @property
    def longitude(self):
        """Get longitude from point geometry"""
        return self.location.x if self.location else None


class Review(models.Model):
    """
    Model representing a user review for a FoodSpot.
    """
    
    foodspot = models.ForeignKey(
        FoodSpot, 
        on_delete=models.CASCADE, 
        related_name='reviews',
        help_text="The food spot being reviewed"
    )
    
    # User information (using simple fields for now, can be extended with User model)
    reviewer_name = models.CharField(
        max_length=100, 
        help_text="Name of the reviewer"
    )
    reviewer_email = models.EmailField(
        blank=True, 
        null=True,
        help_text="Email of the reviewer (optional)"
    )
    
    # Review content
    rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)],
        help_text="Rating from 1.0 to 5.0"
    )
    comment = models.TextField(
        max_length=1000,
        help_text="Review comment"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_approved = models.BooleanField(
        default=True,
        help_text="Whether the review is approved and visible"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['foodspot', '-created_at']),
            models.Index(fields=['rating']),
        ]
    
    def __str__(self):
        return f"{self.reviewer_name} - {self.foodspot.name} ({self.rating}⭐)"