/* tslint:disable */
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetCharacter
// ====================================================

export interface GetCharacter_hero_friends {
  name: string; // The name of the character
  id: string; // The ID of the character
  appearsIn: (Episode | null)[]; // The movies this character appears in
}

export interface GetCharacter_hero {
  name: string; // The name of the character
  id: string; // The ID of the character
  friends: (GetCharacter_hero_friends | null)[] | null; // The friends of the character, or an empty list if they have none
}

export interface GetCharacter {
  hero: GetCharacter_hero | null;
}

//==============================================================
// START Enums and Input Objects
// All enums and input objects are included in every output file
// for now, but this will be changed soon.
// TODO: Link to issue to fix this.
//==============================================================

// The episodes in the Star Wars trilogy
export enum Episode {
  NEWHOPE = 'NEWHOPE',
  EMPIRE = 'EMPIRE',
  JEDI = 'JEDI',
}

//==============================================================
// END Enums and Input Objects
//==============================================================
