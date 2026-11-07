export type ArtMode = 'pixelArt' | 'retroCover' | 'inspo' | 'cassette';

export interface RetroCover {
  id: string;
  name: string;
  franchise: string;
  filename: string;
  gifUrl: string;
}

export const RETRO_COVERS: RetroCover[] = [
  { id: 'nyan_cat', name: 'NYAN CAT', franchise: 'Nyan Cat (2011)', filename: '01_nyan_cat.gif', gifUrl: './covers/01_nyan_cat.gif' },
  { id: 'pokemon_pikachu', name: 'PIKACHU', franchise: 'Pokémon', filename: '02_pokemon_pikachu.gif', gifUrl: './covers/02_pokemon_pikachu.gif' },
  { id: 'pokemon_gengar', name: 'GENGAR', franchise: 'Pokémon', filename: '03_pokemon_gengar.gif', gifUrl: './covers/03_pokemon_gengar.gif' },
  { id: 'kirby_warpstar', name: 'KIRBY', franchise: 'Kirby Dream Land', filename: '04_kirby_warpstar.gif', gifUrl: './covers/04_kirby_warpstar.gif' },
  { id: 'mario_question_block', name: 'SUPER MARIO', franchise: 'Super Mario Bros.', filename: '05_mario_question_block.gif', gifUrl: './covers/05_mario_question_block.gif' },
  { id: 'zelda_triforce', name: 'ZELDA', franchise: 'The Legend of Zelda', filename: '06_zelda_triforce.gif', gifUrl: './covers/06_zelda_triforce.gif' },
  { id: 'sonic_green_hill', name: 'SONIC', franchise: 'Sonic the Hedgehog', filename: '07_sonic_green_hill.gif', gifUrl: './covers/07_sonic_green_hill.gif' },
  { id: 'pacman_arcade', name: 'PAC-MAN', franchise: 'Pac-Man Arcade', filename: '08_pacman_arcade.gif', gifUrl: './covers/08_pacman_arcade.gif' },
  { id: 'space_invaders', name: 'INVADERS', franchise: 'Space Invaders', filename: '09_space_invaders.gif', gifUrl: './covers/09_space_invaders.gif' },
  { id: 'megaman_charging', name: 'MEGA MAN', franchise: 'Mega Man', filename: '10_megaman_charging.gif', gifUrl: './covers/10_megaman_charging.gif' },
  { id: 'metroid_samus', name: 'SAMUS', franchise: 'Metroid', filename: '11_metroid_samus.gif', gifUrl: './covers/11_metroid_samus.gif' },
  { id: 'tamagotchi_pet', name: 'TAMAGOTCHI', franchise: 'Tamagotchi', filename: '12_tamagotchi_pet.gif', gifUrl: './covers/12_tamagotchi_pet.gif' },
  { id: 'chocobo_field', name: 'CHOCOBO', franchise: 'Final Fantasy', filename: '13_chocobo_field.gif', gifUrl: './covers/13_chocobo_field.gif' },
  { id: 'earthbound_onett', name: 'EARTHBOUND', franchise: 'EarthBound / Mother 2', filename: '14_earthbound_onett.gif', gifUrl: './covers/14_earthbound_onett.gif' },
  { id: 'castlevania_moon', name: 'CASTLEVANIA', franchise: 'Castlevania', filename: '15_castlevania_moon.gif', gifUrl: './covers/15_castlevania_moon.gif' },
  { id: 'tetris_matrix', name: 'TETRIS', franchise: 'Tetris', filename: '16_tetris_matrix.gif', gifUrl: './covers/16_tetris_matrix.gif' },
  { id: 'donkey_kong', name: 'DONKEY KONG', franchise: 'Donkey Kong (1981)', filename: '17_donkey_kong.gif', gifUrl: './covers/17_donkey_kong.gif' },
  { id: 'chrono_campfire', name: 'CHRONO TRIGGER', franchise: 'Chrono Trigger', filename: '18_chrono_campfire.gif', gifUrl: './covers/18_chrono_campfire.gif' },
  { id: 'undertale_dog', name: 'UNDERTALE', franchise: 'Undertale', filename: '19_undertale_dog.gif', gifUrl: './covers/19_undertale_dog.gif' },
  { id: 'stardew_farm', name: 'STARDEW VALLEY', franchise: 'Stardew Valley', filename: '20_stardew_farm.gif', gifUrl: './covers/20_stardew_farm.gif' },
];
