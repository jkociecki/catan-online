from enum import Enum
from dataclasses import dataclass, field
from typing import Dict


class Resource(Enum):

    WHEAT = "wheat"
    BRICK = "brick"
    ORE = "ore"
    SHEEP = "sheep"
    WOOD = "wood"
    DESERT = "desert"

@dataclass
class PlayerResources:

    resources: Dict[Resource, int] = field(default_factory=lambda: {
        Resource.WHEAT: 0,
        Resource.BRICK: 0,
        Resource.ORE: 0,
        Resource.SHEEP: 0,
        Resource.WOOD: 0,
    })


    def add(self, resource: Resource, amount: int) -> None:
        if resource != Resource.DESERT:
            self.resources[resource] = self.resources.get(resource, 0) + amount

    def has_enough_resource(self, resource: Resource, amount: int) -> bool:
        
        return amount <= self.resources.get(resource, 0)
    
    def subtract(self, resource: Resource, amount: int) -> None:
        
        if resource != Resource.DESERT and self.has_enough_resource(resource, amount):
            self.resources[resource] = self.resources.get(resource, 0) - amount
            
