from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    """
    Custom User model that extends Django's AbstractUser to support both
    regular authenticated users and guest users.
    """
    # Indicates if this is a guest user
    is_guest = models.BooleanField(default=False)
    
    # External provider ID (if using SSO)
    external_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Provider for SSO (e.g., 'google', 'facebook')
    provider = models.CharField(max_length=50, blank=True, null=True)
    
    # Profile picture URL (can be from SSO provider)
    avatar_url = models.URLField(blank=True, null=True)
    
    # User's display name in the game (might be different from username)
    display_name = models.CharField(max_length=50, blank=True, null=True)
    
    # Preferred color for game pieces
    preferred_color = models.CharField(max_length=20, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Stats
    games_played = models.IntegerField(default=0)
    games_won = models.IntegerField(default=0)
    
    # Fix related_name conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name='custom_user_set',
        related_query_name='custom_user'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name='custom_user_set',
        related_query_name='custom_user'
    )
    
    def __str__(self):
        if self.is_guest:
            return f"Guest: {self.username}"
        return self.username
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')