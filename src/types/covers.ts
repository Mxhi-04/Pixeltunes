export interface PixelCover {
  id: string;
  name: string;
  type: 'canvas_saturn' | 'canvas_bunny' | 'canvas_synthwave' | 'gif';
  src?: string;
}

export const PIXEL_COVERS: PixelCover[] = [
  { id: 'saturn_galaxy', name: 'Saturn Galaxy', type: 'canvas_saturn', src: './covers/00_saturn_galaxy.png' },
  { id: 'moon_bunny', name: 'Moon Bunny', type: 'canvas_bunny' },
  { id: 'retro_synthwave', name: 'Synthwave Sunset', type: 'canvas_synthwave' },
  { id: 'nyan_cat', name: 'Nyan Cat', type: 'gif', src: './covers/01_nyan_cat.gif' },
  { id: 'kirby_warpstar', name: 'Kirby Warpstar', type: 'gif', src: './covers/04_kirby_warpstar.gif' },
  { id: 'pokemon_pikachu', name: 'Pikachu', type: 'gif', src: './covers/02_pokemon_pikachu.gif' },
  { id: 'pokemon_gengar', name: 'Gengar', type: 'gif', src: './covers/03_pokemon_gengar.gif' },
  { id: 'zelda_triforce', name: 'Zelda Triforce', type: 'gif', src: './covers/06_zelda_triforce.gif' },
  { id: 'sonic_green_hill', name: 'Sonic Green Hill', type: 'gif', src: './covers/07_sonic_green_hill.gif' },
  { id: 'castlevania_moon', name: 'Castlevania Moon', type: 'gif', src: './covers/15_castlevania_moon.gif' },
  { id: 'chrono_campfire', name: 'Chrono Campfire', type: 'gif', src: './covers/18_chrono_campfire.gif' },
  { id: 'stardew_farm', name: 'Stardew Valley', type: 'gif', src: './covers/20_stardew_farm.gif' },
  { id: 'tamagotchi_pet', name: 'Tamagotchi Pet', type: 'gif', src: './covers/12_tamagotchi_pet.gif' },
  { id: 'mario_block', name: 'Super Mario', type: 'gif', src: './covers/05_mario_question_block.gif' },
  { id: 'tetris_matrix', name: 'Tetris Matrix', type: 'gif', src: './covers/16_tetris_matrix.gif' },
  { id: 'earthbound_onett', name: 'EarthBound', type: 'gif', src: './covers/14_earthbound_onett.gif' },
  { id: 'undertale_dog', name: 'Undertale Dog', type: 'gif', src: './covers/19_undertale_dog.gif' },
];

/**
 * Deterministically pick a pixel cover based on song title & artist.
 * Ensures the cover is stable throughout the track and automatically rotates with each new song.
 */
export function getPixelCoverForTrack(trackTitle: string, artistName: string = ''): PixelCover {
  const normTitle = (trackTitle || '').trim().toLowerCase();
  // Ensure the default initial track features the user's new Saturn galaxy artwork!
  if (normTitle.includes('fly me to the moon') || !normTitle) {
    return PIXEL_COVERS[0]; // saturn_galaxy
  }
  let hash = 0;
  const seed = `${normTitle}__${(artistName || '').trim().toLowerCase()}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PIXEL_COVERS.length;
  return PIXEL_COVERS[index];
}
