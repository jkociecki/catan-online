"""
Module for printing the Catan game board in a visually appealing way.
"""
from game_engine.board.game_tile import Tile
from game_engine.common.resources import Resource
from typing import List


def print_board(gameboard):
    """
    Prints the Catan game board in a visually appealing way.

    Args:
        gameboard: GameBoard instance to print
    """
    # Symbol and color mapping for resources
    resource_symbols = {
        Resource.WOOD: "🌲",
        Resource.BRICK: "🧱",
        Resource.DESERT: "🏜️",
        Resource.SHEEP: "🐑",
        Resource.ORE: "⛰️",
        Resource.WHEAT: "🌾"
    }

    # ANSI color codes for terminal output
    colors = {
        Resource.WOOD: "\033[32m",  # Green
        Resource.BRICK: "\033[31m",  # Red
        Resource.DESERT: "\033[33m",  # Yellow
        Resource.SHEEP: "\033[1;37m",  # White (bright)
        Resource.ORE: "\033[1;30m",  # Gray
        Resource.WHEAT: "\033[1;33m",  # Yellow (bright)
        "RESET": "\033[0m"  # Reset color
    }

    # Display robber marker
    robber_marker = "R"

    # Sort tiles by row (r coordinate) then by column (q coordinate)
    sorted_tiles = sorted(gameboard.tiles, key=lambda tile: (tile.r, tile.q))

    # Determine the range of coordinates
    min_r = min(tile.r for tile in gameboard.tiles)
    max_r = max(tile.r for tile in gameboard.tiles)

    # Print the board row by row
    print("\n==== CATAN GAME BOARD ====\n")

    current_r = min_r
    row_tiles = []

    for tile in sorted_tiles:
        if tile.r != current_r:
            # Print the current row before moving to the next
            print_row(row_tiles, colors, resource_symbols)
            row_tiles = []
            current_r = tile.r

        row_tiles.append(tile)

    # Print the last row
    if row_tiles:
        print_row(row_tiles, colors, resource_symbols)

    print("\n=========================\n")


def print_row(tiles, colors, resource_symbols):
    """
    Prints a single row of tiles.

    Args:
        tiles: List of Tile objects in the row
        colors: Dictionary mapping resources to color codes
        resource_symbols: Dictionary mapping resources to symbol strings
    """
    # Calculate row indentation based on row coordinate
    # Center rows have less indentation, outer rows have more
    r = tiles[0].r
    indentation = " " * (4 * abs(r))

    # Top part of the hexagons
    top_line = indentation
    for tile in tiles:
        top_line += "  ____  "
    print(top_line)

    # Resource and tile number
    middle_line = indentation
    for tile in tiles:
        resource = tile.get_resource()
        symbol = resource_symbols.get(resource, "?")
        color = colors.get(resource, colors["RESET"])

        # Format the tile number for display
        if tile.number is None:
            number_str = "  "
        else:
            # Add asterisks around 6 and 8 as they're high-probability numbers
            if tile.number in [6, 8]:
                number_str = f"*{tile.number}*"
            else:
                number_str = f" {tile.number} "

        # Add robber indicator if present
        robber_indicator = 'R' if tile.is_robber_placed else " "

        middle_line += f"/{color}{symbol}{colors['RESET']} {number_str}{robber_indicator}\\ "
    print(middle_line)

    # Bottom part of the hexagons
    bottom_line = indentation
    for tile in tiles:
        q, r, s = tile.q, tile.r, tile.s
        coord_str = f"({q},{r},{s})"
        # Pad the coordinates to ensure uniform width
        coord_str = coord_str.ljust(8)
        bottom_line += f"\\{coord_str}/"
    print(bottom_line)


def print_board_ascii(gameboard):
    """
    Alternative board printer using only ASCII characters.
    Useful for environments where Unicode or ANSI colors aren't supported.

    Args:
        gameboard: GameBoard instance to print
    """
    # ASCII representation for resources
    resource_symbols = {
        Resource.WOOD: "WOOD",
        Resource.BRICK: "BRCK",
        Resource.DESERT: "DSRT",
        Resource.SHEEP: "SHEEP",
        Resource.ORE: "ORE ",
        Resource.WHEAT: "WHEAT"
    }

    # Sort tiles by row (r coordinate) then by column (q coordinate)
    sorted_tiles = sorted(gameboard.tiles, key=lambda tile: (tile.r, tile.q))

    # Determine the range of coordinates
    min_r = min(tile.r for tile in gameboard.tiles)

    # Print the board row by row
    print("\n==== CATAN GAME BOARD (ASCII) ====\n")

    current_r = min_r
    row_tiles = []

    for tile in sorted_tiles:
        if tile.r != current_r:
            # Print the current row before moving to the next
            print_ascii_row(row_tiles, resource_symbols)
            row_tiles = []
            current_r = tile.r

        row_tiles.append(tile)

    # Print the last row
    if row_tiles:
        print_ascii_row(row_tiles, resource_symbols)

    print("\n=================================\n")


def print_ascii_row(tiles, resource_symbols):
    """
    Prints a single row of tiles using ASCII characters.

    Args:
        tiles: List of Tile objects in the row
        resource_symbols: Dictionary mapping resources to symbol strings
    """
    # Calculate row indentation
    r = tiles[0].r
    indentation = " " * (4 * abs(r))

    # Top part of the hexagons
    top_line = indentation
    for _ in tiles:
        top_line += " _______ "
    print(top_line)

    # Resource line
    resource_line = indentation
    for tile in tiles:
        resource = tile.get_resource()
        symbol = resource_symbols.get(resource, "????")
        resource_line += f"|{symbol}|"
    print(resource_line)

    # Number line
    number_line = indentation
    for tile in tiles:
        if tile.number is None:
            number_str = "   "
        else:
            if tile.number in [6, 8]:
                number_str = f"*{tile.number}*"
            else:
                number_str = f" {tile.number} "

        # Add robber indicator if present
        robber_indicator = "R" if tile.is_robber_placed else " "
        number_line += f"|  {number_str}{robber_indicator} |"
    print(number_line)

    # Coordinates line
    coord_line = indentation
    for tile in tiles:
        q, r, s = tile.q, tile.r, tile.s
        coord_str = f"({q},{r},{s})"
        coord_line += f"|{coord_str.center(7)}|"
    print(coord_line)

    # Bottom line
    bottom_line = indentation
    for _ in tiles:
        bottom_line += "|_______|"
    print(bottom_line)