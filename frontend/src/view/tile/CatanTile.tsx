import { Hexagon, HexUtils } from 'react-hexgrid';
import { Tile } from '../../engine/tile';
import { Hex, Resource } from '../../engine/types';
import { DiceNumber } from './DiceNumber';

interface Props {
  hex: Hex;
  tile: Tile;
}

const colorByResource: { [index: number]: string } = {
  [Resource.Desert]: 'burlywood',
  [Resource.Clay]: 'darkred',
  [Resource.Sheep]: 'lightgreen',
  [Resource.Wheat]: 'gold',
  [Resource.Wood]: 'forestgreen',
  [Resource.Stone]: 'darkgray'
};

function getTileColor(tile: Tile) {
  const resource = tile.getResource();
  if (resource === undefined) {
    return 'black';
  }
  return colorByResource[resource] || 'black';
}

export function CatanTile({ hex, tile }: Props) {
  const key = HexUtils.getID(hex);
  return (
    <Hexagon
      key={key}
      q={hex.q}
      r={hex.r}
      s={hex.s}
      cellStyle={{ fill: getTileColor(tile) }}
    >
      <DiceNumber diceNumber={tile.getDiceNumber() ?? 0} />
    </Hexagon>
  );
}
