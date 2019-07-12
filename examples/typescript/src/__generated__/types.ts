/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetCharacter
// ====================================================

export interface GetCharacter_hero_friends {
  __typename: "Human" | "Droid";
  name: string;
  id: string;
  appearsIn: (Episode | null)[];
}

export interface GetCharacter_hero {
  __typename: "Human" | "Droid";
  name: string;
  id: string;
  friends: (GetCharacter_hero_friends | null)[] | null;
}

export interface GetCharacter {
  hero: GetCharacter_hero | null;
}

export interface GetCharacterVariables {
  episode: Episode;
}

/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

export enum Episode {
  EMPIRE = "EMPIRE",
  JEDI = "JEDI",
  NEWHOPE = "NEWHOPE",
}

//==============================================================
// END Enums and Input Objects
//==============================================================
