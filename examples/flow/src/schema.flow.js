/* @flow */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

// The episodes in the Star Wars trilogy
export type Episode =
  | 'NEWHOPE' // Star Wars Episode IV: A New Hope, released in 1977.
  | 'EMPIRE' // Star Wars Episode V: The Empire Strikes Back, released in 1980.
  | 'JEDI'; // Star Wars Episode VI: Return of the Jedi, released in 1983.

export type GetCharacterQueryVariables = {|
  episode: Episode,
|};

export type GetCharacterQuery = {|
  hero: ?(
    | {
        __typename: 'Human',
        // The name of the character
        name: string,
        // The ID of the character
        id: string,
        // The friends of the character, or an empty list if they have none
        friends: ?Array<?(
          | {
              __typename: 'Human',
              // The name of the character
              name: string,
              // The ID of the character
              id: string,
              // The movies this character appears in
              appearsIn: Array<?Episode>,
            }
          | {
              __typename: 'Droid',
              // The name of the character
              name: string,
              // The ID of the character
              id: string,
              // The movies this character appears in
              appearsIn: Array<?Episode>,
            }
        )>,
      }
    | {
        __typename: 'Droid',
        // The name of the character
        name: string,
        // The ID of the character
        id: string,
        // The friends of the character, or an empty list if they have none
        friends: ?Array<?(
          | {
              __typename: 'Human',
              // The name of the character
              name: string,
              // The ID of the character
              id: string,
              // The movies this character appears in
              appearsIn: Array<?Episode>,
            }
          | {
              __typename: 'Droid',
              // The name of the character
              name: string,
              // The ID of the character
              id: string,
              // The movies this character appears in
              appearsIn: Array<?Episode>,
            }
        )>,
      }
  ),
|};
