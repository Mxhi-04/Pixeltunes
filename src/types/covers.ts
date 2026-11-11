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
  { id: 'pokemon_pikachu', name: 'Pikachu', type: 'gif', src: './covers/02_pokemon_pikachu.gif' },
  { id: 'pokemon_gengar', name: 'Gengar', type: 'gif', src: './covers/03_pokemon_gengar.gif' },
  { id: 'kirby_warpstar', name: 'Kirby Warpstar', type: 'gif', src: './covers/04_kirby_warpstar.gif' },
  { id: 'mario_block', name: 'Super Mario', type: 'gif', src: './covers/05_mario_question_block.gif' },
  { id: 'zelda_triforce', name: 'Zelda Triforce', type: 'gif', src: './covers/06_zelda_triforce.gif' },
  { id: 'sonic_green_hill', name: 'Sonic Green Hill', type: 'gif', src: './covers/07_sonic_green_hill.gif' },
  { id: 'pacman_arcade', name: 'Pac-Man', type: 'gif', src: './covers/08_pacman_arcade.gif' },
  { id: 'space_invaders', name: 'Space Invaders', type: 'gif', src: './covers/09_space_invaders.gif' },
  { id: 'megaman_charging', name: 'Mega Man', type: 'gif', src: './covers/10_megaman_charging.gif' },
  { id: 'metroid_samus', name: 'Metroid Samus', type: 'gif', src: './covers/11_metroid_samus.gif' },
  { id: 'tamagotchi_pet', name: 'Tamagotchi Pet', type: 'gif', src: './covers/12_tamagotchi_pet.gif' },
  { id: 'chocobo_field', name: 'Chocobo', type: 'gif', src: './covers/13_chocobo_field.gif' },
  { id: 'earthbound_onett', name: 'EarthBound', type: 'gif', src: './covers/14_earthbound_onett.gif' },
  { id: 'castlevania_moon', name: 'Castlevania Moon', type: 'gif', src: './covers/15_castlevania_moon.gif' },
  { id: 'tetris_matrix', name: 'Tetris Matrix', type: 'gif', src: './covers/16_tetris_matrix.gif' },
  { id: 'donkey_kong', name: 'Donkey Kong', type: 'gif', src: './covers/17_donkey_kong.gif' },
  { id: 'chrono_campfire', name: 'Chrono Campfire', type: 'gif', src: './covers/18_chrono_campfire.gif' },
  { id: 'undertale_dog', name: 'Undertale Dog', type: 'gif', src: './covers/19_undertale_dog.gif' },
  { id: 'stardew_farm', name: 'Stardew Valley', type: 'gif', src: './covers/20_stardew_farm.gif' },
  { id: 'pastel_beach', name: 'Pastel Beach', type: 'gif', src: './covers/21_pastel_beach.gif' },
  { id: 'cyber_butterfly', name: 'Cyber Butterfly', type: 'gif', src: './covers/22_cyber_butterfly.gif' },
  { id: 'celestial_star', name: 'Celestial Star', type: 'gif', src: './covers/23_celestial_star.gif' },
];

/**
 * Deterministically pick a pixel cover based on song title & artist (+ optional offset).
 * Ensures each song has its own distinct shuffled pixel cover,
 * stable during playback and rotating cleanly upon every song change.
 */
export function getPixelCoverForTrack(trackTitle: string = '', artistName: string = '', offset: number = 0): PixelCover {
  const normTitle = (trackTitle || '').trim().toLowerCase();
  const normArtist = (artistName || '').trim().toLowerCase();

  let baseIndex: number;
  if (!normTitle || normTitle === 'nothing playing' || normTitle.includes('pastel clouds')) {
    baseIndex = 0;
  } else if (normTitle.includes('fly me to the moon')) {
    baseIndex = 1;
  } else if (normTitle.includes('midnight orbit')) {
    baseIndex = 2;
  } else {
    let hash = 0;
    const seed = `${normTitle}__${normArtist}`;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    baseIndex = Math.abs(hash) % PIXEL_COVERS.length;
  }

  return PIXEL_COVERS[(baseIndex + offset) % PIXEL_COVERS.length];
}
