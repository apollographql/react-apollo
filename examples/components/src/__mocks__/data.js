export const empty = null;

export const hero_no_friends = {
  name: 'r2d2',
  id: '1',
  friends: null,
};

export const empty_array_friends = {
  ...hero_no_friends,
  ...{
    friends: [null],
  },
};

export const friend_without_appearsIn = {
  ...hero_no_friends,
  ...{
    friends: [
      { name: 'luke', id: '2', appearsIn: ['NEWHOPE'] },
      { name: 'james', id: '777', appearsIn: [null] },
    ],
  },
};

export const full = {
  ...hero_no_friends,
  ...{
    friends: [{ name: 'luke', id: '2', appearsIn: ['NEWHOPE'] }],
  },
};
