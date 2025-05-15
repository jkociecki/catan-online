import { OffsetTile } from "./tile";
import { Edge } from "./edge";
import { Corner } from "./corner";

describe("BaseTile", () => {
  it("should initialize corners and edges for such tile", () => {
    // as BaseTile is abstract, I'll test it using OffsetTile for the base methods
    const tile = new OffsetTile("0,0,0");

    const edges = tile.getEdges();
    expect(edges).toHaveLength(3);
    expect(edges[0]).toBeInstanceOf(Edge);

    const corners = tile.getCorners();
    expect(corners).toHaveLength(2);
    expect(corners[0]).toBeInstanceOf(Corner);
  });
});
