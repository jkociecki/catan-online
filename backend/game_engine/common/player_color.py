from enum import Enum



class PlayerColor(Enum):
    WHITE = 'white'
    BLACK = 'black'
    RED = 'red'
    BLUE = 'blue'
    GREEN = 'green'
    YELLOW = 'yellow'
    ORANGE = 'orange'
    PURPLE = 'purple'
    PINK = 'pink'
    CYAN = 'cyan'
    BROWN = 'brown'

    @classmethod
    def get_all_colors(cls):
        return [color.value for color in cls]

    @classmethod
    def get_color(cls, color_name: str):
        for color in cls:
            if color.value == color_name:
                return color
        raise ValueError(f"Color '{color_name}' not found.")


if __name__ == '__main__':
    print(PlayerColor.get_all_colors())
    print(PlayerColor.get_color('red'))
    print(PlayerColor.get_color('purple'))
    print(PlayerColor.get_color('blue'))