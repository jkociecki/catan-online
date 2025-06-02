# backend/game_api/models.py
from django.db import models
from django.conf import settings  # Import dla AUTH_USER_MODEL

# Usuń duplikowany model User - używaj users.User!

class Game(models.Model):
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    dice_distribution = models.JSONField(default=dict, blank=True)
    turns = models.IntegerField(default=0)

    def __str__(self):
        return f"Game {self.id}"

    class Meta:
        db_table = 'games'


class GamePlayer(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, db_column='game_id')
    # ✅ Używaj settings.AUTH_USER_MODEL zamiast lokalnego User
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
    victory_points = models.IntegerField()
    roads_built = models.IntegerField(default=0)
    settlements_built = models.IntegerField(default=0)
    cities_built = models.IntegerField(default=0)
    longest_road = models.BooleanField(default=False)
    largest_army = models.BooleanField(default=False)

    class Meta:
        unique_together = ('game', 'user')
        db_table = 'game_players'


class PlayerResource(models.Model):
    game_player = models.ForeignKey(GamePlayer, on_delete=models.CASCADE, db_column='game_player_id')
    resource_type = models.CharField(
        max_length=20,
        choices=[('wood', 'Wood'), ('brick', 'Brick'), ('sheep', 'Sheep'), ('wheat', 'Wheat'), ('ore', 'Ore')]
    )
    amount = models.IntegerField()

    class Meta:
        db_table = 'player_resources'


class Vertex(models.Model):
    """Wierzchołek planszy - miejsce dla domków/osad"""
    vertex_id = models.IntegerField(unique=True, primary_key=True)
    has_settlement = models.BooleanField(default=False)
    player_color = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['vertex_id']
        db_table = 'vertices'

    def __str__(self):
        status = "🏠" if self.has_settlement else "⚪"
        return f"Vertex {self.vertex_id} {status}"


class Edge(models.Model):
    """Krawędź planszy - miejsce dla dróg"""
    edge_id = models.IntegerField(unique=True, primary_key=True)
    has_road = models.BooleanField(default=False)
    player_color = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['edge_id']
        db_table = 'edges'

    def __str__(self):
        status = "🛣️" if self.has_road else "➖"
        return f"Edge {self.edge_id} {status}"


class BoardState(models.Model):
    """Opcjonalnie - całościowy stan planszy"""
    name = models.CharField(max_length=100, default="Main Board")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'board_states'

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