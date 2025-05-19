from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, user_profile
from . import views, callbacks

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token-callback/', callbacks.token_callback, name='token_callback'),
    path('profile/', user_profile, name='user_profile'),
    path('me/', user_profile, name='user_me'),
]