from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, GameViewSet, GamePlayerViewSet, PlayerResourceViewSet, StatsViewSet
from . import views


router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'games', GameViewSet)
router.register(r'game-players', GamePlayerViewSet)
router.register(r'player-resources', PlayerResourceViewSet)
router.register(r'stats', StatsViewSet, basename='stats')


urlpatterns = [
    path('room/create/', views.create_room, name='create_room'),
    path('', include(router.urls)),
]