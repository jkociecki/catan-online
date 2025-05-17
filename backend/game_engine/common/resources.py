from enum import Enum
from typing import Dict


class Resource(Enum):
    DESERT = "DESERT"
    WOOD = "WOOD"
    BRICK = "BRICK"
    ORE = "ORE"
    WHEAT = "WHEAT"
    SHEEP = "SHEEP"

    def __str__(self):
        return self.value


class PlayerResources:
    def __init__(self):
        self.resources: Dict[Resource, int] = {
            Resource.WOOD: 0,
            Resource.BRICK: 0,
            Resource.ORE: 0,
            Resource.WHEAT: 0,
            Resource.SHEEP: 0,
            Resource.DESERT: 0
        }

    def add(self, resource: Resource, amount: int = 1):
        self.resources[resource] += amount

    def subtract(self, resource: Resource, amount: int = 1):
        if self.resources[resource] < amount:
            raise ValueError(f"Not enough {resource} resources")
        self.resources[resource] -= amount

    def get_total(self) -> int:
        return sum(self.resources.values())

    def serialize(self) -> Dict[str, int]:
        """Serializes the resources to a dictionary with string keys for JSON compatibility"""
        return {res.value: amount for res, amount in self.resources.items() if amount > 0}