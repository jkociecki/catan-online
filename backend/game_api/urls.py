from django.urls import path
from . import views

urlpatterns = [
    path('room/create/', views.create_room, name='create_room'),
]