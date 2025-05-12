from typing import Optional

from game_engine.board.buildings import Building


class Vertex:

    def __init__(self, q: int, r: int, s: int):

        self.q = q
        self.r = r
        self.s = s

        self.building = Optional[Building] = None


    def can_build_settlement(self):

        if self.building:
            return False


    def get_adjacent_vertices(self):

        vertices = []
        directions = [(1,0,-1), (0,1,-1), (1,0,1)]

        adjacent_vertices = []
        for dq, dr, ds in directions:
            adjestant = (self.q + dq, self.r + dr, self.s + ds)
            adjacent_vertices.append(adjestant)

        return adjacent_vertices



