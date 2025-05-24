# backend/game_api/models.py
from django.db import models

class Vertex(models.Model):
    """Wierzchołek planszy - miejsce dla domków/osad"""
    vertex_id = models.IntegerField(unique=True, primary_key=True)
    has_settlement = models.BooleanField(default=False)
    player_color = models.CharField(max_length=20, blank=True, null=True)  # Opcjonalnie
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['vertex_id']
    
    def __str__(self):
        status = "🏠" if self.has_settlement else "⚪"
        return f"Vertex {self.vertex_id} {status}"

class Edge(models.Model):
    """Krawędź planszy - miejsce dla dróg"""
    edge_id = models.IntegerField(unique=True, primary_key=True)
    has_road = models.BooleanField(default=False)
    player_color = models.CharField(max_length=20, blank=True, null=True)  # Opcjonalnie
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['edge_id']
    
    def __str__(self):
        status = "🛣️" if self.has_road else "➖"
        return f"Edge {self.edge_id} {status}"

class BoardState(models.Model):
    """Opcjonalnie - całościowy stan planszy"""
    name = models.CharField(max_length=100, default="Main Board")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Board: {self.name}"
    
    def get_stats(self):
        """Zwróć statystyki planszy"""
        settlements_count = Vertex.objects.filter(has_settlement=True).count()
        roads_count = Edge.objects.filter(has_road=True).count()
        
        return {
            'settlements': settlements_count,
            'roads': roads_count,
            'total_vertices': Vertex.objects.count(),
            'total_edges': Edge.objects.count()
        }