# backend/game_engine/board/vertex.py
from typing import Optional, List, Dict, Tuple
from game_engine.board.buildings import Building, Road


class Vertex:
    """Wierzchołek na planszy - miejsce gdzie można stawiać osady/miasta"""
    
    def __init__(self, vertex_id: int, adjacent_tiles: List[int]):
        self.vertex_id = vertex_id
        self.adjacent_tiles = adjacent_tiles  # Lista ID kafelków przylegających do tego wierzchołka
        self.building: Optional[Building] = None
        self.adjacent_edges: List[int] = []  # Lista ID krawędzi przylegających do tego wierzchołka
    
    def has_building(self) -> bool:
        return self.building is not None
    
    def can_place_building(self, building_type) -> bool:
        """Sprawdź czy można postawić budynek (bez sprawdzania zasobów gracza)"""
        if self.building is not None:
            # Można tylko ulepszyć osadę do miasta
            from game_engine.board.buildings import BuildingType
            return (self.building.building_type == BuildingType.SETTLEMENT and 
                    building_type == BuildingType.CITY)
        return True


class Edge:
    """Krawędź na planszy - miejsce gdzie można stawiać drogi"""
    
    def __init__(self, edge_id: int, adjacent_tiles: List[int], connecting_vertices: List[int]):
        self.edge_id = edge_id
        self.adjacent_tiles = adjacent_tiles  # Lista ID kafelków (max 2)
        self.connecting_vertices = connecting_vertices  # Lista ID wierzchołków (zawsze 2)
        self.road: Optional[Road] = None
    
    def has_road(self) -> bool:
        return self.road is not None
    
    def can_place_road(self) -> bool:
        """Sprawdź czy można postawić drogę"""
        return self.road is None


class BoardGeometry:
    """Klasa pomocnicza do generowania geometrii planszy heksagonalnej"""
    
# backend/game_engine/board/vertex.py - zamień metodę generate_vertices_and_edges

    @staticmethod
    def generate_vertices_and_edges(board_radius: int) -> Tuple[List[Vertex], List[Edge], Dict[int, List[int]], Dict[int, List[int]]]:
        """
        Generuje wierzchołki i krawędzie dla planszy heksagonalnej
        ZSYNCHRONIZOWANE z frontendem - każdy kafelek ma dokładnie 6 wierzchołków i 6 krawędzi w ustalonej kolejności
        """
        vertices = []
        edges = []
        tile_to_vertices = {}
        tile_to_edges = {}
        
        # Najpierw wygenerujemy wszystkie kafelki W TEJ SAMEJ KOLEJNOŚCI co frontend
        tiles = []
        tile_id = 0
        
        for q in range(-board_radius, board_radius + 1):
            for r in range(-board_radius, board_radius + 1):
                s = -q - r
                if abs(s) <= board_radius:
                    tiles.append((tile_id, q, r, s))
                    tile_id += 1
        
        # Mapa globalnych wierzchołków - klucz to (q,r,s) pozycja wierzchołka w przestrzeni
        global_vertices = {}  # (q,r,s) -> vertex_id
        vertex_id = 0
        
        # Mapa globalnych krawędzi - klucz to frozenset dwóch pozycji wierzchołków
        global_edges = {}     # frozenset([(q1,r1,s1), (q2,r2,s2)]) -> edge_id  
        edge_id = 0
        
        # Dla każdego kafelka wygeneruj jego 6 wierzchołków i 6 krawędzi W USTALONEJ KOLEJNOŚCI
        for tile_id, q, r, s in tiles:
            tile_vertices = []
            tile_edges = []
            
            # ========== WIERZCHOŁKI ==========
            # Każdy kafelek ma 6 wierzchołków w ustalonej kolejności (zgodnie z frontendem):
            # 0=N, 1=NE, 2=SE, 3=S, 4=SW, 5=NW
            vertex_positions = [
                (q, r-1, s+1),    # 0: North
                (q+1, r-1, s),    # 1: North-East  
                (q+1, r, s-1),    # 2: South-East
                (q, r+1, s-1),    # 3: South
                (q-1, r+1, s),    # 4: South-West
                (q-1, r, s+1),    # 5: North-West
            ]
            
            for corner_index, vertex_pos in enumerate(vertex_positions):
                if vertex_pos not in global_vertices:
                    # Znajdź wszystkie kafelki które mają ten wierzchołek
                    adjacent_tiles = []
                    for other_tile_id, oq, or_, os in tiles:
                        # Sprawdź czy ten kafelek ma ten wierzchołek
                        other_vertex_positions = [
                            (oq, or_-1, os+1),    # 0: North
                            (oq+1, or_-1, os),    # 1: North-East  
                            (oq+1, or_, os-1),    # 2: South-East
                            (oq, or_+1, os-1),    # 3: South
                            (oq-1, or_+1, os),    # 4: South-West
                            (oq-1, or_, os+1),    # 5: North-West
                        ]
                        
                        if vertex_pos in other_vertex_positions:
                            adjacent_tiles.append(other_tile_id)
                    
                    # Stwórz nowy wierzchołek
                    vertex = Vertex(vertex_id, adjacent_tiles)
                    vertices.append(vertex)
                    global_vertices[vertex_pos] = vertex_id
                    vertex_id += 1
                
                tile_vertices.append(global_vertices[vertex_pos])
            
            tile_to_vertices[tile_id] = tile_vertices
            
            # ========== KRAWĘDZIE ==========
            # Każdy kafelek ma 6 krawędzi w ustalonej kolejności:
            # 0=NE, 1=E, 2=SE, 3=SW, 4=W, 5=NW
            edge_connections = [
                (0, 1),  # 0: NE edge (N -> NE)
                (1, 2),  # 1: E edge (NE -> SE)  
                (2, 3),  # 2: SE edge (SE -> S)
                (3, 4),  # 3: SW edge (S -> SW)
                (4, 5),  # 4: W edge (SW -> NW)
                (5, 0),  # 5: NW edge (NW -> N)
            ]
            
            for edge_index, (start_corner, end_corner) in enumerate(edge_connections):
                start_pos = vertex_positions[start_corner]
                end_pos = vertex_positions[end_corner]
                edge_key = frozenset([start_pos, end_pos])
                
                if edge_key not in global_edges:
                    # Znajdź kafelki które mają tę krawędź
                    adjacent_tiles = []
                    connecting_vertices = []
                    
                    # Znajdź wszystkie kafelki które mają oba te wierzchołki
                    for other_tile_id, oq, or_, os in tiles:
                        other_vertex_positions = [
                            (oq, or_-1, os+1),    # 0: North
                            (oq+1, or_-1, os),    # 1: North-East  
                            (oq+1, or_, os-1),    # 2: South-East
                            (oq, or_+1, os-1),    # 3: South
                            (oq-1, or_+1, os),    # 4: South-West
                            (oq-1, or_, os+1),    # 5: North-West
                        ]
                        
                        if start_pos in other_vertex_positions and end_pos in other_vertex_positions:
                            adjacent_tiles.append(other_tile_id)
                    
                    # Znajdź vertex_id dla końców krawędzi
                    start_vertex_id = global_vertices.get(start_pos)
                    end_vertex_id = global_vertices.get(end_pos)
                    
                    if start_vertex_id is not None and end_vertex_id is not None:
                        connecting_vertices = [start_vertex_id, end_vertex_id]
                        
                        # Stwórz nową krawędź
                        edge = Edge(edge_id, adjacent_tiles, connecting_vertices)
                        edges.append(edge)
                        global_edges[edge_key] = edge_id
                        
                        # Zaktualizuj wierzchołki o informację o tej krawędzi
                        vertices[start_vertex_id].adjacent_edges.append(edge_id)
                        vertices[end_vertex_id].adjacent_edges.append(edge_id)
                        
                        edge_id += 1
                
                if edge_key in global_edges:
                    tile_edges.append(global_edges[edge_key])
            
            tile_to_edges[tile_id] = tile_edges
        
        print(f"Generated {len(vertices)} vertices, {len(edges)} edges")
        print(f"Sample tile_to_vertices: {dict(list(tile_to_vertices.items())[:3])}")
        print(f"Sample tile_to_edges: {dict(list(tile_to_edges.items())[:3])}")
        
        return vertices, edges, tile_to_vertices, tile_to_edges

    @staticmethod
    def get_vertex_neighbors(vertex_id: int, vertices: List[Vertex], edges: List[Edge]) -> List[int]:
        """
        Zwraca listę wierzchołków sąsiadujących z danym wierzchołkiem
        (połączonych bezpośrednio krawędzią)
        """
        neighbors = []
        vertex = vertices[vertex_id]
        
        for edge_id in vertex.adjacent_edges:
            edge = edges[edge_id]
            for connected_vertex_id in edge.connecting_vertices:
                if connected_vertex_id != vertex_id:
                    neighbors.append(connected_vertex_id)
        
        return neighbors
    
    @staticmethod
    def can_place_settlement_here(vertex_id: int, vertices: List[Vertex], edges: List[Edge], 
                                  player, is_setup_phase: bool = False) -> bool:
        """
        Sprawdź czy można postawić osadę na danym wierzchołku
        """
        # vertex = vertices[vertex_id]
        
        # # Sprawdź czy wierzchołek jest wolny
        # if vertex.has_building():
        #     return False
        
        # # Sprawdź regułę odległości - żaden sąsiedni wierzchołek nie może mieć budynku
        # neighbor_vertices = BoardGeometry.get_vertex_neighbors(vertex_id, vertices, edges)
        # for neighbor_id in neighbor_vertices:
        #     if vertices[neighbor_id].has_building():
        #         return False
        
        # # W fazie setup nie sprawdzamy połączenia z drogą
        # if is_setup_phase:
        #     return True
        
        # # W normalnej grze musi być połączenie z drogą gracza
        # for edge_id in vertex.adjacent_edges:
        #     edge = edges[edge_id]
        #     if edge.has_road() and edge.road.player == player:
        #         return True
        
        # return False
        return True
    
    @staticmethod
    def can_place_road_here(edge_id: int, vertices: List[Vertex], edges: List[Edge], 
                           player, is_setup_phase: bool = False) -> bool:
        """
        Sprawdź czy można postawić drogę na danej krawędzi
        """
        # edge = edges[edge_id]
        
        # # Sprawdź czy krawędź jest wolna
        # if edge.has_road():
        #     return False
        
        # # W fazie setup sprawdź tylko połączenie z osadą gracza
        # if is_setup_phase:
        #     for vertex_id in edge.connecting_vertices:
        #         vertex = vertices[vertex_id]
        #         if vertex.has_building() and vertex.building.player == player:
        #             return True
        #     return False
        
        # # W normalnej grze sprawdź połączenie z inną drogą lub osadą gracza
        # # Sprawdź osady/miasta gracza na końcach tej krawędzi
        # for vertex_id in edge.connecting_vertices:
        #     vertex = vertices[vertex_id]
        #     if vertex.has_building() and vertex.building.player == player:
        #         return True
        
        # # Sprawdź drogi gracza połączone z tą krawędzią
        # for vertex_id in edge.connecting_vertices:
        #     vertex = vertices[vertex_id]
        #     for adjacent_edge_id in vertex.adjacent_edges:
        #         if adjacent_edge_id != edge_id:
        #             adjacent_edge = edges[adjacent_edge_id]
        #             if adjacent_edge.has_road() and adjacent_edge.road.player == player:
        #                 return True
        
        # return False
        return True